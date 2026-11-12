// One painted layer: an unlit, alpha-blended plane in metres, anchored at its ground point, with its motion in the
// vertex/fragment shader. Textures are uploaded PREMULTIPLIED (rgb * a, done here on the CPU), so filtering and
// mipmaps never mix the colour of transparent pixels into the edge: no light or dark halos at any size.
import {
  Constants, Effect, Mesh, RawTexture, ShaderMaterial, Texture, Vector2, Vector3, Vector4, VertexBuffer, VertexData,
  type Scene,
} from '@babylonjs/core'
import type { Asset, BlinkEye, MotionSpec, Puppet } from './types'
import { SHADE_COLOUR, SUN_COLOUR, type Alive, type Paper } from './look'
import { MOTION_CODE } from './layout'
import { bottomColour, inkLevel, landTop, rowBands, skylineRow } from './ground'
import { GL_NOISE, HATCH_GLSL } from './ground-gl'
import type { BentPicture } from './bones'

/** Line by depth (look.ts), shared with the puppet figures (S3): `lineByDepth` takes a STRAIGHT colour, how much of
 *  it is ink (inkOf), and the depth's values; returns the colour. Defines lum, inkOf and LINE_BROWN. */
export const LINE_BY_DEPTH_GLSL = `
  const vec3 LINE_BROWN = vec3(0.42, 0.31, 0.22);
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  // ink = the dark line pixels of the art (1 on a line, 0 on a wash)
  float inkOf(vec3 s) { return smoothstep(0.5, 0.2, lum(s)); }
  vec3 lineByDepth(vec3 s, float ink, float lineFade, float haze, float lineBrown, vec3 hazeTint) {
    s = mix(s, LINE_BROWN * (0.55 + lum(s)), ink * lineBrown);   // black ink becomes the book's brown pencil
    s = mix(s, mix(s, hazeTint, 0.75), ink * lineFade);         // lighter: the line goes toward the air's colour
    return mix(s, hazeTint, haze);                              // aerial perspective over the whole picture
  }`

/** The paper the picture is painted on (look.ts sheet*), on a STRAIGHT colour at `px` (1080p px in the picture's own
 *  space, so the grain moves with the picture: no shower-door). Needs GL_NOISE (fbm) and lum (LINE_BY_DEPTH_GLSL). */
export const PAPER_GLSL = `
  vec3 paperOn(vec3 c, vec2 px, float paper, float grain, float patches, float wash, vec3 washColour) {
    float l = lum(c);
    // paper tooth: fine fibre and a medium cockle, light on the light washes too (it is the sheet)
    c *= 1.0 + paper * (0.12 * (fbm(px / 1.6) - 0.5) + 0.08 * (fbm(px / 9.0 + 17.0) - 0.5));
    // granulation: pigment settling in the tooth, in the darker and more coloured washes only
    float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
    c *= 1.0 + grain * 0.5 * (fbm(px / 1.3 + 31.0) - 0.5) * (1.0 - 0.6 * l) * (0.4 + sat);
    // the warm wash goes on thicker and thinner in big soft patches (its even part is the sheet pass)
    c *= mix(vec3(1.0), washColour, wash * patches * 1.6 * (fbm(px / 380.0 + 5.0) - 0.5));
    return c;
  }`

/** A layer's motion in its vertex shader (layout.ts MOTION_CODE), shared with its cast shadow so the shadow sways,
 *  breathes and drifts with it. h: 0 at the ground point, 1 at the top. Needs the motion uniforms. */
const MOTION_GLSL = `
  vec3 moved(vec3 p, float h) {
    if (kind == 1.0) {          // sway: bends from the base, top moves most, two beats so it never ticks like a metronome
      float s = sin(time * speed * 1.1 + phase) + 0.35 * sin(time * speed * 2.7 + phase * 1.7);
      p.x += amount * 0.035 * height * h * h * s;
      p.y -= amount * 0.004 * height * h * h * s * s;      // a bent stem is a touch shorter
    } else if (kind == 2.0) {   // drift: a slow sideways travel (clouds), long period so a shot never sees it turn
      p.x += amount * 0.12 * width * sin(time * speed * 0.035 + phase);
    } else if (kind == 4.0) {   // flicker: the flame stretches and settles
      p.y *= 1.0 + amount * 0.05 * h * (sin(time * speed * 9.0 + phase) * 0.6 + sin(time * speed * 23.0) * 0.4);
    } else if (kind == 5.0) {   // breathe: the chest rises and carries the head, feet stay put, a slow weight shift on top
      float chest = smoothstep(0.35, 0.75, h);
      p.y += amount * 0.008 * height * chest * sin(time * speed * 1.6 + phase);
      p.x += amount * 0.005 * height * h * h * sin(time * speed * 0.45 + phase * 1.3);
    }
    return p;
  }`

Effect.ShadersStore.stageLayerVertexShader = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  uniform float time, kind, amount, speed, phase, height, width;
  ${MOTION_GLSL}
  varying vec2 vUV;
  varying float vH;
  #ifdef REST
  attribute vec2 uv2;     // where this corner sits in the drawing at rest (a figure of parts: restDrawing)
  varying vec2 vRest;
  #endif
  void main(void) {
    #ifdef REST
    vRest = uv2;
    #endif
    float h = clamp(position.y / max(height, 0.001), 0.0, 1.0);   // 0 at the ground point, 1 at the top
    vec3 p = moved(position, h);
    vUV = uv;
    vH = h;
    gl_Position = worldViewProjection * vec4(p, 1.0);
  }`

Effect.ShadersStore.stageLayerFragmentShader = `
  #extension GL_OES_standard_derivatives : enable
  precision highp float;
  varying vec2 vUV;
  varying float vH;
  uniform sampler2D tex;
  uniform float time, kind, amount, speed, phase, opacity, uRepeat, feather;
  uniform vec3 featherTint;
  uniform float groundLine;                  // sky only: below this height of the plane (the eye line) it is floor
  uniform float lineFade, lineThin, haze;   // line by depth (look.ts): lighter, thinner, into the sky's haze
  uniform float lineBrown;                  // all depths: black lines toward a warm brown
  uniform float inkMul;                     // this layer's line colour scale, so every layer's ink reaches one value
  uniform vec2 pxUV;                         // texture uv per 1080p screen px
  uniform vec3 hazeTint;
  uniform float paper, grain, patches, wash;   // the paper (look.ts sheet*), anchored to this picture
  uniform vec3 washColour;
  uniform vec2 grainUV;                        // texture uv per 1080p px at the house pose (fixed: grain never swims)
  // no sticker look (look.ts): a painted edge instead of a scissor cut, a foot that sinks into the floor, one light
  uniform float edgeSoft, footM, grounding, grass, light, sunSide, drift, height;
  uniform float bottomFade;                    // ground bands: alpha ramps to 0 over this share of the height, from the bottom
  uniform vec3 footTint, sunColour, shadeColour;
  uniform vec3 ambient;                        // the time of day's light (daylight.ts), on everything painted
  uniform float tone;                          // a cloud: how far its paint goes toward the time's cloud colours
  uniform vec3 toneLight, toneShade, toneUnder;
  uniform vec4 cell;                           // an animation: the frame's part of the sheet (u0, v0, du, dv), else 0 0 1 1
  uniform vec2 uvFit;                          // the drawing's uv as uv of its atlas (a puppet), else 1 1
  uniform float outlineW, etch, width;         // the teacher's ink on this picture: 1080p px inside its edge, hatching in its shade
  ${GL_NOISE}
  #define EDGE_FEATHER_PX 1.5                      // at edgeSoft 1: the cut fades out over this many 1080p px (anti-aliasing only)
  #define EDGE_FEATHER_MAX_UV 0.025                // ...but over at most this share of the picture (small far pictures keep their edge)
  ${LINE_BY_DEPTH_GLSL}
  ${PAPER_GLSL}
  // a frame of a sheet is read inside its own cell only, so no tap ever reaches the next frame
  vec4 tap(vec2 p) {
    if (cell.z < 1.0 || cell.w < 1.0) return texture2D(tex, cell.xy + clamp(p, 0.0, 1.0) * cell.zw);
    return texture2D(tex, p);
  }
  ${HATCH_GLSL}
  // past the image's own border counts as air, so a picture cut off by its border gets a line there too
  bool past(vec2 p) { return p.x < 0.0 || p.y < 0.0 || p.x > uRepeat || p.y > 1.0; }
  #ifdef REST
  uniform sampler2D rest;
  uniform vec2 restScale;   // uv of the atlas to uv of the drawing (1 / uvFit)
  varying vec2 vRest;
  #endif
  // what lies \`off\` (uv of this picture) away from here, for the ink's air and lines: on a figure of parts the drawing as
  // it was drawn (a cut between two parts is no edge), elsewhere the picture itself; past its border is air
  vec4 around(vec2 uv, vec2 off) {
    #ifdef REST
    vec2 q = vRest + off * restScale;
    return (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) ? vec4(0.0) : texture2D(rest, q);
    #else
    vec2 q = uv + off;
    return past(q) ? vec4(0.0) : tap(q);
    #endif
  }
  #ifdef BLINK
  // a close-up blinks (blink.ts): per eye the closed lid's edge slides from just above the eye box down to the closed
  // lash line; above the edge the closed picture in place, on a thin band above it the closed lash line riding the
  // edge, below it the open eye. Never a fade. Blended in with a soft ellipse in the box: no rectangles.
  uniform sampler2D blinkTex;                // the closed-eye picture, pixel-aligned with tex, premultiplied
  uniform float blinkT;                      // 0 open .. 1 closed
  uniform vec4 eyeBox0, eyeBox1;             // x0 y0 x1 y1, fractions of the picture, y from the top (x1 <= x0: no eye)
  uniform vec3 eyeLash0, eyeLash1;           // the closed lash line's y at the box's left edge, middle, right edge
  #define LASH_BAND 0.0045                   // the band of closed lash line that travels with the edge (~7 px of 1588)
  #define LID_ABOVE 0.0025                   // the edge starts this far above the box (~4 px)
  vec4 lidOver(vec4 c, vec2 uv, vec4 box, vec3 lash) {
    if (box.z <= box.x) return c;
    vec2 q = (uv - box.xy) / (box.zw - box.xy);          // 0..1 inside the box
    float m = 1.0 - smoothstep(0.9, 1.25, length((q - 0.5) * 2.0));
    float top = box.y - LID_ABOVE;
    if (m <= 0.0 || uv.y < top || uv.y > box.w + LID_ABOVE) return c;
    float u = clamp(q.x, 0.0, 1.0);
    float ly = lash.x * 2.0 * (u - 0.5) * (u - 1.0) - lash.y * 4.0 * u * (u - 1.0) + lash.z * 2.0 * u * (u - 0.5);
    float edge = top + blinkT * (ly - top);
    vec4 col = c;
    if (uv.y < edge) col = texture2D(blinkTex, uv);
    if (blinkT > 0.02 && uv.y >= edge - LASH_BAND && uv.y < edge + LASH_BAND / 7.0) col = texture2D(blinkTex, vec2(uv.x, uv.y + ly - edge));
    return mix(c, col, m);
  }
  #endif
  void main(void) {
    vec2 uv = vec2(vUV.x * uRepeat, vUV.y);
    uv.x += drift * 0.03 * sin(time * 0.009 + phase);     // the backdrop sky's clouds travel, too slow to see turn
    if (kind == 3.0) {          // ripple: the water surface wobbles, more toward the bottom (nearer)
      float k = amount * (0.3 + 0.7 * (1.0 - vH));
      uv.x += k * 0.004 * sin(uv.y * 70.0 + time * speed * 2.2 + phase);
      uv.y += k * 0.002 * sin(uv.x * 45.0 / uRepeat + time * speed * 1.6);
    }
    vec4 c = tap(uv);                       // premultiplied
    #ifdef BLINK
    if (blinkT > 0.0) c = lidOver(lidOver(c, uv, eyeBox0, eyeLash0), uv, eyeBox1, eyeLash1);
    #endif
    if (kind == 4.0) c.rgb *= 1.0 + amount * 0.12 * (sin(time * speed * 13.0 + phase) * 0.5 + sin(time * speed * 31.0) * 0.5);
    // the time of day lights everything painted, before the haze: far layers still fade into the sky's own colour.
    // A flame keeps its own light.
    vec3 amb = kind == 4.0 ? vec3(1.0) : ambient;
    c.rgb *= amb;
    // a cloud takes the sky's colours: its light parts the lit top, its washes the shade, its lower edge the underside
    // (warm at dusk and dawn, dark at night). Its ink lines stay as drawn.
    if (tone > 0.0 && c.a > 0.004) {
      vec3 s = c.rgb / c.a;
      float l = lum(s);
      vec3 t = mix(toneShade, toneLight, smoothstep(0.45, 0.95, l));
      t = mix(t, toneUnder, (1.0 - smoothstep(0.05, 0.5, vH)) * smoothstep(0.45, 0.9, l) * 0.85);
      t *= 0.3 + 0.7 * smoothstep(0.15, 0.55, l);
      c.rgb = mix(s, t, tone * (1.0 - inkOf(s))) * c.a;
    }
    if (c.a > 0.004 && (lineFade + lineThin + haze + lineBrown + abs(inkMul - 1.0)) > 0.0) {
      vec3 s = c.rgb / c.a;                            // straight colour
      float ink = inkOf(s);
      // thinner: a line pixel takes its lightest opaque neighbour lineThin px away (an opening of the dark lines);
      // a line pixel next to the air loses its alpha instead, so the silhouette outline thins the same way
      if (lineThin > 0.0 && ink > 0.0) {
        vec3 best = s; float bl = lum(s), edge = 1.0;
        for (int k = 0; k < 4; k++) {
          vec2 d = k == 0 ? vec2(1, 0) : k == 1 ? vec2(-1, 0) : k == 2 ? vec2(0, 1) : vec2(0, -1);
          #ifdef REST
          vec4 n = around(uv, d * pxUV * lineThin);
          #else
          vec4 n = tap(uv + d * pxUV * lineThin);
          #endif
          if (n.a > 0.9) { vec3 ns = n.rgb / n.a * amb; float nl = lum(ns); if (nl > bl) { best = ns; bl = nl; } }
          else edge = min(edge, n.a);
        }
        s = mix(s, best, ink);
        c.a *= mix(1.0, edge, ink);   // the outline against the air thins too: its outer line pixels go
        ink = inkOf(s);
      }
      s = mix(s, clamp(s * inkMul, 0.0, 1.0), ink);                  // one ink value for every layer
      s = lineByDepth(s, ink, lineFade, haze, lineBrown, hazeTint);
      c.rgb = s * c.a;
    }
    if (c.a > 0.004 && paper + grain + patches > 0.0) c.rgb = paperOn(c.rgb / c.a, uv / grainUV, paper, grain, patches, wash, washColour) * c.a;
    vec2 px = uv / grainUV;                              // 1080p px in the picture's own space
    // one light for every picture: the side toward the sun warmer and lighter, the far side cooler, the top a touch up
    if (light > 0.0 && c.a > 0.004) {
      vec3 s = c.rgb / c.a;
      float side = (vUV.x - 0.5) * sunSide;              // -0.5 .. 0.5, + toward the sun
      s *= 1.0 + light * (0.4 * side + 0.08 * (vH - 0.5));
      s = mix(s, s * sunColour, light * max(side, 0.0) * 1.2);
      s = mix(s, s * shadeColour, light * max(-side, 0.0) * 1.2);
      c.rgb = clamp(s, 0.0, 1.0) * c.a;
    }
    // etched shadow: hatching on the side away from the light, hanging off the silhouette and the art's own ink lines
    if (etch > 0.0 && c.a > 0.004) {
      vec2 away = vec2(-sunSide * 0.09, 0.055 * width / max(height, 0.01)) * uvFit;
      float shade = 0.0;
      for (int k = 1; k <= 6; k++) {
        float f = float(k) / 6.0;
        vec4 n = around(uv, away * f);
        float e = max(1.0 - n.a, n.a > 0.1 ? 0.6 * inkOf(n.rgb / n.a) : 0.0);
        shade = max(shade, e * (1.0 - 0.75 * f));
      }
      vec2 h = px / 5.0;
      float t = h.x + h.y + 0.6 * fbm(h * 0.18 + phase);
      float wid = 0.06 + 0.26 * shade;
      float gap = smoothstep(0.62 - 0.6 * shade, 0.7 - 0.6 * shade, fbm(vec2((h.x - h.y) * 0.35, floor(t) * 3.1)));
      float ink = hatched(t, wid, gap, 0.7 * smoothstep(0.1, 0.7, shade));
      c.rgb = mix(c.rgb / c.a, vec3(0.05, 0.045, 0.04), etch * ink * smoothstep(0.1, 0.35, shade)) * c.a;
    }
    // the outline: black inside the silhouette, over the art's own line, on a hard edge (no feather: it stays sharp)
    if (outlineW > 0.0) {
      float air = 0.0;
      for (int k = 0; k < 12; k++) {
        float a = float(k) * 0.5236;
        vec2 d = vec2(cos(a), sin(a)) * pxUV * outlineW;
        air = max(air, 1.0 - around(uv, d).a);
        air = max(air, 1.0 - around(uv, d * 0.5).a);
      }
      float inside = smoothstep(0.35, 0.65, tap(uv).a);
      vec3 s = c.a > 0.004 ? c.rgb / c.a : vec3(0.0);
      c = vec4(s * (1.0 - smoothstep(0.35, 0.65, air)) * inside, inside);
    }
    // grounding: the foot takes the floor's colour along a ragged line, and a few blades of the floor stand in front
    if (grounding + grass > 0.0 && footM > 0.0 && c.a > 0.004) {
      float foot = clamp(footM / max(height, 0.01), 0.03, 0.12);
      float rag = 0.35 * foot * (fbm(vec2(px.x / 9.0, 1.3)) - 0.5);
      float k = 1.0 - smoothstep(0.0, foot, vH + rag);
      c.rgb = mix(c.rgb / c.a, footTint, k * 0.75 * grounding) * c.a;
      float blade = smoothstep(0.4, 0.95, fbm(vec2(px.x / 2.2, 7.0)));
      if (vH < grass * foot * 1.4 * blade) c *= 1.0 - 0.85 * grass;
    }
    // The art's own black contour IS the edge: nothing here may eat into it. A noise rim that broke the cut up and bled
    // outward, and a 6 px feather, wiped the ink line on every picture (Bart 11-12: "this edge is really bad ... the
    // outline is cut out and the edges are not sharp"). What stays is a 1.5 px fade, so the cut is anti-aliased, not a
    // scissor step.
    if (edgeSoft > 0.0 && outlineW <= 0.0) {
      // and it melts into what stands behind it (Bart 11-11: "softer edges, blending into the environment"): the
      // silhouette fades out over a few screen px inside its cut. around(): a cut between two parts is no edge.
      // The feather is a few screen px, but never more than a small share of the picture itself: on a far donkey 25 px
      // tall six px wiped out the whole outline (Bart 11-12: "far away assets are very blurry and edges are gone").
      vec2 reach = min(pxUV * EDGE_FEATHER_PX, vec2(EDGE_FEATHER_MAX_UV)) * edgeSoft;
      float soft = 0.0;
      for (int k = 0; k < 8; k++) {
        float a = float(k) * 0.785398 + 0.39;
        soft += around(uv, vec2(cos(a), sin(a)) * reach).a;
      }
      c *= mix(1.0, smoothstep(0.15, 0.95, soft / 8.0), edgeSoft);
    }
    // the lower edge is painted over into the ground's own colour along a ragged line (not a blur, not see-through:
    // behind a far strip's lower part is sky, not floor), so the far landscape meets the floor without a seam. Opaque
    // even where the painting itself fades out at the bottom (art v3 strips do), else the sky shows through
    if (feather > 0.0) {
      float rag = feather * 0.45 * (fbm(vec2(uv.x * 14.0, 3.7)) - 0.5);
      float k = smoothstep(0.0, feather, vH + rag);
      c = mix(vec4(featherTint, 1.0), c, k);
    }
    // the floor plane ends 1200 m out, a pixel or two short of the horizon: there the sky would show as a pale line
    if (vH < groundLine) c = vec4(featherTint, 1.0);
    if (bottomFade > 0.0) c *= smoothstep(0.0, bottomFade, vH);   // melts into the floor and the band behind: no hard bottom edge
    gl_FragColor = c * opacity;
  }`

// The picture's own shadow on the ground (Bart 11-12: "the position of the sun... casts shadows"): the picture's mesh
// laid down along the light, each point moved away from the sun by its height times the sun's reach, on the ground
// under the picture's foot. One flat wash with a drawn edge (docs/lesson-rules.md: hard shadows, never blurred),
// multiplied over the ground so its paint shows through, darkening a pixel once however many shadows cover it.
Effect.ShadersStore.stageCastVertexShader = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 world, viewProjection;
  uniform float time, kind, amount, speed, phase, height, width;
  uniform vec2 sunGround;                     // the light's direction along the ground, unit length
  uniform float reach, groundY;               // metres of shadow per metre of height, the ground under the foot
  varying vec2 vUV, vG;
  varying float vUp;
  ${MOTION_GLSL}
  void main(void) {
    float h = clamp(position.y / max(height, 0.001), 0.0, 1.0);
    vec4 w = world * vec4(moved(position, h), 1.0);
    // a painted card has no depth: laid down along a sideways light it would be a line. Like a sprite's shadow, its
    // width lies across the light and its height along it, from its feet (with the light toward the camera this is
    // exactly the card's own projection)
    vec3 foot = (world * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec2 across = vec2(-sunGround.y, sunGround.x);
    vec2 g = foot.xz + across * (w.x - foot.x) + sunGround * max(w.y - groundY, 0.0) * reach;
    vUV = uv; vUp = h; vG = g;
    gl_Position = viewProjection * vec4(g.x, groundY + 0.03, g.y, 1.0);
  }`

Effect.ShadersStore.stageCastFragmentShader = `
  #extension GL_OES_standard_derivatives : enable
  precision highp float;
  varying vec2 vUV, vG;
  varying float vUp;
  uniform sampler2D tex;
  uniform vec4 cell;
  uniform float uRepeat, opacity, seed, etch;
  uniform vec3 tint;
  ${GL_NOISE}
  ${HATCH_GLSL}
  vec4 tap(vec2 p) {
    if (cell.z < 1.0 || cell.w < 1.0) return texture2D(tex, cell.xy + clamp(p, 0.0, 1.0) * cell.zw);
    return texture2D(tex, p);
  }
  void main(void) {
    float a = tap(vec2(vUV.x * uRepeat, vUV.y)).a;
    // a drawn edge: the silhouette cut where its alpha passes a line that wanders a little, never a blur
    if (a < 0.5 + 0.25 * (fbm(vG * 1.4 + seed) - 0.5)) discard;
    // one wash, laid unevenly by hand, a touch lighter toward its far end
    float k = opacity * (1.0 - 0.3 * vUp) * (0.85 + 0.3 * fbm(vG * 0.45 + seed));
    vec3 c = mix(vec3(1.0), tint, clamp(k, 0.0, 1.0));
    if (etch > 0.0) {   // etched: the same shadow in ink strokes across the ground
      vec2 q = vG * 9.0;
      float t = q.x + q.y + 0.9 * fbm(q * 0.35 + seed);
      float ink = hatched(t, 0.22, smoothstep(0.3, 0.45, fbm(vec2((q.x - q.y) * 0.5, floor(t) * 3.1 + seed))), 0.5);
      c = mix(c, vec3(0.05, 0.045, 0.04), etch * ink * clamp(opacity * 1.6, 0.0, 1.0));
    }
    gl_FragColor = vec4(c, 1.0);
  }`

/** per Babylon scene (a texture belongs to one engine: the editor and an off-screen thumbnail stage each load their own) */
const textures = new WeakMap<Scene, Map<string, Promise<RawTexture>>>()
/** url -> the colour an image's bottom rows end in (0..1), read while loading: the ground fades into it */
export const edgeColours = new Map<string, [number, number, number]>()
/** Per url: where its land starts (landTop), for set.horizon 'auto'. */
export const landTops = new Map<string, number>()
/** Per url: a ground band's skyline (skylineRow), where its crest is measured from. */
export const skylines = new Map<string, number>()
/** Per url: how dark its ink is (inkLevel), for line normalisation (look.ts inkScale). */
export const inkLevels = new Map<string, number>()
/** Per url: the picture's colour per band of rows (rowBands), for a sky's colour where it meets the floor. */
export const bandColours = new Map<string, ([number, number, number] | null)[]>()

/** The image as a premultiplied RGBA texture with mipmaps (cached per url and scene). */
export function loadPremultiplied(url: string, scene: Scene): Promise<RawTexture> {
  const own = textures.get(scene) ?? new Map<string, Promise<RawTexture>>()
  textures.set(scene, own)
  const hit = own.get(url)
  if (hit) return hit
  const p = new Promise<RawTexture>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onerror = () => reject(new Error(`layer image ${url} did not load`))
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth; c.height = img.naturalHeight
      const g = c.getContext('2d', { willReadFrequently: true })!
      g.drawImage(img, 0, 0)
      const data = g.getImageData(0, 0, c.width, c.height).data
      const edge = bottomColour(data, c.width, c.height)
      if (edge) edgeColours.set(url, edge)
      bandColours.set(url, rowBands(data, c.width, c.height))
      landTops.set(url, landTop(data, c.width, c.height))
      skylines.set(url, skylineRow(data, c.width, c.height))
      const ink = inkLevel(data, c.width, c.height)
      if (ink !== null) inkLevels.set(url, ink)
      resolve(premultipliedTexture(data, c.width, c.height, scene))
    }
    img.src = url
  })
  own.set(url, p)
  p.catch(() => own.delete(url))
  return p
}

function premultipliedTexture(data: Uint8ClampedArray, width: number, height: number, scene: Scene): RawTexture {
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255
    data[i] = Math.round(data[i] * a); data[i + 1] = Math.round(data[i + 1] * a); data[i + 2] = Math.round(data[i + 2] * a)
  }
  // row 0 = the image's top; sampled with v = 0 at the top, so no flip anywhere
  const tex = new RawTexture(data, width, height, Constants.TEXTUREFORMAT_RGBA, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE)
  tex.anisotropicFilteringLevel = 8
  tex.wrapV = Texture.CLAMP_ADDRESSMODE
  return tex
}

/** A picture still being edited, as a texture: nothing about it is kept, it changes with every stroke. Its owner disposes it. */
export function pictureTexture(url: string, scene: Scene): Promise<RawTexture> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onerror = () => reject(new Error('the edited picture did not load'))
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth; c.height = img.naturalHeight
      const g = c.getContext('2d', { willReadFrequently: true })!
      g.drawImage(img, 0, 0)
      resolve(premultipliedTexture(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height, scene))
    }
    img.src = url
  })
}

const ROWS = 24 // enough rows for a smooth sway bend

/** A plane w x h metres whose local origin is the asset's anchor (its ground point). */
function anchoredPlane(name: string, asset: Asset, w: number, h: number, scene: Scene): Mesh {
  const [ax, ay] = asset.anchor ?? [0.5, 1]
  const positions: number[] = [], uvs: number[] = [], indices: number[] = []
  for (let r = 0; r <= ROWS; r++) {
    const v = r / ROWS                                       // image v: 0 top .. 1 bottom
    for (const u of [0, 1]) {
      positions.push((u - ax) * w, (ay - v) * h, 0)
      uvs.push(u, v)
    }
    if (r < ROWS) { const i = r * 2; indices.push(i, i + 2, i + 1, i + 1, i + 2, i + 3) }
  }
  const mesh = new Mesh(name, scene)
  Object.assign(new VertexData(), { positions, uvs, indices }).applyToMesh(mesh)
  return mesh
}

export interface LayerHandle {
  mesh: Mesh
  material: ShaderMaterial
  /** live values: read every frame, so a teacher's edit shows at once */
  setMotion(m: Required<MotionSpec>): void
  setOpacity(o: number): void
  /** share of the height, from the bottom, that fades into the ground */
  setFeather(f: number, tint?: [number, number, number]): void
  /** the paper under this picture (look.ts paperOf) and its grain scale (uv per 1080p px at the house pose) */
  setPaper(p: Paper, grainUV: readonly [number, number]): void
  /** ground bands: the share of the height (from the bottom) whose alpha ramps to 0 */
  setBottomFade(f: number): void
  /** no sticker look: painted edge, grounding (footM 0 = none: not standing), shared light (look.ts aliveOf) */
  setAlive(a: Alive): void
  /** sky only: share of the plane's height, from the bottom, below the eye line (painted as the far floor) */
  setGroundLine(f: number): void
  /** line by depth (look.ts lineOf) and the texture uv per 1080p screen px (look.ts pxUV) */
  setLine(l: { fade: number; thin: number; haze: number; brown: number }, inkMul: number, uvPerPx: readonly [number, number], hazeTint: [number, number, number]): void
  /** the teacher's ink: an outline this many 1080p px inside the edge, and hatching in the shade (0..1) */
  setInk(outline: number, etch: number): void
  /** the drawing's uv as uv of its atlas: a puppet's reach, so its hatching falls where the drawing's would */
  setUvFit(fit: readonly [number, number]): void
  /** Draw the picture as this mesh, then turn its bones. */
  setBent(bent: BentPicture, bones: Record<string, number>): void
  /** A point of the bent drawing (its px) in the world, where setBent put it. */
  worldOf(bent: BentPicture, px: number, py: number): Vector3
  /** the time of day (daylight.ts): the light on the picture, its lit side's and its shaded side's colour */
  setLight(ambient: readonly number[], sun: readonly number[], shade: readonly number[]): void
  /** a cloud: how far it takes the time's cloud colours (0 = as painted) */
  setTone(k: number, t?: { light: readonly number[]; shade: readonly number[]; under: readonly number[] }): void
  /** its shadow on the ground (made with `cast`): the light's direction along the ground (unit), metres of shadow per
   *  metre of height, the ground's height under it, the shadow's colour and strength, its draw slot; null hides it */
  setCast(c: { dir: readonly [number, number]; reach: number; groundY: number; tint: readonly number[]; opacity: number; slot: number; time: number; etch: number } | null): void
  /** an animation: the frame's cell of the sheet, [u0, v0, du, dv] (sprite.ts cellOf) */
  setCell(c: readonly [number, number, number, number]): void
  /** a close-up's lid: 0 open .. 1 closed (no-op on a layer built without a blink) */
  setBlink(t: number): void
}

let seed = 0

/**
 * A figure of parts put back together as it was drawn: every part of the atlas in its place at rest, back to front. The
 * shader reads its air and lines here, so a cut between two parts (the neck under the head) is no edge to outline or
 * hatch, while the real silhouette still is; its corners carry their place in it (restUvs), so the ink travels with
 * each part when the figure moves. Cached per atlas and scene.
 */
export function restDrawing(puppet: Puppet, scene: Scene): Promise<RawTexture> {
  const own = textures.get(scene) ?? new Map<string, Promise<RawTexture>>()
  textures.set(scene, own)
  const key = `rest:${puppet.atlas}`
  const hit = own.get(key)
  if (hit) return hit
  const p = new Promise<RawTexture>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onerror = () => reject(new Error(`atlas ${puppet.atlas} did not load`))
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = puppet.width; c.height = puppet.height
      const g = c.getContext('2d', { willReadFrequently: true })!
      const aw = img.naturalWidth, ah = img.naturalHeight
      for (const { quad: [[x0, y0], , [x1, y1]], uv: [u0, v0, u1, v1] } of puppet.parts) {
        g.drawImage(img, u0 * aw, v0 * ah, (u1 - u0) * aw, (v1 - v0) * ah, x0, y0, x1 - x0, y1 - y0)
      }
      resolve(premultipliedTexture(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height, scene))
    }
    img.src = puppet.atlas
  })
  own.set(key, p)
  p.catch(() => own.delete(key))
  return p
}

/** A close-up's blink for makeLayer: the closed-eye texture and its eyes (blink.ts blinkOf). */
export interface LayerBlink { tex: RawTexture; eyes: BlinkEye[] }

export function makeLayer(asset: Asset, tex: RawTexture, w: number, h: number, uRepeat: number, scene: Scene, rest?: RawTexture, blink?: LayerBlink, opts: { cast?: boolean } = {}): LayerHandle {
  const mesh = anchoredPlane(`layer:${asset.id}`, asset, w, h, scene)
  const mat = new ShaderMaterial(`layer:${asset.id}`, scene, 'stageLayer', {
    attributes: rest ? ['position', 'uv', 'uv2'] : ['position', 'uv'],
    uniforms: ['worldViewProjection', 'time', 'kind', 'amount', 'speed', 'phase', 'height', 'width', 'opacity', 'uRepeat', 'feather', 'featherTint', 'groundLine', 'lineFade', 'lineThin', 'haze', 'lineBrown', 'inkMul', 'pxUV', 'hazeTint', 'paper', 'grain', 'patches', 'wash', 'washColour', 'grainUV', 'bottomFade', 'edgeSoft', 'footM', 'grounding', 'grass', 'light', 'sunSide', 'drift', 'footTint', 'sunColour', 'shadeColour', 'ambient', 'tone', 'toneLight', 'toneShade', 'toneUnder', 'cell', 'outlineW', 'etch', 'uvFit', 'restScale', ...(blink ? ['blinkT', 'eyeBox0', 'eyeBox1', 'eyeLash0', 'eyeLash1'] : [])],
    samplers: [...(rest ? ['tex', 'rest'] : ['tex']), ...(blink ? ['blinkTex'] : [])],
    defines: [...(rest ? ['#define REST'] : []), ...(blink ? ['#define BLINK'] : [])],
    needAlphaBlending: true,
  })
  tex.wrapU = uRepeat !== 1 ? Texture.WRAP_ADDRESSMODE : Texture.CLAMP_ADDRESSMODE
  mat.setTexture('tex', tex)
  if (rest) mat.setTexture('rest', rest)
  if (blink) {
    mat.setTexture('blinkTex', blink.tex).setFloat('blinkT', 0)
    for (const i of [0, 1]) {
      const e = blink.eyes[i]
      mat.setVector4(`eyeBox${i}`, e ? new Vector4(e.x0, e.y0, e.x1, e.y1) : new Vector4(0, 0, 0, 0))
      mat.setVector3(`eyeLash${i}`, e ? Vector3.FromArray(e.lash) : Vector3.Zero())
    }
  }
  mat.alphaMode = Constants.ALPHA_PREMULTIPLIED
  mat.disableDepthWrite = true          // planes never hide each other by depth: draw order (alphaIndex) does that
  mat.backFaceCulling = false
  const phase = (seed++ * 2.39996) % (Math.PI * 2) // golden-angle phases: neighbours never sway in step
  let bentOf: BentPicture | null = null, bentSig = ''
  const top = asset.anchor?.[1] ?? 1
  mat.setFloat('phase', phase).setFloat('height', h * top).setFloat('width', w).setFloat('uRepeat', uRepeat).setFloat('opacity', 1)
  mat.setFloat('kind', 0).setFloat('amount', 1).setFloat('speed', 1).setFloat('time', 0).setFloat('feather', 0)
  mat.setFloat('groundLine', -1).setFloat('lineFade', 0).setFloat('lineThin', 0).setFloat('haze', 0).setFloat('lineBrown', 0).setFloat('inkMul', 1).setFloat('paper', 0).setFloat('grain', 0).setFloat('patches', 0)
  mat.setFloat('edgeSoft', 0).setFloat('bottomFade', 0).setFloat('footM', 0).setFloat('grounding', 0).setFloat('grass', 0).setFloat('light', 0).setFloat('sunSide', 1).setFloat('drift', 0)
  mat.setFloat('outlineW', 0).setFloat('etch', 0).setFloat('tone', 0)
  mat.setVector3('ambient', new Vector3(1, 1, 1)).setVector3('sunColour', Vector3.FromArray(SUN_COLOUR)).setVector3('shadeColour', Vector3.FromArray(SHADE_COLOUR))
  mat.setVector4('cell', new Vector4(0, 0, 1, 1))
  mat.setVector2('uvFit', new Vector2(1, 1))
  mesh.material = mat
  mesh.metadata = { noGBuffer: true, painted: true } // the look draws no ink on its edges: the art has its own
  mesh.isPickable = false
  const cast = opts.cast ? makeCast(mesh, tex, scene, { phase, height: h * top, width: w, uRepeat }) : null
  return {
    mesh, material: mat,
    setMotion: (m) => {
      for (const x of cast ? [mat, cast.mat] : [mat]) x.setFloat('kind', MOTION_CODE[m.kind] ?? 0).setFloat('amount', m.amount).setFloat('speed', m.speed)
    },
    setOpacity: (o) => { mat.setFloat('opacity', o); mesh.isVisible = o > 0.001 },
    setLine: (l, inkMul, uvPerPx, tint) => {
      mat.setFloat('inkMul', inkMul).setFloat('lineFade', l.fade).setFloat('lineThin', l.thin).setFloat('haze', l.haze).setFloat('lineBrown', l.brown)
      mat.setVector2('pxUV', new Vector2(uvPerPx[0], uvPerPx[1])).setVector3('hazeTint', Vector3.FromArray(tint))
    },
    setPaper: (pp, g) => {
      mat.setFloat('paper', pp.paper).setFloat('grain', pp.grain).setFloat('patches', pp.patches).setFloat('wash', pp.wash)
      mat.setVector3('washColour', Vector3.FromArray(pp.washColour)).setVector2('grainUV', new Vector2(g[0], g[1]))
    },
    setBottomFade: (f) => { mat.setFloat('bottomFade', f) },
    setBent: (bent, bones) => {
      const sig = JSON.stringify(bones)
      if (sig === bentSig && bentOf === bent) return
      const [ax, ay] = asset.anchor ?? [0.5, 1]
      const px = bent.bend(bones)
      const positions = new Float32Array((px.length / 2) * 3)
      for (let i = 0; i < px.length / 2; i++) {
        positions[i * 3] = (px[i * 2] / bent.width - ax) * w
        positions[i * 3 + 1] = (ay - px[i * 2 + 1] / bent.height) * h
      }
      if (bentOf === bent) mesh.updateVerticesData(VertexBuffer.PositionKind, positions)
      else {
        Object.assign(new VertexData(), { positions, uvs: bent.uvs, ...(bent.restUvs ? { uvs2: bent.restUvs } : {}), indices: bent.triangles }).applyToMesh(mesh, true)
        bentOf = bent
      }
      mesh.refreshBoundingInfo()
      bentSig = sig
    },
    worldOf: (bent, px, py) => {
      const [ax, ay] = asset.anchor ?? [0.5, 1]
      return Vector3.TransformCoordinates(new Vector3((px / bent.width - ax) * w, (ay - py / bent.height) * h, 0), mesh.getWorldMatrix())
    },
    setInk: (outline, etch) => { mat.setFloat('outlineW', outline).setFloat('etch', etch) },
    setUvFit: (f) => { mat.setVector2('uvFit', new Vector2(f[0], f[1])).setVector2('restScale', new Vector2(1 / f[0], 1 / f[1])) },
    setCell: (c) => { for (const x of cast ? [mat, cast.mat] : [mat]) x.setVector4('cell', new Vector4(c[0], c[1], c[2], c[3])) },
    setBlink: (t) => { if (blink) mat.setFloat('blinkT', t) },
    setCast: (c) => {
      if (!cast) return
      cast.mesh.isVisible = !!c && c.opacity > 0.001 && mesh.isVisible
      if (!c) return
      cast.mesh.alphaIndex = c.slot
      cast.mat.setVector2('sunGround', new Vector2(c.dir[0], c.dir[1])).setFloat('reach', c.reach).setFloat('groundY', c.groundY)
        .setVector3('tint', Vector3.FromArray(c.tint)).setFloat('opacity', c.opacity).setFloat('time', c.time).setFloat('etch', c.etch)
    },
    setAlive: (a) => {
      mat.setFloat('edgeSoft', a.edgeSoft).setFloat('footM', a.footM).setFloat('grounding', a.grounding).setFloat('grass', a.grass)
        .setFloat('light', a.light).setFloat('sunSide', a.sunSide).setFloat('drift', a.drift)
      mat.setVector3('footTint', Vector3.FromArray(a.footTint))
    },
    setLight: (ambient, sun, shade) => {
      mat.setVector3('ambient', Vector3.FromArray(ambient)).setVector3('sunColour', Vector3.FromArray(sun)).setVector3('shadeColour', Vector3.FromArray(shade))
    },
    setTone: (k, t) => {
      mat.setFloat('tone', k)
      if (t) mat.setVector3('toneLight', Vector3.FromArray(t.light)).setVector3('toneShade', Vector3.FromArray(t.shade)).setVector3('toneUnder', Vector3.FromArray(t.under))
    },
    setGroundLine: (f) => { mat.setFloat('groundLine', f) },
    setFeather: (f, tint) => {
      mat.setFloat('feather', Math.max(0, Math.min(1, f)))
      if (tint) mat.setVector3('featherTint', Vector3.FromArray(tint))
    },
  }
}

/** A picture's shadow: a mesh on the picture's own geometry (bones bend it too), a child of the picture so it takes the
 *  picture's place, size and turn, drawn by stageCast. All shadows share one stencil mark, so where two overlap (a
 *  crowd, the parts of one figure) the ground darkens once. */
function makeCast(picture: Mesh, tex: RawTexture, scene: Scene, o: { phase: number; height: number; width: number; uRepeat: number }): { mesh: Mesh; mat: ShaderMaterial } {
  const mesh = new Mesh(`cast:${picture.name}`, scene)
  picture.geometry?.applyToMesh(mesh)
  mesh.parent = picture
  const mat = new ShaderMaterial(mesh.name, scene, 'stageCast', {
    attributes: ['position', 'uv'],
    uniforms: ['world', 'viewProjection', 'time', 'kind', 'amount', 'speed', 'phase', 'height', 'width', 'sunGround', 'reach', 'groundY', 'cell', 'uRepeat', 'opacity', 'seed', 'etch', 'tint'],
    samplers: ['tex'],
    needAlphaBlending: true,
  })
  mat.setTexture('tex', tex)
  mat.alphaMode = Constants.ALPHA_MULTIPLY
  mat.disableDepthWrite = true
  mat.depthFunction = Constants.ALWAYS   // lies on the floor, which writes its depth: the floor never cuts it
  mat.backFaceCulling = false
  mat.stencil.enabled = true
  mat.stencil.func = Constants.NOTEQUAL
  mat.stencil.funcRef = CAST_STENCIL
  mat.stencil.opStencilDepthPass = Constants.REPLACE
  mat.setFloat('phase', o.phase).setFloat('height', o.height).setFloat('width', o.width).setFloat('uRepeat', o.uRepeat)
    .setFloat('kind', 0).setFloat('amount', 1).setFloat('speed', 1).setFloat('time', 0).setFloat('seed', (o.phase * 13.7) % 31)
    .setFloat('opacity', 0).setFloat('etch', 0).setFloat('reach', 1).setFloat('groundY', 0)
  mat.setVector4('cell', new Vector4(0, 0, 1, 1)).setVector2('sunGround', new Vector2(1, 0)).setVector3('tint', new Vector3(0.27, 0.23, 0.18))
  mesh.material = mat
  mesh.metadata = { noGBuffer: true }   // the look draws no ink line around a shadow
  mesh.isPickable = false
  mesh.isVisible = false
  mesh.alwaysSelectAsActiveMesh = true   // laid down in the shader: the upright picture's box is not where it shows
  picture.onDisposeObservable.add(() => mat.dispose())
  return { mesh, mat }
}

/** The stencil value every cast shadow marks the pixels it darkened with. */
const CAST_STENCIL = 1
