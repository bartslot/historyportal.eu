// GLSL for the storybook look. Every texture-like detail is computed from the WORLD position of the
// pixel (rebuilt from the depth buffer), never from screen coordinates: when the camera moves, pigment,
// granulation and paper stay on the walls and the ground instead of sliding over the picture.
/* global BABYLON */
'use strict';

(() => {
  // Shared: rebuild world position from linear depth, and 3D Perlin noise that fades out octaves smaller
  // than a pixel at that distance (so far surfaces get calm washes, not shimmer).
  const WORLD = `
    uniform sampler2D depthSampler;
    uniform sampler2D normalSampler;
    uniform mat4 invView;
    uniform vec2 tanHalf;      // tan(fov/2) for x and y
    uniform vec2 resolution;
    uniform float skyDepth;    // metres used where nothing was drawn

    float depthAt(vec2 uv) { float d = texture2D(depthSampler, uv).r; return d > 0.0 ? d : skyDepth; }
    vec3 worldAt(vec2 uv, float d) {
      vec3 v = vec3((uv * 2.0 - 1.0) * tanHalf * d, d);   // Babylon view space: +z looks forward
      return (invView * vec4(v, 1.0)).xyz;
    }
    float pixelSize(float d) { return d * 2.0 * tanHalf.y / resolution.y; } // metres covered by one pixel

    vec3 hash3(vec3 p) {
      p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }
    float perlin(vec3 p) {                                   // gradient noise, about -0.7..0.7
      vec3 i = floor(p), f = fract(p);
      vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
      return mix(mix(mix(dot(hash3(i), f), dot(hash3(i + vec3(1, 0, 0)), f - vec3(1, 0, 0)), u.x),
                     mix(dot(hash3(i + vec3(0, 1, 0)), f - vec3(0, 1, 0)), dot(hash3(i + vec3(1, 1, 0)), f - vec3(1, 1, 0)), u.x), u.y),
                 mix(mix(dot(hash3(i + vec3(0, 0, 1)), f - vec3(0, 0, 1)), dot(hash3(i + vec3(1, 0, 1)), f - vec3(1, 0, 1)), u.x),
                     mix(dot(hash3(i + vec3(0, 1, 1)), f - vec3(0, 1, 1)), dot(hash3(i + vec3(1, 1, 1)), f - vec3(1, 1, 1)), u.x), u.y), u.z);
    }
    // fbm in world metres; 'scale' = size of the largest feature, 'ps' = pixel size in metres
    float fbm3o(vec3 w, float scale, float ps, float octaves) {
      vec3 p = w / scale;
      float s = 0.0, a = 0.5, f = 1.0, norm = 0.0;
      for (int i = 0; i < 6; i++) {
        if (float(i) >= octaves) break;
        float keep = smoothstep(2.0, 6.0, (scale / f) / ps);  // drop octaves finer than a few pixels
        s += a * keep * perlin(p * f);
        norm += a;
        f *= 2.07; a *= 0.5;
      }
      return s / norm * 2.0;                                   // roughly -1..1
    }
    float fbm3(vec3 w, float scale, float ps) { return fbm3o(w, scale, ps, 6.0); }
    float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
    // the sheet itself: a ragged paper border fixed to the frame (the picture's edge, not a texture on it);
    // 1 = picture, 0 = bare paper
    float paperMask(vec2 uv, float edge) {
      if (edge <= 0.0) return 1.0;
      float aspect = resolution.x / resolution.y;
      float e = min(min(uv.x * aspect, (1.0 - uv.x) * aspect), min(uv.y, 1.0 - uv.y));
      float rag = edge * (0.02 + 0.03 * (0.5 + 0.5 * perlin(vec3(uv * resolution / 14.0, 0.0))));
      return smoothstep(rag, rag + 0.004, e);
    }
    const vec3 PAPER_WHITE = vec3(0.95, 0.94, 0.91);`;

  BABYLON.Effect.ShadersStore.washFragmentShader = `
    precision highp float;
    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform vec2 texel;
    uniform float radius;
    ${WORLD}
    void main(void) {
      vec2 uv = vUV;
      int r = int(radius);
      if (r < 1) { gl_FragColor = texture2D(textureSampler, uv); return; }
      vec3 m0 = vec3(0.0), m1 = vec3(0.0), m2 = vec3(0.0), m3 = vec3(0.0);
      vec3 s0 = vec3(0.0), s1 = vec3(0.0), s2 = vec3(0.0), s3 = vec3(0.0);
      for (int j = -5; j <= 5; j++) {
        for (int i = -5; i <= 5; i++) {
          if (i < -r || i > r || j < -r || j > r) continue;
          vec3 c = texture2D(textureSampler, uv + vec2(float(i), float(j)) * texel).rgb;
          vec3 cc = c * c;
          if (i <= 0 && j <= 0) { m0 += c; s0 += cc; }
          if (i >= 0 && j <= 0) { m1 += c; s1 += cc; }
          if (i <= 0 && j >= 0) { m2 += c; s2 += cc; }
          if (i >= 0 && j >= 0) { m3 += c; s3 += cc; }
        }
      }
      float n = float((r + 1) * (r + 1));
      m0 /= n; m1 /= n; m2 /= n; m3 /= n;
      float v0 = dot(abs(s0 / n - m0 * m0), vec3(1.0));
      float v1 = dot(abs(s1 / n - m1 * m1), vec3(1.0));
      float v2 = dot(abs(s2 / n - m2 * m2), vec3(1.0));
      float v3 = dot(abs(s3 / n - m3 * m3), vec3(1.0));
      vec3 best = m0; float bv = v0;
      if (v1 < bv) { best = m1; bv = v1; }
      if (v2 < bv) { best = m2; bv = v2; }
      if (v3 < bv) { best = m3; bv = v3; }
      gl_FragColor = vec4(best, 1.0);
    }`;

  // Ink runs LAST, over the finished watercolour, so lines stay real black (palette, stains and paper
  // never tint them). Edges inside images are found on the clean wash, not on the textured paint.
  BABYLON.Effect.ShadersStore.inkFragmentShader = `
    precision highp float;
    varying vec2 vUV;
    uniform sampler2D textureSampler;   // finished watercolour
    uniform sampler2D washSampler;      // clean wash, for colour edges
    uniform vec2 texel;
    uniform float ink;
    uniform float width;
    uniform float colorInk;
    uniform float nearDist;
    uniform float farInk;
    uniform float wobble;
    uniform float darkness;             // 1 = true black lines
    uniform float outline;              // silhouette weight relative to inner lines
    uniform float paperEdge;
    uniform float inkOpacity;
    uniform float inkBlend;             // 0 normal, 1 multiply, 2 pencil
    uniform float paintOver;            // 0 = lines keep their own colour, 1 = the wash tints them
    uniform vec3 inkColor;
    ${WORLD}
    float geoEdge(vec2 uv, vec2 o, float d, vec3 nC, out float sil) {
      float crease = 0.0;
      sil = 0.0;
      vec2 offs[4];
      offs[0] = vec2(o.x, 0.0); offs[1] = vec2(-o.x, 0.0); offs[2] = vec2(0.0, o.y); offs[3] = vec2(0.0, -o.y);
      for (int k = 0; k < 4; k++) {
        float dr = texture2D(depthSampler, uv + offs[k]).r;
        float dk = dr > 0.0 ? dr : skyDepth;
        vec3 nk = texture2D(normalSampler, uv + offs[k]).rgb;
        sil = max(sil, smoothstep(0.03, 0.08, abs(dk - d) / min(d, dk)));      // object against what is behind it
        crease = max(crease, smoothstep(0.35, 0.8, length(nk - nC)));          // the surface turns a corner
      }
      return crease;
    }
    void main(void) {
      vec3 col = texture2D(textureSampler, vUV).rgb;
      float d0 = depthAt(vUV);
      vec3 w0 = worldAt(vUV, d0);
      float ps0 = pixelSize(d0);
      // hand-drawn line: the edge is looked for at a point displaced by smooth world noise
      vec2 suv = vUV + vec2(fbm3o(w0, 1.5, ps0, 2.0), fbm3o(w0 + 17.0, 1.5, ps0, 2.0)) * wobble * 3.0 * texel;
      float raw = texture2D(depthSampler, suv).r;
      float d = depthAt(suv);
      float near = raw > 0.0 ? clamp(nearDist / d, 0.0, 1.0) : 0.0;
      vec2 o = texel * mix(0.6, width, near);              // comic-book weight: thinner far away
      vec3 nC = texture2D(normalSampler, suv).rgb;

      float silThin, silWide;
      float crease = geoEdge(suv, o, d, nC, silThin);
      geoEdge(suv, o * outline, d, nC, silWide);            // silhouettes get the heavier pen
      float sil = max(silThin, silWide);

      float tl = lum(texture2D(washSampler, suv + vec2(-o.x,  o.y)).rgb);
      float t  = lum(texture2D(washSampler, suv + vec2( 0.0,  o.y)).rgb);
      float tr = lum(texture2D(washSampler, suv + vec2( o.x,  o.y)).rgb);
      float l  = lum(texture2D(washSampler, suv + vec2(-o.x,  0.0)).rgb);
      float r  = lum(texture2D(washSampler, suv + vec2( o.x,  0.0)).rgb);
      float bl = lum(texture2D(washSampler, suv + vec2(-o.x, -o.y)).rgb);
      float b  = lum(texture2D(washSampler, suv + vec2( 0.0, -o.y)).rgb);
      float br = lum(texture2D(washSampler, suv + vec2( o.x, -o.y)).rgb);
      float sob = smoothstep(0.2, 0.5, length(vec2(-tl - 2.0 * l - bl + tr + 2.0 * r + br, -bl - 2.0 * b - br + tl + 2.0 * t + tr)));

      float pen = 0.85 + 0.15 * fbm3(w0, 0.25, ps0);        // pen pressure along the line
      float strength = ink * mix(farInk, 1.0, near) * pen;
      float hard = clamp(max(sil, crease), 0.0, 1.0) * strength;     // model lines: real black
      float soft = clamp(sob * colorInk, 0.0, 1.0) * strength * 0.6; // lines inside images: lighter
      vec3 ownColor = mix(inkColor, vec3(0.02, 0.02, 0.025), darkness);
      float a = clamp(hard + soft * (1.0 - hard), 0.0, 1.0) * inkOpacity;
      // graphite: greyer, broken up by the paper tooth (world-anchored grain that fades out far away)
      if (inkBlend > 1.5) {
        ownColor = mix(ownColor, vec3(0.30, 0.30, 0.33), 0.45);
        a *= smoothstep(-0.55, 0.25, fbm3(w0 + 41.0, 0.03, ps0));
      }
      vec3 outC;
      if (inkBlend < 0.5) {
        // normal: the line is painted on top; with paint-over it takes a deep version of the wash colour
        outC = mix(col, mix(ownColor, col * 0.28, paintOver), a);
      } else {
        // multiply / pencil: the line darkens what is under it, as graphite does under a watercolour wash;
        // paint-over keeps the hue of the wash in the line instead of neutral grey
        vec3 factor = mix(ownColor, vec3(0.28), paintOver);
        outC = col * mix(vec3(1.0), factor, a);
      }
      gl_FragColor = vec4(mix(PAPER_WHITE, outC, paperMask(vUV, paperEdge)), 1.0); // the border covers the lines too
    }`;

  BABYLON.Effect.ShadersStore.watercolorFragmentShader = `
    precision highp float;
    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform sampler2D aquarelSampler;
    uniform vec2 texel;
    uniform float useTex;
    uniform float texScale;
    uniform float texAmount;
    uniform float blendMode;
    uniform float stains;
    uniform float blooms;
    uniform float dark;
    uniform float wetEdge;
    uniform float granulation;
    uniform float palette;
    uniform float paletteMode;
    uniform float paper;
    uniform float paperEdge;
    ${WORLD}
    vec3 blendWith(vec3 base, vec3 t, float mode) {
      if (mode < 0.5) return base * t;
      if (mode < 1.5) return mix(2.0 * base * t, 1.0 - 2.0 * (1.0 - base) * (1.0 - t), step(0.5, base));
      return mix(2.0 * base * t + base * base * (1.0 - 2.0 * t), sqrt(base) * (2.0 * t - 1.0) + 2.0 * base * (1.0 - t), step(0.5, t));
    }
    vec3 ramp(float l, float mode) {
      vec3 a, b, c;
      if (mode < 1.5) { a = vec3(0.08, 0.12, 0.20); b = vec3(0.23, 0.35, 0.49); c = vec3(0.88, 0.91, 0.93); }
      else { a = vec3(0.18, 0.12, 0.08); b = vec3(0.52, 0.40, 0.28); c = vec3(0.95, 0.91, 0.82); }
      return l < 0.5 ? mix(a, b, smoothstep(0.0, 0.5, l)) : mix(b, c, smoothstep(0.5, 1.0, l));
    }
    // your own texture, projected onto surfaces from three sides in world space (no UVs, no screen)
    vec3 triplanar(vec3 w, vec3 n) {
      vec3 bw = pow(abs(n), vec3(4.0));
      bw /= max(bw.x + bw.y + bw.z, 1e-4);
      return texture2D(aquarelSampler, w.zy / texScale).rgb * bw.x
           + texture2D(aquarelSampler, w.xz / texScale).rgb * bw.y
           + texture2D(aquarelSampler, w.xy / texScale).rgb * bw.z;
    }
    void main(void) {
      vec3 c = texture2D(textureSampler, vUV).rgb;
      float lc = lum(c);
      float d = depthAt(vUV);
      vec3 w = worldAt(vUV, d);
      float ps = pixelSize(d);
      // surface pigment belongs to surfaces: the far sky dome (a painted wash already) gets none of it,
      // otherwise metre-scale noise shrinks to speckles 500 m away
      float surf = 1.0 - smoothstep(150.0, 320.0, d);

      // wet edges: pigment pools at the rim of a wash (an image-space edge effect; it follows edges, not the frame)
      float lb = 0.0;
      for (int k = 0; k < 8; k++) {
        float a = float(k) * 0.785398;
        lb += lum(texture2D(textureSampler, vUV + vec2(cos(a), sin(a)) * texel * 5.0).rgb);
      }
      lb /= 8.0;
      // only real colour edges pool pigment; small noise-level differences must not draw lines
      c *= 1.0 - wetEdge * 0.4 * smoothstep(0.05, 0.18, lb - lc);

      // pigment stains: big, smooth, and mostly LIGHTER (paper showing through a thinner wash),
      // only 3 octaves so a wash never looks dirty or mottled
      float sn = fbm3o(w, 6.0, ps, 3.0);
      vec3 paperC = vec3(0.96, 0.95, 0.92);
      c = mix(c, paperC, surf * stains * 0.22 * max(sn, 0.0));
      c *= 1.0 - surf * stains * 0.08 * max(-sn, 0.0);

      // blooms: soft, very large lighter patches where the wash ran wetter. No rims: contour rims of noise
      // draw vein-like lines across every surface.
      float bn = fbm3o(w + 31.0, 14.0, ps, 2.0);
      c = mix(c, paperC, surf * blooms * 0.18 * smoothstep(0.15, 0.6, bn));

      // dark pigment: where the wash went on thicker, the same hue goes deeper and a little richer.
      // A soft ramp over the noise (no threshold line), so it reads as pooled pigment, not a stain.
      float dn = fbm3o(w + 53.0, 4.0, ps, 3.0);
      float pool = smoothstep(0.05, 0.55, -dn);
      vec3 deeper = mix(vec3(lum(c)), c, 1.3) * 0.68;
      c = mix(c, clamp(deeper, 0.0, 1.0), surf * dark * 0.65 * pool);

      // granulation: fine pigment grain, only in darker washes, small amplitude
      c *= 1.0 + surf * granulation * 0.18 * fbm3(w + 7.0, 0.12, ps) * (1.0 - lc);

      // paper fibre, faint
      c *= 1.0 + paper * 0.05 * fbm3(w + 3.0, 0.035, ps);

      // optional aquarelle texture (your scan or a ChatGPT image), triplanar in world space
      if (useTex > 0.5) {
        vec3 nV = texture2D(normalSampler, vUV).rgb;
        vec3 nW = normalize((invView * vec4(nV, 0.0)).xyz + vec3(1e-4));
        vec3 t = triplanar(w, nW);
        vec3 tb = blendMode < 0.5 ? t : clamp(t - 0.40, 0.0, 1.0);
        c = mix(c, blendWith(c, tb, blendMode), texAmount);
      }

      if (paletteMode > 0.5) c = mix(c, ramp(lum(c), paletteMode), palette);

      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`;
})();
