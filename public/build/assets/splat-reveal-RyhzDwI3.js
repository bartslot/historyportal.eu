import{k as a}from"./babylon-OtcCI6ux.js";import"./vite-helpers-DqutJMZx.js";const r=`
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
`;class m extends a{constructor(t,e=1){super(t,"SplatReveal",300),this.time=0,this.unit=e,this._enable(!0)}getClassName(){return"SplatRevealPlugin"}isCompatible(t){return t===0}getUniforms(){return{externalUniforms:["revealT","revealUnit"]}}bindForSubMesh(t,e,n,l){l.effect?.setFloat("revealT",this.time),l.effect?.setFloat("revealUnit",this.unit)}getCustomCode(t){return t!=="vertex"?null:{CUSTOM_VERTEX_DEFINITIONS:`uniform float revealT;
uniform float revealUnit;`,CUSTOM_VERTEX_UPDATE:r}}}export{m as SplatRevealPlugin};
