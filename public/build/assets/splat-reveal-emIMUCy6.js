import{l as r}from"./babylon-ClnPoGlu.js";import{W as l}from"./engine-DO1YNny1.js";import"./vite-helpers-DqutJMZx.js";import"./puppet-sheet-B0KaX9MG.js";import"./load-image-DngxJD_v.js";import"./water-BMfY3xTc.js";import"./scene-animation-DKjZRutc.js";import"./easing-HS2C6-zA.js";import"./config-DwQUN7uY.js";import"./stage-handle-Ckz2xOyo.js";import"./ambient-CnaWjG1w.js";import"./projection-CL24asTn.js";const a=`
{
  float t = revealT;
  vec3 p = splat.center.xyz;
  float l = length(p.xz) * revealUnit;
  float tt = t * t * .4 + .5;
  p.xz *= min(1., .3 + max(0., tt * .05));
  worldPos = splatWorld * vec4(p, 1.0);
  float k = max(clamp(tt - 7. - l * 2.5, 0., 1.), .2 * clamp(tt - 1. - l * 2., 0., 1.));
  covA *= k * k;
  covB *= k * k;
  vColor = mix(vec4(.3), vColor, clamp(tt - l * 2.5 - 3., 0., 1.));
}
`,i=`
{
  vec3 c = vColor.rgb;
  vec3 g = mix(vec3(dot(c, vec3(.299, .587, .114))), c, .75);
  g = mix(g, g * washColour, .35);
  g = floor(g * 6. + .5) / 6.;
  float far = smoothstep(2.4, 4.5, length(splat.center.xz) * revealUnit);
  g = mix(g, washColour, far * .85);
  vColor.rgb = mix(c, g, paintK);
}
`;class S extends r{constructor(t,o=1){super(t,"SplatReveal",300),this.time=0,this.unit=o,this.paint=1,this._enable(!0)}getClassName(){return"SplatRevealPlugin"}isCompatible(t){return t===0}getUniforms(){return{externalUniforms:["revealT","revealUnit","paintK","washColour"]}}bindForSubMesh(t,o,m,e){e.effect?.setFloat("revealT",this.time),e.effect?.setFloat("revealUnit",this.unit),e.effect?.setFloat("paintK",this.paint),e.effect?.setFloat3("washColour",...l)}getCustomCode(t){return t!=="vertex"?null:{CUSTOM_VERTEX_DEFINITIONS:`uniform float revealT;
uniform float revealUnit;
uniform float paintK;
uniform vec3 washColour;`,CUSTOM_VERTEX_UPDATE:a+i}}}export{S as SplatRevealPlugin};
