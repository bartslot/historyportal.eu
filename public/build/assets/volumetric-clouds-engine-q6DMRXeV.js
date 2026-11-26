import{Uniform as d,WebGLRenderTarget as rt,LinearMipmapLinearFilter as $o,UnsignedByteType as Ye,Vector2 as k,SRGBColorSpace as Qe,DepthTexture as Jr,DepthStencilFormat as Xo,UnsignedInt248Type as Zo,FloatType as mt,LinearFilter as Te,BasicDepthPacking as br,EventDispatcher as Lr,LinearSRGBColorSpace as Ke,NoColorSpace as Li,NearestFilter as xr,Scene as fi,OrthographicCamera as qo,Mesh as Ko,Color as Mi,BackSide as dr,DoubleSide as mr,ShaderMaterial as ar,FrontSide as Qo,NoBlending as Mr,REVISION as Pi,PerspectiveCamera as ga,Material as Pt,Texture as wr,AlwaysDepth as Jo,BufferGeometry as es,BufferAttribute as xn,Loader as Et,Data3DTexture as et,FileLoader as Sa,RedFormat as St,RepeatWrapping as Er,Vector3 as D,Matrix4 as W,DataTextureLoader as ts,HalfFloatType as Ve,RGBAFormat as vt,RGFormat as Vt,DataUtils as wn,MathUtils as He,WebGLRenderer as _a,DataTexture as vi,ByteType as rs,ShortType as is,UnsignedShortType as ns,IntType as as,UnsignedIntType as os,RawShaderMaterial as Pr,Camera as Ui,GLSL3 as Ut,Matrix3 as ss,Object3D as yn,Box3 as cs,Vector4 as Re,WebGLArrayRenderTarget as ls,NoToneMapping as us,ExternalTexture as hs,OneMinusSrcAlphaFactor as Rn,OneFactor as An,AddEquation as ds,CustomBlending as ms}from"./three.module-CpB-wl7P.js";import{u as pr}from"./fflate.module-lXf-65b9.js";import{E as Nt}from"./border-sweep-U-9KZvb-.js";import{b as ps,C as fs,c as vs,a as ei,s as gs,d as Ss,S as _s,E as Es,e as Ts}from"./index-93jXXxCB.js";import"./map-chart-Clb3w5-k.js";import"./i18n-DoByrmTl.js";import"./easing-HS2C6-zA.js";import"./vite-helpers-DqutJMZx.js";import"./tuner-CTMYYJl-.js";var xs=(()=>{const t=new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),e=new Float32Array([0,0,2,0,0,2]),r=new es;return r.setAttribute("position",new xn(t,3)),r.setAttribute("uv",new xn(e,2)),r})(),Le=class gi{static get fullscreenGeometry(){return xs}constructor(e="Pass",r=new fi,i=new qo){this.name=e,this.renderer=null,this.scene=r,this.camera=i,this.screen=null,this.rtt=!0,this.needsSwap=!0,this.needsDepthBlit=!1,this.needsDepthTexture=!1,this.enabled=!0}get renderToScreen(){return!this.rtt}set renderToScreen(e){if(this.rtt===e){const r=this.fullscreenMaterial;r!==null&&(r.needsUpdate=!0),this.rtt=!e}}set mainScene(e){}set mainCamera(e){}setRenderer(e){this.renderer=e}isEnabled(){return this.enabled}setEnabled(e){this.enabled=e}get fullscreenMaterial(){return this.screen!==null?this.screen.material:null}set fullscreenMaterial(e){let r=this.screen;r!==null?r.material=e:(r=new Ko(gi.fullscreenGeometry,e),r.frustumCulled=!1,this.scene===null&&(this.scene=new fi),this.scene.add(r),this.screen=r)}getFullscreenMaterial(){return this.fullscreenMaterial}setFullscreenMaterial(e){this.fullscreenMaterial=e}getDepthTexture(){return null}setDepthTexture(e,r=br){}render(e,r,i,n,o){throw new Error("Render method not implemented!")}setSize(e,r){}initialize(e,r,i){}dispose(){for(const e of Object.keys(this)){const r=this[e];(r instanceof rt||r instanceof Pt||r instanceof wr||r instanceof gi)&&this[e].dispose()}this.fullscreenMaterial!==null&&this.fullscreenMaterial.dispose()}},ws=class extends Le{constructor(){super("ClearMaskPass",null,null),this.needsSwap=!1}render(t,e,r,i,n){const o=t.state.buffers.stencil;o.setLocked(!1),o.setTest(!1)}},ys=`#ifdef COLOR_WRITE
#include <common>
#include <dithering_pars_fragment>
#ifdef FRAMEBUFFER_PRECISION_HIGH
uniform mediump sampler2D inputBuffer;
#else
uniform lowp sampler2D inputBuffer;
#endif
#endif
#ifdef DEPTH_WRITE
#include <packing>
#ifdef GL_FRAGMENT_PRECISION_HIGH
uniform highp sampler2D depthBuffer;
#else
uniform mediump sampler2D depthBuffer;
#endif
float readDepth(const in vec2 uv){
#if DEPTH_PACKING == 3201
return unpackRGBAToDepth(texture2D(depthBuffer,uv));
#else
return texture2D(depthBuffer,uv).r;
#endif
}
#endif
#ifdef USE_WEIGHTS
uniform vec4 channelWeights;
#endif
uniform float opacity;varying vec2 vUv;void main(){
#ifdef COLOR_WRITE
vec4 texel=texture2D(inputBuffer,vUv);
#ifdef USE_WEIGHTS
texel*=channelWeights;
#endif
gl_FragColor=opacity*texel;
#ifdef COLOR_SPACE_CONVERSION
#include <colorspace_fragment>
#endif
#include <dithering_fragment>
#else
gl_FragColor=vec4(0.0);
#endif
#ifdef DEPTH_WRITE
gl_FragDepth=readDepth(vUv);
#endif
}`,Hi="varying vec2 vUv;void main(){vUv=position.xy*0.5+0.5;gl_Position=vec4(position.xy,1.0,1.0);}",Rs=class extends ar{constructor(){super({name:"CopyMaterial",defines:{COLOR_SPACE_CONVERSION:"1",DEPTH_PACKING:"0",COLOR_WRITE:"1"},uniforms:{inputBuffer:new d(null),depthBuffer:new d(null),channelWeights:new d(null),opacity:new d(1)},blending:Mr,toneMapped:!1,depthWrite:!1,depthTest:!1,fragmentShader:ys,vertexShader:Hi}),this.depthFunc=Jo}get inputBuffer(){return this.uniforms.inputBuffer.value}set inputBuffer(t){const e=t!==null;this.colorWrite!==e&&(e?this.defines.COLOR_WRITE=!0:delete this.defines.COLOR_WRITE,this.colorWrite=e,this.needsUpdate=!0),this.uniforms.inputBuffer.value=t}get depthBuffer(){return this.uniforms.depthBuffer.value}set depthBuffer(t){const e=t!==null;this.depthWrite!==e&&(e?this.defines.DEPTH_WRITE=!0:delete this.defines.DEPTH_WRITE,this.depthTest=e,this.depthWrite=e,this.needsUpdate=!0),this.uniforms.depthBuffer.value=t}set depthPacking(t){this.defines.DEPTH_PACKING=t.toFixed(0),this.needsUpdate=!0}get colorSpaceConversion(){return this.defines.COLOR_SPACE_CONVERSION!==void 0}set colorSpaceConversion(t){this.colorSpaceConversion!==t&&(t?this.defines.COLOR_SPACE_CONVERSION=!0:delete this.defines.COLOR_SPACE_CONVERSION,this.needsUpdate=!0)}get channelWeights(){return this.uniforms.channelWeights.value}set channelWeights(t){t!==null?(this.defines.USE_WEIGHTS="1",this.uniforms.channelWeights.value=t):delete this.defines.USE_WEIGHTS,this.needsUpdate=!0}setInputBuffer(t){this.uniforms.inputBuffer.value=t}getOpacity(t){return this.uniforms.opacity.value}setOpacity(t){this.uniforms.opacity.value=t}},Ea=class extends Le{constructor(t,e=!0){super("CopyPass"),this.fullscreenMaterial=new Rs,this.needsSwap=!1,this.renderTarget=t,t===void 0&&(this.renderTarget=new rt(1,1,{minFilter:Te,magFilter:Te,stencilBuffer:!1,depthBuffer:!1}),this.renderTarget.texture.name="CopyPass.Target"),this.autoResize=e}get resize(){return this.autoResize}set resize(t){this.autoResize=t}get texture(){return this.renderTarget.texture}getTexture(){return this.renderTarget.texture}setAutoResizeEnabled(t){this.autoResize=t}render(t,e,r,i,n){this.fullscreenMaterial.inputBuffer=e.texture,t.setRenderTarget(this.renderToScreen?null:this.renderTarget),t.render(this.scene,this.camera)}setSize(t,e){this.autoResize&&this.renderTarget.setSize(t,e)}initialize(t,e,r){r!==void 0&&(this.renderTarget.texture.type=r,r!==Ye?this.fullscreenMaterial.defines.FRAMEBUFFER_PRECISION_HIGH="1":t!==null&&t.outputColorSpace===Qe&&(this.renderTarget.texture.colorSpace=Qe))}},Cn=new Mi,Ta=class extends Le{constructor(t=!0,e=!0,r=!1){super("ClearPass",null,null),this.needsSwap=!1,this.color=t,this.depth=e,this.stencil=r,this.overrideClearColor=null,this.overrideClearAlpha=-1}setClearFlags(t,e,r){this.color=t,this.depth=e,this.stencil=r}getOverrideClearColor(){return this.overrideClearColor}setOverrideClearColor(t){this.overrideClearColor=t}getOverrideClearAlpha(){return this.overrideClearAlpha}setOverrideClearAlpha(t){this.overrideClearAlpha=t}render(t,e,r,i,n){const o=this.overrideClearColor,s=this.overrideClearAlpha,l=t.getClearAlpha(),h=o!==null,f=s>=0;h?(t.getClearColor(Cn),t.setClearColor(o,f?s:l)):f&&t.setClearAlpha(s),t.setRenderTarget(this.renderToScreen?null:e),t.clear(this.color,this.depth,this.stencil),h?t.setClearColor(Cn,l):f&&t.setClearAlpha(l)}},As=class extends Le{constructor(t,e){super("MaskPass",t,e),this.needsSwap=!1,this.clearPass=new Ta(!1,!1,!0),this.inverse=!1}set mainScene(t){this.scene=t}set mainCamera(t){this.camera=t}get inverted(){return this.inverse}set inverted(t){this.inverse=t}get clear(){return this.clearPass.enabled}set clear(t){this.clearPass.enabled=t}getClearPass(){return this.clearPass}isInverted(){return this.inverted}setInverted(t){this.inverted=t}render(t,e,r,i,n){const o=t.getContext(),s=t.state.buffers,l=this.scene,h=this.camera,f=this.clearPass,g=this.inverted?0:1,y=1-g;s.color.setMask(!1),s.depth.setMask(!1),s.color.setLocked(!0),s.depth.setLocked(!0),s.stencil.setTest(!0),s.stencil.setOp(o.REPLACE,o.REPLACE,o.REPLACE),s.stencil.setFunc(o.ALWAYS,g,4294967295),s.stencil.setClear(y),s.stencil.setLocked(!0),this.clearPass.enabled&&(this.renderToScreen?f.render(t,null):(f.render(t,e),f.render(t,r))),this.renderToScreen?(t.setRenderTarget(null),t.render(l,h)):(t.setRenderTarget(e),t.render(l,h),t.setRenderTarget(r),t.render(l,h)),s.color.setLocked(!1),s.depth.setLocked(!1),s.stencil.setLocked(!1),s.stencil.setFunc(o.EQUAL,1,4294967295),s.stencil.setOp(o.KEEP,o.KEEP,o.KEEP),s.stencil.setLocked(!0)}};function Cs(t,e){const r=t.getContext();if(e<=0||typeof r.renderbufferStorageMultisample!="function")return 0;const i=r.getParameter(r.MAX_SAMPLES),n=Math.min(e,i);if(n<=0)return 0;const o=r.getParameter(r.RENDERBUFFER_BINDING),s=r.createRenderbuffer();try{return r.bindRenderbuffer(r.RENDERBUFFER,s),r.renderbufferStorageMultisample(r.RENDERBUFFER,n,r.RGBA8,1,1),n}catch{return 0}finally{r.bindRenderbuffer(r.RENDERBUFFER,o),r.deleteRenderbuffer(s)}}var ti=1/1e3,Is=1e3,Ds=class{constructor(){this.startTime=performance.now(),this.previousTime=0,this.currentTime=0,this._delta=0,this._elapsed=0,this._fixedDelta=1e3/60,this.timescale=1,this.useFixedDelta=!1,this._autoReset=!1}get autoReset(){return this._autoReset}set autoReset(t){typeof document<"u"&&document.hidden!==void 0&&(t?document.addEventListener("visibilitychange",this):document.removeEventListener("visibilitychange",this),this._autoReset=t)}get delta(){return this._delta*ti}get fixedDelta(){return this._fixedDelta*ti}set fixedDelta(t){this._fixedDelta=t*Is}get elapsed(){return this._elapsed*ti}update(t){this.useFixedDelta?this._delta=this.fixedDelta:(this.previousTime=this.currentTime,this.currentTime=(t!==void 0?t:performance.now())-this.startTime,this._delta=this.currentTime-this.previousTime),this._delta*=this.timescale,this._elapsed+=this._delta}reset(){this._delta=0,this._elapsed=0,this.currentTime=performance.now()-this.startTime}getDelta(){return this.delta}getElapsed(){return this.elapsed}handleEvent(t){document.hidden||(this.currentTime=performance.now()-this.startTime)}dispose(){this.autoReset=!1}},Ns=class{constructor(t=null,{depthBuffer:e=!0,stencilBuffer:r=!1,multisampling:i=0,frameBufferType:n=Ye}={}){this.renderer=null,this.inputBuffer=this.createBuffer(e,r,n,i),this.outputBuffer=this.inputBuffer.clone(),this.copyPass=new Ea,this.depthRenderTarget=null,this.passes=[],this.timer=new Ds,this.autoRenderToScreen=!0,this.setRenderer(t)}get stableDepthTexture(){return this.depthRenderTarget===null?null:this.depthRenderTarget.depthTexture}get multisampling(){return this.inputBuffer.samples}set multisampling(t){const e=this.renderer===null?t:Cs(this.renderer,t);this.multisampling!==e&&(this.inputBuffer.samples=e,this.outputBuffer.samples=e,this.inputBuffer.dispose(),this.outputBuffer.dispose())}getTimer(){return this.timer}getRenderer(){return this.renderer}setRenderer(t){if(this.renderer=t,t!==null){const e=t.getSize(new k),r=t.getContext().getContextAttributes().alpha,i=this.inputBuffer.texture.type;i===Ye&&t.outputColorSpace===Qe&&(this.inputBuffer.texture.colorSpace=Qe,this.outputBuffer.texture.colorSpace=Qe,this.inputBuffer.dispose(),this.outputBuffer.dispose());const n=this.multisampling;this.multisampling=n,t.autoClear=!1,this.setSize(e.width,e.height);for(const o of this.passes)o.initialize(t,r,i)}}replaceRenderer(t,e=!0){const r=this.renderer,i=r.domElement.parentNode;return this.setRenderer(t),e&&i!==null&&(i.removeChild(r.domElement),i.appendChild(t.domElement)),r}createDepthTexture(){const t=new Jr;t.name="EffectComposer.InputDepth",this.inputBuffer.stencilBuffer?(t.format=Xo,t.type=Zo):t.type=mt;const e=new Jr;e.format=t.format,e.type=t.type,e.name="EffectComposer.OutputDepth";const r=new Jr;r.format=t.format,r.type=t.type,r.name="EffectComposer.StableDepth",this.inputBuffer.depthTexture=t,this.outputBuffer.depthTexture=e,this.inputBuffer.dispose(),this.outputBuffer.dispose();const{width:i,height:n}=this.inputBuffer;this.depthRenderTarget=new rt(i,n,{depthBuffer:!0,stencilBuffer:this.inputBuffer.stencilBuffer,depthTexture:r})}blitDepthBuffer(t){const e=this.renderer,r=this.depthRenderTarget,i=e.properties,n=e.getContext();e.setRenderTarget(r);const o=i.get(t).__webglFramebuffer,s=i.get(r).__webglFramebuffer,l=t.stencilBuffer?n.DEPTH_BUFFER_BIT|n.STENCIL_BUFFER_BIT:n.DEPTH_BUFFER_BIT;n.bindFramebuffer(n.READ_FRAMEBUFFER,o),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,s),n.blitFramebuffer(0,0,t.width,t.height,0,0,r.width,r.height,l,n.NEAREST),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),e.setRenderTarget(null)}deleteDepthTexture(){const t=this.stableDepthTexture;for(const e of this.passes)e.getDepthTexture()===t&&e.setDepthTexture(null);this.depthRenderTarget!==null&&(this.depthRenderTarget.dispose(),this.depthRenderTarget=null),this.inputBuffer.depthTexture!==null&&(this.inputBuffer.depthTexture.dispose(),this.inputBuffer.depthTexture=null),this.outputBuffer.depthTexture!==null&&(this.outputBuffer.depthTexture.dispose(),this.outputBuffer.depthTexture=null)}createBuffer(t,e,r,i){const n=this.renderer,o=n===null?new k:n.getDrawingBufferSize(new k),s=new rt(o.width,o.height,{minFilter:Te,magFilter:Te,samples:i,stencilBuffer:e,depthBuffer:t,type:r});return r===Ye&&n!==null&&n.outputColorSpace===Qe&&(s.texture.colorSpace=Qe),s.texture.name="EffectComposer.Buffer",s.texture.generateMipmaps=!1,s}setMainScene(t){for(const e of this.passes)e.mainScene=t}setMainCamera(t){for(const e of this.passes)e.mainCamera=t}addPass(t,e){const r=this.passes,i=this.renderer,n=i.getDrawingBufferSize(new k),o=i.getContext().getContextAttributes().alpha,s=this.inputBuffer.texture.type;if(t.renderer=i,t.setSize(n.width,n.height),t.initialize(i,o,s),this.autoRenderToScreen&&(r.length>0&&(r[r.length-1].renderToScreen=!1),t.renderToScreen&&(this.autoRenderToScreen=!1)),e!==void 0?r.splice(e,0,t):r.push(t),this.autoRenderToScreen&&(r[r.length-1].renderToScreen=!0),t.needsDepthTexture||this.depthRenderTarget!==null)if(this.depthRenderTarget===null){this.createDepthTexture();for(const l of r)l.setDepthTexture(this.stableDepthTexture)}else t.setDepthTexture(this.stableDepthTexture)}removePass(t){const e=this.passes,r=e.indexOf(t);if(r!==-1&&e.splice(r,1).length>0){const o=this.stableDepthTexture;if(o!==null){const s=(h,f)=>h||f.needsDepthTexture;e.reduce(s,!1)||(t.getDepthTexture()===o&&t.setDepthTexture(null),this.deleteDepthTexture())}this.autoRenderToScreen&&r===e.length&&(t.renderToScreen=!1,e.length>0&&(e[e.length-1].renderToScreen=!0))}}removeAllPasses(){const t=this.passes;this.deleteDepthTexture(),t.length>0&&(this.autoRenderToScreen&&(t[t.length-1].renderToScreen=!1),this.passes=[])}render(t){const e=this.renderer,r=this.copyPass;let i=this.inputBuffer,n=this.outputBuffer,o,s=!1;t===void 0&&(this.timer.update(),t=this.timer.getDelta());for(const l of this.passes)if(l.enabled){if(l.render(e,i,n,t,s),l.needsDepthBlit&&this.depthRenderTarget!==null&&this.blitDepthBuffer(i),l.needsSwap){if(s){r.renderToScreen=l.renderToScreen;const h=e.getContext(),f=e.state.buffers.stencil;f.setFunc(h.NOTEQUAL,1,4294967295),r.render(e,i,n,t,s),f.setFunc(h.EQUAL,1,4294967295)}o=i,i=n,n=o}l instanceof As?s=!0:l instanceof ws&&(s=!1)}}setSize(t,e,r){const i=this.renderer,n=i.getSize(new k);(t===void 0||e===void 0)&&(t=n.width,e=n.height),(n.width!==t||n.height!==e)&&i.setSize(t,e,r);const o=i.getDrawingBufferSize(new k);this.inputBuffer.setSize(o.width,o.height),this.outputBuffer.setSize(o.width,o.height),this.depthRenderTarget!==null&&this.depthRenderTarget.setSize(o.width,o.height);for(const s of this.passes)s.setSize(o.width,o.height)}reset(){this.dispose(),this.autoRenderToScreen=!0}dispose(){for(const t of this.passes)t.dispose();this.deleteDepthTexture(),this.inputBuffer.dispose(),this.outputBuffer.dispose(),this.copyPass.dispose(),this.timer.dispose(),this.passes=[],Le.fullscreenGeometry.dispose()}},tt={NONE:0,DEPTH:1,CONVOLUTION:2},$={FRAGMENT_HEAD:"FRAGMENT_HEAD",FRAGMENT_MAIN_UV:"FRAGMENT_MAIN_UV",FRAGMENT_MAIN_IMAGE:"FRAGMENT_MAIN_IMAGE",VERTEX_HEAD:"VERTEX_HEAD",VERTEX_MAIN_SUPPORT:"VERTEX_MAIN_SUPPORT"},Os=class{constructor(){this.shaderParts=new Map([[$.FRAGMENT_HEAD,null],[$.FRAGMENT_MAIN_UV,null],[$.FRAGMENT_MAIN_IMAGE,null],[$.VERTEX_HEAD,null],[$.VERTEX_MAIN_SUPPORT,null]]),this.defines=new Map,this.uniforms=new Map,this.blendModes=new Map,this.extensions=new Set,this.attributes=tt.NONE,this.varyings=new Set,this.uvTransformation=!1,this.readDepth=!1,this.colorSpace=Ke}},ri=!1,In=class{constructor(t=null){this.originalMaterials=new Map,this.material=null,this.materials=null,this.materialsBackSide=null,this.materialsDoubleSide=null,this.materialsFlatShaded=null,this.materialsFlatShadedBackSide=null,this.materialsFlatShadedDoubleSide=null,this.setMaterial(t),this.meshCount=0,this.replaceMaterial=e=>{if(e.isMesh){let r;if(e.material.flatShading)switch(e.material.side){case mr:r=this.materialsFlatShadedDoubleSide;break;case dr:r=this.materialsFlatShadedBackSide;break;default:r=this.materialsFlatShaded;break}else switch(e.material.side){case mr:r=this.materialsDoubleSide;break;case dr:r=this.materialsBackSide;break;default:r=this.materials;break}this.originalMaterials.set(e,e.material),e.isSkinnedMesh?e.material=r[2]:e.isInstancedMesh?e.material=r[1]:e.material=r[0],++this.meshCount}}}cloneMaterial(t){if(!(t instanceof ar))return t.clone();const e=t.uniforms,r=new Map;for(const n in e){const o=e[n].value;o.isRenderTargetTexture&&(e[n].value=null,r.set(n,o))}const i=t.clone();for(const n of r)e[n[0]].value=n[1],i.uniforms[n[0]].value=n[1];return i}setMaterial(t){if(this.disposeMaterials(),this.material=t,t!==null){const e=this.materials=[this.cloneMaterial(t),this.cloneMaterial(t),this.cloneMaterial(t)];for(const r of e)r.uniforms=Object.assign({},t.uniforms),r.side=Qo;e[2].skinning=!0,this.materialsBackSide=e.map(r=>{const i=this.cloneMaterial(r);return i.uniforms=Object.assign({},t.uniforms),i.side=dr,i}),this.materialsDoubleSide=e.map(r=>{const i=this.cloneMaterial(r);return i.uniforms=Object.assign({},t.uniforms),i.side=mr,i}),this.materialsFlatShaded=e.map(r=>{const i=this.cloneMaterial(r);return i.uniforms=Object.assign({},t.uniforms),i.flatShading=!0,i}),this.materialsFlatShadedBackSide=e.map(r=>{const i=this.cloneMaterial(r);return i.uniforms=Object.assign({},t.uniforms),i.flatShading=!0,i.side=dr,i}),this.materialsFlatShadedDoubleSide=e.map(r=>{const i=this.cloneMaterial(r);return i.uniforms=Object.assign({},t.uniforms),i.flatShading=!0,i.side=mr,i})}}render(t,e,r){const i=t.shadowMap.enabled;if(t.shadowMap.enabled=!1,ri){const n=this.originalMaterials;this.meshCount=0,e.traverse(this.replaceMaterial),t.render(e,r);for(const o of n)o[0].material=o[1];this.meshCount!==n.size&&n.clear()}else{const n=e.overrideMaterial;e.overrideMaterial=this.material,t.render(e,r),e.overrideMaterial=n}t.shadowMap.enabled=i}disposeMaterials(){if(this.material!==null){const t=this.materials.concat(this.materialsBackSide).concat(this.materialsDoubleSide).concat(this.materialsFlatShaded).concat(this.materialsFlatShadedBackSide).concat(this.materialsFlatShadedDoubleSide);for(const e of t)e.dispose()}}dispose(){this.originalMaterials.clear(),this.disposeMaterials()}static get workaroundEnabled(){return ri}static set workaroundEnabled(t){ri=t}},ut=-1,Ot=class extends Lr{constructor(t=null,e=ut,r=ut,i=1){super(),t!==null&&this.addEventListener("change",()=>t.setSize(this.baseSize.width,this.baseSize.height)),this.baseSize=new k(1,1),this.preferredSize=new k(e,r),this.target=this.preferredSize,this.s=i,this.effectiveSize=new k,this.addEventListener("change",()=>this.updateEffectiveSize()),this.updateEffectiveSize()}updateEffectiveSize(){const t=this.baseSize,e=this.preferredSize,r=this.effectiveSize,i=this.scale;e.width!==ut?r.width=e.width:e.height!==ut?r.width=Math.round(e.height*(t.width/Math.max(t.height,1))):r.width=Math.round(t.width*i),e.height!==ut?r.height=e.height:e.width!==ut?r.height=Math.round(e.width/Math.max(t.width/Math.max(t.height,1),1)):r.height=Math.round(t.height*i)}get width(){return this.effectiveSize.width}set width(t){this.preferredWidth=t}get height(){return this.effectiveSize.height}set height(t){this.preferredHeight=t}getWidth(){return this.width}getHeight(){return this.height}get scale(){return this.s}set scale(t){this.s!==t&&(this.s=t,this.preferredSize.setScalar(ut),this.dispatchEvent({type:"change"}))}getScale(){return this.scale}setScale(t){this.scale=t}get baseWidth(){return this.baseSize.width}set baseWidth(t){this.baseSize.width!==t&&(this.baseSize.width=t,this.dispatchEvent({type:"change"}))}getBaseWidth(){return this.baseWidth}setBaseWidth(t){this.baseWidth=t}get baseHeight(){return this.baseSize.height}set baseHeight(t){this.baseSize.height!==t&&(this.baseSize.height=t,this.dispatchEvent({type:"change"}))}getBaseHeight(){return this.baseHeight}setBaseHeight(t){this.baseHeight=t}setBaseSize(t,e){(this.baseSize.width!==t||this.baseSize.height!==e)&&(this.baseSize.set(t,e),this.dispatchEvent({type:"change"}))}get preferredWidth(){return this.preferredSize.width}set preferredWidth(t){this.preferredSize.width!==t&&(this.preferredSize.width=t,this.dispatchEvent({type:"change"}))}getPreferredWidth(){return this.preferredWidth}setPreferredWidth(t){this.preferredWidth=t}get preferredHeight(){return this.preferredSize.height}set preferredHeight(t){this.preferredSize.height!==t&&(this.preferredSize.height=t,this.dispatchEvent({type:"change"}))}getPreferredHeight(){return this.preferredHeight}setPreferredHeight(t){this.preferredHeight=t}setPreferredSize(t,e){(this.preferredSize.width!==t||this.preferredSize.height!==e)&&(this.preferredSize.set(t,e),this.dispatchEvent({type:"change"}))}copy(t){this.s=t.scale,this.baseSize.set(t.baseWidth,t.baseHeight),this.preferredSize.set(t.preferredWidth,t.preferredHeight),this.dispatchEvent({type:"change"})}static get AUTO_SIZE(){return ut}},z={ADD:0,ALPHA:1,AVERAGE:2,COLOR:3,COLOR_BURN:4,COLOR_DODGE:5,DARKEN:6,DIFFERENCE:7,DIVIDE:8,DST:9,EXCLUSION:10,HARD_LIGHT:11,HARD_MIX:12,HUE:13,INVERT:14,INVERT_RGB:15,LIGHTEN:16,LINEAR_BURN:17,LINEAR_DODGE:18,LINEAR_LIGHT:19,LUMINOSITY:20,MULTIPLY:21,NEGATION:22,NORMAL:23,OVERLAY:24,PIN_LIGHT:25,REFLECT:26,SATURATION:27,SCREEN:28,SOFT_LIGHT:29,SRC:30,SUBTRACT:31,VIVID_LIGHT:32},bs="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=dst.rgb+src.rgb;return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Ls="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){return mix(dst,src,src.a*opacity);}",Ms="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=(dst.rgb+src.rgb)*0.5;return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Ps="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 a=RGBToHSL(dst.rgb);vec3 b=RGBToHSL(src.rgb);vec3 c=HSLToRGB(vec3(b.xy,a.z));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Us="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 a=dst.rgb,b=src.rgb;vec3 c=mix(step(0.0,b)*(1.0-min(vec3(1.0),(1.0-a)/max(b,1e-9))),vec3(1.0),step(1.0,a));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Hs="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 a=dst.rgb,b=src.rgb;vec3 c=step(0.0,a)*mix(min(vec3(1.0),a/max(1.0-b,1e-9)),vec3(1.0),step(1.0,b));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Fs="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=min(dst.rgb,src.rgb);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Gs="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=abs(dst.rgb-src.rgb);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Bs="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=dst.rgb/max(src.rgb,1e-9);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",zs="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=dst.rgb+src.rgb-2.0*dst.rgb*src.rgb;return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Ws="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 a=min(dst.rgb,1.0);vec3 b=min(src.rgb,1.0);vec3 c=mix(2.0*a*b,1.0-2.0*(1.0-a)*(1.0-b),step(0.5,b));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",ks="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=step(1.0,dst.rgb+src.rgb);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Vs="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 a=RGBToHSL(dst.rgb);vec3 b=RGBToHSL(src.rgb);vec3 c=HSLToRGB(vec3(b.x,a.yz));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Ys="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=max(1.0-src.rgb,0.0);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",js="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=src.rgb*max(1.0-dst.rgb,0.0);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",$s="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=max(dst.rgb,src.rgb);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Xs="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=clamp(src.rgb+dst.rgb-1.0,0.0,1.0);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Zs="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=min(dst.rgb+src.rgb,1.0);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",qs="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=clamp(2.0*src.rgb+dst.rgb-1.0,0.0,1.0);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Ks="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 a=RGBToHSL(dst.rgb);vec3 b=RGBToHSL(src.rgb);vec3 c=HSLToRGB(vec3(a.xy,b.z));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Qs="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=dst.rgb*src.rgb;return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Js="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=max(1.0-abs(1.0-dst.rgb-src.rgb),0.0);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",ec="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){return mix(dst,src,opacity);}",tc="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 a=2.0*src.rgb*dst.rgb;vec3 b=1.0-2.0*(1.0-src.rgb)*(1.0-dst.rgb);vec3 c=mix(a,b,step(0.5,dst.rgb));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",rc="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 src2=2.0*src.rgb;vec3 c=mix(mix(src2,dst.rgb,step(0.5*dst.rgb,src.rgb)),max(src2-1.0,vec3(0.0)),step(dst.rgb,src2-1.0));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",ic="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 a=min(dst.rgb*dst.rgb/max(1.0-src.rgb,1e-9),1.0);vec3 c=mix(a,src.rgb,step(1.0,src.rgb));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",nc="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 a=RGBToHSL(dst.rgb);vec3 b=RGBToHSL(src.rgb);vec3 c=HSLToRGB(vec3(a.x,b.y,a.z));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",ac="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=dst.rgb+src.rgb-min(dst.rgb*src.rgb,1.0);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",oc="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 src2=2.0*src.rgb;vec3 d=dst.rgb+(src2-1.0);vec3 w=step(0.5,src.rgb);vec3 a=dst.rgb-(1.0-src2)*dst.rgb*(1.0-dst.rgb);vec3 b=mix(d*(sqrt(dst.rgb)-dst.rgb),d*dst.rgb*((16.0*dst.rgb-12.0)*dst.rgb+3.0),w*(1.0-step(0.25,dst.rgb)));vec3 c=mix(a,b,w);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",sc="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){return src;}",cc="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=max(dst.rgb-src.rgb,0.0);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",lc="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=mix(max(1.0-min((1.0-dst.rgb)/(2.0*src.rgb),1.0),0.0),min(dst.rgb/(2.0*(1.0-src.rgb)),1.0),step(0.5,src.rgb));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",uc=new Map([[z.ADD,bs],[z.ALPHA,Ls],[z.AVERAGE,Ms],[z.COLOR,Ps],[z.COLOR_BURN,Us],[z.COLOR_DODGE,Hs],[z.DARKEN,Fs],[z.DIFFERENCE,Gs],[z.DIVIDE,Bs],[z.DST,null],[z.EXCLUSION,zs],[z.HARD_LIGHT,Ws],[z.HARD_MIX,ks],[z.HUE,Vs],[z.INVERT,Ys],[z.INVERT_RGB,js],[z.LIGHTEN,$s],[z.LINEAR_BURN,Xs],[z.LINEAR_DODGE,Zs],[z.LINEAR_LIGHT,qs],[z.LUMINOSITY,Ks],[z.MULTIPLY,Qs],[z.NEGATION,Js],[z.NORMAL,ec],[z.OVERLAY,tc],[z.PIN_LIGHT,rc],[z.REFLECT,ic],[z.SATURATION,nc],[z.SCREEN,ac],[z.SOFT_LIGHT,oc],[z.SRC,sc],[z.SUBTRACT,cc],[z.VIVID_LIGHT,lc]]),hc=class extends Lr{constructor(t,e=1){super(),this._blendFunction=t,this.opacity=new d(e)}getOpacity(){return this.opacity.value}setOpacity(t){this.opacity.value=t}get blendFunction(){return this._blendFunction}set blendFunction(t){this._blendFunction=t,this.dispatchEvent({type:"change"})}getBlendFunction(){return this.blendFunction}setBlendFunction(t){this.blendFunction=t}getShaderCode(){return uc.get(this.blendFunction)}},tr=class extends Lr{constructor(t,e,{attributes:r=tt.NONE,blendFunction:i=z.NORMAL,defines:n=new Map,uniforms:o=new Map,extensions:s=null,vertexShader:l=null}={}){super(),this.name=t,this.renderer=null,this.attributes=r,this.fragmentShader=e,this.vertexShader=l,this.defines=n,this.uniforms=o,this.extensions=s,this.blendMode=new hc(i),this.blendMode.addEventListener("change",h=>this.setChanged()),this._inputColorSpace=Ke,this._outputColorSpace=Li}get inputColorSpace(){return this._inputColorSpace}set inputColorSpace(t){this._inputColorSpace=t,this.setChanged()}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t,this.setChanged()}set mainScene(t){}set mainCamera(t){}getName(){return this.name}setRenderer(t){this.renderer=t}getDefines(){return this.defines}getUniforms(){return this.uniforms}getExtensions(){return this.extensions}getBlendMode(){return this.blendMode}getAttributes(){return this.attributes}setAttributes(t){this.attributes=t,this.setChanged()}getFragmentShader(){return this.fragmentShader}setFragmentShader(t){this.fragmentShader=t,this.setChanged()}getVertexShader(){return this.vertexShader}setVertexShader(t){this.vertexShader=t,this.setChanged()}setChanged(){this.dispatchEvent({type:"change"})}setDepthTexture(t,e=br){}update(t,e,r){}setSize(t,e){}initialize(t,e,r){}dispose(){for(const t of Object.keys(this)){const e=this[t];(e instanceof rt||e instanceof Pt||e instanceof wr||e instanceof Le)&&this[t].dispose()}}},dc=`#include <common>
#ifdef FRAMEBUFFER_PRECISION_HIGH
uniform mediump sampler2D inputBuffer;
#else
uniform lowp sampler2D inputBuffer;
#endif
#ifdef RANGE
uniform vec2 range;
#elif defined(THRESHOLD)
uniform float threshold;uniform float smoothing;
#endif
varying vec2 vUv;void main(){vec4 texel=texture2D(inputBuffer,vUv);float l=luminance(texel.rgb);float mask=1.0;
#ifdef RANGE
float low=step(range.x,l);float high=step(l,range.y);mask=low*high;
#elif defined(THRESHOLD)
mask=smoothstep(threshold,threshold+smoothing,l);
#endif
#ifdef COLOR
gl_FragColor=texel*mask;
#else
gl_FragColor=vec4(l*mask);
#endif
}`,mc=class extends ar{constructor(t=!1,e=null){super({name:"LuminanceMaterial",defines:{THREE_REVISION:Pi.replace(/\D+/g,"")},uniforms:{inputBuffer:new d(null),threshold:new d(0),smoothing:new d(1),range:new d(null)},blending:Mr,toneMapped:!1,depthWrite:!1,depthTest:!1,fragmentShader:dc,vertexShader:Hi}),this.colorOutput=t,this.luminanceRange=e}set inputBuffer(t){this.uniforms.inputBuffer.value=t}setInputBuffer(t){this.uniforms.inputBuffer.value=t}get threshold(){return this.uniforms.threshold.value}set threshold(t){this.smoothing>0||t>0?this.defines.THRESHOLD="1":delete this.defines.THRESHOLD,this.uniforms.threshold.value=t}getThreshold(){return this.threshold}setThreshold(t){this.threshold=t}get smoothing(){return this.uniforms.smoothing.value}set smoothing(t){this.threshold>0||t>0?this.defines.THRESHOLD="1":delete this.defines.THRESHOLD,this.uniforms.smoothing.value=t}getSmoothingFactor(){return this.smoothing}setSmoothingFactor(t){this.smoothing=t}get useThreshold(){return this.threshold>0||this.smoothing>0}set useThreshold(t){}get colorOutput(){return this.defines.COLOR!==void 0}set colorOutput(t){t?this.defines.COLOR="1":delete this.defines.COLOR,this.needsUpdate=!0}isColorOutputEnabled(t){return this.colorOutput}setColorOutputEnabled(t){this.colorOutput=t}get useRange(){return this.luminanceRange!==null}set useRange(t){this.luminanceRange=null}get luminanceRange(){return this.uniforms.range.value}set luminanceRange(t){t!==null?this.defines.RANGE="1":delete this.defines.RANGE,this.uniforms.range.value=t,this.needsUpdate=!0}getLuminanceRange(){return this.luminanceRange}setLuminanceRange(t){this.luminanceRange=t}},pc=class extends Le{constructor({renderTarget:t,luminanceRange:e,colorOutput:r,resolutionScale:i=1,width:n=Ot.AUTO_SIZE,height:o=Ot.AUTO_SIZE,resolutionX:s=n,resolutionY:l=o}={}){super("LuminancePass"),this.fullscreenMaterial=new mc(r,e),this.needsSwap=!1,this.renderTarget=t,this.renderTarget===void 0&&(this.renderTarget=new rt(1,1,{depthBuffer:!1}),this.renderTarget.texture.name="LuminancePass.Target");const h=this.resolution=new Ot(this,s,l,i);h.addEventListener("change",f=>this.setSize(h.baseWidth,h.baseHeight))}get texture(){return this.renderTarget.texture}getTexture(){return this.renderTarget.texture}getResolution(){return this.resolution}render(t,e,r,i,n){const o=this.fullscreenMaterial;o.inputBuffer=e.texture,t.setRenderTarget(this.renderToScreen?null:this.renderTarget),t.render(this.scene,this.camera)}setSize(t,e){const r=this.resolution;r.setBaseSize(t,e),this.renderTarget.setSize(r.width,r.height)}initialize(t,e,r){r!==void 0&&r!==Ye&&(this.renderTarget.texture.type=r,this.fullscreenMaterial.defines.FRAMEBUFFER_PRECISION_HIGH="1")}},Si=class extends Le{constructor(t,e="inputBuffer"){super("ShaderPass"),this.fullscreenMaterial=t,this.input=e}setInput(t){this.input=t}render(t,e,r,i,n){const o=this.fullscreenMaterial.uniforms;e!==null&&o!==void 0&&o[this.input]!==void 0&&(o[this.input].value=e.texture),t.setRenderTarget(this.renderToScreen?null:r),t.render(this.scene,this.camera)}initialize(t,e,r){r!==void 0&&r!==Ye&&(this.fullscreenMaterial.defines.FRAMEBUFFER_PRECISION_HIGH="1")}},fc=class extends Le{constructor(t,e,r=null){super("RenderPass",t,e),this.needsSwap=!1,this.needsDepthBlit=!0,this.clearPass=new Ta,this.overrideMaterialManager=r===null?null:new In(r),this.ignoreBackground=!1,this.skipShadowMapUpdate=!1,this.selection=null}set mainScene(t){this.scene=t}set mainCamera(t){this.camera=t}get renderToScreen(){return super.renderToScreen}set renderToScreen(t){super.renderToScreen=t,this.clearPass.renderToScreen=t}get overrideMaterial(){const t=this.overrideMaterialManager;return t!==null?t.material:null}set overrideMaterial(t){const e=this.overrideMaterialManager;t!==null?e!==null?e.setMaterial(t):this.overrideMaterialManager=new In(t):e!==null&&(e.dispose(),this.overrideMaterialManager=null)}getOverrideMaterial(){return this.overrideMaterial}setOverrideMaterial(t){this.overrideMaterial=t}get clear(){return this.clearPass.enabled}set clear(t){this.clearPass.enabled=t}getSelection(){return this.selection}setSelection(t){this.selection=t}isBackgroundDisabled(){return this.ignoreBackground}setBackgroundDisabled(t){this.ignoreBackground=t}isShadowMapDisabled(){return this.skipShadowMapUpdate}setShadowMapDisabled(t){this.skipShadowMapUpdate=t}getClearPass(){return this.clearPass}render(t,e,r,i,n){const o=this.scene,s=this.camera,l=this.selection,h=s.layers.mask,f=o.background,g=t.shadowMap.autoUpdate,y=this.renderToScreen?null:e;l!==null&&s.layers.set(l.getLayer()),this.skipShadowMapUpdate&&(t.shadowMap.autoUpdate=!1),(this.ignoreBackground||this.clearPass.overrideClearColor!==null)&&(o.background=null),this.clearPass.enabled&&this.clearPass.render(t,e),t.setRenderTarget(y),this.overrideMaterialManager!==null?this.overrideMaterialManager.render(t,o,s):t.render(o,s),s.layers.mask=h,o.background=f,t.shadowMap.autoUpdate=g}},he={LINEAR:0,REINHARD:1,REINHARD2:2,REINHARD2_ADAPTIVE:3,OPTIMIZED_CINEON:5,CINEON:5,ACES_FILMIC:6,AGX:7,NEUTRAL:8},vc=`#include <packing>
#define packFloatToRGBA(v) packDepthToRGBA(v)
#define unpackRGBAToFloat(v) unpackRGBAToDepth(v)
uniform lowp sampler2D luminanceBuffer0;uniform lowp sampler2D luminanceBuffer1;uniform float minLuminance;uniform float deltaTime;uniform float tau;varying vec2 vUv;void main(){float l0=unpackRGBAToFloat(texture2D(luminanceBuffer0,vUv));
#if __VERSION__ < 300
float l1=texture2DLodEXT(luminanceBuffer1,vUv,MIP_LEVEL_1X1).r;
#else
float l1=textureLod(luminanceBuffer1,vUv,MIP_LEVEL_1X1).r;
#endif
l0=max(minLuminance,l0);l1=max(minLuminance,l1);float adaptedLum=l0+(l1-l0)*(1.0-exp(-deltaTime*tau));gl_FragColor=(adaptedLum==1.0)?vec4(1.0):packFloatToRGBA(adaptedLum);}`,gc=class extends ar{constructor(){super({name:"AdaptiveLuminanceMaterial",defines:{MIP_LEVEL_1X1:"0.0"},uniforms:{luminanceBuffer0:new d(null),luminanceBuffer1:new d(null),minLuminance:new d(.01),deltaTime:new d(0),tau:new d(1)},extensions:{shaderTextureLOD:!0},blending:Mr,toneMapped:!1,depthWrite:!1,depthTest:!1,fragmentShader:vc,vertexShader:Hi})}set luminanceBuffer0(t){this.uniforms.luminanceBuffer0.value=t}setLuminanceBuffer0(t){this.uniforms.luminanceBuffer0.value=t}set luminanceBuffer1(t){this.uniforms.luminanceBuffer1.value=t}setLuminanceBuffer1(t){this.uniforms.luminanceBuffer1.value=t}set mipLevel1x1(t){this.defines.MIP_LEVEL_1X1=t.toFixed(1),this.needsUpdate=!0}setMipLevel1x1(t){this.mipLevel1x1=t}set deltaTime(t){this.uniforms.deltaTime.value=t}setDeltaTime(t){this.uniforms.deltaTime.value=t}get minLuminance(){return this.uniforms.minLuminance.value}set minLuminance(t){this.uniforms.minLuminance.value=t}getMinLuminance(){return this.uniforms.minLuminance.value}setMinLuminance(t){this.uniforms.minLuminance.value=t}get adaptationRate(){return this.uniforms.tau.value}set adaptationRate(t){this.uniforms.tau.value=t}getAdaptationRate(){return this.uniforms.tau.value}setAdaptationRate(t){this.uniforms.tau.value=t}},Sc=class extends Le{constructor(t,{minLuminance:e=.01,adaptationRate:r=1}={}){super("AdaptiveLuminancePass"),this.fullscreenMaterial=new gc,this.needsSwap=!1,this.renderTargetPrevious=new rt(1,1,{minFilter:xr,magFilter:xr,depthBuffer:!1}),this.renderTargetPrevious.texture.name="Luminance.Previous";const i=this.fullscreenMaterial;i.luminanceBuffer0=this.renderTargetPrevious.texture,i.luminanceBuffer1=t,i.minLuminance=e,i.adaptationRate=r,this.renderTargetAdapted=this.renderTargetPrevious.clone(),this.renderTargetAdapted.texture.name="Luminance.Adapted",this.copyPass=new Ea(this.renderTargetPrevious,!1)}get texture(){return this.renderTargetAdapted.texture}getTexture(){return this.renderTargetAdapted.texture}set mipLevel1x1(t){this.fullscreenMaterial.mipLevel1x1=t}get adaptationRate(){return this.fullscreenMaterial.adaptationRate}set adaptationRate(t){this.fullscreenMaterial.adaptationRate=t}render(t,e,r,i,n){this.fullscreenMaterial.deltaTime=i,t.setRenderTarget(this.renderToScreen?null:this.renderTargetAdapted),t.render(this.scene,this.camera),this.copyPass.render(t,this.renderTargetAdapted)}},_c=`#include <tonemapping_pars_fragment>
uniform float whitePoint;
#if TONE_MAPPING_MODE == 2 || TONE_MAPPING_MODE == 3
uniform float middleGrey;
#if TONE_MAPPING_MODE == 3
uniform lowp sampler2D luminanceBuffer;
#else
uniform float averageLuminance;
#endif
vec3 Reinhard2ToneMapping(vec3 color){color*=toneMappingExposure;float l=luminance(color);
#if TONE_MAPPING_MODE == 3
float lumAvg=unpackRGBAToFloat(texture2D(luminanceBuffer,vec2(0.5)));
#else
float lumAvg=averageLuminance;
#endif
float lumScaled=(l*middleGrey)/max(lumAvg,1e-6);float lumCompressed=lumScaled*(1.0+lumScaled/(whitePoint*whitePoint));lumCompressed/=(1.0+lumScaled);return clamp(lumCompressed*color,0.0,1.0);}
#elif TONE_MAPPING_MODE == 4
#define A 0.15
#define B 0.50
#define C 0.10
#define D 0.20
#define E 0.02
#define F 0.30
vec3 Uncharted2Helper(const in vec3 x){return((x*(A*x+C*B)+D*E)/(x*(A*x+B)+D*F))-E/F;}vec3 Uncharted2ToneMapping(vec3 color){color*=toneMappingExposure;return clamp(Uncharted2Helper(color)/Uncharted2Helper(vec3(whitePoint)),0.0,1.0);}
#endif
void mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor){
#if TONE_MAPPING_MODE == 2 || TONE_MAPPING_MODE == 3
outputColor=vec4(Reinhard2ToneMapping(inputColor.rgb),inputColor.a);
#elif TONE_MAPPING_MODE == 4
outputColor=vec4(Uncharted2ToneMapping(inputColor.rgb),inputColor.a);
#else
outputColor=vec4(toneMapping(inputColor.rgb),inputColor.a);
#endif
}`,Ec=class extends tr{constructor({blendFunction:t=z.SRC,adaptive:e=!1,mode:r=e?he.REINHARD2_ADAPTIVE:he.AGX,resolution:i=256,maxLuminance:n=4,whitePoint:o=n,middleGrey:s=.6,minLuminance:l=.01,averageLuminance:h=1,adaptationRate:f=1}={}){super("ToneMappingEffect",_c,{blendFunction:t,uniforms:new Map([["luminanceBuffer",new d(null)],["maxLuminance",new d(n)],["whitePoint",new d(o)],["middleGrey",new d(s)],["averageLuminance",new d(h)]])}),this.renderTargetLuminance=new rt(1,1,{minFilter:$o,depthBuffer:!1}),this.renderTargetLuminance.texture.generateMipmaps=!0,this.renderTargetLuminance.texture.name="Luminance",this.luminancePass=new pc({renderTarget:this.renderTargetLuminance}),this.adaptiveLuminancePass=new Sc(this.luminancePass.texture,{minLuminance:l,adaptationRate:f}),this.uniforms.get("luminanceBuffer").value=this.adaptiveLuminancePass.texture,this.resolution=i,this.mode=r}get mode(){return Number(this.defines.get("TONE_MAPPING_MODE"))}set mode(t){if(this.mode===t)return;const r=Pi.replace(/\D+/g,"")>=168?"CineonToneMapping(texel)":"OptimizedCineonToneMapping(texel)";switch(this.defines.clear(),this.defines.set("TONE_MAPPING_MODE",t.toFixed(0)),t){case he.LINEAR:this.defines.set("toneMapping(texel)","LinearToneMapping(texel)");break;case he.REINHARD:this.defines.set("toneMapping(texel)","ReinhardToneMapping(texel)");break;case he.CINEON:case he.OPTIMIZED_CINEON:this.defines.set("toneMapping(texel)",r);break;case he.ACES_FILMIC:this.defines.set("toneMapping(texel)","ACESFilmicToneMapping(texel)");break;case he.AGX:this.defines.set("toneMapping(texel)","AgXToneMapping(texel)");break;case he.NEUTRAL:this.defines.set("toneMapping(texel)","NeutralToneMapping(texel)");break;default:this.defines.set("toneMapping(texel)","texel");break}this.adaptiveLuminancePass.enabled=t===he.REINHARD2_ADAPTIVE,this.setChanged()}getMode(){return this.mode}setMode(t){this.mode=t}get whitePoint(){return this.uniforms.get("whitePoint").value}set whitePoint(t){this.uniforms.get("whitePoint").value=t}get middleGrey(){return this.uniforms.get("middleGrey").value}set middleGrey(t){this.uniforms.get("middleGrey").value=t}get averageLuminance(){return this.uniforms.get("averageLuminance").value}set averageLuminance(t){this.uniforms.get("averageLuminance").value=t}get adaptiveLuminanceMaterial(){return this.adaptiveLuminancePass.fullscreenMaterial}getAdaptiveLuminanceMaterial(){return this.adaptiveLuminanceMaterial}get resolution(){return this.luminancePass.resolution.width}set resolution(t){const e=Math.max(0,Math.ceil(Math.log2(t))),r=Math.pow(2,e);this.luminancePass.resolution.setPreferredSize(r,r),this.adaptiveLuminanceMaterial.mipLevel1x1=e}getResolution(){return this.resolution}setResolution(t){this.resolution=t}get adaptive(){return this.mode===he.REINHARD2_ADAPTIVE}set adaptive(t){this.mode=t?he.REINHARD2_ADAPTIVE:he.REINHARD2}get adaptationRate(){return this.adaptiveLuminanceMaterial.adaptationRate}set adaptationRate(t){this.adaptiveLuminanceMaterial.adaptationRate=t}get distinction(){return console.warn(this.name,"distinction was removed."),1}set distinction(t){console.warn(this.name,"distinction was removed.")}update(t,e,r){this.adaptiveLuminancePass.enabled&&(this.luminancePass.render(t,e),this.adaptiveLuminancePass.render(t,null,null,r))}initialize(t,e,r){this.adaptiveLuminancePass.initialize(t,e,r)}},Tc=`#include <common>
#include <packing>
#include <dithering_pars_fragment>
#define packFloatToRGBA(v) packDepthToRGBA(v)
#define unpackRGBAToFloat(v) unpackRGBAToDepth(v)
#ifdef FRAMEBUFFER_PRECISION_HIGH
uniform mediump sampler2D inputBuffer;
#else
uniform lowp sampler2D inputBuffer;
#endif
#if DEPTH_PACKING == 3201
uniform lowp sampler2D depthBuffer;
#elif defined(GL_FRAGMENT_PRECISION_HIGH)
uniform highp sampler2D depthBuffer;
#else
uniform mediump sampler2D depthBuffer;
#endif
uniform vec2 resolution;uniform vec2 texelSize;uniform float cameraNear;uniform float cameraFar;uniform float aspect;uniform float time;varying vec2 vUv;vec4 sRGBToLinear(const in vec4 value){return vec4(mix(pow(value.rgb*0.9478672986+vec3(0.0521327014),vec3(2.4)),value.rgb*0.0773993808,vec3(lessThanEqual(value.rgb,vec3(0.04045)))),value.a);}float readDepth(const in vec2 uv){
#if DEPTH_PACKING == 3201
float depth=unpackRGBAToDepth(texture2D(depthBuffer,uv));
#else
float depth=texture2D(depthBuffer,uv).r;
#endif
#if defined(USE_LOGARITHMIC_DEPTH_BUFFER) || defined(LOG_DEPTH)
float d=pow(2.0,depth*log2(cameraFar+1.0))-1.0;float a=cameraFar/(cameraFar-cameraNear);float b=cameraFar*cameraNear/(cameraNear-cameraFar);depth=a+b/d;
#elif defined(USE_REVERSED_DEPTH_BUFFER)
depth=1.0-depth;
#endif
return depth;}float getViewZ(const in float depth){
#ifdef PERSPECTIVE_CAMERA
return perspectiveDepthToViewZ(depth,cameraNear,cameraFar);
#else
return orthographicDepthToViewZ(depth,cameraNear,cameraFar);
#endif
}vec3 RGBToHCV(const in vec3 RGB){vec4 P=mix(vec4(RGB.bg,-1.0,2.0/3.0),vec4(RGB.gb,0.0,-1.0/3.0),step(RGB.b,RGB.g));vec4 Q=mix(vec4(P.xyw,RGB.r),vec4(RGB.r,P.yzx),step(P.x,RGB.r));float C=Q.x-min(Q.w,Q.y);float H=abs((Q.w-Q.y)/(6.0*C+EPSILON)+Q.z);return vec3(H,C,Q.x);}vec3 RGBToHSL(const in vec3 RGB){vec3 HCV=RGBToHCV(RGB);float L=HCV.z-HCV.y*0.5;float S=HCV.y/(1.0-abs(L*2.0-1.0)+EPSILON);return vec3(HCV.x,S,L);}vec3 HueToRGB(const in float H){float R=abs(H*6.0-3.0)-1.0;float G=2.0-abs(H*6.0-2.0);float B=2.0-abs(H*6.0-4.0);return clamp(vec3(R,G,B),0.0,1.0);}vec3 HSLToRGB(const in vec3 HSL){vec3 RGB=HueToRGB(HSL.x);float C=(1.0-abs(2.0*HSL.z-1.0))*HSL.y;return(RGB-0.5)*C+HSL.z;}FRAGMENT_HEAD void main(){FRAGMENT_MAIN_UV vec4 color0=texture2D(inputBuffer,UV);vec4 color1=vec4(0.0);FRAGMENT_MAIN_IMAGE color0.a=clamp(color0.a,0.0,1.0);gl_FragColor=color0;
#ifdef ENCODE_OUTPUT
#include <colorspace_fragment>
#endif
#include <dithering_fragment>
}`,xc="uniform vec2 resolution;uniform vec2 texelSize;uniform float cameraNear;uniform float cameraFar;uniform float aspect;uniform float time;varying vec2 vUv;VERTEX_HEAD void main(){vUv=position.xy*0.5+0.5;VERTEX_MAIN_SUPPORT gl_Position=vec4(position.xy,1.0,1.0);}",wc=class extends ar{constructor(t,e,r,i,n=!1){super({name:"EffectMaterial",defines:{THREE_REVISION:Pi.replace(/\D+/g,""),DEPTH_PACKING:"0",ENCODE_OUTPUT:"1"},uniforms:{inputBuffer:new d(null),depthBuffer:new d(null),resolution:new d(new k),texelSize:new d(new k),cameraNear:new d(.3),cameraFar:new d(1e3),aspect:new d(1),time:new d(0)},blending:Mr,toneMapped:!1,depthWrite:!1,depthTest:!1,dithering:n}),t&&this.setShaderParts(t),e&&this.setDefines(e),r&&this.setUniforms(r),this.copyCameraSettings(i)}set inputBuffer(t){this.uniforms.inputBuffer.value=t}setInputBuffer(t){this.uniforms.inputBuffer.value=t}get depthBuffer(){return this.uniforms.depthBuffer.value}set depthBuffer(t){this.uniforms.depthBuffer.value=t}get depthPacking(){return Number(this.defines.DEPTH_PACKING)}set depthPacking(t){this.defines.DEPTH_PACKING=t.toFixed(0),this.needsUpdate=!0}setDepthBuffer(t,e=br){this.depthBuffer=t,this.depthPacking=e}setShaderData(t){this.setShaderParts(t.shaderParts),this.setDefines(t.defines),this.setUniforms(t.uniforms),this.setExtensions(t.extensions)}setShaderParts(t){return this.fragmentShader=Tc.replace($.FRAGMENT_HEAD,t.get($.FRAGMENT_HEAD)||"").replace($.FRAGMENT_MAIN_UV,t.get($.FRAGMENT_MAIN_UV)||"").replace($.FRAGMENT_MAIN_IMAGE,t.get($.FRAGMENT_MAIN_IMAGE)||""),this.vertexShader=xc.replace($.VERTEX_HEAD,t.get($.VERTEX_HEAD)||"").replace($.VERTEX_MAIN_SUPPORT,t.get($.VERTEX_MAIN_SUPPORT)||""),this.needsUpdate=!0,this}setDefines(t){for(const e of t.entries())this.defines[e[0]]=e[1];return this.needsUpdate=!0,this}setUniforms(t){for(const e of t.entries())this.uniforms[e[0]]=e[1];return this}setExtensions(t){this.extensions={};for(const e of t)this.extensions[e]=!0;return this}get encodeOutput(){return this.defines.ENCODE_OUTPUT!==void 0}set encodeOutput(t){this.encodeOutput!==t&&(t?this.defines.ENCODE_OUTPUT="1":delete this.defines.ENCODE_OUTPUT,this.needsUpdate=!0)}isOutputEncodingEnabled(t){return this.encodeOutput}setOutputEncodingEnabled(t){this.encodeOutput=t}get time(){return this.uniforms.time.value}set time(t){this.uniforms.time.value=t}setDeltaTime(t){this.uniforms.time.value+=t}adoptCameraSettings(t){this.copyCameraSettings(t)}copyCameraSettings(t){t&&(this.uniforms.cameraNear.value=t.near,this.uniforms.cameraFar.value=t.far,t instanceof ga?this.defines.PERSPECTIVE_CAMERA="1":delete this.defines.PERSPECTIVE_CAMERA,this.needsUpdate=!0)}setSize(t,e){const r=this.uniforms;r.resolution.value.set(t,e),r.texelSize.value.set(1/t,1/e),r.aspect.value=t/e}static get Section(){return $}};function Dn(t,e,r){for(const i of e){const n="$1"+t+i.charAt(0).toUpperCase()+i.slice(1),o=new RegExp("([^\\.])(\\b"+i+"\\b)","g");for(const s of r.entries())s[1]!==null&&r.set(s[0],s[1].replace(o,n))}}function yc(t,e,r){let i=e.getFragmentShader(),n=e.getVertexShader();const o=i!==void 0&&/mainImage/.test(i),s=i!==void 0&&/mainUv/.test(i);if(r.attributes|=e.getAttributes(),i===void 0)throw new Error(`Missing fragment shader (${e.name})`);if(s&&(r.attributes&tt.CONVOLUTION)!==0)throw new Error(`Effects that transform UVs are incompatible with convolution effects (${e.name})`);if(!o&&!s)throw new Error(`Could not find mainImage or mainUv function (${e.name})`);{const l=/\w+\s+(\w+)\([\w\s,]*\)\s*{/g,h=r.shaderParts;let f=h.get($.FRAGMENT_HEAD)||"",g=h.get($.FRAGMENT_MAIN_UV)||"",y=h.get($.FRAGMENT_MAIN_IMAGE)||"",R=h.get($.VERTEX_HEAD)||"",P=h.get($.VERTEX_MAIN_SUPPORT)||"";const B=new Set,H=new Set;if(s&&(g+=`	${t}MainUv(UV);
`,r.uvTransformation=!0),n!==null&&/mainSupport/.test(n)){const Q=/mainSupport *\([\w\s]*?uv\s*?\)/.test(n);P+=`	${t}MainSupport(`,P+=Q?`vUv);
`:`);
`;for(const X of n.matchAll(/(?:varying\s+\w+\s+([\S\s]*?);)/g))for(const ue of X[1].split(/\s*,\s*/))r.varyings.add(ue),B.add(ue),H.add(ue);for(const X of n.matchAll(l))H.add(X[1])}for(const Q of i.matchAll(l))H.add(Q[1]);for(const Q of e.defines.keys())H.add(Q.replace(/\([\w\s,]*\)/g,""));for(const Q of e.uniforms.keys())H.add(Q);H.delete("while"),H.delete("for"),H.delete("if"),e.uniforms.forEach((Q,X)=>r.uniforms.set(t+X.charAt(0).toUpperCase()+X.slice(1),Q)),e.defines.forEach((Q,X)=>r.defines.set(t+X.charAt(0).toUpperCase()+X.slice(1),Q));const ee=new Map([["fragment",i],["vertex",n]]);Dn(t,H,r.defines),Dn(t,H,ee),i=ee.get("fragment"),n=ee.get("vertex");const ne=e.blendMode;if(r.blendModes.set(ne.blendFunction,ne),o){e.inputColorSpace!==null&&e.inputColorSpace!==r.colorSpace&&(y+=e.inputColorSpace===Qe?`color0 = sRGBTransferOETF(color0);
	`:`color0 = sRGBToLinear(color0);
	`),e.outputColorSpace!==Li?r.colorSpace=e.outputColorSpace:e.inputColorSpace!==null&&(r.colorSpace=e.inputColorSpace);const Q=/MainImage *\([\w\s,]*?depth[\w\s,]*?\)/;y+=`${t}MainImage(color0, UV, `,(r.attributes&tt.DEPTH)!==0&&Q.test(i)&&(y+="depth, ",r.readDepth=!0),y+=`color1);
	`;const X=t+"BlendOpacity";r.uniforms.set(X,ne.opacity),y+=`color0 = blend${ne.blendFunction}(color0, color1, ${X});

	`,f+=`uniform float ${X};

`}if(f+=i+`
`,n!==null&&(R+=n+`
`),h.set($.FRAGMENT_HEAD,f),h.set($.FRAGMENT_MAIN_UV,g),h.set($.FRAGMENT_MAIN_IMAGE,y),h.set($.VERTEX_HEAD,R),h.set($.VERTEX_MAIN_SUPPORT,P),e.extensions!==null)for(const Q of e.extensions)r.extensions.add(Q)}}var Nn=class extends Le{constructor(t,...e){super("EffectPass"),this.fullscreenMaterial=new wc(null,null,null,t),this.listener=r=>this.handleEvent(r),this.effects=[],this.setEffects(e),this.skipRendering=!1,this.minTime=1,this.maxTime=Number.POSITIVE_INFINITY,this.timeScale=1}set mainScene(t){for(const e of this.effects)e.mainScene=t}set mainCamera(t){this.fullscreenMaterial.copyCameraSettings(t);for(const e of this.effects)e.mainCamera=t}get encodeOutput(){return this.fullscreenMaterial.encodeOutput}set encodeOutput(t){this.fullscreenMaterial.encodeOutput=t}get dithering(){return this.fullscreenMaterial.dithering}set dithering(t){const e=this.fullscreenMaterial;e.dithering=t,e.needsUpdate=!0}setEffects(t){for(const e of this.effects)e.removeEventListener("change",this.listener);this.effects=t.sort((e,r)=>r.attributes-e.attributes);for(const e of this.effects)e.addEventListener("change",this.listener)}updateMaterial(){const t=new Os;let e=0;for(const s of this.effects)if(s.blendMode.blendFunction===z.DST)t.attributes|=s.getAttributes()&tt.DEPTH;else{if((t.attributes&s.getAttributes()&tt.CONVOLUTION)!==0)throw new Error(`Convolution effects cannot be merged (${s.name})`);yc("e"+e++,s,t)}let r=t.shaderParts.get($.FRAGMENT_HEAD),i=t.shaderParts.get($.FRAGMENT_MAIN_IMAGE),n=t.shaderParts.get($.FRAGMENT_MAIN_UV);const o=/\bblend\b/g;for(const s of t.blendModes.values())r+=s.getShaderCode().replace(o,`blend${s.blendFunction}`)+`
`;(t.attributes&tt.DEPTH)!==0?(t.readDepth&&(i=`float depth = readDepth(UV);

	`+i),this.needsDepthTexture=this.getDepthTexture()===null):this.needsDepthTexture=!1,t.colorSpace===Qe&&(i+=`color0 = sRGBToLinear(color0);
	`),t.uvTransformation?(n=`vec2 transformedUv = vUv;
`+n,t.defines.set("UV","transformedUv")):t.defines.set("UV","vUv"),t.shaderParts.set($.FRAGMENT_HEAD,r),t.shaderParts.set($.FRAGMENT_MAIN_IMAGE,i),t.shaderParts.set($.FRAGMENT_MAIN_UV,n);for(const[s,l]of t.shaderParts)l!==null&&t.shaderParts.set(s,l.trim().replace(/^#/,`
#`));this.skipRendering=e===0,this.needsSwap=!this.skipRendering,this.fullscreenMaterial.setShaderData(t)}recompile(){this.updateMaterial()}getDepthTexture(){return this.fullscreenMaterial.depthBuffer}setDepthTexture(t,e=br){this.fullscreenMaterial.depthBuffer=t,this.fullscreenMaterial.depthPacking=e;for(const r of this.effects)r.setDepthTexture(t,e)}render(t,e,r,i,n){for(const o of this.effects)o.update(t,e,i);if(!this.skipRendering||this.renderToScreen){const o=this.fullscreenMaterial;o.inputBuffer=e.texture,o.time+=i*this.timeScale,t.setRenderTarget(this.renderToScreen?null:r),t.render(this.scene,this.camera)}}setSize(t,e){this.fullscreenMaterial.setSize(t,e);for(const r of this.effects)r.setSize(t,e)}initialize(t,e,r){this.renderer=t;for(const i of this.effects)i.initialize(t,e,r);this.updateMaterial(),r!==void 0&&r!==Ye&&(this.fullscreenMaterial.defines.FRAMEBUFFER_PRECISION_HIGH="1")}dispose(){super.dispose();for(const t of this.effects)t.removeEventListener("change",this.listener),t.dispose()}handleEvent(t){t.type==="change"&&this.recompile()}},Rc="Invariant failed";function rr(t,e){if(!t)throw new Error(Rc)}const Ac=128,Cc=128,Ic=64;let Dc=class extends Et{load(e,r,i,n){const o=new et,s=new Sa(this.manager);return s.setPath(this.path),s.setRequestHeader(this.requestHeader),s.setWithCredentials(this.withCredentials),s.setResponseType("arraybuffer"),s.load(e,l=>{rr(l instanceof ArrayBuffer),o.image.data=new Uint8Array(l),o.image.width=Ac,o.image.height=Cc,o.image.depth=Ic,o.type=Ye,o.format=St,o.minFilter=xr,o.magFilter=xr,o.wrapS=Er,o.wrapT=Er,o.wrapR=Er,o.needsUpdate=!0,r?.(o)},i,n),o}};const Nc=new D;function xa(t,e,r=new D,i){const{x:n,y:o,z:s}=t,l=e.x,h=e.y,f=e.z,g=n*n*l,y=o*o*h,R=s*s*f,P=g+y+R,B=Math.sqrt(1/P);if(!Number.isFinite(B))return;const H=Nc.copy(t).multiplyScalar(B);if(P<(i?.centerTolerance??.1))return r.copy(H);const ee=H.multiply(e).multiplyScalar(2);let ne=(1-B)*t.length()/(ee.length()/2),Q=0,X,ue,le,Ne;do{ne-=Q,X=1/(1+ne*l),ue=1/(1+ne*h),le=1/(1+ne*f);const Me=X*X,_e=ue*ue,Ee=le*le,Fe=Me*X,Ge=_e*ue,ge=Ee*le;Ne=g*Me+y*_e+R*Ee-1,Q=Ne/((g*Fe*l+y*Ge*h+R*ge*f)*-2)}while(Math.abs(Ne)>1e-12);return r.set(n*X,o*ue,s*le)}const Rt=new D,ii=new D,ni=new D,_i=class{constructor(e,r,i){this.radii=new D(e,r,i)}get minimumRadius(){return Math.min(this.radii.x,this.radii.y,this.radii.z)}get maximumRadius(){return Math.max(this.radii.x,this.radii.y,this.radii.z)}get flattening(){return 1-this.minimumRadius/this.maximumRadius}get eccentricity(){return Math.sqrt(this.eccentricitySquared)}get eccentricitySquared(){const e=this.maximumRadius**2,r=this.minimumRadius**2;return(e-r)/e}reciprocalRadii(e=new D){const{x:r,y:i,z:n}=this.radii;return e.set(1/r,1/i,1/n)}reciprocalRadiiSquared(e=new D){const{x:r,y:i,z:n}=this.radii;return e.set(1/r**2,1/i**2,1/n**2)}projectOnSurface(e,r=new D,i){return xa(e,this.reciprocalRadiiSquared(),r,i)}getSurfaceNormal(e,r=new D){return r.multiplyVectors(this.reciprocalRadiiSquared(Rt),e).normalize()}getEastNorthUpVectors(e,r=new D,i=new D,n=new D){this.getSurfaceNormal(e,n),r.set(-e.y,e.x,0).normalize(),i.crossVectors(n,r).normalize()}getEastNorthUpFrame(e,r=new W){const i=Rt,n=ii,o=ni;return this.getEastNorthUpVectors(e,i,n,o),r.makeBasis(i,n,o).setPosition(e)}getNorthUpEastFrame(e,r=new W){const i=Rt,n=ii,o=ni;return this.getEastNorthUpVectors(e,i,n,o),r.makeBasis(n,o,i).setPosition(e)}getIntersection(e,r=new D){const i=this.reciprocalRadii(Rt),n=ii.copy(i).multiply(e.origin),o=ni.copy(i).multiply(e.direction),s=n.lengthSq(),l=o.lengthSq(),h=n.dot(o),f=h**2-l*(s-1);if(s===1)return r.copy(e.origin);if(s>1){if(h>=0||f<0)return;const g=Math.sqrt(f),y=(-h-g)/l,R=(-h+g)/l;return e.at(Math.min(y,R),r)}if(s<1){const g=h**2-l*(s-1),y=Math.sqrt(g),R=(-h+y)/l;return e.at(R,r)}if(h<0)return e.at(-h/l,r)}getOsculatingSphereCenter(e,r,i=new D){rr(this.radii.x===this.radii.y);const n=this.radii.x**2,o=this.radii.z**2,s=Rt.set(e.x/n,e.y/n,e.z/o).normalize();return i.copy(s.multiplyScalar(-r).add(e))}getNormalAtHorizon(e,r,i=new D){rr(this.radii.x===this.radii.y);const n=this.radii.x**2,o=this.radii.z**2,s=e,l=r;let h=(s.x*l.x+s.y*l.y)/n+s.z*l.z/o;h/=(s.x**2+s.y**2)/n+s.z**2/o;const f=Rt.copy(l).multiplyScalar(-h).add(e);return i.set(f.x/n,f.y/n,f.z/o).normalize()}};_i.WGS84=new _i(6378137,6378137,6356752314245179e-9);let ir=_i;const fr=new D,On=new D,Zt=class Ei{constructor(e=0,r=0,i=0){this.longitude=e,this.latitude=r,this.height=i}set(e,r,i){return this.longitude=e,this.latitude=r,i!=null&&(this.height=i),this}clone(){return new Ei(this.longitude,this.latitude,this.height)}copy(e){return this.longitude=e.longitude,this.latitude=e.latitude,this.height=e.height,this}equals(e){return e.longitude===this.longitude&&e.latitude===this.latitude&&e.height===this.height}setLongitude(e){return this.longitude=e,this}setLatitude(e){return this.latitude=e,this}setHeight(e){return this.height=e,this}normalize(){return this.longitude<Ei.MIN_LONGITUDE&&(this.longitude+=Math.PI*2),this}setFromECEF(e,r){const i=(r?.ellipsoid??ir.WGS84).reciprocalRadiiSquared(fr),n=xa(e,i,On,r);if(n==null)throw new Error(`Could not project position to ellipsoid surface: ${e.toArray()}`);const o=fr.multiplyVectors(n,i).normalize();this.longitude=Math.atan2(o.y,o.x),this.latitude=Math.asin(o.z);const s=fr.subVectors(e,n);return this.height=Math.sign(s.dot(e))*s.length(),this}toECEF(e=new D,r){const i=r?.ellipsoid??ir.WGS84,n=fr.multiplyVectors(i.radii,i.radii),o=Math.cos(this.latitude),s=On.set(o*Math.cos(this.longitude),o*Math.sin(this.longitude),Math.sin(this.latitude)).normalize();return e.multiplyVectors(n,s),e.divideScalar(Math.sqrt(s.dot(e))).add(s.multiplyScalar(this.height))}fromArray(e,r=0){return this.longitude=e[r],this.latitude=e[r+1],this.height=e[r+2],this}toArray(e=[],r=0){return e[r]=this.longitude,e[r+1]=this.latitude,e[r+2]=this.height,e}*[Symbol.iterator](){yield this.longitude,yield this.latitude,yield this.height}};Zt.MIN_LONGITUDE=-Math.PI,Zt.MAX_LONGITUDE=Math.PI,Zt.MIN_LATITUDE=-Math.PI/2,Zt.MAX_LATITUDE=Math.PI/2;let wa=Zt;class ya extends ts{constructor(e){super(e),this.type=Ve,this.outputFormat=vt}parse(e){const Ee=Math.pow(2.7182818,2.2);function Fe(a,c){let u=0;for(let v=0;v<65536;++v)(v==0||a[v>>3]&1<<(v&7))&&(c[u++]=v);const p=u-1;for(;u<65536;)c[u++]=0;return p}function Ge(a){for(let c=0;c<16384;c++)a[c]={},a[c].len=0,a[c].lit=0,a[c].p=null}const ge={l:0,c:0,lc:0};function Bt(a,c,u,p,v){for(;u<a;)c=c<<8|Sn(p,v),u+=8;u-=a,ge.l=c>>u&(1<<a)-1,ge.c=c,ge.lc=u}const $e=new Array(59);function G(a){for(let u=0;u<=58;++u)$e[u]=0;for(let u=0;u<65537;++u)$e[a[u]]+=1;let c=0;for(let u=58;u>0;--u){const p=c+$e[u]>>1;$e[u]=c,c=p}for(let u=0;u<65537;++u){const p=a[u];p>0&&(a[u]=p|$e[p]++<<6)}}function zt(a,c,u,p,v,T){const m=c;let x=0,_=0;for(;p<=v;p++){if(m.value-c.value>u)return!1;Bt(6,x,_,a,m);const S=ge.l;if(x=ge.c,_=ge.lc,T[p]=S,S==63){if(m.value-c.value>u)throw new Error("Something wrong with hufUnpackEncTable");Bt(8,x,_,a,m);let E=ge.l+6;if(x=ge.c,_=ge.lc,p+E>v+1)throw new Error("Something wrong with hufUnpackEncTable");for(;E--;)T[p++]=0;p--}else if(S>=59){let E=S-59+2;if(p+E>v+1)throw new Error("Something wrong with hufUnpackEncTable");for(;E--;)T[p++]=0;p--}}G(T)}function Be(a){return a&63}function at(a){return a>>6}function $r(a,c,u,p){for(;c<=u;c++){const v=at(a[c]),T=Be(a[c]);if(v>>T)throw new Error("Invalid table entry");if(T>14){const m=p[v>>T-14];if(m.len)throw new Error("Invalid table entry");if(m.lit++,m.p){const x=m.p;m.p=new Array(m.lit);for(let _=0;_<m.lit-1;++_)m.p[_]=x[_]}else m.p=new Array(1);m.p[m.lit-1]=c}else if(T){let m=0;for(let x=1<<14-T;x>0;x--){const _=p[(v<<14-T)+m];if(_.len||_.p)throw new Error("Invalid table entry");_.len=T,_.lit=c,m++}}}return!0}const ot={c:0,lc:0};function Xr(a,c,u,p){a=a<<8|Sn(u,p),c+=8,ot.c=a,ot.lc=c}const st={c:0,lc:0};function Zr(a,c,u,p,v,T,m,x,_){if(a==c){p<8&&(Xr(u,p,v,T),u=ot.c,p=ot.lc),p-=8;let S=u>>p;if(S=new Uint8Array([S])[0],x.value+S>_)return!1;const E=m[x.value-1];for(;S-- >0;)m[x.value++]=E}else if(x.value<_)m[x.value++]=a;else return!1;st.c=u,st.lc=p}function qr(a){return a&65535}function cn(a){const c=qr(a);return c>32767?c-65536:c}const oe={a:0,b:0};function wt(a,c){const u=cn(a),v=cn(c),T=u+(v&1)+(v>>1),m=T,x=T-v;oe.a=m,oe.b=x}function yt(a,c){const u=qr(a),p=qr(c),v=u-(p>>1)&65535,T=p+v-32768&65535;oe.a=T,oe.b=v}function fo(a,c,u,p,v,T,m){const x=m<16384,_=u>v?v:u;let S=1,E,A;for(;S<=_;)S<<=1;for(S>>=1,E=S,S>>=1;S>=1;){A=0;const w=A+T*(v-E),I=T*S,b=T*E,C=p*S,O=p*E;let L,j,te,de;for(;A<=w;A+=b){let J=A;const U=A+p*(u-E);for(;J<=U;J+=O){const ce=J+C,me=J+I,ae=me+C;x?(wt(a[J+c],a[me+c]),L=oe.a,te=oe.b,wt(a[ce+c],a[ae+c]),j=oe.a,de=oe.b,wt(L,j),a[J+c]=oe.a,a[ce+c]=oe.b,wt(te,de),a[me+c]=oe.a,a[ae+c]=oe.b):(yt(a[J+c],a[me+c]),L=oe.a,te=oe.b,yt(a[ce+c],a[ae+c]),j=oe.a,de=oe.b,yt(L,j),a[J+c]=oe.a,a[ce+c]=oe.b,yt(te,de),a[me+c]=oe.a,a[ae+c]=oe.b)}if(u&S){const ce=J+I;x?wt(a[J+c],a[ce+c]):yt(a[J+c],a[ce+c]),L=oe.a,a[ce+c]=oe.b,a[J+c]=L}}if(v&S){let J=A;const U=A+p*(u-E);for(;J<=U;J+=O){const ce=J+C;x?wt(a[J+c],a[ce+c]):yt(a[J+c],a[ce+c]),L=oe.a,a[ce+c]=oe.b,a[J+c]=L}}E=S,S>>=1}return A}function vo(a,c,u,p,v,T,m,x,_){let S=0,E=0;const A=m,w=Math.trunc(p.value+(v+7)/8);for(;p.value<w;)for(Xr(S,E,u,p),S=ot.c,E=ot.lc;E>=14;){const b=S>>E-14&16383,C=c[b];if(C.len)E-=C.len,Zr(C.lit,T,S,E,u,p,x,_,A),S=st.c,E=st.lc;else{if(!C.p)throw new Error("hufDecode issues");let O;for(O=0;O<C.lit;O++){const L=Be(a[C.p[O]]);for(;E<L&&p.value<w;)Xr(S,E,u,p),S=ot.c,E=ot.lc;if(E>=L&&at(a[C.p[O]])==(S>>E-L&(1<<L)-1)){E-=L,Zr(C.p[O],T,S,E,u,p,x,_,A),S=st.c,E=st.lc;break}}if(O==C.lit)throw new Error("hufDecode issues")}}const I=8-v&7;for(S>>=I,E-=I;E>0;){const b=c[S<<14-E&16383];if(b.len)E-=b.len,Zr(b.lit,T,S,E,u,p,x,_,A),S=st.c,E=st.lc;else throw new Error("hufDecode issues")}return!0}function ln(a,c,u,p,v,T){const m={value:0},x=u.value,_=be(c,u),S=be(c,u);u.value+=4;const E=be(c,u);if(u.value+=4,_<0||_>=65537||S<0||S>=65537)throw new Error("Something wrong with HUF_ENCSIZE");const A=new Array(65537),w=new Array(16384);Ge(w);const I=p-(u.value-x);if(zt(a,u,I,_,S,A),E>8*(p-(u.value-x)))throw new Error("Something wrong with hufUncompress");$r(A,_,S,w),vo(A,w,a,u,E,S,T,v,m)}function go(a,c,u){for(let p=0;p<u;++p)c[p]=a[c[p]]}function un(a){for(let c=1;c<a.length;c++){const u=a[c-1]+a[c]-128;a[c]=u}}function hn(a,c){let u=0,p=Math.floor((a.length+1)/2),v=0;const T=a.length-1;for(;!(v>T||(c[v++]=a[u++],v>T));)c[v++]=a[p++]}function dn(a){let c=a.byteLength;const u=new Array;let p=0;const v=new DataView(a);for(;c>0;){const T=v.getInt8(p++);if(T<0){const m=-T;c-=m+1;for(let x=0;x<m;x++)u.push(v.getUint8(p++))}else{const m=T;c-=2;const x=v.getUint8(p++);for(let _=0;_<m+1;_++)u.push(x)}}return u}function So(a,c,u,p,v,T){let m=new DataView(T.buffer);const x=u[a.idx[0]].width,_=u[a.idx[0]].height,S=3,E=Math.floor(x/8),A=Math.ceil(x/8),w=Math.ceil(_/8),I=x-(A-1)*8,b=_-(w-1)*8,C={value:0},O=new Array(S),L=new Array(S),j=new Array(S),te=new Array(S),de=new Array(S);for(let U=0;U<S;++U)de[U]=c[a.idx[U]],O[U]=U<1?0:O[U-1]+A*w,L[U]=new Float32Array(64),j[U]=new Uint16Array(64),te[U]=new Uint16Array(A*64);for(let U=0;U<w;++U){let ce=8;U==w-1&&(ce=b);let me=8;for(let V=0;V<A;++V){V==A-1&&(me=I);for(let re=0;re<S;++re)j[re].fill(0),j[re][0]=v[O[re]++],mn(C,p,j[re]),pn(j[re],L[re]),fn(L[re]);Eo(L);for(let re=0;re<S;++re)vn(L[re],te[re],V*64)}let ae=0;for(let V=0;V<S;++V){const re=u[a.idx[V]].type;for(let Xe=8*U;Xe<8*U+ce;++Xe){ae=de[V][Xe];for(let kt=0;kt<E;++kt){const ze=kt*64+(Xe&7)*8;m.setUint16(ae+0*re,te[V][ze+0],!0),m.setUint16(ae+2*re,te[V][ze+1],!0),m.setUint16(ae+4*re,te[V][ze+2],!0),m.setUint16(ae+6*re,te[V][ze+3],!0),m.setUint16(ae+8*re,te[V][ze+4],!0),m.setUint16(ae+10*re,te[V][ze+5],!0),m.setUint16(ae+12*re,te[V][ze+6],!0),m.setUint16(ae+14*re,te[V][ze+7],!0),ae+=16*re}}if(E!=A)for(let Xe=8*U;Xe<8*U+ce;++Xe){const kt=de[V][Xe]+8*E*2*re,ze=E*64+(Xe&7)*8;for(let hr=0;hr<me;++hr)m.setUint16(kt+hr*2*re,te[V][ze+hr],!0)}}}const J=new Uint16Array(x);m=new DataView(T.buffer);for(let U=0;U<S;++U){u[a.idx[U]].decoded=!0;const ce=u[a.idx[U]].type;if(u[U].type==2)for(let me=0;me<_;++me){const ae=de[U][me];for(let V=0;V<x;++V)J[V]=m.getUint16(ae+V*2*ce,!0);for(let V=0;V<x;++V)m.setFloat32(ae+V*2*ce,N(J[V]),!0)}}}function _o(a,c,u,p,v,T){const m=new DataView(T.buffer),x=u[a],_=x.width,S=x.height,E=Math.ceil(_/8),A=Math.ceil(S/8),w=Math.floor(_/8),I=_-(E-1)*8,b=S-(A-1)*8,C={value:0};let O=0;const L=new Float32Array(64),j=new Uint16Array(64),te=new Uint16Array(E*64);for(let de=0;de<A;++de){let J=8;de==A-1&&(J=b);for(let U=0;U<E;++U)j.fill(0),j[0]=v[O++],mn(C,p,j),pn(j,L),fn(L),vn(L,te,U*64);for(let U=8*de;U<8*de+J;++U){let ce=c[a][U];for(let me=0;me<w;++me){const ae=me*64+(U&7)*8;for(let V=0;V<8;++V)m.setUint16(ce+V*2*x.type,te[ae+V],!0);ce+=16*x.type}if(E!=w){const me=w*64+(U&7)*8;for(let ae=0;ae<I;++ae)m.setUint16(ce+ae*2*x.type,te[me+ae],!0)}}}x.decoded=!0}function mn(a,c,u){let p,v=1;for(;v<64;)p=c[a.value],p==65280?v=64:p>>8==255?v+=p&255:(u[v]=p,v++),a.value++}function pn(a,c){c[0]=N(a[0]),c[1]=N(a[1]),c[2]=N(a[5]),c[3]=N(a[6]),c[4]=N(a[14]),c[5]=N(a[15]),c[6]=N(a[27]),c[7]=N(a[28]),c[8]=N(a[2]),c[9]=N(a[4]),c[10]=N(a[7]),c[11]=N(a[13]),c[12]=N(a[16]),c[13]=N(a[26]),c[14]=N(a[29]),c[15]=N(a[42]),c[16]=N(a[3]),c[17]=N(a[8]),c[18]=N(a[12]),c[19]=N(a[17]),c[20]=N(a[25]),c[21]=N(a[30]),c[22]=N(a[41]),c[23]=N(a[43]),c[24]=N(a[9]),c[25]=N(a[11]),c[26]=N(a[18]),c[27]=N(a[24]),c[28]=N(a[31]),c[29]=N(a[40]),c[30]=N(a[44]),c[31]=N(a[53]),c[32]=N(a[10]),c[33]=N(a[19]),c[34]=N(a[23]),c[35]=N(a[32]),c[36]=N(a[39]),c[37]=N(a[45]),c[38]=N(a[52]),c[39]=N(a[54]),c[40]=N(a[20]),c[41]=N(a[22]),c[42]=N(a[33]),c[43]=N(a[38]),c[44]=N(a[46]),c[45]=N(a[51]),c[46]=N(a[55]),c[47]=N(a[60]),c[48]=N(a[21]),c[49]=N(a[34]),c[50]=N(a[37]),c[51]=N(a[47]),c[52]=N(a[50]),c[53]=N(a[56]),c[54]=N(a[59]),c[55]=N(a[61]),c[56]=N(a[35]),c[57]=N(a[36]),c[58]=N(a[48]),c[59]=N(a[49]),c[60]=N(a[57]),c[61]=N(a[58]),c[62]=N(a[62]),c[63]=N(a[63])}function fn(a){const c=.5*Math.cos(.7853975),u=.5*Math.cos(3.14159/16),p=.5*Math.cos(3.14159/8),v=.5*Math.cos(3*3.14159/16),T=.5*Math.cos(5*3.14159/16),m=.5*Math.cos(3*3.14159/8),x=.5*Math.cos(7*3.14159/16),_=new Array(4),S=new Array(4),E=new Array(4),A=new Array(4);for(let w=0;w<8;++w){const I=w*8;_[0]=p*a[I+2],_[1]=m*a[I+2],_[2]=p*a[I+6],_[3]=m*a[I+6],S[0]=u*a[I+1]+v*a[I+3]+T*a[I+5]+x*a[I+7],S[1]=v*a[I+1]-x*a[I+3]-u*a[I+5]-T*a[I+7],S[2]=T*a[I+1]-u*a[I+3]+x*a[I+5]+v*a[I+7],S[3]=x*a[I+1]-T*a[I+3]+v*a[I+5]-u*a[I+7],E[0]=c*(a[I+0]+a[I+4]),E[3]=c*(a[I+0]-a[I+4]),E[1]=_[0]+_[3],E[2]=_[1]-_[2],A[0]=E[0]+E[1],A[1]=E[3]+E[2],A[2]=E[3]-E[2],A[3]=E[0]-E[1],a[I+0]=A[0]+S[0],a[I+1]=A[1]+S[1],a[I+2]=A[2]+S[2],a[I+3]=A[3]+S[3],a[I+4]=A[3]-S[3],a[I+5]=A[2]-S[2],a[I+6]=A[1]-S[1],a[I+7]=A[0]-S[0]}for(let w=0;w<8;++w)_[0]=p*a[16+w],_[1]=m*a[16+w],_[2]=p*a[48+w],_[3]=m*a[48+w],S[0]=u*a[8+w]+v*a[24+w]+T*a[40+w]+x*a[56+w],S[1]=v*a[8+w]-x*a[24+w]-u*a[40+w]-T*a[56+w],S[2]=T*a[8+w]-u*a[24+w]+x*a[40+w]+v*a[56+w],S[3]=x*a[8+w]-T*a[24+w]+v*a[40+w]-u*a[56+w],E[0]=c*(a[w]+a[32+w]),E[3]=c*(a[w]-a[32+w]),E[1]=_[0]+_[3],E[2]=_[1]-_[2],A[0]=E[0]+E[1],A[1]=E[3]+E[2],A[2]=E[3]-E[2],A[3]=E[0]-E[1],a[0+w]=A[0]+S[0],a[8+w]=A[1]+S[1],a[16+w]=A[2]+S[2],a[24+w]=A[3]+S[3],a[32+w]=A[3]-S[3],a[40+w]=A[2]-S[2],a[48+w]=A[1]-S[1],a[56+w]=A[0]-S[0]}function Eo(a){for(let c=0;c<64;++c){const u=a[0][c],p=a[1][c],v=a[2][c];a[0][c]=u+1.5747*v,a[1][c]=u-.1873*p-.4682*v,a[2][c]=u+1.8556*p}}function vn(a,c,u){for(let p=0;p<64;++p)c[u+p]=wn.toHalfFloat(To(a[p]))}function To(a){return a<=1?Math.sign(a)*Math.pow(Math.abs(a),2.2):Math.sign(a)*Math.pow(Ee,Math.abs(a)-1)}function Kr(a){return new DataView(a.array.buffer,a.offset.value,a.size)}function xo(a){const c=a.viewer.buffer.slice(a.offset.value,a.offset.value+a.size),u=new Uint8Array(dn(c)),p=new Uint8Array(u.length);return un(u),hn(u,p),new DataView(p.buffer)}function Qr(a){const c=a.array.slice(a.offset.value,a.offset.value+a.size),u=pr(c),p=new Uint8Array(u.length);return un(u),hn(u,p),new DataView(p.buffer)}function wo(a){const c=a.viewer,u={value:a.offset.value},p=new Uint16Array(a.columns*a.lines*(a.inputChannels.length*a.type)),v=new Uint8Array(8192);let T=0;const m=new Array(a.inputChannels.length);for(let b=0,C=a.inputChannels.length;b<C;b++)m[b]={},m[b].start=T,m[b].end=m[b].start,m[b].nx=a.columns,m[b].ny=a.lines,m[b].size=a.type,T+=m[b].nx*m[b].ny*m[b].size;const x=Wt(c,u),_=Wt(c,u);if(_>=8192)throw new Error("Something is wrong with PIZ_COMPRESSION BITMAP_SIZE");if(x<=_)for(let b=0;b<_-x+1;b++)v[b+x]=ct(c,u);const S=new Uint16Array(65536),E=Fe(v,S),A=be(c,u);ln(a.array,c,u,A,p,T);for(let b=0;b<a.inputChannels.length;++b){const C=m[b];for(let O=0;O<m[b].size;++O)fo(p,C.start+O,C.nx,C.size,C.ny,C.nx*C.size,E)}go(S,p,T);let w=0;const I=new Uint8Array(p.buffer.byteLength);for(let b=0;b<a.lines;b++)for(let C=0;C<a.inputChannels.length;C++){const O=m[C],L=O.nx*O.size,j=new Uint8Array(p.buffer,O.end*2,L*2);I.set(j,w),w+=L*2,O.end+=L}return new DataView(I.buffer)}function yo(a){const c=a.array.slice(a.offset.value,a.offset.value+a.size),u=pr(c),p=a.inputChannels.length*a.lines*a.columns*a.totalBytes,v=new ArrayBuffer(p),T=new DataView(v);let m=0,x=0;const _=new Array(4);for(let S=0;S<a.lines;S++)for(let E=0;E<a.inputChannels.length;E++){let A=0;switch(a.inputChannels[E].pixelType){case 1:_[0]=m,_[1]=_[0]+a.columns,m=_[1]+a.columns;for(let I=0;I<a.columns;++I){const b=u[_[0]++]<<8|u[_[1]++];A+=b,T.setUint16(x,A,!0),x+=2}break;case 2:_[0]=m,_[1]=_[0]+a.columns,_[2]=_[1]+a.columns,m=_[2]+a.columns;for(let I=0;I<a.columns;++I){const b=u[_[0]++]<<24|u[_[1]++]<<16|u[_[2]++]<<8;A+=b,T.setUint32(x,A,!0),x+=4}break}}return T}function gn(a){const c=a.viewer,u={value:a.offset.value},p=new Uint8Array(a.columns*a.lines*(a.inputChannels.length*a.type*2)),v={version:Ie(c,u),unknownUncompressedSize:Ie(c,u),unknownCompressedSize:Ie(c,u),acCompressedSize:Ie(c,u),dcCompressedSize:Ie(c,u),rleCompressedSize:Ie(c,u),rleUncompressedSize:Ie(c,u),rleRawSize:Ie(c,u),totalAcUncompressedCount:Ie(c,u),totalDcUncompressedCount:Ie(c,u),acCompression:Ie(c,u)};if(v.version<2)throw new Error("EXRLoader.parse: "+pt.compression+" version "+v.version+" is unsupported");const T=new Array;let m=Wt(c,u)-2;for(;m>0;){const C=ur(c.buffer,u),O=ct(c,u),L=O>>2&3,j=(O>>4)-1,te=new Int8Array([j])[0],de=ct(c,u);T.push({name:C,index:te,type:de,compression:L}),m-=C.length+3}const x=pt.channels,_=new Array(a.inputChannels.length);for(let C=0;C<a.inputChannels.length;++C){const O=_[C]={},L=x[C];O.name=L.name,O.compression=0,O.decoded=!1,O.type=L.pixelType,O.pLinear=L.pLinear,O.width=a.columns,O.height=a.lines}const S={idx:new Array(3)};for(let C=0;C<a.inputChannels.length;++C){const O=_[C];for(let L=0;L<T.length;++L){const j=T[L];O.name==j.name&&(O.compression=j.compression,j.index>=0&&(S.idx[j.index]=C),O.offset=C)}}let E,A,w;if(v.acCompressedSize>0)switch(v.acCompression){case 0:E=new Uint16Array(v.totalAcUncompressedCount),ln(a.array,c,u,v.acCompressedSize,E,v.totalAcUncompressedCount);break;case 1:const C=a.array.slice(u.value,u.value+v.totalAcUncompressedCount),O=pr(C);E=new Uint16Array(O.buffer),u.value+=v.totalAcUncompressedCount;break}if(v.dcCompressedSize>0){const C={array:a.array,offset:u,size:v.dcCompressedSize};A=new Uint16Array(Qr(C).buffer),u.value+=v.dcCompressedSize}if(v.rleRawSize>0){const C=a.array.slice(u.value,u.value+v.rleCompressedSize),O=pr(C);w=dn(O.buffer),u.value+=v.rleCompressedSize}let I=0;const b=new Array(_.length);for(let C=0;C<b.length;++C)b[C]=new Array;for(let C=0;C<a.lines;++C)for(let O=0;O<_.length;++O)b[O].push(I),I+=_[O].width*a.type*2;S.idx[0]!==void 0&&_[S.idx[0]]&&So(S,b,_,E,A,p);for(let C=0;C<_.length;++C){const O=_[C];if(!O.decoded)switch(O.compression){case 2:let L=0,j=0;for(let te=0;te<a.lines;++te){let de=b[C][L];for(let J=0;J<O.width;++J){for(let U=0;U<2*O.type;++U)p[de++]=w[j+U*O.width*O.height];j++}L++}break;case 1:_o(C,b,_,E,A,p);break;default:throw new Error("EXRLoader.parse: unsupported channel compression")}}return new DataView(p.buffer)}function ur(a,c){const u=new Uint8Array(a);let p=0;for(;u[c.value+p]!=0;)p+=1;const v=new TextDecoder().decode(u.slice(c.value,c.value+p));return c.value=c.value+p+1,v}function Ro(a,c,u){const p=new TextDecoder().decode(new Uint8Array(a).slice(c.value,c.value+u));return c.value=c.value+u,p}function Ao(a,c){const u=Oe(a,c),p=be(a,c);return[u,p]}function Co(a,c){const u=be(a,c),p=be(a,c);return[u,p]}function Oe(a,c){const u=a.getInt32(c.value,!0);return c.value=c.value+4,u}function be(a,c){const u=a.getUint32(c.value,!0);return c.value=c.value+4,u}function Sn(a,c){const u=a[c.value];return c.value=c.value+1,u}function ct(a,c){const u=a.getUint8(c.value);return c.value=c.value+1,u}const Ie=function(a,c){let u;return"getBigInt64"in DataView.prototype?u=Number(a.getBigInt64(c.value,!0)):u=a.getUint32(c.value+4,!0)+Number(a.getUint32(c.value,!0)<<32),c.value+=8,u};function Se(a,c){const u=a.getFloat32(c.value,!0);return c.value+=4,u}function Io(a,c){return wn.toHalfFloat(Se(a,c))}function N(a){const c=(a&31744)>>10,u=a&1023;return(a>>15?-1:1)*(c?c===31?u?NaN:1/0:Math.pow(2,c-15)*(1+u/1024):6103515625e-14*(u/1024))}function Wt(a,c){const u=a.getUint16(c.value,!0);return c.value+=2,u}function Do(a,c){return N(Wt(a,c))}function No(a,c,u,p){const v=u.value,T=[];for(;u.value<v+p-1;){const m=ur(c,u),x=Oe(a,u),_=ct(a,u);u.value+=3;const S=Oe(a,u),E=Oe(a,u);T.push({name:m,pixelType:x,pLinear:_,xSampling:S,ySampling:E})}return u.value+=1,T}function Oo(a,c){const u=Se(a,c),p=Se(a,c),v=Se(a,c),T=Se(a,c),m=Se(a,c),x=Se(a,c),_=Se(a,c),S=Se(a,c);return{redX:u,redY:p,greenX:v,greenY:T,blueX:m,blueY:x,whiteX:_,whiteY:S}}function bo(a,c){const u=["NO_COMPRESSION","RLE_COMPRESSION","ZIPS_COMPRESSION","ZIP_COMPRESSION","PIZ_COMPRESSION","PXR24_COMPRESSION","B44_COMPRESSION","B44A_COMPRESSION","DWAA_COMPRESSION","DWAB_COMPRESSION"],p=ct(a,c);return u[p]}function Lo(a,c){const u=Oe(a,c),p=Oe(a,c),v=Oe(a,c),T=Oe(a,c);return{xMin:u,yMin:p,xMax:v,yMax:T}}function Mo(a,c){const u=["INCREASING_Y","DECREASING_Y","RANDOM_Y"],p=ct(a,c);return u[p]}function Po(a,c){const u=["ENVMAP_LATLONG","ENVMAP_CUBE"],p=ct(a,c);return u[p]}function Uo(a,c){const u=["ONE_LEVEL","MIPMAP_LEVELS","RIPMAP_LEVELS"],p=["ROUND_DOWN","ROUND_UP"],v=be(a,c),T=be(a,c),m=ct(a,c);return{xSize:v,ySize:T,levelMode:u[m&15],roundingMode:p[m>>4]}}function Ho(a,c){const u=Se(a,c),p=Se(a,c);return[u,p]}function Fo(a,c){const u=Se(a,c),p=Se(a,c),v=Se(a,c);return[u,p,v]}function Go(a,c,u,p,v){if(p==="string"||p==="stringvector"||p==="iccProfile")return Ro(c,u,v);if(p==="chlist")return No(a,c,u,v);if(p==="chromaticities")return Oo(a,u);if(p==="compression")return bo(a,u);if(p==="box2i")return Lo(a,u);if(p==="envmap")return Po(a,u);if(p==="tiledesc")return Uo(a,u);if(p==="lineOrder")return Mo(a,u);if(p==="float")return Se(a,u);if(p==="v2f")return Ho(a,u);if(p==="v3f")return Fo(a,u);if(p==="int")return Oe(a,u);if(p==="rational")return Ao(a,u);if(p==="timecode")return Co(a,u);if(p==="preview")return u.value+=v,"skipped";u.value+=v}function Bo(a,c){const u=Math.log2(a);return c=="ROUND_DOWN"?Math.floor(u):Math.ceil(u)}function zo(a,c,u){let p=0;switch(a.levelMode){case"ONE_LEVEL":p=1;break;case"MIPMAP_LEVELS":p=Bo(Math.max(c,u),a.roundingMode)+1;break;case"RIPMAP_LEVELS":throw new Error("THREE.EXRLoader: RIPMAP_LEVELS tiles currently unsupported.")}return p}function _n(a,c,u,p){const v=new Array(a);for(let T=0;T<a;T++){const m=1<<T;let x=c/m|0;p=="ROUND_UP"&&x*m<c&&(x+=1);const _=Math.max(x,1);v[T]=(_+u-1)/u|0}return v}function Wo(){const a=this,c=a.offset,u={value:0};for(let p=0;p<a.tileCount;p++){const v=Oe(a.viewer,c),T=Oe(a.viewer,c);c.value+=8,a.size=be(a.viewer,c);const m=v*a.blockWidth,x=T*a.blockHeight;a.columns=m+a.blockWidth>a.width?a.width-m:a.blockWidth,a.lines=x+a.blockHeight>a.height?a.height-x:a.blockHeight;const _=a.columns*a.totalBytes,E=a.size<a.lines*_?a.uncompress(a):Kr(a);c.value+=a.size;for(let A=0;A<a.lines;A++){const w=A*a.columns*a.totalBytes;for(let I=0;I<a.inputChannels.length;I++){const b=pt.channels[I].name,C=a.channelByteOffsets[b]*a.columns,O=a.decodeChannels[b];if(O===void 0)continue;u.value=w+C;const L=(a.height-(1+x+A))*a.outLineWidth;for(let j=0;j<a.columns;j++){const te=L+(j+m)*a.outputChannels+O;a.byteArray[te]=a.getter(E,u)}}}}}function ko(){const a=this,c=a.offset,u={value:0};for(let p=0;p<a.height/a.blockHeight;p++){const v=Oe(a.viewer,c)-pt.dataWindow.yMin;a.size=be(a.viewer,c),a.lines=v+a.blockHeight>a.height?a.height-v:a.blockHeight;const T=a.columns*a.totalBytes,x=a.size<a.lines*T?a.uncompress(a):Kr(a);c.value+=a.size;for(let _=0;_<a.blockHeight;_++){const S=p*a.blockHeight,E=_+a.scanOrder(S);if(E>=a.height)continue;const A=_*T,w=(a.height-1-E)*a.outLineWidth;for(let I=0;I<a.inputChannels.length;I++){const b=pt.channels[I].name,C=a.channelByteOffsets[b]*a.columns,O=a.decodeChannels[b];if(O!==void 0){u.value=A+C;for(let L=0;L<a.columns;L++){const j=w+L*a.outputChannels+O;a.byteArray[j]=a.getter(x,u)}}}}}}function Vo(a,c,u){const p={};if(a.getUint32(0,!0)!=20000630)throw new Error("THREE.EXRLoader: Provided file doesn't appear to be in OpenEXR format.");p.version=a.getUint8(4);const v=a.getUint8(5);p.spec={singleTile:!!(v&2),longName:!!(v&4),deepFormat:!!(v&8),multiPart:!!(v&16)},u.value=8;let T=!0;for(;T;){const m=ur(c,u);if(m==="")T=!1;else{const x=ur(c,u),_=be(a,u),S=Go(a,c,u,x,_);S===void 0?console.warn(`THREE.EXRLoader: Skipped unknown header attribute type '${x}'.`):p[m]=S}}if((v&-7)!=0)throw console.error("THREE.EXRHeader:",p),new Error("THREE.EXRLoader: Provided file is currently unsupported.");return p}function Yo(a,c,u,p,v,T){const m={size:0,viewer:c,array:u,offset:p,width:a.dataWindow.xMax-a.dataWindow.xMin+1,height:a.dataWindow.yMax-a.dataWindow.yMin+1,inputChannels:a.channels,channelByteOffsets:{},shouldExpand:!1,scanOrder:null,totalBytes:null,columns:null,lines:null,type:null,uncompress:null,getter:null,format:null,colorSpace:Ke};switch(a.compression){case"NO_COMPRESSION":m.blockHeight=1,m.uncompress=Kr;break;case"RLE_COMPRESSION":m.blockHeight=1,m.uncompress=xo;break;case"ZIPS_COMPRESSION":m.blockHeight=1,m.uncompress=Qr;break;case"ZIP_COMPRESSION":m.blockHeight=16,m.uncompress=Qr;break;case"PIZ_COMPRESSION":m.blockHeight=32,m.uncompress=wo;break;case"PXR24_COMPRESSION":m.blockHeight=16,m.uncompress=yo;break;case"DWAA_COMPRESSION":m.blockHeight=32,m.uncompress=gn;break;case"DWAB_COMPRESSION":m.blockHeight=256,m.uncompress=gn;break;default:throw new Error("EXRLoader.parse: "+a.compression+" is unsupported")}const x={};for(const w of a.channels)switch(w.name){case"Y":case"R":case"G":case"B":case"A":x[w.name]=!0,m.type=w.pixelType}let _=!1,S=!1;if(x.R&&x.G&&x.B)m.outputChannels=4;else if(x.Y)m.outputChannels=1;else throw new Error("EXRLoader.parse: file contains unsupported data channels.");switch(m.outputChannels){case 4:T==vt?(_=!x.A,m.format=vt,m.colorSpace=Ke,m.outputChannels=4,m.decodeChannels={R:0,G:1,B:2,A:3}):T==Vt?(m.format=Vt,m.colorSpace=Ke,m.outputChannels=2,m.decodeChannels={R:0,G:1}):T==St?(m.format=St,m.colorSpace=Ke,m.outputChannels=1,m.decodeChannels={R:0}):S=!0;break;case 1:T==vt?(_=!0,m.format=vt,m.colorSpace=Ke,m.outputChannels=4,m.shouldExpand=!0,m.decodeChannels={Y:0}):T==Vt?(m.format=Vt,m.colorSpace=Ke,m.outputChannels=2,m.shouldExpand=!0,m.decodeChannels={Y:0}):T==St?(m.format=St,m.colorSpace=Ke,m.outputChannels=1,m.decodeChannels={Y:0}):S=!0;break;default:S=!0}if(S)throw new Error("EXRLoader.parse: invalid output format for specified file.");if(m.type==1)switch(v){case mt:m.getter=Do;break;case Ve:m.getter=Wt;break}else if(m.type==2)switch(v){case mt:m.getter=Se;break;case Ve:m.getter=Io}else throw new Error("EXRLoader.parse: unsupported pixelType "+m.type+" for "+a.compression+".");m.columns=m.width;const E=m.width*m.height*m.outputChannels;switch(v){case mt:m.byteArray=new Float32Array(E),_&&m.byteArray.fill(1,0,E);break;case Ve:m.byteArray=new Uint16Array(E),_&&m.byteArray.fill(15360,0,E);break;default:console.error("THREE.EXRLoader: unsupported type: ",v);break}let A=0;for(const w of a.channels)m.decodeChannels[w.name]!==void 0&&(m.channelByteOffsets[w.name]=A),A+=w.pixelType*2;if(m.totalBytes=A,m.outLineWidth=m.width*m.outputChannels,a.lineOrder==="INCREASING_Y"?m.scanOrder=w=>w:m.scanOrder=w=>m.height-1-w,a.spec.singleTile){m.blockHeight=a.tiles.ySize,m.blockWidth=a.tiles.xSize;const w=zo(a.tiles,m.width,m.height),I=_n(w,m.width,a.tiles.xSize,a.tiles.roundingMode),b=_n(w,m.height,a.tiles.ySize,a.tiles.roundingMode);m.tileCount=I[0]*b[0];for(let C=0;C<w;C++)for(let O=0;O<b[C];O++)for(let L=0;L<I[C];L++)Ie(c,p);m.decode=Wo.bind(m)}else{m.blockWidth=m.width;const w=Math.ceil(m.height/m.blockHeight);for(let I=0;I<w;I++)Ie(c,p);m.decode=ko.bind(m)}return m}const En={value:0},Tn=new DataView(e),jo=new Uint8Array(e),pt=Vo(Tn,e,En),lt=Yo(pt,Tn,jo,En,this.type,this.outputFormat);if(lt.decode(),lt.shouldExpand){const a=lt.byteArray;if(this.outputFormat==vt)for(let c=0;c<a.length;c+=4)a[c+2]=a[c+1]=a[c];else if(this.outputFormat==Vt)for(let c=0;c<a.length;c+=2)a[c+1]=a[c]}return{header:pt,width:lt.width,height:lt.height,data:lt.byteArray,format:lt.format,colorSpace:lt.colorSpace,type:this.type}}setDataType(e){return this.type=e,this}setOutputFormat(e){return this.outputFormat=e,this}load(e,r,i,n){function o(s,l){s.colorSpace=l.colorSpace,s.minFilter=Te,s.magFilter=Te,s.generateMipmaps=!1,s.flipY=!1,r&&r(s,l)}return super.load(e,o,i,n)}}class Oc extends Et{load(e,r,i,n){const o=new Sa(this.manager);o.setResponseType("arraybuffer"),o.setRequestHeader(this.requestHeader),o.setPath(this.path),o.setWithCredentials(this.withCredentials),o.load(e,s=>{rr(s instanceof ArrayBuffer);try{r(s)}catch(l){n!=null?n(l):console.error(l),this.manager.itemError(e)}},i,n)}}function bc(t){return t instanceof _a?t.getContext().getExtension("OES_texture_float_linear")!=null:t.backend.hasFeature?.("float32-filterable")??!1}const Lc="This is not an object",Mc="This is not a Float16Array object",bn="This constructor is not a subclass of Float16Array",Ra="The constructor property value is not an object",Pc="Species constructor didn't return TypedArray object",Uc="Derived constructor created TypedArray object which was too small length",Qt="Attempting to access detached ArrayBuffer",Ti="Cannot convert undefined or null to object",xi="Cannot mix BigInt and other types, use explicit conversions",Ln="@@iterator property is not callable",Mn="Reduce of empty array with no initial value",Hc="The comparison function must be either a function or undefined",ai="Offset is out of bounds";function ie(t){return(e,...r)=>Ae(t,e,r)}function Ht(t,e){return ie(bt(t,e).get)}const{apply:Ae,construct:qt,defineProperty:Fc,get:oi,getOwnPropertyDescriptor:bt,getPrototypeOf:or,has:wi,ownKeys:Aa,set:Pn,setPrototypeOf:Ca}=Reflect,Gc=Proxy,{EPSILON:Bc,MAX_SAFE_INTEGER:Un,isFinite:Ia,isNaN:Lt}=Number,{iterator:je,species:zc,toStringTag:Fi,for:Wc}=Symbol,Mt=Object,{create:Ur,defineProperty:sr,freeze:kc,is:Hn}=Mt,yi=Mt.prototype,Vc=yi.__lookupGetter__?ie(yi.__lookupGetter__):(t,e)=>{if(t==null)throw se(Ti);let r=Mt(t);do{const i=bt(r,e);if(i!==void 0)return Je(i,"get")?i.get:void 0}while((r=or(r))!==null)},Je=Mt.hasOwn||ie(yi.hasOwnProperty),Da=Array,Na=Da.isArray,Hr=Da.prototype,Yc=ie(Hr.join),jc=ie(Hr.push),$c=ie(Hr.toLocaleString),Gi=Hr[je],Xc=ie(Gi),{abs:Zc,trunc:Oa}=Math,Fr=ArrayBuffer,qc=Fr.isView,ba=Fr.prototype,Kc=ie(ba.slice),Qc=Ht(ba,"byteLength"),Ri=typeof SharedArrayBuffer<"u"?SharedArrayBuffer:null,Jc=Ri&&Ht(Ri.prototype,"byteLength"),Bi=or(Uint8Array),el=Bi.from,ve=Bi.prototype,tl=ve[je],rl=ie(ve.keys),il=ie(ve.values),nl=ie(ve.entries),al=ie(ve.set),Fn=ie(ve.reverse),ol=ie(ve.fill),sl=ie(ve.copyWithin),Gn=ie(ve.sort),Yt=ie(ve.slice),cl=ie(ve.subarray),pe=Ht(ve,"buffer"),ft=Ht(ve,"byteOffset"),q=Ht(ve,"length"),La=Ht(ve,Fi),ll=Uint8Array,De=Uint16Array,Bn=(...t)=>Ae(el,De,t),zi=Uint32Array,ul=Float32Array,_t=or([][je]()),Gr=ie(_t.next),hl=ie((function*(){})().next),dl=or(_t),ml=DataView.prototype,pl=ie(ml.getUint16),se=TypeError,si=RangeError,Ma=WeakSet,Pa=Ma.prototype,fl=ie(Pa.add),vl=ie(Pa.has),Br=WeakMap,Wi=Br.prototype,yr=ie(Wi.get),gl=ie(Wi.has),ki=ie(Wi.set),Ua=new Br,Sl=Ur(null,{next:{value:function(){const t=yr(Ua,this);return Gr(t)}},[je]:{value:function(){return this}}});function Kt(t){if(t[je]===Gi&&_t.next===Gr)return t;const e=Ur(Sl);return ki(Ua,e,Xc(t)),e}const Ha=new Br,Fa=Ur(dl,{next:{value:function(){const t=yr(Ha,this);return hl(t)},writable:!0,configurable:!0}});for(const t of Aa(_t))t!=="next"&&sr(Fa,t,bt(_t,t));function zn(t){const e=Ur(Fa);return ki(Ha,e,t),e}function Rr(t){return t!==null&&typeof t=="object"||typeof t=="function"}function Wn(t){return t!==null&&typeof t=="object"}function Ar(t){return La(t)!==void 0}function Ai(t){const e=La(t);return e==="BigInt64Array"||e==="BigUint64Array"}function _l(t){try{return Na(t)?!1:(Qc(t),!0)}catch{return!1}}function Ga(t){if(Ri===null)return!1;try{return Jc(t),!0}catch{return!1}}function El(t){return _l(t)||Ga(t)}function kn(t){return Na(t)?t[je]===Gi&&_t.next===Gr:!1}function Tl(t){return Ar(t)?t[je]===tl&&_t.next===Gr:!1}function vr(t){if(typeof t!="string")return!1;const e=+t;return t!==e+""||!Ia(e)?!1:e===Oa(e)}const Cr=Wc("__Float16Array__");function xl(t){if(!Wn(t))return!1;const e=or(t);if(!Wn(e))return!1;const r=e.constructor;if(r===void 0)return!1;if(!Rr(r))throw se(Ra);return wi(r,Cr)}const Ci=1/Bc;function wl(t){return t+Ci-Ci}const Ba=6103515625e-14,yl=65504,za=.0009765625,Vn=za*Ba,Rl=za*Ci;function Al(t){const e=+t;if(!Ia(e)||e===0)return e;const r=e>0?1:-1,i=Zc(e);if(i<Ba)return r*wl(i/Vn)*Vn;const n=(1+Rl)*i,o=n-(n-i);return o>yl||Lt(o)?r*(1/0):r*o}const Wa=new Fr(4),ka=new ul(Wa),Va=new zi(Wa),Pe=new De(512),Ue=new ll(512);for(let t=0;t<256;++t){const e=t-127;e<-24?(Pe[t]=0,Pe[t|256]=32768,Ue[t]=24,Ue[t|256]=24):e<-14?(Pe[t]=1024>>-e-14,Pe[t|256]=1024>>-e-14|32768,Ue[t]=-e-1,Ue[t|256]=-e-1):e<=15?(Pe[t]=e+15<<10,Pe[t|256]=e+15<<10|32768,Ue[t]=13,Ue[t|256]=13):e<128?(Pe[t]=31744,Pe[t|256]=64512,Ue[t]=24,Ue[t|256]=24):(Pe[t]=31744,Pe[t|256]=64512,Ue[t]=13,Ue[t|256]=13)}function We(t){ka[0]=Al(t);const e=Va[0],r=e>>23&511;return Pe[r]+((e&8388607)>>Ue[r])}const Vi=new zi(2048);for(let t=1;t<1024;++t){let e=t<<13,r=0;for(;(e&8388608)===0;)e<<=1,r-=8388608;e&=-8388609,r+=947912704,Vi[t]=e|r}for(let t=1024;t<2048;++t)Vi[t]=939524096+(t-1024<<13);const Ft=new zi(64);for(let t=1;t<31;++t)Ft[t]=t<<23;Ft[31]=1199570944;Ft[32]=2147483648;for(let t=33;t<63;++t)Ft[t]=2147483648+(t-32<<23);Ft[63]=3347054592;const Ya=new De(64);for(let t=1;t<64;++t)t!==32&&(Ya[t]=1024);function K(t){const e=t>>10;return Va[0]=Vi[Ya[e]+(t&1023)]+Ft[e],ka[0]}function qe(t){const e=+t;return Lt(e)||e===0?0:Oa(e)}function ci(t){const e=qe(t);return e<0?0:e<Un?e:Un}function gr(t,e){if(!Rr(t))throw se(Lc);const r=t.constructor;if(r===void 0)return e;if(!Rr(r))throw se(Ra);return r[zc]??e}function Jt(t){if(Ga(t))return!1;try{return Kc(t,0,0),!1}catch{}return!0}function Yn(t,e){const r=Lt(t),i=Lt(e);if(r&&i)return 0;if(r)return 1;if(i||t<e)return-1;if(t>e)return 1;if(t===0&&e===0){const n=Hn(t,0),o=Hn(e,0);if(!n&&o)return-1;if(n&&!o)return 1}return 0}const Yi=2,Ir=new Br;function Dt(t){return gl(Ir,t)||!qc(t)&&xl(t)}function Z(t){if(!Dt(t))throw se(Mc)}function Sr(t,e){const r=Dt(t),i=Ar(t);if(!r&&!i)throw se(Pc);if(typeof e=="number"){let n;if(r){const o=F(t);n=q(o)}else n=q(t);if(n<e)throw se(Uc)}if(Ai(t))throw se(xi)}function F(t){const e=yr(Ir,t);if(e!==void 0){const n=pe(e);if(Jt(n))throw se(Qt);return e}const r=t.buffer;if(Jt(r))throw se(Qt);const i=qt(nt,[r,t.byteOffset,t.length],t.constructor);return yr(Ir,i)}function jn(t){const e=q(t),r=[];for(let i=0;i<e;++i)r[i]=K(t[i]);return r}const ja=new Ma;for(const t of Aa(ve)){if(t===Fi)continue;const e=bt(ve,t);Je(e,"get")&&typeof e.get=="function"&&fl(ja,e.get)}const Cl=kc({get(t,e,r){return vr(e)&&Je(t,e)?K(oi(t,e)):vl(ja,Vc(t,e))?oi(t,e):oi(t,e,r)},set(t,e,r,i){return vr(e)&&Je(t,e)?Pn(t,e,We(r)):Pn(t,e,r,i)},getOwnPropertyDescriptor(t,e){if(vr(e)&&Je(t,e)){const r=bt(t,e);return r.value=K(r.value),r}return bt(t,e)},defineProperty(t,e,r){return vr(e)&&Je(t,e)&&Je(r,"value")&&(r.value=We(r.value)),Fc(t,e,r)}});let nt=class fe{constructor(e,r,i){let n;if(Dt(e))n=qt(De,[F(e)],new.target);else if(Rr(e)&&!El(e)){let s,l;if(Ar(e)){s=e,l=q(e);const h=pe(e);if(Jt(h))throw se(Qt);if(Ai(e))throw se(xi);const f=new Fr(l*Yi);n=qt(De,[f],new.target)}else{const h=e[je];if(h!=null&&typeof h!="function")throw se(Ln);h!=null?kn(e)?(s=e,l=e.length):(s=[...e],l=s.length):(s=e,l=ci(s.length)),n=qt(De,[l],new.target)}for(let h=0;h<l;++h)n[h]=We(s[h])}else n=qt(De,arguments,new.target);const o=new Gc(n,Cl);return ki(Ir,o,n),o}static from(e,...r){const i=this;if(!wi(i,Cr))throw se(bn);if(i===fe){if(Dt(e)&&r.length===0){const g=F(e),y=new De(pe(g),ft(g),q(g));return new fe(pe(Yt(y)))}if(r.length===0)return new fe(pe(Bn(e,We)));const h=r[0],f=r[1];return new fe(pe(Bn(e,function(g,...y){return We(Ae(h,this,[g,...Kt(y)]))},f)))}let n,o;const s=e[je];if(s!=null&&typeof s!="function")throw se(Ln);if(s!=null)kn(e)?(n=e,o=e.length):Tl(e)?(n=e,o=q(e)):(n=[...e],o=n.length);else{if(e==null)throw se(Ti);n=Mt(e),o=ci(n.length)}const l=new i(o);if(r.length===0)for(let h=0;h<o;++h)l[h]=n[h];else{const h=r[0],f=r[1];for(let g=0;g<o;++g)l[g]=Ae(h,f,[n[g],g])}return l}static of(...e){const r=this;if(!wi(r,Cr))throw se(bn);const i=e.length;if(r===fe){const o=new fe(i),s=F(o);for(let l=0;l<i;++l)s[l]=We(e[l]);return o}const n=new r(i);for(let o=0;o<i;++o)n[o]=e[o];return n}keys(){Z(this);const e=F(this);return rl(e)}values(){Z(this);const e=F(this);return zn((function*(){for(const r of il(e))yield K(r)})())}entries(){Z(this);const e=F(this);return zn((function*(){for(const[r,i]of nl(e))yield[r,K(i)]})())}at(e){Z(this);const r=F(this),i=q(r),n=qe(e),o=n>=0?n:i+n;if(!(o<0||o>=i))return K(r[o])}with(e,r){Z(this);const i=F(this),n=q(i),o=qe(e),s=o>=0?o:n+o,l=+r;if(s<0||s>=n)throw si(ai);const h=new De(pe(i),ft(i),q(i)),f=new fe(pe(Yt(h))),g=F(f);return g[s]=We(l),f}map(e,...r){Z(this);const i=F(this),n=q(i),o=r[0],s=gr(i,fe);if(s===fe){const h=new fe(n),f=F(h);for(let g=0;g<n;++g){const y=K(i[g]);f[g]=We(Ae(e,o,[y,g,this]))}return h}const l=new s(n);Sr(l,n);for(let h=0;h<n;++h){const f=K(i[h]);l[h]=Ae(e,o,[f,h,this])}return l}filter(e,...r){Z(this);const i=F(this),n=q(i),o=r[0],s=[];for(let f=0;f<n;++f){const g=K(i[f]);Ae(e,o,[g,f,this])&&jc(s,g)}const l=gr(i,fe),h=new l(s);return Sr(h),h}reduce(e,...r){Z(this);const i=F(this),n=q(i);if(n===0&&r.length===0)throw se(Mn);let o,s;r.length===0?(o=K(i[0]),s=1):(o=r[0],s=0);for(let l=s;l<n;++l)o=e(o,K(i[l]),l,this);return o}reduceRight(e,...r){Z(this);const i=F(this),n=q(i);if(n===0&&r.length===0)throw se(Mn);let o,s;r.length===0?(o=K(i[n-1]),s=n-2):(o=r[0],s=n-1);for(let l=s;l>=0;--l)o=e(o,K(i[l]),l,this);return o}forEach(e,...r){Z(this);const i=F(this),n=q(i),o=r[0];for(let s=0;s<n;++s)Ae(e,o,[K(i[s]),s,this])}find(e,...r){Z(this);const i=F(this),n=q(i),o=r[0];for(let s=0;s<n;++s){const l=K(i[s]);if(Ae(e,o,[l,s,this]))return l}}findIndex(e,...r){Z(this);const i=F(this),n=q(i),o=r[0];for(let s=0;s<n;++s){const l=K(i[s]);if(Ae(e,o,[l,s,this]))return s}return-1}findLast(e,...r){Z(this);const i=F(this),n=q(i),o=r[0];for(let s=n-1;s>=0;--s){const l=K(i[s]);if(Ae(e,o,[l,s,this]))return l}}findLastIndex(e,...r){Z(this);const i=F(this),n=q(i),o=r[0];for(let s=n-1;s>=0;--s){const l=K(i[s]);if(Ae(e,o,[l,s,this]))return s}return-1}every(e,...r){Z(this);const i=F(this),n=q(i),o=r[0];for(let s=0;s<n;++s)if(!Ae(e,o,[K(i[s]),s,this]))return!1;return!0}some(e,...r){Z(this);const i=F(this),n=q(i),o=r[0];for(let s=0;s<n;++s)if(Ae(e,o,[K(i[s]),s,this]))return!0;return!1}set(e,...r){Z(this);const i=F(this),n=qe(r[0]);if(n<0)throw si(ai);if(e==null)throw se(Ti);if(Ai(e))throw se(xi);if(Dt(e))return al(F(this),F(e),n);if(Ar(e)){const h=pe(e);if(Jt(h))throw se(Qt)}const o=q(i),s=Mt(e),l=ci(s.length);if(n===1/0||l+n>o)throw si(ai);for(let h=0;h<l;++h)i[h+n]=We(s[h])}reverse(){Z(this);const e=F(this);return Fn(e),this}toReversed(){Z(this);const e=F(this),r=new De(pe(e),ft(e),q(e)),i=new fe(pe(Yt(r))),n=F(i);return Fn(n),i}fill(e,...r){Z(this);const i=F(this);return ol(i,We(e),...Kt(r)),this}copyWithin(e,r,...i){Z(this);const n=F(this);return sl(n,e,r,...Kt(i)),this}sort(e){Z(this);const r=F(this),i=e!==void 0?e:Yn;return Gn(r,(n,o)=>i(K(n),K(o))),this}toSorted(e){Z(this);const r=F(this);if(e!==void 0&&typeof e!="function")throw new se(Hc);const i=e!==void 0?e:Yn,n=new De(pe(r),ft(r),q(r)),o=new fe(pe(Yt(n))),s=F(o);return Gn(s,(l,h)=>i(K(l),K(h))),o}slice(e,r){Z(this);const i=F(this),n=gr(i,fe);if(n===fe){const B=new De(pe(i),ft(i),q(i));return new fe(pe(Yt(B,e,r)))}const o=q(i),s=qe(e),l=r===void 0?o:qe(r);let h;s===-1/0?h=0:s<0?h=o+s>0?o+s:0:h=o<s?o:s;let f;l===-1/0?f=0:l<0?f=o+l>0?o+l:0:f=o<l?o:l;const g=f-h>0?f-h:0,y=new n(g);if(Sr(y,g),g===0)return y;const R=pe(i);if(Jt(R))throw se(Qt);let P=0;for(;h<f;)y[P]=K(i[h]),++h,++P;return y}subarray(e,r){Z(this);const i=F(this),n=gr(i,fe),o=new De(pe(i),ft(i),q(i)),s=cl(o,e,r),l=new n(pe(s),ft(s),q(s));return Sr(l),l}indexOf(e,...r){Z(this);const i=F(this),n=q(i);let o=qe(r[0]);if(o===1/0)return-1;o<0&&(o+=n,o<0&&(o=0));for(let s=o;s<n;++s)if(Je(i,s)&&K(i[s])===e)return s;return-1}lastIndexOf(e,...r){Z(this);const i=F(this),n=q(i);let o=r.length>=1?qe(r[0]):n-1;if(o===-1/0)return-1;o>=0?o=o<n-1?o:n-1:o+=n;for(let s=o;s>=0;--s)if(Je(i,s)&&K(i[s])===e)return s;return-1}includes(e,...r){Z(this);const i=F(this),n=q(i);let o=qe(r[0]);if(o===1/0)return!1;o<0&&(o+=n,o<0&&(o=0));const s=Lt(e);for(let l=o;l<n;++l){const h=K(i[l]);if(s&&Lt(h)||h===e)return!0}return!1}join(e){Z(this);const r=F(this),i=jn(r);return Yc(i,e)}toLocaleString(...e){Z(this);const r=F(this),i=jn(r);return $c(i,...Kt(e))}get[Fi](){if(Dt(this))return"Float16Array"}};sr(nt,"BYTES_PER_ELEMENT",{value:Yi});sr(nt,Cr,{});Ca(nt,Bi);const Dr=nt.prototype;sr(Dr,"BYTES_PER_ELEMENT",{value:Yi});sr(Dr,je,{value:Dr.values,writable:!0,configurable:!0});Ca(Dr,ve);function Il(t,e,...r){return K(pl(t,e,...Kt(r)))}class Dl extends Et{constructor(e,r){super(r),this.parser=e}load(e,r,i,n){const o=new Oc(this.manager);o.setRequestHeader(this.requestHeader),o.setPath(this.path),o.setWithCredentials(this.withCredentials),o.load(e,s=>{try{r(this.parser(s))}catch(l){n!=null?n(l):console.error(l),this.manager.itemError(e)}},i,n)}}function Nl(t){const e=t instanceof Int8Array?rs:t instanceof Uint8Array?Ye:t instanceof Uint8ClampedArray?Ye:t instanceof Int16Array?is:t instanceof Uint16Array?ns:t instanceof Int32Array?as:t instanceof Uint32Array?os:t instanceof nt?Ve:t instanceof Float32Array?mt:t instanceof Float64Array?mt:null;return rr(e!=null),e}class gt extends Et{constructor(e,r,i={},n){super(n),this.textureClass=e,this.parser=r,this.options={format:vt,minFilter:Te,magFilter:Te,...i}}load(e,r,i,n){const o=new this.textureClass,s=new Dl(this.parser,this.manager);return s.setRequestHeader(this.requestHeader),s.setPath(this.path),s.setWithCredentials(this.withCredentials),s.load(e,l=>{o.image.data=l instanceof nt?new Uint16Array(l.buffer):l;const{width:h,height:f,depth:g,...y}=this.options;h!=null&&(o.image.width=h),f!=null&&(o.image.height=f),"depth"in o.image&&g!=null&&(o.image.depth=g),o.type=Nl(l),Object.assign(o,y),o.needsUpdate=!0,r?.(o)},i,n),o}}const Nr=He.clamp;He.euclideanModulo;He.inverseLerp;const $a=He.lerp,Ol=He.degToRad;He.radToDeg;He.isPowerOfTwo;He.ceilPowerOfTwo;He.floorPowerOfTwo;He.normalize;function bl(t,e,r,i=0,n=1){return He.mapLinear(t,e,r,i,n)}function Ll(t){return Math.min(Math.max(t,0),1)}function Y(t){return(e,r)=>{e instanceof Pt?Object.defineProperty(e,r,{enumerable:!0,get(){return this.defines?.[t]!=null},set(i){i!==this[r]&&(i?(this.defines??={},this.defines[t]="1"):delete this.defines?.[t],this.needsUpdate=!0)}}):Object.defineProperty(e,r,{enumerable:!0,get(){return this.defines.has(t)},set(i){i!==this[r]&&(i?this.defines.set(t,"1"):this.defines.delete(t),this.setChanged())}})}}function $n(t){return typeof t=="number"?Math.floor(t):typeof t=="string"?parseInt(t,10):typeof t=="boolean"?+t:0}function Tt(t,{min:e=Number.MIN_SAFE_INTEGER,max:r=Number.MAX_SAFE_INTEGER}={}){return(i,n)=>{i instanceof Pt?Object.defineProperty(i,n,{enumerable:!0,get(){const o=this.defines?.[t];return o!=null?$n(o):0},set(o){const s=this[n];o!==s&&(this.defines??={},this.defines[t]=Nr(o,e,r).toFixed(0),this.needsUpdate=!0)}}):Object.defineProperty(i,n,{enumerable:!0,get(){const o=this.defines.get(t);return o!=null?$n(o):0},set(o){const s=this[n];o!==s&&(this.defines.set(t,Nr(o,e,r).toFixed(0)),this.setChanged())}})}}function Xn(t){return typeof t=="number"?t:typeof t=="string"?parseFloat(t):typeof t=="boolean"?+t:0}function ji(t,{min:e=-1/0,max:r=1/0,precision:i=7}={}){return(n,o)=>{n instanceof Pt?Object.defineProperty(n,o,{enumerable:!0,get(){const s=this.defines?.[t];return s!=null?Xn(s):0},set(s){const l=this[o];s!==l&&(this.defines??={},this.defines[t]=Nr(s,e,r).toFixed(i),this.needsUpdate=!0)}}):Object.defineProperty(n,o,{enumerable:!0,get(){const s=this.defines.get(t);return s!=null?Xn(s):0},set(s){const l=this[o];s!==l&&(this.defines.set(t,Nr(s,e,r).toFixed(i)),this.setChanged())}})}}function Xa(t,{validate:e}={}){return(r,i)=>{r instanceof Pt?Object.defineProperty(r,i,{enumerable:!0,get(){return this.defines?.[t]},set(n){if(n!==this[i]){if(e?.(n)===!1){console.error(`Expression validation failed: ${n}`);return}this.defines??={},this.defines[t]=n,this.needsUpdate=!0}}}):Object.defineProperty(r,i,{enumerable:!0,get(){return this.defines.get(t)},set(n){if(n!==this[i]){if(e?.(n)===!1){console.error(`Expression validation failed: ${n}`);return}this.defines.set(t,n),this.setChanged()}}})}}function Zn(t,...e){const r={};for(let i=0;i<e.length;i+=2){const n=e[i],o=e[i+1];for(const s of o)r[s]={enumerable:!0,get:()=>n[s],set:l=>{n[s]=l}}}return Object.defineProperties(t,r),t}function qn(t,e,r){const i={};for(const n of r)i[n]={enumerable:!0,get:()=>e.uniforms[n].value,set:o=>{e.uniforms[n].value=o}};return Object.defineProperties(t,i),t}class li extends Et{constructor(e={},r){super(r),this.options=e}load(e,r,i,n){const{width:o,height:s,depth:l}=this.options,h=new et(null,o,s,l),f=new ya(this.manager);return f.setRequestHeader(this.requestHeader),f.setPath(this.path),f.setWithCredentials(this.withCredentials),f.load(e,g=>{const{image:y}=g;h.image={data:y.data,width:o??y.width,height:s??y.height,depth:l??Math.sqrt(y.height)},h.type=g.type,h.format=g.format,h.colorSpace=g.colorSpace,h.needsUpdate=!0;try{r?.(h)}catch(R){n!=null?n(R):console.error(R),this.manager.itemError(e)}},i,n),h}}class Kn extends Et{constructor(e={},r){super(r),this.options=e}load(e,r,i,n){const{width:o,height:s}=this.options,l=new vi(null,o,s),h=new ya(this.manager);return h.setRequestHeader(this.requestHeader),h.setPath(this.path),h.setWithCredentials(this.withCredentials),h.load(e,f=>{const{image:g}=f;l.image={data:g.data,width:o??g.width,height:s??g.height},l.type=f.type,l.format=f.format,l.colorSpace=f.colorSpace,l.needsUpdate=!0;try{r?.(l)}catch(y){n!=null?n(y):console.error(y),this.manager.itemError(e)}},i,n),l}}const Ml=/^[ \t]*#include +"([\w\d./]+)"/gm;function it(t,e){return t.replace(Ml,(r,i)=>{const n=i.split("/").reduce((o,s)=>typeof o!="string"&&o!=null?o[s]:void 0,e);if(typeof n!="string")throw new Error(`Could not find include for ${i}.`);return it(n,e)})}let _r;function Pl(){if(_r!=null)return _r;const t=new Uint32Array([268435456]);return _r=new Uint8Array(t.buffer,t.byteOffset,t.byteLength)[0]===0,_r}function Ul(t,e,r,i=!0){if(i===Pl())return new e(t);const n=Object.assign(new DataView(t),{getFloat16(s,l){return Il(this,s,l)}}),o=new e(n.byteLength/e.BYTES_PER_ELEMENT);for(let s=0,l=0;s<o.length;++s,l+=e.BYTES_PER_ELEMENT)o[s]=n[r](l,i);return o}const Qn=t=>new Uint8Array(t),jt=(t,e)=>Ul(t,nt,"getFloat16",e);const Hl=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*(?:i\s*\+\+|\+\+\s*i)\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Fl(t,e,r,i){let n="";for(let o=parseInt(e,10);o<parseInt(r,10);++o)n+=i.replace(/\[\s*i\s*\]/g,`[${o}]`).replace(/UNROLLED_LOOP_INDEX/g,`${o}`);return n}function cr(t){return t.replace(Hl,Fl)}const Gl=`// Reference: https://github.com/mrdoob/three.js/blob/r171/examples/jsm/csm/CSMShader.js

#ifndef SHADOW_CASCADE_COUNT
#error "SHADOW_CASCADE_COUNT macro must be defined."
#endif // SHADOW_CASCADE_COUNT

int getCascadeIndex(
  const mat4 viewMatrix,
  const vec3 worldPosition,
  const vec2 intervals[SHADOW_CASCADE_COUNT],
  const float near,
  const float far
) {
  vec4 viewPosition = viewMatrix * vec4(worldPosition, 1.0);
  float depth = viewZToOrthographicDepth(viewPosition.z, near, far);
  vec2 interval;
  #pragma unroll_loop_start
  for (int i = 0; i < 4; ++i) {
    #if UNROLLED_LOOP_INDEX < SHADOW_CASCADE_COUNT
    interval = intervals[i];
    if (depth >= interval.x && depth < interval.y) {
      return UNROLLED_LOOP_INDEX;
    }
    #endif // UNROLLED_LOOP_INDEX < SHADOW_CASCADE_COUNT
  }
  #pragma unroll_loop_end
  return SHADOW_CASCADE_COUNT - 1;
}

int getFadedCascadeIndex(
  const mat4 viewMatrix,
  const vec3 worldPosition,
  const vec2 intervals[SHADOW_CASCADE_COUNT],
  const float near,
  const float far,
  const float jitter
) {
  vec4 viewPosition = viewMatrix * vec4(worldPosition, 1.0);
  float depth = viewZToOrthographicDepth(viewPosition.z, near, far);

  vec2 interval;
  float intervalCenter;
  float closestEdge;
  float margin;
  int nextIndex = -1;
  int prevIndex = -1;
  float alpha;

  #pragma unroll_loop_start
  for (int i = 0; i < 4; ++i) {
    #if UNROLLED_LOOP_INDEX < SHADOW_CASCADE_COUNT
    interval = intervals[i];
    intervalCenter = (interval.x + interval.y) * 0.5;
    closestEdge = depth < intervalCenter ? interval.x : interval.y;
    margin = closestEdge * closestEdge * 0.5;
    interval += margin * vec2(-0.5, 0.5);

    #if UNROLLED_LOOP_INDEX < SHADOW_CASCADE_COUNT - 1
    if (depth >= interval.x && depth < interval.y) {
      prevIndex = nextIndex;
      nextIndex = UNROLLED_LOOP_INDEX;
      alpha = saturate(min(depth - interval.x, interval.y - depth) / margin);
    }
    #else // UNROLLED_LOOP_INDEX < SHADOW_CASCADE_COUNT - 1
    // Don't fade out the last cascade.
    if (depth >= interval.x) {
      prevIndex = nextIndex;
      nextIndex = UNROLLED_LOOP_INDEX;
      alpha = saturate((depth - interval.x) / margin);
    }
    #endif // UNROLLED_LOOP_INDEX < SHADOW_CASCADE_COUNT - 1
    #endif // UNROLLED_LOOP_INDEX < SHADOW_CASCADE_COUNT
  }
  #pragma unroll_loop_end

  return jitter <= alpha
    ? nextIndex
    : prevIndex;
}
`,Bl=`// cSpell:words logdepthbuf

#ifdef DEPTH_PACKING
float readDepthValue(const sampler2D depthBuffer, const vec2 uv) {
  #if DEPTH_PACKING == 3201
  return unpackRGBAToDepth(texture(depthBuffer, uv));
  #else // DEPTH_PACKING == 3201
  return texture(depthBuffer, uv).r;
  #endif // DEPTH_PACKING == 3201
}
#endif // DEPTH_PACKING

float reverseLogDepth(const float depth, const float near, const float far) {
  #if defined(USE_LOGDEPTHBUF) || defined(USE_LOGARITHMIC_DEPTH_BUFFER)
  float d = pow(2.0, depth * log2(far + 1.0)) - 1.0;
  float a = far / (far - near);
  float b = far * near / (near - far);
  return a + b / d;
  #else // defined(USE_LOGARITHMIC_DEPTH_BUFFER) || defined(USE_LOGARITHMIC_DEPTH_BUFFER)
  return depth;
  #endif // defined(USE_LOGARITHMIC_DEPTH_BUFFER) || defined(USE_LOGARITHMIC_DEPTH_BUFFER)
}

float linearizeDepth(const float depth, const float near, const float far) {
  float ndc = depth * 2.0 - 1.0;
  return 2.0 * near * far / (far + near - ndc * (far - near));
}
`,zl=`float checker(const vec2 uv, const vec2 repeats) {
  vec2 c = floor(repeats * uv);
  float result = mod(c.x + c.y, 2.0);
  return sign(result);
}

float checker(const vec2 uv, const float repeats) {
  return checker(uv, vec2(repeats));
}
`,Wl=`// Reference: https://advances.realtimerendering.com/s2014/index.html#_NEXT_GENERATION_POST

float interleavedGradientNoise(const vec2 coord) {
  const vec3 magic = vec3(0.06711056, 0.00583715, 52.9829189);
  return fract(magic.z * fract(dot(coord, magic.xy)));
}
`,kl=`#if !defined(saturate)
#define saturate(a) clamp(a, 0.0, 1.0)
#endif // !defined(saturate)

float remap(const float x, const float min1, const float max1, const float min2, const float max2) {
  return min2 + (x - min1) / (max1 - min1) * (max2 - min2);
}

vec2 remap(const vec2 x, const vec2 min1, const vec2 max1, const vec2 min2, const vec2 max2) {
  return min2 + (x - min1) / (max1 - min1) * (max2 - min2);
}

vec3 remap(const vec3 x, const vec3 min1, const vec3 max1, const vec3 min2, const vec3 max2) {
  return min2 + (x - min1) / (max1 - min1) * (max2 - min2);
}

vec4 remap(const vec4 x, const vec4 min1, const vec4 max1, const vec4 min2, const vec4 max2) {
  return min2 + (x - min1) / (max1 - min1) * (max2 - min2);
}

float remapClamped(
  const float x,
  const float min1,
  const float max1,
  const float min2,
  const float max2
) {
  return clamp(min2 + (x - min1) / (max1 - min1) * (max2 - min2), min2, max2);
}

vec2 remapClamped(
  const vec2 x,
  const vec2 min1,
  const vec2 max1,
  const vec2 min2,
  const vec2 max2
) {
  return clamp(min2 + (x - min1) / (max1 - min1) * (max2 - min2), min2, max2);
}

vec3 remapClamped(
  const vec3 x,
  const vec3 min1,
  const vec3 max1,
  const vec3 min2,
  const vec3 max2
) {
  return clamp(min2 + (x - min1) / (max1 - min1) * (max2 - min2), min2, max2);
}

vec4 remapClamped(
  const vec4 x,
  const vec4 min1,
  const vec4 max1,
  const vec4 min2,
  const vec4 max2
) {
  return clamp(min2 + (x - min1) / (max1 - min1) * (max2 - min2), min2, max2);
}

// Implicitly remap to 0 and 1
float remap(const float x, const float min1, const float max1) {
  return (x - min1) / (max1 - min1);
}

vec2 remap(const vec2 x, const vec2 min1, const vec2 max1) {
  return (x - min1) / (max1 - min1);
}

vec3 remap(const vec3 x, const vec3 min1, const vec3 max1) {
  return (x - min1) / (max1 - min1);
}

vec4 remap(const vec4 x, const vec4 min1, const vec4 max1) {
  return (x - min1) / (max1 - min1);
}

float remapClamped(const float x, const float min1, const float max1) {
  return saturate((x - min1) / (max1 - min1));
}

vec2 remapClamped(const vec2 x, const vec2 min1, const vec2 max1) {
  return saturate((x - min1) / (max1 - min1));
}

vec3 remapClamped(const vec3 x, const vec3 min1, const vec3 max1) {
  return saturate((x - min1) / (max1 - min1));
}

vec4 remapClamped(const vec4 x, const vec4 min1, const vec4 max1) {
  return saturate((x - min1) / (max1 - min1));
}
`,Vl=`// Reference: https://jcgt.org/published/0003/02/01/paper.pdf

vec2 signNotZero(vec2 v) {
  return vec2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0);
}

vec2 packNormalToVec2(vec3 v) {
  vec2 p = v.xy * (1.0 / (abs(v.x) + abs(v.y) + abs(v.z)));
  return v.z <= 0.0
    ? (1.0 - abs(p.yx)) * signNotZero(p)
    : p;
}

vec3 unpackVec2ToNormal(vec2 e) {
  vec3 v = vec3(e.xy, 1.0 - abs(e.x) - abs(e.y));
  if (v.z < 0.0) {
    v.xy = (1.0 - abs(v.yx)) * signNotZero(v.xy);
  }
  return normalize(v);
}
`,Yl=`float raySphereFirstIntersection(
  const vec3 origin,
  const vec3 direction,
  const vec3 center,
  const float radius
) {
  vec3 a = origin - center;
  float b = 2.0 * dot(direction, a);
  float c = dot(a, a) - radius * radius;
  float discriminant = b * b - 4.0 * c;
  return discriminant < 0.0
    ? -1.0
    : (-b - sqrt(discriminant)) * 0.5;
}

float raySphereFirstIntersection(const vec3 origin, const vec3 direction, const float radius) {
  return raySphereFirstIntersection(origin, direction, vec3(0.0), radius);
}

vec4 raySphereFirstIntersection(
  const vec3 origin,
  const vec3 direction,
  const vec3 center,
  const vec4 radius
) {
  vec3 a = origin - center;
  float b = 2.0 * dot(direction, a);
  vec4 c = dot(a, a) - radius * radius;
  vec4 discriminant = b * b - 4.0 * c;
  vec4 mask = step(discriminant, vec4(0.0));
  return mix((-b - sqrt(max(vec4(0.0), discriminant))) * 0.5, vec4(-1.0), mask);
}

vec4 raySphereFirstIntersection(const vec3 origin, const vec3 direction, const vec4 radius) {
  return raySphereFirstIntersection(origin, direction, vec3(0.0), radius);
}

float raySphereSecondIntersection(
  const vec3 origin,
  const vec3 direction,
  const vec3 center,
  const float radius
) {
  vec3 a = origin - center;
  float b = 2.0 * dot(direction, a);
  float c = dot(a, a) - radius * radius;
  float discriminant = b * b - 4.0 * c;
  return discriminant < 0.0
    ? -1.0
    : (-b + sqrt(discriminant)) * 0.5;
}

float raySphereSecondIntersection(const vec3 origin, const vec3 direction, const float radius) {
  return raySphereSecondIntersection(origin, direction, vec3(0.0), radius);
}

vec4 raySphereSecondIntersection(
  const vec3 origin,
  const vec3 direction,
  const vec3 center,
  const vec4 radius
) {
  vec3 a = origin - center;
  float b = 2.0 * dot(direction, a);
  vec4 c = dot(a, a) - radius * radius;
  vec4 discriminant = b * b - 4.0 * c;
  vec4 mask = step(discriminant, vec4(0.0));
  return mix((-b + sqrt(max(vec4(0.0), discriminant))) * 0.5, vec4(-1.0), mask);
}

vec4 raySphereSecondIntersection(const vec3 origin, const vec3 direction, const vec4 radius) {
  return raySphereSecondIntersection(origin, direction, vec3(0.0), radius);
}

void raySphereIntersections(
  const vec3 origin,
  const vec3 direction,
  const vec3 center,
  const float radius,
  out float intersection1,
  out float intersection2
) {
  vec3 a = origin - center;
  float b = 2.0 * dot(direction, a);
  float c = dot(a, a) - radius * radius;
  float discriminant = b * b - 4.0 * c;
  if (discriminant < 0.0) {
    intersection1 = -1.0;
    intersection2 = -1.0;
    return;
  } else {
    float Q = sqrt(discriminant);
    intersection1 = (-b - Q) * 0.5;
    intersection2 = (-b + Q) * 0.5;
  }
}

void raySphereIntersections(
  const vec3 origin,
  const vec3 direction,
  const float radius,
  out float intersection1,
  out float intersection2
) {
  raySphereIntersections(origin, direction, vec3(0.0), radius, intersection1, intersection2);
}

void raySphereIntersections(
  const vec3 origin,
  const vec3 direction,
  const vec3 center,
  const vec4 radius,
  out vec4 intersection1,
  out vec4 intersection2
) {
  vec3 a = origin - center;
  float b = 2.0 * dot(direction, a);
  vec4 c = dot(a, a) - radius * radius;
  vec4 discriminant = b * b - 4.0 * c;
  vec4 mask = step(discriminant, vec4(0.0));
  vec4 Q = sqrt(max(vec4(0.0), discriminant));
  intersection1 = mix((-b - Q) * 0.5, vec4(-1.0), mask);
  intersection2 = mix((-b + Q) * 0.5, vec4(-1.0), mask);
}

void raySphereIntersections(
  const vec3 origin,
  const vec3 direction,
  const vec4 radius,
  out vec4 intersection1,
  out vec4 intersection2
) {
  raySphereIntersections(origin, direction, vec3(0.0), radius, intersection1, intersection2);
}
`,jl=`vec3 screenToView(
  const vec2 uv,
  const float depth,
  const float viewZ,
  const mat4 projectionMatrix,
  const mat4 inverseProjectionMatrix
) {
  vec4 clip = vec4(vec3(uv, depth) * 2.0 - 1.0, 1.0);
  float clipW = projectionMatrix[2][3] * viewZ + projectionMatrix[3][3];
  clip *= clipW;
  return (inverseProjectionMatrix * clip).xyz;
}
`,$l=`// A fifth-order polynomial approximation of Turbo color map.
// See: https://observablehq.com/@mbostock/turbo
// prettier-ignore
vec3 turbo(const float x) {
  float r = 0.1357 + x * (4.5974 - x * (42.3277 - x * (130.5887 - x * (150.5666 - x * 58.1375))));
  float g = 0.0914 + x * (2.1856 + x * (4.8052 - x * (14.0195 - x * (4.2109 + x * 2.7747))));
  float b = 0.1067 + x * (12.5925 - x * (60.1097 - x * (109.0745 - x * (88.5066 - x * 26.8183))));
  return vec3(r, g, b);
}
`,Xl=`// Reference: https://www.gamedev.net/tutorials/programming/graphics/contact-hardening-soft-shadows-made-fast-r4906/

vec2 vogelDisk(const int index, const int sampleCount, const float phi) {
  const float goldenAngle = 2.39996322972865332;
  float r = sqrt(float(index) + 0.5) / sqrt(float(sampleCount));
  float theta = float(index) * goldenAngle + phi;
  return r * vec2(cos(theta), sin(theta));
}
`,Za=Gl,qa=Bl,Zl=zl,Ka=Wl,$i=kl,ql=Vl,zr=Yl,Kl=jl,Qa=$l,Ja=Xl,Xi=64,Zi=16,qi=32,Ki=128,Qi=32,Ji=8,Ql=Ji*Qi,Jl=Ki,eu=qi,en=256,tn=64,Or=1/1e3,tu=new D;function rn(t,e,r,i){const n=r.projectOnSurface(t,tu);return n!=null?r.getOsculatingSphereCenter(n,e,i).negate():i.setScalar(0)}const Wr=`// Based on: https://github.com/ebruneton/precomputed_atmospheric_scattering/blob/master/atmosphere/functions.glsl

/**
 * Copyright (c) 2017 Eric Bruneton
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holders nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
 *
 * Precomputed Atmospheric Scattering
 * Copyright (c) 2008 INRIA
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holders nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
 */

Number ClampCosine(const Number mu) {
  return clamp(mu, Number(-1.0), Number(1.0));
}

Length ClampDistance(const Length d) {
  return max(d, 0.0 * m);
}

Length ClampRadius(const AtmosphereParameters atmosphere, const Length r) {
  return clamp(r, atmosphere.bottom_radius, atmosphere.top_radius);
}

Length SafeSqrt(const Area a) {
  return sqrt(max(a, 0.0 * m2));
}

Length DistanceToTopAtmosphereBoundary(const AtmosphereParameters atmosphere,
    const Length r, const Number mu) {
  assert(r <= atmosphere.top_radius);
  assert(mu >= -1.0 && mu <= 1.0);
  Area discriminant = r * r * (mu * mu - 1.0) +
      atmosphere.top_radius * atmosphere.top_radius;
  return ClampDistance(-r * mu + SafeSqrt(discriminant));
}

Length DistanceToBottomAtmosphereBoundary(const AtmosphereParameters atmosphere,
    const Length r, const Number mu) {
  assert(r >= atmosphere.bottom_radius);
  assert(mu >= -1.0 && mu <= 1.0);
  Area discriminant = r * r * (mu * mu - 1.0) +
      atmosphere.bottom_radius * atmosphere.bottom_radius;
  return ClampDistance(-r * mu - SafeSqrt(discriminant));
}

bool RayIntersectsGround(const AtmosphereParameters atmosphere,
    const Length r, const Number mu) {
  assert(r >= atmosphere.bottom_radius);
  assert(mu >= -1.0 && mu <= 1.0);
  return mu < 0.0 && r * r * (mu * mu - 1.0) +
      atmosphere.bottom_radius * atmosphere.bottom_radius >= 0.0 * m2;
}

Number GetTextureCoordFromUnitRange(const Number x, const int texture_size) {
  return 0.5 / Number(texture_size) + x * (1.0 - 1.0 / Number(texture_size));
}

vec2 GetTransmittanceTextureUvFromRMu(const AtmosphereParameters atmosphere,
    const Length r, const Number mu) {
  assert(r >= atmosphere.bottom_radius && r <= atmosphere.top_radius);
  assert(mu >= -1.0 && mu <= 1.0);
  // Distance to top atmosphere boundary for a horizontal ray at ground level.
  Length H = sqrt(atmosphere.top_radius * atmosphere.top_radius -
      atmosphere.bottom_radius * atmosphere.bottom_radius);
  // Distance to the horizon.
  Length rho =
      SafeSqrt(r * r - atmosphere.bottom_radius * atmosphere.bottom_radius);
  // Distance to the top atmosphere boundary for the ray (r,mu), and its minimum
  // and maximum values over all mu - obtained for (r,1) and (r,mu_horizon).
  Length d = DistanceToTopAtmosphereBoundary(atmosphere, r, mu);
  Length d_min = atmosphere.top_radius - r;
  Length d_max = rho + H;
  Number x_mu = (d - d_min) / (d_max - d_min);
  Number x_r = rho / H;
  return vec2(GetTextureCoordFromUnitRange(x_mu, TRANSMITTANCE_TEXTURE_WIDTH),
              GetTextureCoordFromUnitRange(x_r, TRANSMITTANCE_TEXTURE_HEIGHT));
}

DimensionlessSpectrum GetTransmittanceToTopAtmosphereBoundary(
    const AtmosphereParameters atmosphere,
    const TransmittanceTexture transmittance_texture,
    const Length r, const Number mu) {
  assert(r >= atmosphere.bottom_radius && r <= atmosphere.top_radius);
  vec2 uv = GetTransmittanceTextureUvFromRMu(atmosphere, r, mu);
  // @shotamatsuda: Added for the precomputation stage in half-float precision.
  #ifdef TRANSMITTANCE_PRECISION_LOG
  // Manually interpolate the transmittance instead of the optical depth.
  const vec2 size = vec2(TRANSMITTANCE_TEXTURE_WIDTH, TRANSMITTANCE_TEXTURE_HEIGHT);
  const vec3 texel_size = vec3(1.0 / size, 0.0);
  vec2 coord = (uv * size) - 0.5;
  vec2 i = (floor(coord) + 0.5) * texel_size.xy;
  vec2 f = fract(coord);
  vec4 t1 = exp(-texture(transmittance_texture, i));
  vec4 t2 = exp(-texture(transmittance_texture, i + texel_size.xz));
  vec4 t3 = exp(-texture(transmittance_texture, i + texel_size.zy));
  vec4 t4 = exp(-texture(transmittance_texture, i + texel_size.xy));
  return DimensionlessSpectrum(mix(mix(t1, t2, f.x), mix(t3, t4, f.x), f.y));
  #else // TRANSMITTANCE_PRECISION_LOG
  return DimensionlessSpectrum(texture(transmittance_texture, uv));
  #endif // TRANSMITTANCE_PRECISION_LOG
}

DimensionlessSpectrum GetTransmittance(
    const AtmosphereParameters atmosphere,
    const TransmittanceTexture transmittance_texture,
    const Length r, const Number mu, const Length d,
    const bool ray_r_mu_intersects_ground) {
  assert(r >= atmosphere.bottom_radius && r <= atmosphere.top_radius);
  assert(mu >= -1.0 && mu <= 1.0);
  assert(d >= 0.0 * m);

  Length r_d = ClampRadius(atmosphere, sqrt(d * d + 2.0 * r * mu * d + r * r));
  Number mu_d = ClampCosine((r * mu + d) / r_d);

  if (ray_r_mu_intersects_ground) {
    return min(
        GetTransmittanceToTopAtmosphereBoundary(
            atmosphere, transmittance_texture, r_d, -mu_d) /
        GetTransmittanceToTopAtmosphereBoundary(
            atmosphere, transmittance_texture, r, -mu),
        DimensionlessSpectrum(1.0));
  } else {
    return min(
        GetTransmittanceToTopAtmosphereBoundary(
            atmosphere, transmittance_texture, r, mu) /
        GetTransmittanceToTopAtmosphereBoundary(
            atmosphere, transmittance_texture, r_d, mu_d),
        DimensionlessSpectrum(1.0));
  }
}

DimensionlessSpectrum GetTransmittanceToSun(
    const AtmosphereParameters atmosphere,
    const TransmittanceTexture transmittance_texture,
    const Length r, const Number mu_s) {
  Number sin_theta_h = atmosphere.bottom_radius / r;
  Number cos_theta_h = -sqrt(max(1.0 - sin_theta_h * sin_theta_h, 0.0));
  return GetTransmittanceToTopAtmosphereBoundary(
          atmosphere, transmittance_texture, r, mu_s) *
      smoothstep(-sin_theta_h * atmosphere.sun_angular_radius / rad,
                 sin_theta_h * atmosphere.sun_angular_radius / rad,
                 mu_s - cos_theta_h);
}

InverseSolidAngle RayleighPhaseFunction(const Number nu) {
  InverseSolidAngle k = 3.0 / (16.0 * PI * sr);
  return k * (1.0 + nu * nu);
}

InverseSolidAngle MiePhaseFunction(const Number g, const Number nu) {
  InverseSolidAngle k = 3.0 / (8.0 * PI * sr) * (1.0 - g * g) / (2.0 + g * g);
  return k * (1.0 + nu * nu) / pow(1.0 + g * g - 2.0 * g * nu, 1.5);
}

vec4 GetScatteringTextureUvwzFromRMuMuSNu(const AtmosphereParameters atmosphere,
    const Length r, const Number mu, const Number mu_s, const Number nu,
    const bool ray_r_mu_intersects_ground) {
  assert(r >= atmosphere.bottom_radius && r <= atmosphere.top_radius);
  assert(mu >= -1.0 && mu <= 1.0);
  assert(mu_s >= -1.0 && mu_s <= 1.0);
  assert(nu >= -1.0 && nu <= 1.0);

  // Distance to top atmosphere boundary for a horizontal ray at ground level.
  Length H = sqrt(atmosphere.top_radius * atmosphere.top_radius -
      atmosphere.bottom_radius * atmosphere.bottom_radius);
  // Distance to the horizon.
  Length rho =
      SafeSqrt(r * r - atmosphere.bottom_radius * atmosphere.bottom_radius);
  Number u_r = GetTextureCoordFromUnitRange(rho / H, SCATTERING_TEXTURE_R_SIZE);

  // Discriminant of the quadratic equation for the intersections of the ray
  // (r,mu) with the ground (see RayIntersectsGround).
  Length r_mu = r * mu;
  Area discriminant =
      r_mu * r_mu - r * r + atmosphere.bottom_radius * atmosphere.bottom_radius;
  Number u_mu;
  if (ray_r_mu_intersects_ground) {
    // Distance to the ground for the ray (r,mu), and its minimum and maximum
    // values over all mu - obtained for (r,-1) and (r,mu_horizon).
    Length d = -r_mu - SafeSqrt(discriminant);
    Length d_min = r - atmosphere.bottom_radius;
    Length d_max = rho;
    u_mu = 0.5 - 0.5 * GetTextureCoordFromUnitRange(d_max == d_min ? 0.0 :
        (d - d_min) / (d_max - d_min), SCATTERING_TEXTURE_MU_SIZE / 2);
  } else {
    // Distance to the top atmosphere boundary for the ray (r,mu), and its
    // minimum and maximum values over all mu - obtained for (r,1) and
    // (r,mu_horizon).
    Length d = -r_mu + SafeSqrt(discriminant + H * H);
    Length d_min = atmosphere.top_radius - r;
    Length d_max = rho + H;
    u_mu = 0.5 + 0.5 * GetTextureCoordFromUnitRange(
        (d - d_min) / (d_max - d_min), SCATTERING_TEXTURE_MU_SIZE / 2);
  }

  Length d = DistanceToTopAtmosphereBoundary(
      atmosphere, atmosphere.bottom_radius, mu_s);
  Length d_min = atmosphere.top_radius - atmosphere.bottom_radius;
  Length d_max = H;
  Number a = (d - d_min) / (d_max - d_min);
  Length D = DistanceToTopAtmosphereBoundary(
      atmosphere, atmosphere.bottom_radius, atmosphere.mu_s_min);
  Number A = (D - d_min) / (d_max - d_min);
  // An ad-hoc function equal to 0 for mu_s = mu_s_min (because then d = D and
  // thus a = A), equal to 1 for mu_s = 1 (because then d = d_min and thus
  // a = 0), and with a large slope around mu_s = 0, to get more texture
  // samples near the horizon.
  Number u_mu_s = GetTextureCoordFromUnitRange(
      max(1.0 - a / A, 0.0) / (1.0 + a), SCATTERING_TEXTURE_MU_S_SIZE);

  Number u_nu = (nu + 1.0) / 2.0;
  return vec4(u_nu, u_mu_s, u_mu, u_r);
}

vec2 GetIrradianceTextureUvFromRMuS(const AtmosphereParameters atmosphere,
    const Length r, const Number mu_s) {
  assert(r >= atmosphere.bottom_radius && r <= atmosphere.top_radius);
  assert(mu_s >= -1.0 && mu_s <= 1.0);
  Number x_r = (r - atmosphere.bottom_radius) /
      (atmosphere.top_radius - atmosphere.bottom_radius);
  Number x_mu_s = mu_s * 0.5 + 0.5;
  return vec2(GetTextureCoordFromUnitRange(x_mu_s, IRRADIANCE_TEXTURE_WIDTH),
              GetTextureCoordFromUnitRange(x_r, IRRADIANCE_TEXTURE_HEIGHT));
}

IrradianceSpectrum GetIrradiance(
    const AtmosphereParameters atmosphere,
    const IrradianceTexture irradiance_texture,
    const Length r, const Number mu_s) {
  vec2 uv = GetIrradianceTextureUvFromRMuS(atmosphere, r, mu_s);
  return IrradianceSpectrum(texture(irradiance_texture, uv));
}
`,kr=`// Based on: https://github.com/ebruneton/precomputed_atmospheric_scattering/blob/master/atmosphere/definitions.glsl

/**
 * Copyright (c) 2017 Eric Bruneton
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holders nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
 */

#define assert(x)

#define Length float
#define Wavelength float
#define Angle float
#define SolidAngle float
#define Power float
#define LuminousPower float

#define Number float
#define InverseLength float
#define Area float
#define Volume float
#define NumberDensity float
#define Irradiance float
#define Radiance float
#define SpectralPower float
#define SpectralIrradiance float
#define SpectralRadiance float
#define SpectralRadianceDensity float
#define ScatteringCoefficient float
#define InverseSolidAngle float
#define LuminousIntensity float
#define Luminance float
#define Illuminance float

// A generic function from Wavelength to some other type.
#define AbstractSpectrum vec3
// A function from Wavelength to Number.
#define DimensionlessSpectrum vec3
// A function from Wavelength to SpectralPower.
#define PowerSpectrum vec3
// A function from Wavelength to SpectralIrradiance.
#define IrradianceSpectrum vec3
// A function from Wavelength to SpectralRadiance.
#define RadianceSpectrum vec3
// A function from Wavelength to SpectralRadianceDensity.
#define RadianceDensitySpectrum vec3
// A function from Wavelength to ScatteringCoefficient.
#define ScatteringSpectrum vec3

// A position in 3D (3 length values).
#define Position vec3
// A unit direction vector in 3D (3 unit-less values).
#define Direction vec3
// A vector of 3 luminance values.
#define Luminance3 vec3
// A vector of 3 illuminance values.
#define Illuminance3 vec3

#define TransmittanceTexture sampler2D
#define AbstractScatteringTexture sampler3D
#define ReducedScatteringTexture sampler3D
#define ScatteringTexture sampler3D
#define ScatteringDensityTexture sampler3D
#define IrradianceTexture sampler2D

const Length m = 1.0;
const Wavelength nm = 1.0;
const Angle rad = 1.0;
const SolidAngle sr = 1.0;
const Power watt = 1.0;
const LuminousPower lm = 1.0;

#if !defined(PI)
const float PI = 3.14159265358979323846;
#endif // !defined(PI)

const Length km = 1000.0 * m;
const Area m2 = m * m;
const Volume m3 = m * m * m;
const Angle pi = PI * rad;
const Angle deg = pi / 180.0;
const Irradiance watt_per_square_meter = watt / m2;
const Radiance watt_per_square_meter_per_sr = watt / (m2 * sr);
const SpectralIrradiance watt_per_square_meter_per_nm = watt / (m2 * nm);
const SpectralRadiance watt_per_square_meter_per_sr_per_nm = watt / (m2 * sr * nm);
const SpectralRadianceDensity watt_per_cubic_meter_per_sr_per_nm = watt / (m3 * sr * nm);
const LuminousIntensity cd = lm / sr;
const LuminousIntensity kcd = 1000.0 * cd;
const Luminance cd_per_square_meter = cd / m2;
const Luminance kcd_per_square_meter = kcd / m2;

struct DensityProfileLayer {
  Length width;
  Number exp_term;
  InverseLength exp_scale;
  InverseLength linear_term;
  Number constant_term;
};

struct DensityProfile {
  DensityProfileLayer layers[2];
};

// See AtmosphereParameter.ts for further details.
struct AtmosphereParameters {
  IrradianceSpectrum solar_irradiance;
  Angle sun_angular_radius;
  Length bottom_radius;
  Length top_radius;
  DensityProfile rayleigh_density;
  ScatteringSpectrum rayleigh_scattering;
  DensityProfile mie_density;
  ScatteringSpectrum mie_scattering;
  ScatteringSpectrum mie_extinction;
  Number mie_phase_function_g;
  DensityProfile absorption_density;
  ScatteringSpectrum absorption_extinction;
  DimensionlessSpectrum ground_albedo;
  Number mu_s_min;
};
`,Vr=`// Based on: https://github.com/ebruneton/precomputed_atmospheric_scattering/blob/master/atmosphere/functions.glsl

/**
 * Copyright (c) 2017 Eric Bruneton
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holders nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
 *
 * Precomputed Atmospheric Scattering
 * Copyright (c) 2008 INRIA
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holders nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
 */

#ifdef COMBINED_SCATTERING_TEXTURES
vec3 GetExtrapolatedSingleMieScattering(
    const AtmosphereParameters atmosphere, const vec4 scattering) {
  // Algebraically this can never be negative, but rounding errors can produce
  // that effect for sufficiently short view rays.
  // @shotamatsuda: Avoid division by infinitesimal values.
  // See https://github.com/takram-design-engineering/three-geospatial/issues/47
  if (scattering.r < 1e-5) {
    return vec3(0.0);
  }
  return scattering.rgb * scattering.a / scattering.r *
	    (atmosphere.rayleigh_scattering.r / atmosphere.mie_scattering.r) *
	    (atmosphere.mie_scattering / atmosphere.rayleigh_scattering);
}
#endif // COMBINED_SCATTERING_TEXTURES

IrradianceSpectrum GetCombinedScattering(
    const AtmosphereParameters atmosphere,
    const ReducedScatteringTexture scattering_texture,
    const ReducedScatteringTexture single_mie_scattering_texture,
    const Length r, const Number mu, const Number mu_s, const Number nu,
    const bool ray_r_mu_intersects_ground,
    out IrradianceSpectrum single_mie_scattering) {
  vec4 uvwz = GetScatteringTextureUvwzFromRMuMuSNu(
      atmosphere, r, mu, mu_s, nu, ray_r_mu_intersects_ground);
  Number tex_coord_x = uvwz.x * Number(SCATTERING_TEXTURE_NU_SIZE - 1);
  Number tex_x = floor(tex_coord_x);
  Number lerp = tex_coord_x - tex_x;
  vec3 uvw0 = vec3((tex_x + uvwz.y) / Number(SCATTERING_TEXTURE_NU_SIZE),
      uvwz.z, uvwz.w);
  vec3 uvw1 = vec3((tex_x + 1.0 + uvwz.y) / Number(SCATTERING_TEXTURE_NU_SIZE),
      uvwz.z, uvwz.w);
#ifdef COMBINED_SCATTERING_TEXTURES
  vec4 combined_scattering =
      texture(scattering_texture, uvw0) * (1.0 - lerp) +
      texture(scattering_texture, uvw1) * lerp;
  IrradianceSpectrum scattering = IrradianceSpectrum(combined_scattering);
  single_mie_scattering =
      GetExtrapolatedSingleMieScattering(atmosphere, combined_scattering);
#else // COMBINED_SCATTERING_TEXTURES
  IrradianceSpectrum scattering = IrradianceSpectrum(
      texture(scattering_texture, uvw0) * (1.0 - lerp) +
      texture(scattering_texture, uvw1) * lerp);
  single_mie_scattering = IrradianceSpectrum(
      texture(single_mie_scattering_texture, uvw0) * (1.0 - lerp) +
      texture(single_mie_scattering_texture, uvw1) * lerp);
#endif // COMBINED_SCATTERING_TEXTURES
  return scattering;
}

// @shotamatsuda: Added for reading higher-order scattering texture.
#ifdef HAS_HIGHER_ORDER_SCATTERING_TEXTURE
IrradianceSpectrum GetScattering(
    const AtmosphereParameters atmosphere,
    const ReducedScatteringTexture scattering_texture,
    const Length r, const Number mu, const Number mu_s, const Number nu,
    const bool ray_r_mu_intersects_ground) {
  vec4 uvwz = GetScatteringTextureUvwzFromRMuMuSNu(
      atmosphere, r, mu, mu_s, nu, ray_r_mu_intersects_ground);
  Number tex_coord_x = uvwz.x * Number(SCATTERING_TEXTURE_NU_SIZE - 1);
  Number tex_x = floor(tex_coord_x);
  Number lerp = tex_coord_x - tex_x;
  vec3 uvw0 = vec3((tex_x + uvwz.y) / Number(SCATTERING_TEXTURE_NU_SIZE),
      uvwz.z, uvwz.w);
  vec3 uvw1 = vec3((tex_x + 1.0 + uvwz.y) / Number(SCATTERING_TEXTURE_NU_SIZE),
      uvwz.z, uvwz.w);
  IrradianceSpectrum scattering = IrradianceSpectrum(
      texture(scattering_texture, uvw0) * (1.0 - lerp) +
      texture(scattering_texture, uvw1) * lerp);
  return scattering;
}
#endif // HAS_HIGHER_ORDER_SCATTERING_TEXTURE

RadianceSpectrum GetSkyRadiance(
    const AtmosphereParameters atmosphere,
    const TransmittanceTexture transmittance_texture,
    const ReducedScatteringTexture scattering_texture,
    const ReducedScatteringTexture single_mie_scattering_texture,
    Position camera, const Direction view_ray, const Length shadow_length,
    const Direction sun_direction,
    out DimensionlessSpectrum transmittance) {
  // Compute the distance to the top atmosphere boundary along the view ray,
  // assuming the viewer is in space (or NaN if the view ray does not intersect
  // the atmosphere).
  Length r = length(camera);
  Length rmu = dot(camera, view_ray);
  // @shotamatsuda: Use SafeSqrt instead.
  // See: https://github.com/takram-design-engineering/three-geospatial/pull/26
  Length distance_to_top_atmosphere_boundary = -rmu -
      SafeSqrt(rmu * rmu - r * r +
          atmosphere.top_radius * atmosphere.top_radius);
  // If the viewer is in space and the view ray intersects the atmosphere, move
  // the viewer to the top atmosphere boundary (along the view ray):
  if (distance_to_top_atmosphere_boundary > 0.0 * m) {
    camera = camera + view_ray * distance_to_top_atmosphere_boundary;
    r = atmosphere.top_radius;
    rmu += distance_to_top_atmosphere_boundary;
  } else if (r > atmosphere.top_radius) {
    // If the view ray does not intersect the atmosphere, simply return 0.
    transmittance = DimensionlessSpectrum(1.0);
    return RadianceSpectrum(0.0 * watt_per_square_meter_per_sr_per_nm);
  }
  // Compute the r, mu, mu_s and nu parameters needed for the texture lookups.
  Number mu = rmu / r;
  Number mu_s = dot(camera, sun_direction) / r;
  Number nu = dot(view_ray, sun_direction);

  // @shotamatsuda: For rendering points below the bottom atmosphere.
  #ifdef GROUND
  bool ray_r_mu_intersects_ground = RayIntersectsGround(atmosphere, r, mu);
  #else // GROUND
  bool ray_r_mu_intersects_ground = false;
  #endif // GROUND

  transmittance = ray_r_mu_intersects_ground ? DimensionlessSpectrum(0.0) :
      GetTransmittanceToTopAtmosphereBoundary(
          atmosphere, transmittance_texture, r, mu);
  IrradianceSpectrum single_mie_scattering;
  IrradianceSpectrum scattering;
  if (shadow_length == 0.0 * m) {
    scattering = GetCombinedScattering(
        atmosphere, scattering_texture, single_mie_scattering_texture,
        r, mu, mu_s, nu, ray_r_mu_intersects_ground,
        single_mie_scattering);
  } else {
    // Case of light shafts (shadow_length is the total length noted l in our
    // paper): we omit the scattering between the camera and the point at
    // distance l, by implementing Eq. (18) of the paper (shadow_transmittance
    // is the T(x,x_s) term, scattering is the S|x_s=x+lv term).
    Length d = shadow_length;
    Length r_p =
        ClampRadius(atmosphere, sqrt(d * d + 2.0 * r * mu * d + r * r));
    Number mu_p = (r * mu + d) / r_p;
    Number mu_s_p = (r * mu_s + d * nu) / r_p;

    scattering = GetCombinedScattering(
        atmosphere, scattering_texture, single_mie_scattering_texture,
        r_p, mu_p, mu_s_p, nu, ray_r_mu_intersects_ground,
        single_mie_scattering);
    DimensionlessSpectrum shadow_transmittance =
        GetTransmittance(atmosphere, transmittance_texture,
            r, mu, shadow_length, ray_r_mu_intersects_ground);
    // @shotamatsuda: Occlude only single Rayleigh scattering by the shadow.
#ifdef HAS_HIGHER_ORDER_SCATTERING_TEXTURE
    IrradianceSpectrum higher_order_scattering = GetScattering(
        atmosphere, higher_order_scattering_texture,
        r_p, mu_p, mu_s_p, nu, ray_r_mu_intersects_ground);
    IrradianceSpectrum single_scattering = scattering - higher_order_scattering;
    scattering = single_scattering * shadow_transmittance + higher_order_scattering;
#else // HAS_HIGHER_ORDER_SCATTERING_TEXTURE
    scattering = scattering * shadow_transmittance;
#endif // HAS_HIGHER_ORDER_SCATTERING_TEXTURE
    single_mie_scattering = single_mie_scattering * shadow_transmittance;
  }
  return scattering * RayleighPhaseFunction(nu) + single_mie_scattering *
      MiePhaseFunction(atmosphere.mie_phase_function_g, nu);
}

// @shotamatsuda: Returns the point on the ray closest to the origin.
vec3 ClosestPointOnRay(const Position camera, const Position point) {
  Position ray = point - camera;
  Number t = clamp(-dot(camera, ray) / dot(ray, ray), 0.0, 1.0);
  return camera + t * ray;
}

vec2 RaySphereIntersections(
    const Position camera, const Direction direction, const Length radius) {
  float b = 2.0 * dot(direction, camera);
  float c = dot(camera, camera) - radius * radius;
  float discriminant = b * b - 4.0 * c;
  float Q = sqrt(discriminant);
  return vec2(-b - Q, -b + Q) * 0.5;
}

// @shotamatsuda: Clip the view ray at the bottom atmosphere boundary.
bool ClipAtBottomAtmosphere(
    const AtmosphereParameters atmosphere,
    const Direction view_ray, inout Position camera, inout Position point) {
  const Length eps = 0.0;
  Length bottom_radius = atmosphere.bottom_radius + eps;
  Length r_camera = length(camera);
  Length r_point = length(point);
  bool camera_below = r_camera < bottom_radius;
  bool point_below = r_point < bottom_radius;

  vec2 t = RaySphereIntersections(camera, view_ray, bottom_radius);
  Position intersection = camera + view_ray * (camera_below ? t.y : t.x);
  camera = camera_below ? intersection : camera;
  point = point_below ? intersection : point;

  return camera_below && point_below;
}

RadianceSpectrum GetSkyRadianceToPoint(
    const AtmosphereParameters atmosphere,
    const TransmittanceTexture transmittance_texture,
    const ReducedScatteringTexture scattering_texture,
    const ReducedScatteringTexture single_mie_scattering_texture,
    Position camera, Position point, const Length shadow_length,
    const Direction sun_direction, out DimensionlessSpectrum transmittance) {
  // @shotamatsuda: Avoid artifacts when the ray does not intersect the top
  // atmosphere boundary.
  if (length(ClosestPointOnRay(camera, point)) > atmosphere.top_radius) {
    transmittance = vec3(1.0);
    return vec3(0.0);
  }

  Direction view_ray = normalize(point - camera);
  if (ClipAtBottomAtmosphere(atmosphere, view_ray, camera, point)) {
    transmittance = vec3(1.0);
    return vec3(0.0);
  }

  // Compute the distance to the top atmosphere boundary along the view ray,
  // assuming the viewer is in space (or NaN if the view ray does not intersect
  // the atmosphere).
  Length r = length(camera);
  Length rmu = dot(camera, view_ray);
  // @shotamatsuda: Use SafeSqrt instead.
  // See: https://github.com/takram-design-engineering/three-geospatial/pull/26
  Length distance_to_top_atmosphere_boundary = -rmu -
      SafeSqrt(rmu * rmu - r * r +
          atmosphere.top_radius * atmosphere.top_radius);
  // If the viewer is in space and the view ray intersects the atmosphere, move
  // the viewer to the top atmosphere boundary (along the view ray):
  if (distance_to_top_atmosphere_boundary > 0.0 * m) {
    camera = camera + view_ray * distance_to_top_atmosphere_boundary;
    r = atmosphere.top_radius;
    rmu += distance_to_top_atmosphere_boundary;
  }

  // Compute the r, mu, mu_s and nu parameters for the first texture lookup.
  Number mu = rmu / r;
  Number mu_s = dot(camera, sun_direction) / r;
  Number nu = dot(view_ray, sun_direction);
  Length d = length(point - camera);
  bool ray_r_mu_intersects_ground = RayIntersectsGround(atmosphere, r, mu);

  // @shotamatsuda: Hack to avoid rendering artifacts near the horizon, due to
  // finite atmosphere texture resolution and finite floating point precision.
  // See: https://github.com/ebruneton/precomputed_atmospheric_scattering/pull/32
  if (!ray_r_mu_intersects_ground) {
    Number mu_horizon = -SafeSqrt(1.0 -
        (atmosphere.bottom_radius * atmosphere.bottom_radius) / (r * r));
    const Number eps = 0.004;
    mu = max(mu, mu_horizon + eps);
  }

  transmittance = GetTransmittance(atmosphere, transmittance_texture,
      r, mu, d, ray_r_mu_intersects_ground);

  IrradianceSpectrum single_mie_scattering;
  IrradianceSpectrum scattering = GetCombinedScattering(
      atmosphere, scattering_texture, single_mie_scattering_texture,
      r, mu, mu_s, nu, ray_r_mu_intersects_ground,
      single_mie_scattering);

  // Compute the r, mu, mu_s and nu parameters for the second texture lookup.
  // If shadow_length is not 0 (case of light shafts), we want to ignore the
  // scattering along the last shadow_length meters of the view ray, which we
  // do by subtracting shadow_length from d (this way scattering_p is equal to
  // the S|x_s=x_0-lv term in Eq. (17) of our paper).
  d = max(d - shadow_length, 0.0 * m);
  Length r_p = ClampRadius(atmosphere, sqrt(d * d + 2.0 * r * mu * d + r * r));
  Number mu_p = (r * mu + d) / r_p;
  Number mu_s_p = (r * mu_s + d * nu) / r_p;

  IrradianceSpectrum single_mie_scattering_p;
  IrradianceSpectrum scattering_p = GetCombinedScattering(
      atmosphere, scattering_texture, single_mie_scattering_texture,
      r_p, mu_p, mu_s_p, nu, ray_r_mu_intersects_ground,
      single_mie_scattering_p);

  // Combine the lookup results to get the scattering between camera and point.
  DimensionlessSpectrum shadow_transmittance = transmittance;
  if (shadow_length > 0.0 * m) {
    // This is the T(x,x_s) term in Eq. (17) of our paper, for light shafts.
    shadow_transmittance = GetTransmittance(atmosphere, transmittance_texture,
        r, mu, d, ray_r_mu_intersects_ground);
  }
  // @shotamatsuda: Occlude only single Rayleigh scattering by the shadow.
#ifdef HAS_HIGHER_ORDER_SCATTERING_TEXTURE
  IrradianceSpectrum higher_order_scattering = GetScattering(
      atmosphere, higher_order_scattering_texture,
      r, mu, mu_s, nu, ray_r_mu_intersects_ground);
  IrradianceSpectrum single_scattering = scattering - higher_order_scattering;
  IrradianceSpectrum higher_order_scattering_p = GetScattering(
      atmosphere, higher_order_scattering_texture,
      r_p, mu_p, mu_s_p, nu, ray_r_mu_intersects_ground);
  IrradianceSpectrum single_scattering_p =
      scattering_p - higher_order_scattering_p;
  scattering =
      single_scattering - shadow_transmittance * single_scattering_p +
      higher_order_scattering - transmittance * higher_order_scattering_p;
#else // HAS_HIGHER_ORDER_SCATTERING_TEXTURE
  scattering = scattering - shadow_transmittance * scattering_p;
#endif // HAS_HIGHER_ORDER_SCATTERING_TEXTURE

  single_mie_scattering =
      single_mie_scattering - shadow_transmittance * single_mie_scattering_p;
#ifdef COMBINED_SCATTERING_TEXTURES
  single_mie_scattering = GetExtrapolatedSingleMieScattering(
      atmosphere, vec4(scattering, single_mie_scattering.r));
#endif // COMBINED_SCATTERING_TEXTURES

  // Hack to avoid rendering artifacts when the sun is below the horizon.
  single_mie_scattering = single_mie_scattering *
      smoothstep(Number(0.0), Number(0.01), mu_s);

  return scattering * RayleighPhaseFunction(nu) + single_mie_scattering *
      MiePhaseFunction(atmosphere.mie_phase_function_g, nu);
}

IrradianceSpectrum GetSunAndSkyIrradiance(
    const AtmosphereParameters atmosphere,
    const TransmittanceTexture transmittance_texture,
    const IrradianceTexture irradiance_texture,
    const Position point, const Direction normal, const Direction sun_direction,
    out IrradianceSpectrum sky_irradiance) {
  Length r = length(point);
  Number mu_s = dot(point, sun_direction) / r;

  // Indirect irradiance (approximated if the surface is not horizontal).
  sky_irradiance = GetIrradiance(atmosphere, irradiance_texture, r, mu_s) *
      (1.0 + dot(normal, point) / r) * 0.5;

  // Direct irradiance.
  return atmosphere.solar_irradiance *
      GetTransmittanceToSun(
          atmosphere, transmittance_texture, r, mu_s) *
      max(dot(normal, sun_direction), 0.0);
}

// @shotamatsuda: Added for the clouds.
IrradianceSpectrum GetSunAndSkyScalarIrradiance(
    const AtmosphereParameters atmosphere,
    const TransmittanceTexture transmittance_texture,
    const IrradianceTexture irradiance_texture,
    const Position point, const Direction sun_direction,
    out IrradianceSpectrum sky_irradiance) {
  Length r = length(point);
  Number mu_s = dot(point, sun_direction) / r;

  // Indirect irradiance. Integral over sphere yields 2π.
  sky_irradiance = GetIrradiance(atmosphere, irradiance_texture, r, mu_s) *
      2.0 * PI;

  // Direct irradiance. Omit the cosine term.
  return atmosphere.solar_irradiance *
      GetTransmittanceToSun(atmosphere, transmittance_texture, r, mu_s);
}

Luminance3 GetSolarLuminance() {
  return ATMOSPHERE.solar_irradiance /
      (PI * ATMOSPHERE.sun_angular_radius * ATMOSPHERE.sun_angular_radius) *
      SUN_SPECTRAL_RADIANCE_TO_LUMINANCE;
}

Luminance3 GetSkyLuminance(
    const Position camera, Direction view_ray, const Length shadow_length,
    const Direction sun_direction, out DimensionlessSpectrum transmittance) {
  return GetSkyRadiance(ATMOSPHERE, transmittance_texture,
      scattering_texture, single_mie_scattering_texture,
      camera, view_ray, shadow_length, sun_direction,
      transmittance) * SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;
}

Luminance3 GetSkyLuminanceToPoint(
    const Position camera, const Position point, const Length shadow_length,
    const Direction sun_direction, out DimensionlessSpectrum transmittance) {
  return GetSkyRadianceToPoint(ATMOSPHERE, transmittance_texture,
      scattering_texture, single_mie_scattering_texture,
      camera, point, shadow_length, sun_direction, transmittance) *
      SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;
}

Illuminance3 GetSunAndSkyIlluminance(
    const Position p, const Direction normal, const Direction sun_direction,
    out IrradianceSpectrum sky_irradiance) {
  IrradianceSpectrum sun_irradiance = GetSunAndSkyIrradiance(
      ATMOSPHERE, transmittance_texture, irradiance_texture, p, normal,
      sun_direction, sky_irradiance);
  sky_irradiance *= SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;
  return sun_irradiance * SUN_SPECTRAL_RADIANCE_TO_LUMINANCE;
}

// @shotamatsuda: Added for the clouds.
Illuminance3 GetSunAndSkyScalarIlluminance(
    const Position p, const Direction sun_direction,
    out IrradianceSpectrum sky_irradiance) {
  IrradianceSpectrum sun_irradiance = GetSunAndSkyScalarIrradiance(
      ATMOSPHERE, transmittance_texture, irradiance_texture, p,
      sun_direction, sky_irradiance);
  sky_irradiance *= SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;
  return sun_irradiance * SUN_SPECTRAL_RADIANCE_TO_LUMINANCE;
}

#define GetSolarRadiance GetSolarLuminance
#define GetSkyRadiance GetSkyLuminance
#define GetSkyRadianceToPoint GetSkyLuminanceToPoint
#define GetSunAndSkyIrradiance GetSunAndSkyIlluminance
#define GetSunAndSkyScalarIrradiance GetSunAndSkyScalarIlluminance
`,ru=new D(.2126,.7152,.0722),iu=["solarIrradiance","sunAngularRadius","bottomRadius","topRadius","rayleighDensity","rayleighScattering","mieDensity","mieScattering","mieExtinction","miePhaseFunctionG","absorptionDensity","absorptionExtinction","groundAlbedo","muSMin","skyRadianceToLuminance","sunRadianceToLuminance"];function nu(t,e){if(e!=null)for(const r of iu){const i=e[r];i!=null&&(t[r]instanceof D?t[r].copy(i):t[r]=i)}}class At{constructor(e,r,i,n,o){this.width=e,this.expTerm=r,this.expScale=i,this.linearTerm=n,this.constantTerm=o}toUniform(){return new d({width:this.width,exp_term:this.expTerm,exp_scale:this.expScale,linear_term:this.linearTerm,constant_term:this.constantTerm})}}const Ii=class{constructor(e){this.solarIrradiance=new D(1.474,1.8504,1.91198),this.sunAngularRadius=.004675,this.bottomRadius=636e4,this.topRadius=642e4,this.rayleighDensity=[new At(0,0,0,0,0),new At(0,1,-.125,0,0)],this.rayleighScattering=new D(.005802,.013558,.0331),this.mieDensity=[new At(0,0,0,0,0),new At(0,1,-.833333,0,0)],this.mieScattering=new D(.003996,.003996,.003996),this.mieExtinction=new D(.00444,.00444,.00444),this.miePhaseFunctionG=.8,this.absorptionDensity=[new At(25,0,0,1/15,-2/3),new At(0,0,0,-1/15,8/3)],this.absorptionExtinction=new D(65e-5,.001881,85e-6),this.groundAlbedo=new Mi().setScalar(.1),this.muSMin=Math.cos(Ol(120)),this.sunRadianceToLuminance=new D(98242.786222,69954.398112,66475.012354),this.skyRadianceToLuminance=new D(114974.916437,71305.954816,65310.548555),this.sunRadianceToRelativeLuminance=new D,this.skyRadianceToRelativeLuminance=new D,nu(this,e);const r=ru.dot(this.sunRadianceToLuminance);this.sunRadianceToRelativeLuminance.copy(this.sunRadianceToLuminance).divideScalar(r),this.skyRadianceToRelativeLuminance.copy(this.skyRadianceToLuminance).divideScalar(r)}toUniform(){return new d({solar_irradiance:this.solarIrradiance,sun_angular_radius:this.sunAngularRadius,bottom_radius:this.bottomRadius*Or,top_radius:this.topRadius*Or,rayleigh_density:{layers:this.rayleighDensity.map(e=>e.toUniform().value)},rayleigh_scattering:this.rayleighScattering,mie_density:{layers:this.mieDensity.map(e=>e.toUniform().value)},mie_scattering:this.mieScattering,mie_extinction:this.mieExtinction,mie_phase_function_g:this.miePhaseFunctionG,absorption_density:{layers:this.absorptionDensity.map(e=>e.toUniform().value)},absorption_extinction:this.absorptionExtinction,ground_albedo:this.groundAlbedo,mu_s_min:this.muSMin})}};Ii.DEFAULT=new Ii;let Yr=Ii;const au=`precision highp sampler2DArray;

#include "core/depth"
#include "core/math"
#include "core/packing"
#include "core/transform"
#ifdef HAS_SHADOW
#include "core/raySphereIntersection"
#include "core/cascadedShadowMaps"
#include "core/interleavedGradientNoise"
#include "core/vogelDisk"
#endif // HAS_SHADOW

#include "bruneton/definitions"

uniform AtmosphereParameters ATMOSPHERE;
uniform vec3 SUN_SPECTRAL_RADIANCE_TO_LUMINANCE;
uniform vec3 SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;

uniform sampler2D transmittance_texture;
uniform sampler3D scattering_texture;
uniform sampler2D irradiance_texture;
uniform sampler3D single_mie_scattering_texture;
uniform sampler3D higher_order_scattering_texture;

#include "bruneton/common"
#include "bruneton/runtime"

uniform sampler2D normalBuffer;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 inverseProjectionMatrix;
uniform mat4 inverseViewMatrix;
uniform float bottomRadius;
uniform mat4 worldToECEFMatrix;
uniform float geometricErrorCorrectionAmount;
uniform vec3 sunDirection;
uniform float cosSunAngularRadius;
uniform vec3 moonDirection;
uniform float moonAngularRadius;
uniform float lunarRadianceScale;
uniform float albedoScale;

#include "sky"

#ifdef HAS_LIGHTING_MASK
uniform sampler2D lightingMaskBuffer;
#endif // HAS_LIGHTING_MASK

// prettier-ignore
#define LIGHTING_MASK_CHANNEL_ LIGHTING_MASK_CHANNEL

#ifdef HAS_OVERLAY
uniform sampler2D overlayBuffer;
#endif // HAS_OVERLAY

#ifdef HAS_SHADOW
uniform sampler2DArray shadowBuffer;
uniform vec2 shadowIntervals[SHADOW_CASCADE_COUNT];
uniform mat4 shadowMatrices[SHADOW_CASCADE_COUNT];
uniform mat4 inverseShadowMatrices[SHADOW_CASCADE_COUNT];
uniform float shadowFar;
uniform float shadowTopHeight;
uniform float shadowRadius;
uniform sampler3D stbnTexture;
uniform int frame;
#endif // HAS_SHADOW

#ifdef HAS_SHADOW_LENGTH
uniform sampler2D shadowLengthBuffer;
#endif // HAS_SHADOW_LENGTH

varying vec3 vCameraPosition;
varying vec3 vRayDirection;
varying vec3 vGeometryAltitudeCorrection;
varying vec3 vEllipsoidRadiiSquared;

vec3 readNormal(const vec2 uv, out bool degenerate) {
  vec3 normal = texture(normalBuffer, uv).xyz;
  degenerate = normal == vec3(0.0);
  #ifdef OCT_ENCODED_NORMAL
  return unpackVec2ToNormal(normal.xy);
  #else // OCT_ENCODED_NORMAL
  return 2.0 * normal - 1.0;
  #endif // OCT_ENCODED_NORMAL
}

void correctGeometricError(inout vec3 positionECEF, inout vec3 normalECEF) {
  // TODO: The error is pronounced at the edge of the ellipsoid due to the
  // large difference between the sphere position and the unprojected position
  // at the current fragment. Calculating the sphere position from the fragment
  // UV may resolve this.

  // Correct way is slerp, but this will be small-angle interpolation anyways.
  vec3 sphereNormal = normalize(positionECEF / vEllipsoidRadiiSquared);
  vec3 spherePosition = ATMOSPHERE.bottom_radius * sphereNormal;
  normalECEF = mix(normalECEF, sphereNormal, geometricErrorCorrectionAmount);
  positionECEF = mix(positionECEF, spherePosition, geometricErrorCorrectionAmount);
}

#if defined(SUN_LIGHT) || defined(SKY_LIGHT)

vec3 getSunSkyIrradiance(
  const vec3 positionECEF,
  const vec3 normal,
  const vec3 inputColor,
  const float sunTransmittance
) {
  // Assume lambertian BRDF. If both SUN_LIGHT and SKY_LIGHT are not defined,
  // regard the inputColor as radiance at the texel.
  vec3 diffuse = inputColor * albedoScale * RECIPROCAL_PI;
  vec3 skyIrradiance;
  vec3 sunIrradiance = GetSunAndSkyIrradiance(positionECEF, normal, sunDirection, skyIrradiance);

  #ifdef HAS_SHADOW
  sunIrradiance *= sunTransmittance;
  #endif // HAS_SHADOW

  #if defined(SUN_LIGHT) && defined(SKY_LIGHT)
  return diffuse * (sunIrradiance + skyIrradiance);
  #elif defined(SUN_LIGHT)
  return diffuse * sunIrradiance;
  #elif defined(SKY_LIGHT)
  return diffuse * skyIrradiance;
  #endif // defined(SUN_LIGHT) && defined(SKY_LIGHT)
}

#endif // defined(SUN_LIGHT) || defined(SKY_LIGHT)

#if defined(TRANSMITTANCE) || defined(INSCATTER)

void applyTransmittanceInscatter(const vec3 positionECEF, float shadowLength, inout vec3 radiance) {
  vec3 transmittance;
  vec3 inscatter = GetSkyRadianceToPoint(
    vCameraPosition,
    positionECEF,
    shadowLength,
    sunDirection,
    transmittance
  );
  #ifdef TRANSMITTANCE
  radiance = radiance * transmittance;
  #endif // TRANSMITTANCE
  #ifdef INSCATTER
  radiance = radiance + inscatter;
  #endif // INSCATTER
}

#endif // defined(TRANSMITTANCE) || defined(INSCATTER)

#ifdef HAS_SHADOW

float getSTBN() {
  ivec3 size = textureSize(stbnTexture, 0);
  vec3 scale = 1.0 / vec3(size);
  return texture(stbnTexture, vec3(gl_FragCoord.xy, float(frame % size.z)) * scale).r;
}

vec2 getShadowUv(const vec3 worldPosition, const int cascadeIndex) {
  vec4 clip = shadowMatrices[cascadeIndex] * vec4(worldPosition, 1.0);
  clip /= clip.w;
  return clip.xy * 0.5 + 0.5;
}

float getDistanceToShadowTop(const vec3 positionECEF) {
  // Distance to the top of the shadows along the sun direction, which matches
  // the ray origin of BSM.
  return raySphereSecondIntersection(
    positionECEF / METER_TO_LENGTH_UNIT, // TODO: Make units consistent
    sunDirection,
    vec3(0.0),
    bottomRadius + shadowTopHeight
  );
}

float readShadowOpticalDepth(const vec2 uv, const float distanceToTop, const int cascadeIndex) {
  // r: frontDepth, g: meanExtinction, b: maxOpticalDepth, a: maxOpticalDepthTail
  vec4 shadow = texture(shadowBuffer, vec3(uv, float(cascadeIndex)));
  // Omit adding maxOpticalDepthTail to avoid pronounced aliasing. Ground
  // shadow will be attenuated by inscatter anyways.
  return min(shadow.b, shadow.g * max(0.0, distanceToTop - shadow.r));
}

float sampleShadowOpticalDepthPCF(
  const vec3 worldPosition,
  const float distanceToTop,
  const float radius,
  const int cascadeIndex
) {
  vec2 uv = getShadowUv(worldPosition, cascadeIndex);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    return 0.0;
  }

  vec2 texelSize = vec2(1.0) / vec2(textureSize(shadowBuffer, 0).xy);
  float sum = 0.0;
  vec2 offset;
  #pragma unroll_loop_start
  for (int i = 0; i < 16; ++i) {
    #if UNROLLED_LOOP_INDEX < SHADOW_SAMPLE_COUNT
    offset = vogelDisk(
      UNROLLED_LOOP_INDEX,
      SHADOW_SAMPLE_COUNT,
      interleavedGradientNoise(gl_FragCoord.xy) * PI2
    );
    sum += readShadowOpticalDepth(uv + offset * radius * texelSize, distanceToTop, cascadeIndex);
    #endif // UNROLLED_LOOP_INDEX < SHADOW_SAMPLE_COUNT
  }
  #pragma unroll_loop_end
  return sum / float(SHADOW_SAMPLE_COUNT);
}

float sampleShadowOpticalDepth(
  const vec3 worldPosition,
  const vec3 positionECEF,
  const float radius,
  const float jitter
) {
  float distanceToTop = getDistanceToShadowTop(positionECEF);
  if (distanceToTop <= 0.0) {
    return 0.0;
  }
  int cascadeIndex = getFadedCascadeIndex(
    viewMatrix,
    worldPosition,
    shadowIntervals,
    cameraNear,
    shadowFar,
    jitter
  );
  return cascadeIndex >= 0
    ? sampleShadowOpticalDepthPCF(worldPosition, distanceToTop, radius, cascadeIndex)
    : 0.0;
}

float getShadowRadius(const vec3 worldPosition) {
  vec4 clip = shadowMatrices[0] * vec4(worldPosition, 1.0);
  clip /= clip.w;

  // Offset by 1px in each direction in shadow's clip coordinates.
  vec2 shadowSize = vec2(textureSize(shadowBuffer, 0));
  vec3 offset = vec3(2.0 / shadowSize, 0.0);
  vec4 clipX = clip + offset.xzzz;
  vec4 clipY = clip + offset.zyzz;

  // Convert back to world space.
  vec4 worldX = inverseShadowMatrices[0] * clipX;
  vec4 worldY = inverseShadowMatrices[0] * clipY;

  // Project into the main camera's clip space.
  mat4 viewProjectionMatrix = projectionMatrix * viewMatrix;
  vec4 projected = viewProjectionMatrix * vec4(worldPosition, 1.0);
  vec4 projectedX = viewProjectionMatrix * worldX;
  vec4 projectedY = viewProjectionMatrix * worldY;
  projected /= projected.w;
  projectedX /= projectedX.w;
  projectedY /= projectedY.w;

  // Take the mean of pixel sizes.
  vec2 center = (projected.xy * 0.5 + 0.5) * resolution;
  vec2 offsetX = (projectedX.xy * 0.5 + 0.5) * resolution;
  vec2 offsetY = (projectedY.xy * 0.5 + 0.5) * resolution;
  float size = max(length(offsetX - center), length(offsetY - center));

  return remapClamped(size, 10.0, 50.0, 0.0, shadowRadius);
}

#endif // HAS_SHADOW

void mainImage(const vec4 inputColor, const vec2 uv, out vec4 outputColor) {
  #if defined(HAS_LIGHTING_MASK) && defined(DEBUG_SHOW_LIGHTING_MASK)
  outputColor.rgb = vec3(texture(lightingMaskBuffer, uv).LIGHTING_MASK_CHANNEL_);
  outputColor.a = 1.0;
  return;
  #endif // defined(HAS_LIGHTING_MASK) && defined(DEBUG_SHOW_LIGHTING_MASK)

  float shadowLength = 0.0;
  #ifdef HAS_SHADOW_LENGTH
  shadowLength = texture(shadowLengthBuffer, uv).r;
  #endif // HAS_SHADOW_LENGTH

  #ifdef HAS_OVERLAY
  vec4 overlay = texture(overlayBuffer, uv);
  if (overlay.a == 1.0) {
    outputColor = overlay;
    return;
  }
  #endif // HAS_OVERLAY

  vec3 rayDirection = normalize(vRayDirection);
  vec3 dRDdx = dFdx(rayDirection);
  vec3 dRDdy = dFdy(rayDirection);
  float fragmentAngle = length(dRDdx + dRDdy) / length(rayDirection);

  float depth = readDepthValue(depthBuffer, uv);
  if (depth >= 1.0 - 1e-8) {
    #ifdef SKY
    outputColor.rgb = getSkyRadiance(
      vCameraPosition,
      rayDirection,
      shadowLength,
      sunDirection,
      moonDirection,
      moonAngularRadius,
      lunarRadianceScale,
      fragmentAngle
    );
    outputColor.a = 1.0;
    #else // SKY
    outputColor = inputColor;
    #endif // SKY

    #ifdef HAS_OVERLAY
    outputColor.rgb = outputColor.rgb * (1.0 - overlay.a) + overlay.rgb;
    #endif // HAS_OVERLAY
    return;
  }
  depth = reverseLogDepth(depth, cameraNear, cameraFar);

  // Reconstruct position and normal in world space.
  vec3 viewPosition = screenToView(
    uv,
    depth,
    getViewZ(depth),
    projectionMatrix,
    inverseProjectionMatrix
  );
  vec3 worldPosition = (inverseViewMatrix * vec4(viewPosition, 1.0)).xyz;
  vec3 positionECEF = (worldToECEFMatrix * vec4(worldPosition, 1.0)).xyz;
  positionECEF = positionECEF * METER_TO_LENGTH_UNIT + vGeometryAltitudeCorrection;

  vec3 viewNormal;
  bool degenerateNormal = false;
  #ifdef RECONSTRUCT_NORMAL
  vec3 dVPdx = dFdx(viewPosition);
  vec3 dVPdy = dFdy(viewPosition);
  viewNormal = normalize(cross(dVPdx, dVPdy));
  #elif defined(HAS_NORMALS)
  viewNormal = readNormal(uv, degenerateNormal);
  #endif // defined(HAS_NORMALS)

  #if defined(RECONSTRUCT_NORMAL) || defined(HAS_NORMALS)
  vec3 worldNormal = (inverseViewMatrix * vec4(viewNormal, 0.0)).xyz;
  vec3 normalECEF = (worldToECEFMatrix * vec4(worldNormal, 0.0)).xyz;
  #else // defined(RECONSTRUCT_NORMAL) || defined(HAS_NORMALS)
  vec3 normalECEF = normalize(positionECEF);
  #endif // defined(RECONSTRUCT_NORMAL) || defined(HAS_NORMALS)

  #ifdef CORRECT_GEOMETRIC_ERROR
  correctGeometricError(positionECEF, normalECEF);
  #endif // CORRECT_GEOMETRIC_ERROR

  #ifdef HAS_SHADOW
  float stbn = getSTBN();
  float radius = getShadowRadius(worldPosition);
  float opticalDepth = sampleShadowOpticalDepth(worldPosition, positionECEF, radius, stbn);
  float sunTransmittance = exp(-opticalDepth);
  #else // HAS_SHADOW
  float sunTransmittance = 1.0;
  #endif // HAS_SHADOW

  vec3 radiance;
  #if defined(SUN_LIGHT) || defined(SKY_LIGHT)
  // WORKAROUND: When both post-process lighting and sky options are enabled,
  // stars have degenerate normals. We use this to disable irradiance, which is
  // irrelevant for them.
  if (!degenerateNormal) {
    radiance = getSunSkyIrradiance(positionECEF, normalECEF, inputColor.rgb, sunTransmittance);
  } else {
    radiance = inputColor.rgb;
  }
  #ifdef HAS_LIGHTING_MASK
  float lightingMask = texture(lightingMaskBuffer, uv).LIGHTING_MASK_CHANNEL_;
  radiance = mix(inputColor.rgb, radiance, lightingMask);
  #endif // HAS_LIGHTING_MASK
  #else // defined(SUN_LIGHT) || defined(SKY_LIGHT)
  radiance = inputColor.rgb;
  #endif // defined(SUN_LIGHT) || defined(SKY_LIGHT)

  #if defined(TRANSMITTANCE) || defined(INSCATTER)
  applyTransmittanceInscatter(positionECEF, shadowLength, radiance);
  #endif // defined(TRANSMITTANCE) || defined(INSCATTER)

  outputColor = vec4(radiance, inputColor.a);

  #ifdef HAS_OVERLAY
  outputColor.rgb = outputColor.rgb * (1.0 - overlay.a) + overlay.rgb;
  #endif // HAS_OVERLAY
}
`,ou=`uniform mat4 inverseViewMatrix;
uniform mat4 inverseProjectionMatrix;
uniform vec3 cameraPosition;
uniform mat4 worldToECEFMatrix;
uniform vec3 altitudeCorrection;
uniform float geometricErrorCorrectionAmount;
uniform vec3 ellipsoidRadii;

varying vec3 vCameraPosition;
varying vec3 vRayDirection;
varying vec3 vGeometryAltitudeCorrection;
varying vec3 vEllipsoidRadiiSquared;

void getCameraRay(out vec3 origin, out vec3 direction) {
  bool isPerspective = inverseProjectionMatrix[2][3] != 0.0; // 4th entry in the 3rd column

  if (isPerspective) {
    // Calculate the camera ray for a perspective camera.
    vec4 viewPosition = inverseProjectionMatrix * vec4(position, 1.0);
    vec4 worldDirection = inverseViewMatrix * vec4(viewPosition.xyz, 0.0);
    origin = cameraPosition;
    direction = worldDirection.xyz;
  } else {
    // Unprojected points to calculate direction.
    vec4 nearPoint = inverseProjectionMatrix * vec4(position.xy, -1.0, 1.0);
    vec4 farPoint = inverseProjectionMatrix * vec4(position.xy, -0.9, 1.0);
    nearPoint /= nearPoint.w;
    farPoint /= farPoint.w;

    // Calculate world values.
    vec4 worldDirection = inverseViewMatrix * vec4(farPoint.xyz - nearPoint.xyz, 0.0);
    vec4 worldOrigin = inverseViewMatrix * nearPoint;

    // Outputs
    direction = worldDirection.xyz;
    origin = worldOrigin.xyz;
  }
}

void mainSupport() {
  vec3 direction, origin;
  getCameraRay(origin, direction);

  vec3 cameraPositionECEF = (worldToECEFMatrix * vec4(origin, 1.0)).xyz;
  vCameraPosition = (cameraPositionECEF + altitudeCorrection) * METER_TO_LENGTH_UNIT;
  vRayDirection = (worldToECEFMatrix * vec4(direction, 0.0)).xyz;

  vGeometryAltitudeCorrection = altitudeCorrection * METER_TO_LENGTH_UNIT;
  // Gradually turn off the altitude correction on geometries as the geometric
  // error correction takes effect, because that on the ideal sphere will be
  // over corrected.
  // See: https://github.com/takram-design-engineering/three-geospatial/pull/23#issuecomment-2542914656
  #ifdef CORRECT_GEOMETRIC_ERROR
  vGeometryAltitudeCorrection *= 1.0 - geometricErrorCorrectionAmount;
  #endif // CORRECT_GEOMETRIC_ERROR

  vec3 radii = ellipsoidRadii * METER_TO_LENGTH_UNIT;
  vEllipsoidRadiiSquared = radii * radii;
}
`,eo=`vec3 getLunarRadiance(const float moonAngularRadius) {
  // Not a physical number but the order of 10^-6 relative to the sun may fit.
  vec3 radiance =
    ATMOSPHERE.solar_irradiance *
    0.000002 /
    (PI * moonAngularRadius * moonAngularRadius) *
    SUN_SPECTRAL_RADIANCE_TO_LUMINANCE;
  return radiance;
}

float intersectSphere(const vec3 ray, const vec3 point, const float radius) {
  vec3 P = -point;
  float PoR = dot(P, ray);
  float D = dot(P, P) - radius * radius;
  return -PoR - sqrt(PoR * PoR - D);
}

float orenNayarDiffuse(const vec3 L, const vec3 V, const vec3 N) {
  float NoL = dot(N, L);
  float NoV = dot(N, V);
  float s = dot(L, V) - NoL * NoV;
  float t = mix(1.0, max(NoL, NoV), step(0.0, s));
  return max(0.0, NoL) * (0.62406015 + 0.41284404 * s / t);
}

vec3 getSkyRadiance(
  const vec3 cameraPosition,
  const vec3 rayDirection,
  const float shadowLength,
  const vec3 sunDirection,
  const vec3 moonDirection,
  const float moonAngularRadius,
  const float lunarRadianceScale,
  const float fragmentAngle
) {
  vec3 transmittance;
  vec3 radiance = GetSkyRadiance(
    cameraPosition,
    rayDirection,
    shadowLength,
    sunDirection,
    transmittance
  );

  // Rendering celestial objects without perspective doesn't make sense.
  #ifdef PERSPECTIVE_CAMERA

  #ifdef SUN
  float viewDotSun = dot(rayDirection, sunDirection);
  if (viewDotSun > cosSunAngularRadius) {
    float angle = acos(clamp(viewDotSun, -1.0, 1.0));
    float antialias = smoothstep(
      ATMOSPHERE.sun_angular_radius,
      ATMOSPHERE.sun_angular_radius - fragmentAngle,
      angle
    );
    radiance += transmittance * GetSolarRadiance() * antialias;
  }
  #endif // SUN

  #ifdef MOON
  float intersection = intersectSphere(rayDirection, moonDirection, moonAngularRadius);
  if (intersection > 0.0) {
    vec3 normal = normalize(moonDirection - rayDirection * intersection);
    float diffuse = orenNayarDiffuse(-sunDirection, rayDirection, normal);
    float viewDotMoon = dot(rayDirection, moonDirection);
    float angle = acos(clamp(viewDotMoon, -1.0, 1.0));
    float antialias = smoothstep(moonAngularRadius, moonAngularRadius - fragmentAngle, angle);
    radiance +=
      transmittance *
      getLunarRadiance(moonAngularRadius) *
      lunarRadianceScale *
      diffuse *
      antialias;
  }
  #endif // MOON

  #endif // PERSPECTIVE_CAMERA

  return radiance;
}
`;var su=Object.defineProperty,xe=(t,e,r,i)=>{for(var n=void 0,o=t.length-1,s;o>=0;o--)(s=t[o])&&(n=s(e,r,n)||n);return n&&su(e,r,n),n};const cu=new D,lu=new D,uu=new wa,hu={blendFunction:z.NORMAL,octEncodedNormal:!1,reconstructNormal:!1,ellipsoid:ir.WGS84,correctAltitude:!0,correctGeometricError:!0,sunLight:!1,skyLight:!1,transmittance:!0,inscatter:!0,albedoScale:1,sky:!1,sun:!0,moon:!0,moonAngularRadius:.0045,lunarRadianceScale:1,ground:!0};class we extends tr{constructor(e=new Ui,r,i=Yr.DEFAULT){const{blendFunction:n,normalBuffer:o=null,octEncodedNormal:s,reconstructNormal:l,irradianceTexture:h=null,scatteringTexture:f=null,transmittanceTexture:g=null,singleMieScatteringTexture:y=null,higherOrderScatteringTexture:R=null,ellipsoid:P,correctAltitude:B,correctGeometricError:H,sunDirection:ee,sunLight:ne,skyLight:Q,transmittance:X,inscatter:ue,albedoScale:le,sky:Ne,sun:Me,moon:_e,moonDirection:Ee,moonAngularRadius:Fe,lunarRadianceScale:Ge,ground:ge}={...hu,...r};super("AerialPerspectiveEffect",cr(it(au,{core:{depth:qa,packing:ql,math:$i,transform:Kl,raySphereIntersection:zr,cascadedShadowMaps:Za,interleavedGradientNoise:Ka,vogelDisk:Ja},bruneton:{common:Wr,definitions:kr,runtime:Vr},sky:eo})),{blendFunction:n,vertexShader:ou,attributes:tt.DEPTH,uniforms:new Map(Object.entries({normalBuffer:new d(o),projectionMatrix:new d(new W),viewMatrix:new d(new W),inverseProjectionMatrix:new d(new W),inverseViewMatrix:new d(new W),cameraPosition:new d(new D),bottomRadius:new d(i.bottomRadius),ellipsoidRadii:new d(new D),worldToECEFMatrix:new d(new W),altitudeCorrection:new d(new D),geometricErrorCorrectionAmount:new d(0),sunDirection:new d(ee?.clone()??new D),cosSunAngularRadius:new d(i.sunAngularRadius),albedoScale:new d(le),moonDirection:new d(Ee?.clone()??new D),moonAngularRadius:new d(Fe),lunarRadianceScale:new d(Ge),overlayBuffer:new d(null),shadowBuffer:new d(null),shadowMapSize:new d(new k),shadowIntervals:new d([]),shadowMatrices:new d([]),inverseShadowMatrices:new d([]),shadowFar:new d(0),shadowTopHeight:new d(0),shadowRadius:new d(3),stbnTexture:new d(null),frame:new d(0),shadowLengthBuffer:new d(null),lightingMaskBuffer:new d(null),ATMOSPHERE:i.toUniform(),SUN_SPECTRAL_RADIANCE_TO_LUMINANCE:new d(i.sunRadianceToRelativeLuminance),SKY_SPECTRAL_RADIANCE_TO_LUMINANCE:new d(i.skyRadianceToRelativeLuminance),irradiance_texture:new d(h),scattering_texture:new d(f),transmittance_texture:new d(g),single_mie_scattering_texture:new d(null),higher_order_scattering_texture:new d(null)})),defines:new Map([["TRANSMITTANCE_TEXTURE_WIDTH",en.toFixed(0)],["TRANSMITTANCE_TEXTURE_HEIGHT",tn.toFixed(0)],["SCATTERING_TEXTURE_R_SIZE",qi.toFixed(0)],["SCATTERING_TEXTURE_MU_SIZE",Ki.toFixed(0)],["SCATTERING_TEXTURE_MU_S_SIZE",Qi.toFixed(0)],["SCATTERING_TEXTURE_NU_SIZE",Ji.toFixed(0)],["IRRADIANCE_TEXTURE_WIDTH",Xi.toFixed(0)],["IRRADIANCE_TEXTURE_HEIGHT",Zi.toFixed(0)],["METER_TO_LENGTH_UNIT",Or.toFixed(7)]])}),this.camera=e,this.atmosphere=i,this.overlay=null,this.shadow=null,this.shadowLength=null,this.lightingMask=null,this.hasNormals=!1,this.combinedScatteringTextures=!1,this.hasHigherOrderScatteringTexture=!1,this.shadowSampleCount=8,this.octEncodedNormal=s,this.reconstructNormal=l,this.singleMieScatteringTexture=y,this.higherOrderScatteringTexture=R,this.ellipsoid=P,this.correctAltitude=B,this.correctGeometricError=H,this.sunLight=ne,this.skyLight=Q,this.transmittance=X,this.inscatter=ue,this.sky=Ne,this.sun=Me,this.moon=_e,this.ground=ge}get mainCamera(){return this.camera}set mainCamera(e){this.camera=e}copyCameraSettings(e){const{projectionMatrix:r,matrixWorldInverse:i,projectionMatrixInverse:n,matrixWorld:o}=e,s=this.uniforms;s.get("projectionMatrix").value.copy(r),s.get("viewMatrix").value.copy(i),s.get("inverseProjectionMatrix").value.copy(n),s.get("inverseViewMatrix").value.copy(o);const l=e.getWorldPosition(s.get("cameraPosition").value),h=s.get("worldToECEFMatrix").value,f=cu.copy(l).applyMatrix4(h);try{const y=uu.setFromECEF(f).height,R=lu.set(0,this.ellipsoid.maximumRadius,-Math.max(0,y)).applyMatrix4(r);s.get("geometricErrorCorrectionAmount").value=Ll(bl(R.y,41.5,13.8,0,1))}catch{return}const g=s.get("altitudeCorrection");this.correctAltitude?rn(f,this.atmosphere.bottomRadius,this.ellipsoid,g.value):g.value.setScalar(0)}updateOverlay(){let e=!1;const{uniforms:r,defines:i,overlay:n}=this,o=i.has("HAS_OVERLAY"),s=n!=null;return s!==o&&(s?i.set("HAS_OVERLAY","1"):(i.delete("HAS_OVERLAY"),r.get("overlayBuffer").value=null),e=!0),s&&(r.get("overlayBuffer").value=n.map),e}updateShadow(){let e=!1;const{uniforms:r,defines:i,shadow:n}=this,o=i.has("HAS_SHADOW"),s=n!=null;if(s!==o&&(s?i.set("HAS_SHADOW","1"):(i.delete("HAS_SHADOW"),r.get("shadowBuffer").value=null),e=!0),s){const l=i.get("SHADOW_CASCADE_COUNT"),h=`${n.cascadeCount}`;l!==h&&(i.set("SHADOW_CASCADE_COUNT",n.cascadeCount.toFixed(0)),e=!0),r.get("shadowBuffer").value=n.map,r.get("shadowMapSize").value=n.mapSize,r.get("shadowIntervals").value=n.intervals,r.get("shadowMatrices").value=n.matrices,r.get("inverseShadowMatrices").value=n.inverseMatrices,r.get("shadowFar").value=n.far,r.get("shadowTopHeight").value=n.topHeight}return e}updateShadowLength(){let e=!1;const{uniforms:r,defines:i,shadowLength:n}=this,o=i.has("HAS_SHADOW_LENGTH"),s=n!=null;return s!==o&&(s?i.set("HAS_SHADOW_LENGTH","1"):(i.delete("HAS_SHADOW_LENGTH"),r.get("shadowLengthBuffer").value=null),e=!0),s&&(r.get("shadowLengthBuffer").value=n.map),e}updateLightingMask(){let e=!1;const{uniforms:r,defines:i,lightingMask:n}=this,o=i.has("HAS_LIGHTING_MASK"),s=n!=null;if(s!==o&&(s?i.set("HAS_LIGHTING_MASK","1"):(i.delete("HAS_LIGHTING_MASK"),r.get("lightingMaskBuffer").value=null),e=!0),s){r.get("lightingMaskBuffer").value=n.map;const l=i.get("LIGHTING_MASK_CHANNEL"),h=n.channel;h!==l&&(/^[rgba]$/.test(h)?(i.set("LIGHTING_MASK_CHANNEL",h),e=!0):console.error(`Expression validation failed: ${h}`))}return e}update(e,r,i){this.copyCameraSettings(this.camera);let n=!1;n||=this.updateOverlay(),n||=this.updateShadow(),n||=this.updateShadowLength(),n||=this.updateLightingMask(),n&&this.setChanged(),++this.uniforms.get("frame").value}get normalBuffer(){return this.uniforms.get("normalBuffer").value}set normalBuffer(e){this.uniforms.get("normalBuffer").value=e,this.hasNormals=e!=null}get irradianceTexture(){return this.uniforms.get("irradiance_texture").value}set irradianceTexture(e){this.uniforms.get("irradiance_texture").value=e}get scatteringTexture(){return this.uniforms.get("scattering_texture").value}set scatteringTexture(e){this.uniforms.get("scattering_texture").value=e}get transmittanceTexture(){return this.uniforms.get("transmittance_texture").value}set transmittanceTexture(e){this.uniforms.get("transmittance_texture").value=e}get singleMieScatteringTexture(){return this.uniforms.get("single_mie_scattering_texture").value}set singleMieScatteringTexture(e){this.uniforms.get("single_mie_scattering_texture").value=e,this.combinedScatteringTextures=e==null}get higherOrderScatteringTexture(){return this.uniforms.get("higher_order_scattering_texture").value}set higherOrderScatteringTexture(e){this.uniforms.get("higher_order_scattering_texture").value=e,this.hasHigherOrderScatteringTexture=e!=null}get ellipsoid(){return this._ellipsoid}set ellipsoid(e){this._ellipsoid=e,this.uniforms.get("ellipsoidRadii").value.copy(e.radii)}get worldToECEFMatrix(){return this.uniforms.get("worldToECEFMatrix").value}get sunDirection(){return this.uniforms.get("sunDirection").value}get sunAngularRadius(){return this.uniforms.get("ATMOSPHERE").value.sun_angular_radius}set sunAngularRadius(e){this.uniforms.get("ATMOSPHERE").value.sun_angular_radius=e,this.uniforms.get("cosSunAngularRadius").value=Math.cos(e)}get albedoScale(){return this.uniforms.get("albedoScale").value}set albedoScale(e){this.uniforms.get("albedoScale").value=e}get moonDirection(){return this.uniforms.get("moonDirection").value}get moonAngularRadius(){return this.uniforms.get("moonAngularRadius").value}set moonAngularRadius(e){this.uniforms.get("moonAngularRadius").value=e}get lunarRadianceScale(){return this.uniforms.get("lunarRadianceScale").value}set lunarRadianceScale(e){this.uniforms.get("lunarRadianceScale").value=e}get stbnTexture(){return this.uniforms.get("stbnTexture").value}set stbnTexture(e){this.uniforms.get("stbnTexture").value=e}get shadowRadius(){return this.uniforms.get("shadowRadius").value}set shadowRadius(e){this.uniforms.get("shadowRadius").value=e}}xe([Y("OCT_ENCODED_NORMAL")],we.prototype,"octEncodedNormal");xe([Y("RECONSTRUCT_NORMAL")],we.prototype,"reconstructNormal");xe([Y("HAS_NORMALS")],we.prototype,"hasNormals");xe([Y("COMBINED_SCATTERING_TEXTURES")],we.prototype,"combinedScatteringTextures");xe([Y("HAS_HIGHER_ORDER_SCATTERING_TEXTURE")],we.prototype,"hasHigherOrderScatteringTexture");xe([Y("CORRECT_GEOMETRIC_ERROR")],we.prototype,"correctGeometricError");xe([Y("SUN_LIGHT")],we.prototype,"sunLight");xe([Y("SKY_LIGHT")],we.prototype,"skyLight");xe([Y("TRANSMITTANCE")],we.prototype,"transmittance");xe([Y("INSCATTER")],we.prototype,"inscatter");xe([Y("SKY")],we.prototype,"sky");xe([Y("SUN")],we.prototype,"sun");xe([Y("MOON")],we.prototype,"moon");xe([Y("GROUND")],we.prototype,"ground");xe([Tt("SHADOW_SAMPLE_COUNT",{min:1,max:16})],we.prototype,"shadowSampleCount");var du=Object.defineProperty,to=(t,e,r,i)=>{for(var n=void 0,o=t.length-1,s;o>=0;o--)(s=t[o])&&(n=s(e,r,n)||n);return n&&du(e,r,n),n};const mu=new D;function pu(t,e){let r="",i="";for(let n=1;n<e;++n)r+=`layout(location = ${n}) out float renderTarget${n};
`,i+=`renderTarget${n} = 0.0;
`;return t.replace("#include <mrt_layout>",r).replace("#include <mrt_output>",i)}const nn={ellipsoid:ir.WGS84,correctAltitude:!0,renderTargetCount:1};class lr extends Pr{constructor(e,r=Yr.DEFAULT){const{irradianceTexture:i=null,scatteringTexture:n=null,transmittanceTexture:o=null,singleMieScatteringTexture:s=null,higherOrderScatteringTexture:l=null,ellipsoid:h,correctAltitude:f,sunDirection:g,sunAngularRadius:y,renderTargetCount:R,...P}={...nn,...e};super({toneMapped:!1,depthWrite:!1,depthTest:!1,...P,uniforms:{cameraPosition:new d(new D),worldToECEFMatrix:new d(new W),altitudeCorrection:new d(new D),sunDirection:new d(g?.clone()??new D),cosSunAngularRadius:new d(r.sunAngularRadius),ATMOSPHERE:r.toUniform(),SUN_SPECTRAL_RADIANCE_TO_LUMINANCE:new d(r.sunRadianceToRelativeLuminance),SKY_SPECTRAL_RADIANCE_TO_LUMINANCE:new d(r.skyRadianceToRelativeLuminance),irradiance_texture:new d(i),scattering_texture:new d(n),transmittance_texture:new d(o),single_mie_scattering_texture:new d(null),higher_order_scattering_texture:new d(null),...P.uniforms},defines:{PI:`${Math.PI}`,TRANSMITTANCE_TEXTURE_WIDTH:en.toFixed(0),TRANSMITTANCE_TEXTURE_HEIGHT:tn.toFixed(0),SCATTERING_TEXTURE_R_SIZE:qi.toFixed(0),SCATTERING_TEXTURE_MU_SIZE:Ki.toFixed(0),SCATTERING_TEXTURE_MU_S_SIZE:Qi.toFixed(0),SCATTERING_TEXTURE_NU_SIZE:Ji.toFixed(0),IRRADIANCE_TEXTURE_WIDTH:Xi.toFixed(0),IRRADIANCE_TEXTURE_HEIGHT:Zi.toFixed(0),METER_TO_LENGTH_UNIT:Or.toFixed(7),...P.defines}}),this.atmosphere=r,this.combinedScatteringTextures=!1,this.hasHigherOrderScatteringTexture=!1,this.singleMieScatteringTexture=s,this.higherOrderScatteringTexture=l,this.ellipsoid=h,this.correctAltitude=f,y!=null&&(this.sunAngularRadius=y),this.renderTargetCount=R}copyCameraSettings(e){const r=this.uniforms,i=e.getWorldPosition(r.cameraPosition.value),n=mu.copy(i).applyMatrix4(r.worldToECEFMatrix.value),o=r.altitudeCorrection.value;this.correctAltitude?rn(n,this.atmosphere.bottomRadius,this.ellipsoid,o):o.setScalar(0)}onBeforeCompile(e,r){e.fragmentShader=pu(e.fragmentShader,this.renderTargetCount)}onBeforeRender(e,r,i,n,o,s){this.copyCameraSettings(i)}get irradianceTexture(){return this.uniforms.irradiance_texture.value}set irradianceTexture(e){this.uniforms.irradiance_texture.value=e}get scatteringTexture(){return this.uniforms.scattering_texture.value}set scatteringTexture(e){this.uniforms.scattering_texture.value=e}get transmittanceTexture(){return this.uniforms.transmittance_texture.value}set transmittanceTexture(e){this.uniforms.transmittance_texture.value=e}get singleMieScatteringTexture(){return this.uniforms.single_mie_scattering_texture.value}set singleMieScatteringTexture(e){this.uniforms.single_mie_scattering_texture.value=e,this.combinedScatteringTextures=e==null}get higherOrderScatteringTexture(){return this.uniforms.higher_order_scattering_texture.value}set higherOrderScatteringTexture(e){this.uniforms.higher_order_scattering_texture.value=e,this.hasHigherOrderScatteringTexture=e!=null}get worldToECEFMatrix(){return this.uniforms.worldToECEFMatrix.value}get sunDirection(){return this.uniforms.sunDirection.value}get sunAngularRadius(){return this.uniforms.ATMOSPHERE.value.sun_angular_radius}set sunAngularRadius(e){this.uniforms.ATMOSPHERE.value.sun_angular_radius=e,this.uniforms.cosSunAngularRadius.value=Math.cos(e)}get renderTargetCount(){return this._renderTargetCount}set renderTargetCount(e){e!==this.renderTargetCount&&(this._renderTargetCount=e,this.needsUpdate=!0)}}to([Y("COMBINED_SCATTERING_TEXTURES")],lr.prototype,"combinedScatteringTextures");to([Y("HAS_HIGHER_ORDER_SCATTERING_TEXTURE")],lr.prototype,"hasHigherOrderScatteringTexture");var ke;(function(t){t.Sun="Sun",t.Moon="Moon",t.Mercury="Mercury",t.Venus="Venus",t.Earth="Earth",t.Mars="Mars",t.Jupiter="Jupiter",t.Saturn="Saturn",t.Uranus="Uranus",t.Neptune="Neptune",t.Pluto="Pluto",t.SSB="SSB",t.EMB="EMB",t.Star1="Star1",t.Star2="Star2",t.Star3="Star3",t.Star4="Star4",t.Star5="Star5",t.Star6="Star6",t.Star7="Star7",t.Star8="Star8"})(ke||(ke={}));ke.Star1,ke.Star2,ke.Star3,ke.Star4,ke.Star5,ke.Star6,ke.Star7,ke.Star8;var Jn;(function(t){t[t.From2000=0]="From2000",t[t.Into2000=1]="Into2000"})(Jn||(Jn={}));var ea;(function(t){t[t.Pericenter=0]="Pericenter",t[t.Apocenter=1]="Apocenter"})(ea||(ea={}));var ta;(function(t){t.Penumbral="penumbral",t.Partial="partial",t.Annular="annular",t.Total="total"})(ta||(ta={}));var ra;(function(t){t[t.Invalid=0]="Invalid",t[t.Ascending=1]="Ascending",t[t.Descending=-1]="Descending"})(ra||(ra={}));function fu(t){var e=[];if(t.length===0)return"";if(typeof t[0]!="string")throw new TypeError("Url must be a string. Received "+t[0]);if(t[0].match(/^[^/:]+:\/*$/)&&t.length>1){var r=t.shift();t[0]=r+t[0]}t[0].match(/^file:\/\/\//)?t[0]=t[0].replace(/^([^/:]+):\/*/,"$1:///"):t[0]=t[0].replace(/^([^/:]+):\/*/,"$1://");for(var i=0;i<t.length;i++){var n=t[i];if(typeof n!="string")throw new TypeError("Url must be a string. Received "+n);n!==""&&(i>0&&(n=n.replace(/^[\/]+/,"")),i<t.length-1?n=n.replace(/[\/]+$/,""):n=n.replace(/[\/]+$/,"/"),e.push(n))}var o=e.join("/");o=o.replace(/\/(\?|&|#[^!])/g,"$1");var s=o.split("?");return o=s.shift()+(s.length>0?"?":"")+s.join("&"),o}function vu(){var t;return typeof arguments[0]=="object"?t=arguments[0]:t=[].slice.call(arguments),fu(t)}const ia={width:en,height:tn},Ct={width:Ql,height:Jl,depth:eu},na={width:Xi,height:Zi};class gu extends Et{constructor({format:e="exr",type:r=Ve,combinedScattering:i=!0,higherOrderScattering:n=!0}={},o){super(o),this.format=e,this.type=r,this.combinedScattering=i,this.higherOrderScattering=n}setType(e){return this.type=bc(e)?mt:Ve,this}load(e,r,i,n){const o={},s=({key:l,loader:h,path:f})=>(h.setRequestHeader(this.requestHeader),h.setPath(this.path),h.setWithCredentials(this.withCredentials),h.load(vu(e,f),g=>{g.type=this.type,this.type===mt&&(g.image,g.image.data!=null&&(g.image.data=new Float32Array(new nt(g.image.data?.buffer)))),g.minFilter=Te,g.magFilter=Te,o[`${l}Texture`]=g,o.irradianceTexture!=null&&o.scatteringTexture!=null&&o.transmittanceTexture!=null&&(this.combinedScattering||o.singleMieScatteringTexture!=null)&&(!this.higherOrderScattering||o.higherOrderScatteringTexture!=null)&&r?.(o)},i,n));return this.format==="exr"?{transmittanceTexture:s({key:"transmittance",loader:new Kn(ia,this.manager),path:"transmittance.exr"}),scatteringTexture:s({key:"scattering",loader:new li(Ct,this.manager),path:"scattering.exr"}),irradianceTexture:s({key:"irradiance",loader:new Kn(na,this.manager),path:"irradiance.exr"}),singleMieScatteringTexture:this.combinedScattering?void 0:s({key:"singleMieScattering",loader:new li(Ct,this.manager),path:"single_mie_scattering.exr"}),higherOrderScatteringTexture:this.higherOrderScattering?s({key:"higherOrderScattering",loader:new li(Ct,this.manager),path:"higher_order_scattering.exr"}):void 0}:{transmittanceTexture:s({key:"transmittance",loader:new gt(vi,jt,ia,this.manager),path:"transmittance.bin"}),scatteringTexture:s({key:"scattering",loader:new gt(et,jt,Ct,this.manager),path:"scattering.bin"}),irradianceTexture:s({key:"irradiance",loader:new gt(vi,jt,na,this.manager),path:"irradiance.bin"}),singleMieScatteringTexture:this.combinedScattering?void 0:s({key:"singleMieScattering",loader:new gt(et,jt,Ct,this.manager),path:"single_mie_scattering.bin"}),higherOrderScatteringTexture:this.higherOrderScattering?s({key:"higherOrderScattering",loader:new gt(et,jt,Ct,this.manager),path:"higher_order_scattering.bin"}):void 0}}}const Su=`precision highp float;
precision highp sampler3D;

#define RECIPROCAL_PI 0.3183098861837907

#include "core/raySphereIntersection"

#include "bruneton/definitions"

uniform AtmosphereParameters ATMOSPHERE;
uniform vec3 SUN_SPECTRAL_RADIANCE_TO_LUMINANCE;
uniform vec3 SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;

uniform sampler2D transmittance_texture;
uniform sampler3D scattering_texture;
uniform sampler2D irradiance_texture;
uniform sampler3D single_mie_scattering_texture;
uniform sampler3D higher_order_scattering_texture;

#include "bruneton/common"
#include "bruneton/runtime"

uniform vec3 sunDirection;
uniform float cosSunAngularRadius;
uniform vec3 moonDirection;
uniform float moonAngularRadius;
uniform float lunarRadianceScale;
uniform vec3 groundAlbedo;

#include "sky"

#ifdef HAS_SHADOW_LENGTH
uniform sampler2D shadowLengthBuffer;
#endif // HAS_SHADOW_LENGTH

in vec2 vUv;
in vec3 vCameraPosition;
in vec3 vRayDirection;

layout(location = 0) out vec4 outputColor;

#include <mrt_layout>

void main() {
  float shadowLength = 0.0;
  #ifdef HAS_SHADOW_LENGTH
  shadowLength = texture(shadowLengthBuffer, vUv).r;
  #endif // HAS_SHADOW_LENGTH

  vec3 cameraPosition = vCameraPosition;
  vec3 rayDirection = normalize(vRayDirection);
  vec3 dRDdx = dFdx(rayDirection);
  vec3 dRDdy = dFdy(rayDirection);
  float fragmentAngle = length(dRDdx + dRDdy) / length(rayDirection);

  #ifdef GROUND_ALBEDO

  float r = length(cameraPosition);
  float mu = dot(cameraPosition, rayDirection) / r;
  bool intersectsGround = RayIntersectsGround(ATMOSPHERE, r, mu);
  if (intersectsGround) {
    float distanceToGround = raySphereFirstIntersection(
      cameraPosition,
      rayDirection,
      ATMOSPHERE.bottom_radius
    );
    vec3 groundPosition = rayDirection * distanceToGround + cameraPosition;
    vec3 surfaceNormal = normalize(groundPosition);
    vec3 skyIrradiance;
    vec3 sunIrradiance = GetSunAndSkyIrradiance(
      cameraPosition,
      surfaceNormal,
      sunDirection,
      skyIrradiance
    );
    vec3 transmittance;
    vec3 inscatter = GetSkyRadianceToPoint(
      cameraPosition,
      ATMOSPHERE.bottom_radius * surfaceNormal,
      shadowLength,
      sunDirection,
      transmittance
    );
    vec3 radiance = groundAlbedo * RECIPROCAL_PI * (sunIrradiance + skyIrradiance);
    outputColor.rgb = radiance * transmittance + inscatter;
  } else {
    outputColor.rgb = getSkyRadiance(
      cameraPosition,
      rayDirection,
      shadowLength,
      sunDirection,
      moonDirection,
      moonAngularRadius,
      lunarRadianceScale,
      fragmentAngle
    );
  }

  #else // GROUND_ALBEDO

  outputColor.rgb = getSkyRadiance(
    cameraPosition,
    rayDirection,
    shadowLength,
    sunDirection,
    moonDirection,
    moonAngularRadius,
    lunarRadianceScale,
    fragmentAngle
  );

  #endif // GROUND_ALBEDO

  outputColor.a = 1.0;

  #include <mrt_output>
}
`,_u=`precision highp float;
precision highp sampler3D;

uniform mat4 inverseProjectionMatrix;
uniform mat4 inverseViewMatrix;
uniform vec3 cameraPosition;
uniform mat4 worldToECEFMatrix;
uniform vec3 altitudeCorrection;

layout(location = 0) in vec3 position;

out vec2 vUv;
out vec3 vCameraPosition;
out vec3 vRayDirection;

void getCameraRay(out vec3 origin, out vec3 direction) {
  bool isPerspective = inverseProjectionMatrix[2][3] != 0.0; // 4th entry in the 3rd column

  if (isPerspective) {
    // Calculate the camera ray for a perspective camera.
    vec4 viewPosition = inverseProjectionMatrix * vec4(position, 1.0);
    vec4 worldDirection = inverseViewMatrix * vec4(viewPosition.xyz, 0.0);
    origin = cameraPosition;
    direction = worldDirection.xyz;
  } else {
    // Unprojected points to calculate direction.
    vec4 nearPoint = inverseProjectionMatrix * vec4(position.xy, -1.0, 1.0);
    vec4 farPoint = inverseProjectionMatrix * vec4(position.xy, -0.9, 1.0);
    nearPoint /= nearPoint.w;
    farPoint /= farPoint.w;

    // Calculate world values
    vec4 worldDirection = inverseViewMatrix * vec4(farPoint.xyz - nearPoint.xyz, 0.0);
    vec4 worldOrigin = inverseViewMatrix * nearPoint;

    // Outputs
    direction = worldDirection.xyz;
    origin = worldOrigin.xyz;
  }
}

void main() {
  vUv = position.xy * 0.5 + 0.5;

  vec3 direction, origin;
  getCameraRay(origin, direction);

  vec3 cameraPositionECEF = (worldToECEFMatrix * vec4(origin, 1.0)).xyz;
  vCameraPosition = (cameraPositionECEF + altitudeCorrection) * METER_TO_LENGTH_UNIT;
  vRayDirection = (worldToECEFMatrix * vec4(direction, 0.0)).xyz;

  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;var Eu=Object.defineProperty,an=(t,e,r,i)=>{for(var n=void 0,o=t.length-1,s;o>=0;o--)(s=t[o])&&(n=s(e,r,n)||n);return n&&Eu(e,r,n),n};const Tu={...nn,sun:!0,moon:!0,moonAngularRadius:.0045,lunarRadianceScale:1,ground:!0,groundAlbedo:new Mi(0)};class on extends lr{constructor(e){const{sun:r,moon:i,moonDirection:n,moonAngularRadius:o,lunarRadianceScale:s,ground:l,groundAlbedo:h,...f}={...Tu,...e};super({name:"SkyMaterial",glslVersion:Ut,vertexShader:_u,fragmentShader:it(Su,{core:{raySphereIntersection:zr},bruneton:{common:Wr,definitions:kr,runtime:Vr},sky:eo}),...f,uniforms:{inverseProjectionMatrix:new d(new W),inverseViewMatrix:new d(new W),moonDirection:new d(n?.clone()??new D),moonAngularRadius:new d(o),lunarRadianceScale:new d(s),groundAlbedo:new d(h.clone()),shadowLengthBuffer:new d(null),...f.uniforms},defines:{PERSPECTIVE_CAMERA:"1"},depthWrite:!1,depthTest:!0}),this.shadowLength=null,this.sun=r,this.moon=i,this.ground=l}onBeforeRender(e,r,i,n,o,s){super.onBeforeRender(e,r,i,n,o,s);const{uniforms:l,defines:h}=this;l.inverseProjectionMatrix.value.copy(i.projectionMatrixInverse),l.inverseViewMatrix.value.copy(i.matrixWorld);const f=h.PERSPECTIVE_CAMERA!=null,g=i.isPerspectiveCamera===!0;g!==f&&(g?h.PERSPECTIVE_CAMERA="1":delete h.PERSPECTIVE_CAMERA,this.needsUpdate=!0);const y=this.groundAlbedo,R=h.GROUND_ALBEDO!=null,P=y.r!==0||y.g!==0||y.b!==0;P!==R&&(P?this.defines.GROUND_ALBEDO="1":delete this.defines.GROUND_ALBEDO,this.needsUpdate=!0);const B=this.shadowLength,H=h.HAS_SHADOW_LENGTH!=null,ee=B!=null;ee!==H&&(ee?h.HAS_SHADOW_LENGTH="1":(delete h.HAS_SHADOW_LENGTH,l.shadowLengthBuffer.value=null),this.needsUpdate=!0),ee&&(l.shadowLengthBuffer.value=B.map)}get moonDirection(){return this.uniforms.moonDirection.value}get moonAngularRadius(){return this.uniforms.moonAngularRadius.value}set moonAngularRadius(e){this.uniforms.moonAngularRadius.value=e}get lunarRadianceScale(){return this.uniforms.lunarRadianceScale.value}set lunarRadianceScale(e){this.uniforms.lunarRadianceScale.value=e}get groundAlbedo(){return this.uniforms.groundAlbedo.value}}an([Y("SUN")],on.prototype,"sun");an([Y("MOON")],on.prototype,"moon");an([Y("GROUND")],on.prototype,"ground");const xu=`precision highp float;
precision highp sampler3D;

#include "bruneton/definitions"

uniform AtmosphereParameters ATMOSPHERE;
uniform vec3 SUN_SPECTRAL_RADIANCE_TO_LUMINANCE;
uniform vec3 SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;

uniform sampler2D transmittance_texture;
uniform sampler3D scattering_texture;
uniform sampler2D irradiance_texture;
uniform sampler3D single_mie_scattering_texture;
uniform sampler3D higher_order_scattering_texture;

#include "bruneton/common"
#include "bruneton/runtime"

uniform vec3 sunDirection;

in vec3 vCameraPosition;
in vec3 vRayDirection;

layout(location = 0) out vec4 outputColor;

#include <mrt_layout>

in vec3 vColor;

void main() {
  #if !defined(PERSPECTIVE_CAMERA)
  outputColor = vec4(0.0);
  discard; // Rendering celestial objects without perspective doesn't make sense.
  #endif // !defined(PERSPECTIVE_CAMERA)

  #ifdef BACKGROUND
  vec3 rayDirection = normalize(vRayDirection);
  float r = length(vCameraPosition);
  float mu = dot(vCameraPosition, rayDirection) / r;

  if (RayIntersectsGround(ATMOSPHERE, r, mu)) {
    discard;
  }

  vec3 transmittance;
  vec3 radiance = GetSkyRadiance(
    vCameraPosition,
    normalize(vRayDirection),
    0.0, // Shadow length
    sunDirection,
    transmittance
  );
  radiance += transmittance * vColor;
  outputColor = vec4(radiance, 1.0);
  #else // BACKGROUND
  outputColor = vec4(vColor, 1.0);
  #endif // BACKGROUND

  #include <mrt_output>
}
`,wu=`precision highp float;
precision highp sampler3D;

#define saturate(x) clamp(x, 0.0, 1.0)

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 viewMatrix;
uniform mat4 matrixWorld;
uniform vec3 cameraPosition;
uniform float cameraFar;
uniform mat4 worldToECEFMatrix;
uniform vec3 altitudeCorrection;
uniform float pointSize;
uniform vec2 magnitudeRange;
uniform float intensity;

layout(location = 0) in vec3 position;
layout(location = 1) in float magnitude;
layout(location = 2) in vec3 color;

out vec3 vCameraPosition;
out vec3 vRayDirection;
out vec3 vEllipsoidCenter;
out vec3 vColor;

void main() {
  // Magnitude is stored between 0 to 1 within the given range.
  float m = mix(magnitudeRange.x, magnitudeRange.y, magnitude);
  vec3 v = pow(vec3(10.0), -vec3(magnitudeRange, m) / 2.5);
  vColor = vec3(intensity * color);
  vColor *= saturate((v.z - v.y) / (v.x - v.y));

  #ifdef BACKGROUND
  vec3 worldDirection = normalize(matrixWorld * vec4(position, 1.0)).xyz;
  vec3 cameraPositionECEF = (worldToECEFMatrix * vec4(cameraPosition, 1.0)).xyz;
  vCameraPosition = (cameraPositionECEF + altitudeCorrection) * METER_TO_LENGTH_UNIT;
  vRayDirection = (worldToECEFMatrix * vec4(worldDirection, 0.0)).xyz;
  gl_Position =
    projectionMatrix * viewMatrix * vec4(cameraPosition + worldDirection * cameraFar, 1.0);
  #else // BACKGROUND
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #endif // BACKGROUND

  gl_PointSize = pointSize;
}
`;var yu=Object.defineProperty,ro=(t,e,r,i)=>{for(var n=void 0,o=t.length-1,s;o>=0;o--)(s=t[o])&&(n=s(e,r,n)||n);return n&&yu(e,r,n),n};const Ru={...nn,pointSize:1,intensity:1,background:!0,ground:!0};let io=class extends lr{constructor(e){const{pointSize:r,intensity:i,background:n,ground:o,...s}={...Ru,...e};super({name:"StarsMaterial",glslVersion:Ut,vertexShader:wu,fragmentShader:it(xu,{bruneton:{common:Wr,definitions:kr,runtime:Vr}}),...s,uniforms:{projectionMatrix:new d(new W),modelViewMatrix:new d(new W),viewMatrix:new d(new W),matrixWorld:new d(new W),cameraFar:new d(0),pointSize:new d(0),magnitudeRange:new d(new k(-2,8)),intensity:new d(i),...s.uniforms},defines:{PERSPECTIVE_CAMERA:"1"},depthWrite:!0,depthTest:!0}),this.pointSize=r,this.background=n,this.ground=o}onBeforeRender(e,r,i,n,o,s){super.onBeforeRender(e,r,i,n,o,s);const l=this.uniforms;l.projectionMatrix.value.copy(i.projectionMatrix),l.modelViewMatrix.value.copy(i.modelViewMatrix),l.viewMatrix.value.copy(i.matrixWorldInverse),l.matrixWorld.value.copy(o.matrixWorld),l.cameraFar.value=i.far,l.pointSize.value=this.pointSize*e.getPixelRatio();const h=i.isPerspectiveCamera===!0;this.defines.PERSPECTIVE_CAMERA!=null!==h&&(h?this.defines.PERSPECTIVE_CAMERA="1":delete this.defines.PERSPECTIVE_CAMERA,this.needsUpdate=!0)}get magnitudeRange(){return this.uniforms.magnitudeRange.value}get intensity(){return this.uniforms.intensity.value}set intensity(e){this.uniforms.intensity.value=e}};ro([Y("BACKGROUND")],io.prototype,"background");ro([Y("GROUND")],io.prototype,"ground");const aa=Vr,oa=Wr,sa=kr;class jr{constructor(e=0,r=0,i=0,n=0){this.expTerm=e,this.exponent=r,this.linearTerm=i,this.constantTerm=n}set(e=0,r=0,i=0,n=0){return this.expTerm=e,this.exponent=r,this.linearTerm=i,this.constantTerm=n,this}clone(){return new jr(this.expTerm,this.exponent,this.linearTerm,this.constantTerm)}copy(e){return this.expTerm=e.expTerm,this.exponent=e.exponent,this.linearTerm=e.linearTerm,this.constantTerm=e.constantTerm,this}}const Au=["channel","altitude","height","densityScale","shapeAmount","shapeDetailAmount","weatherExponent","shapeAlteringBias","coverageFilterWidth","shadow","densityProfile"];function Cu(t,e){if(e!=null)for(const r of Au){const i=e[r];i!=null&&(t[r]instanceof jr?t[r].copy(i):t[r]=i)}}const Di=class no{constructor(e){this.channel="r",this.altitude=0,this.height=0,this.densityScale=.2,this.shapeAmount=1,this.shapeDetailAmount=1,this.weatherExponent=1,this.shapeAlteringBias=.35,this.coverageFilterWidth=.6,this.densityProfile=new jr(0,0,.75,.25),this.shadow=!1,this.set(e)}set(e){return Cu(this,e),this}clone(){return new no(this)}copy(e){return this.channel=e.channel,this.altitude=e.altitude,this.height=e.height,this.densityScale=e.densityScale,this.shapeAmount=e.shapeAmount,this.shapeDetailAmount=e.shapeDetailAmount,this.weatherExponent=e.weatherExponent,this.shapeAlteringBias=e.shapeAlteringBias,this.coverageFilterWidth=e.coverageFilterWidth,this.densityProfile.copy(e.densityProfile),this.shadow=e.shadow,this}};Di.DEFAULT=new Di;let ht=Di;const It=Array.from({length:8},()=>({value:0,flag:0})),$t=Array.from({length:3},()=>({min:0,max:0}));function Iu(t,e){return t.value!==e.value?t.value-e.value:t.flag-e.flag}const Ni=class ao extends Array{constructor(e){super(new ht(e?.[0]),new ht(e?.[1]),new ht(e?.[2]),new ht(e?.[3]))}set(e){return this[0].set(e?.[0]),this[1].set(e?.[1]),this[2].set(e?.[2]),this[3].set(e?.[3]),this}reset(){return this[0].copy(ht.DEFAULT),this[1].copy(ht.DEFAULT),this[2].copy(ht.DEFAULT),this[3].copy(ht.DEFAULT),this}clone(){return new ao(this)}copy(e){return this[0].copy(e[0]),this[1].copy(e[1]),this[2].copy(e[2]),this[3].copy(e[3]),this}get localWeatherChannels(){return this[0].channel+this[1].channel+this[2].channel+this[3].channel}packValues(e,r){return r.set(this[0][e],this[1][e],this[2][e],this[3][e])}packSums(e,r,i){return i.set(this[0][e]+this[0][r],this[1][e]+this[1][r],this[2][e]+this[2][r],this[3][e]+this[3][r])}packDensityProfiles(e,r){return r.set(this[0].densityProfile[e],this[1].densityProfile[e],this[2].densityProfile[e],this[3].densityProfile[e])}packIntervalHeights(e,r){for(let s=0;s<4;++s){const l=this[s];let h=It[s];h.value=l.altitude,h.flag=0,h=It[s+4],h.value=l.altitude+l.height,h.flag=1}It.sort(Iu);let i=0,n=0;for(let s=0;s<It.length;++s){const{value:l,flag:h}=It[s];if(n===0&&s>0){const f=$t[i++];f.min=It[s-1].value,f.max=l}n+=h===0?1:-1}for(;i<3;++i){const s=$t[i];s.min=0,s.max=0}let o=$t[0];e.x=o.min,r.x=o.max,o=$t[1],e.y=o.min,r.y=o.max,o=$t[2],e.z=o.min,r.z=o.max}};Ni.DEFAULT=new Ni([{channel:"r",altitude:750,height:650,densityScale:.2,shapeAmount:1,shapeDetailAmount:1,weatherExponent:1,shapeAlteringBias:.35,coverageFilterWidth:.6,shadow:!0},{channel:"g",altitude:1e3,height:1200,densityScale:.2,shapeAmount:1,shapeDetailAmount:1,weatherExponent:1,shapeAlteringBias:.35,coverageFilterWidth:.6,shadow:!0},{channel:"b",altitude:7500,height:500,densityScale:.003,shapeAmount:.4,shapeDetailAmount:0,weatherExponent:1,shapeAlteringBias:.35,coverageFilterWidth:.5},{channel:"a"}]);let Du=Ni;var Nu="Invariant failed";function dt(t,e){if(!t)throw new Error(Nu)}class nr{constructor(e,r){this.near=[new D,new D,new D,new D],this.far=[new D,new D,new D,new D],e!=null&&r!=null&&this.setFromCamera(e,r)}clone(){return new nr().copy(this)}copy(e){for(let r=0;r<4;++r)this.near[r].copy(e.near[r]),this.far[r].copy(e.far[r]);return this}setFromCamera(e,r){const i=e.isOrthographicCamera===!0,n=e.projectionMatrixInverse;this.near[0].set(1,1,-1),this.near[1].set(1,-1,-1),this.near[2].set(-1,-1,-1),this.near[3].set(-1,1,-1);for(let o=0;o<4;++o)this.near[o].applyMatrix4(n);this.far[0].set(1,1,1),this.far[1].set(1,-1,1),this.far[2].set(-1,-1,1),this.far[3].set(-1,1,1);for(let o=0;o<4;++o){const s=this.far[o];s.applyMatrix4(n);const l=Math.abs(s.z);i?s.z*=Math.min(r/l,1):s.multiplyScalar(Math.min(r/l,1))}return this}split(e,r=[]){for(let i=0;i<e.length;++i){const n=r[i]??=new nr;if(i===0)for(let o=0;o<4;++o)n.near[o].copy(this.near[o]);else for(let o=0;o<4;++o)n.near[o].lerpVectors(this.near[o],this.far[o],e[i-1]);if(i===e.length-1)for(let o=0;o<4;++o)n.far[o].copy(this.far[o]);else for(let o=0;o<4;++o)n.far[o].lerpVectors(this.near[o],this.far[o],e[i])}return r.length=e.length,r}applyMatrix4(e){for(let r=0;r<4;++r)this.near[r].applyMatrix4(e),this.far[r].applyMatrix4(e);return this}}const Ou={uniform:(t,e,r,i,n=[])=>{for(let o=0;o<t;++o)n[o]=(e+(r-e)*(o+1)/t)/r;return n.length=t,n},logarithmic:(t,e,r,i,n=[])=>{for(let o=0;o<t;++o)n[o]=e*(r/e)**((o+1)/t)/r;return n.length=t,n},practical:(t,e,r,i=.5,n=[])=>{for(let o=0;o<t;++o){const s=(e+(r-e)*(o+1)/t)/r,l=e*(r/e)**((o+1)/t)/r;n[o]=$a(s,l,i)}return n.length=t,n}};function bu(t,e,r,i,n,o=[]){return Ou[t](e,r,i,n,o)}const ca=new D,la=new D,Lu=new W,ua=new W,Mu=new nr,Pu=new cs,Uu={maxFar:null,farScale:1,splitMode:"practical",splitLambda:.5,margin:0,fade:!0};class Hu{constructor(e){this.cascades=[],this.mapSize=new k,this.cameraFrustum=new nr,this.frusta=[],this.splits=[],this._far=0;const{cascadeCount:r,mapSize:i,maxFar:n,farScale:o,splitMode:s,splitLambda:l,margin:h,fade:f}={...Uu,...e};this.cascadeCount=r,this.mapSize.copy(i),this.maxFar=n,this.farScale=o,this.splitMode=s,this.splitLambda=l,this.margin=h,this.fade=f}get cascadeCount(){return this.cascades.length}set cascadeCount(e){if(e!==this.cascadeCount){for(let r=0;r<e;++r)this.cascades[r]??={interval:new k,matrix:new W,inverseMatrix:new W,projectionMatrix:new W,inverseProjectionMatrix:new W,viewMatrix:new W,inverseViewMatrix:new W};this.cascades.length=e}}get far(){return this._far}updateIntervals(e){const r=this.cascadeCount,i=this.splits,n=this.far;bu(this.splitMode,r,e.near,n,this.splitLambda,i),this.cameraFrustum.setFromCamera(e,n),this.cameraFrustum.split(i,this.frusta);const o=this.cascades;for(let s=0;s<r;++s)o[s].interval.set(i[s-1]??0,i[s]??0)}getFrustumRadius(e,r){const i=r.near,n=r.far;let o=Math.max(n[0].distanceTo(n[2]),n[0].distanceTo(i[2]));if(this.fade){const s=e.near,l=this.far,h=n[0].z/(l-s);o+=.25*h**2*(l-s)}return o*.5}updateMatrices(e,r,i=1){const n=Lu.lookAt(ca.setScalar(0),la.copy(r).multiplyScalar(-1),yn.DEFAULT_UP),o=ua.multiplyMatrices(ua.copy(n).invert(),e.matrixWorld),s=this.frusta,l=this.cascades;dt(s.length===l.length);const h=this.margin,f=this.mapSize;for(let g=0;g<s.length;++g){const y=s[g],R=l[g],P=this.getFrustumRadius(e,s[g]),B=-P,H=P,ee=P,ne=-P;R.projectionMatrix.makeOrthographic(B,H,ee,ne,-this.margin,P*2+this.margin);const{near:Q,far:X}=Mu.copy(y).applyMatrix4(o),ue=Pu.makeEmpty();for(let Ee=0;Ee<4;Ee++)ue.expandByPoint(Q[Ee]),ue.expandByPoint(X[Ee]);const le=ue.getCenter(ca);le.z=ue.max.z+h;const Ne=(H-B)/f.width,Me=(ee-ne)/f.height;le.x=Math.round(le.x/Ne)*Ne,le.y=Math.round(le.y/Me)*Me,le.applyMatrix4(n);const _e=la.copy(r).multiplyScalar(i).add(le);R.inverseViewMatrix.lookAt(le,_e,yn.DEFAULT_UP).setPosition(_e)}}update(e,r,i){this._far=this.maxFar!=null?Math.min(this.maxFar,e.far*this.farScale):e.far*this.farScale,this.updateIntervals(e),this.updateMatrices(e,r,i);const n=this.cascades,o=this.cascadeCount;for(let s=0;s<o;++s){const{matrix:l,inverseMatrix:h,projectionMatrix:f,inverseProjectionMatrix:g,viewMatrix:y,inverseViewMatrix:R}=n[s];g.copy(f).invert(),y.copy(R).invert(),l.copy(f).multiply(y),h.copy(R).multiply(g)}}}const ha=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5],oo=ha.reduce((t,e,r)=>{const i=new k;for(let n=0;n<16;++n)if(ha[n]===r){i.set((n%4+.5)/4,(Math.floor(n/4)+.5)/4);break}return[...t,i]},[]),Fu={resolutionScale:1,lightShafts:!0,shapeDetail:!0,turbulence:!0,haze:!0,clouds:{multiScatteringOctaves:8,accurateSunSkyLight:!0,accuratePhaseFunction:!1,maxIterationCount:500,minStepSize:50,maxStepSize:1e3,maxRayDistance:2e5,perspectiveStepScale:1.01,minDensity:1e-5,minExtinction:1e-5,minTransmittance:.01,maxIterationCountToGround:3,maxIterationCountToSun:2,minSecondaryStepSize:100,secondaryStepScale:2,maxShadowLengthIterationCount:500,minShadowLengthStepSize:50,maxShadowLengthRayDistance:2e5},shadow:{cascadeCount:3,mapSize:new k(512,512),maxIterationCount:50,minStepSize:100,maxStepSize:1e3,minDensity:1e-5,minExtinction:1e-5,minTransmittance:1e-4}},M=Fu,Gu={low:{...M,lightShafts:!1,shapeDetail:!1,turbulence:!1,clouds:{...M.clouds,accurateSunSkyLight:!1,maxIterationCount:200,minStepSize:100,maxRayDistance:1e5,minDensity:1e-4,minExtinction:1e-4,minTransmittance:.1,maxIterationCountToGround:0,maxIterationCountToSun:1},shadow:{...M.shadow,maxIterationCount:25,minDensity:1e-4,minExtinction:1e-4,minTransmittance:.01,cascadeCount:2,mapSize:new k(256,256)}},medium:{...M,lightShafts:!1,turbulence:!1,clouds:{...M.clouds,minDensity:1e-4,minExtinction:1e-4,accurateSunSkyLight:!1,maxIterationCountToSun:2,maxIterationCountToGround:1},shadow:{...M.shadow,minDensity:1e-4,minExtinction:1e-4,mapSize:new k(256,256)}},high:M,ultra:{...M,clouds:{...M.clouds,minStepSize:10},shadow:{...M.shadow,mapSize:new k(1024,1024)}}},Bu=`precision highp float;
precision highp sampler3D;
precision highp sampler2DArray;

#include <common>
#include <packing>

#include "core/depth"
#include "core/math"
#include "core/turbo"
#include "core/generators"
#include "core/raySphereIntersection"
#include "core/cascadedShadowMaps"
#include "core/interleavedGradientNoise"
#include "core/vogelDisk"

#include "atmosphere/bruneton/definitions"

uniform AtmosphereParameters ATMOSPHERE;
uniform vec3 SUN_SPECTRAL_RADIANCE_TO_LUMINANCE;
uniform vec3 SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;

uniform sampler2D transmittance_texture;
uniform sampler3D scattering_texture;
uniform sampler2D irradiance_texture;
uniform sampler3D single_mie_scattering_texture;
uniform sampler3D higher_order_scattering_texture;

#include "atmosphere/bruneton/common"
#include "atmosphere/bruneton/runtime"

#include "types"
#include "parameters"
#include "clouds"

#if !defined(RECIPROCAL_PI4)
#define RECIPROCAL_PI4 0.07957747154594767
#endif // !defined(RECIPROCAL_PI4)

uniform sampler2D depthBuffer;
uniform mat4 viewMatrix;
uniform mat4 reprojectionMatrix;
uniform mat4 viewReprojectionMatrix;
uniform float cameraNear;
uniform float cameraFar;
uniform float cameraHeight;
uniform vec2 temporalJitter;
uniform vec2 targetUvScale;
uniform float mipLevelScale;

// Scattering
const vec2 scatterAnisotropy = vec2(SCATTER_ANISOTROPY_1, SCATTER_ANISOTROPY_2);
const float scatterAnisotropyMix = SCATTER_ANISOTROPY_MIX;
uniform float skyLightScale;
uniform float groundBounceScale;
uniform float powderScale;
uniform float powderExponent;

// Primary raymarch
uniform int maxIterationCount;
uniform float minStepSize;
uniform float maxStepSize;
uniform float maxRayDistance;
uniform float perspectiveStepScale;

// Secondary raymarch
uniform int maxIterationCountToSun;
uniform int maxIterationCountToGround;
uniform float minSecondaryStepSize;
uniform float secondaryStepScale;

// Beer shadow map
uniform sampler2DArray shadowBuffer;
uniform vec2 shadowTexelSize;
uniform vec2 shadowIntervals[SHADOW_CASCADE_COUNT];
uniform mat4 shadowMatrices[SHADOW_CASCADE_COUNT];
uniform float shadowFar;
uniform float maxShadowFilterRadius;

// Shadow length
#ifdef SHADOW_LENGTH
uniform int maxShadowLengthIterationCount;
uniform float minShadowLengthStepSize;
uniform float maxShadowLengthRayDistance;
#endif // SHADOW_LENGTH

in vec2 vUv;
in vec3 vCameraPosition;
in vec3 vCameraDirection; // Direction to the center of screen
in vec3 vRayDirection; // Direction to the texel
in vec3 vViewPosition;
in GroundIrradiance vGroundIrradiance;
in CloudsIrradiance vCloudsIrradiance;

layout(location = 0) out vec4 outputColor;
layout(location = 1) out vec3 outputDepthVelocity;
#ifdef SHADOW_LENGTH
layout(location = 2) out float outputShadowLength;
#endif // SHADOW_LENGTH

float getViewZ(const float depth) {
  #ifdef PERSPECTIVE_CAMERA
  return perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
  #else // PERSPECTIVE_CAMERA
  return orthographicDepthToViewZ(depth, cameraNear, cameraFar);
  #endif // PERSPECTIVE_CAMERA
}

vec3 ecefToWorld(const vec3 positionECEF) {
  return (ecefToWorldMatrix * vec4(positionECEF - altitudeCorrection, 1.0)).xyz;
}

vec2 getShadowUv(const vec3 worldPosition, const int cascadeIndex) {
  vec4 clip = shadowMatrices[cascadeIndex] * vec4(worldPosition, 1.0);
  clip /= clip.w;
  return clip.xy * 0.5 + 0.5;
}

float getDistanceToShadowTop(const vec3 rayPosition) {
  // Distance to the top of the shadows along the sun direction, which matches
  // the ray origin of BSM.
  return raySphereSecondIntersection(
    rayPosition,
    sunDirection,
    vec3(0.0),
    bottomRadius + shadowTopHeight
  );
}

#ifdef DEBUG_SHOW_CASCADES

const vec3 cascadeColors[4] = vec3[4](
  vec3(1.0, 0.0, 0.0),
  vec3(0.0, 1.0, 0.0),
  vec3(0.0, 0.0, 1.0),
  vec3(1.0, 1.0, 0.0)
);

vec3 getCascadeColor(const vec3 rayPosition) {
  vec3 worldPosition = ecefToWorld(rayPosition);
  int cascadeIndex = getCascadeIndex(
    viewMatrix,
    worldPosition,
    shadowIntervals,
    cameraNear,
    shadowFar
  );
  vec2 uv = getShadowUv(worldPosition, cascadeIndex);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    return vec3(1.0);
  }
  return cascadeColors[cascadeIndex];
}

vec3 getFadedCascadeColor(const vec3 rayPosition, const float jitter) {
  vec3 worldPosition = ecefToWorld(rayPosition);
  int cascadeIndex = getFadedCascadeIndex(
    viewMatrix,
    worldPosition,
    shadowIntervals,
    cameraNear,
    shadowFar,
    jitter
  );
  return cascadeIndex >= 0
    ? cascadeColors[cascadeIndex]
    : vec3(1.0);
}

#endif // DEBUG_SHOW_CASCADES

float readShadowOpticalDepth(
  const vec2 uv,
  const float distanceToTop,
  const float distanceOffset,
  const int cascadeIndex
) {
  // r: frontDepth, g: meanExtinction, b: maxOpticalDepth, a: maxOpticalDepthTail
  // Also see the discussion here: https://x.com/shotamatsuda/status/1885322308908442106
  vec4 shadow = texture(shadowBuffer, vec3(uv, float(cascadeIndex)));
  float distanceToFront = max(0.0, distanceToTop - distanceOffset - shadow.r);
  return min(shadow.b + shadow.a, shadow.g * distanceToFront);
}

float sampleShadowOpticalDepthPCF(
  const vec3 worldPosition,
  const float distanceToTop,
  const float distanceOffset,
  const float radius,
  const int cascadeIndex
) {
  vec2 uv = getShadowUv(worldPosition, cascadeIndex);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    return 0.0;
  }
  if (radius < 0.1) {
    return readShadowOpticalDepth(uv, distanceToTop, distanceOffset, cascadeIndex);
  }
  float sum = 0.0;
  vec2 offset;
  #pragma unroll_loop_start
  for (int i = 0; i < 16; ++i) {
    #if UNROLLED_LOOP_INDEX < SHADOW_SAMPLE_COUNT
    offset = vogelDisk(
      UNROLLED_LOOP_INDEX,
      SHADOW_SAMPLE_COUNT,
      interleavedGradientNoise(gl_FragCoord.xy + temporalJitter * resolution) * PI2
    );
    sum += readShadowOpticalDepth(
      uv + offset * radius * shadowTexelSize,
      distanceToTop,
      distanceOffset,
      cascadeIndex
    );
    #endif // UNROLLED_LOOP_INDEX < SHADOW_SAMPLE_COUNT
  }
  #pragma unroll_loop_end
  return sum / float(SHADOW_SAMPLE_COUNT);
}

float sampleShadowOpticalDepth(
  const vec3 rayPosition,
  const float distanceOffset,
  const float radius,
  const float jitter
) {
  float distanceToTop = getDistanceToShadowTop(rayPosition);
  if (distanceToTop <= 0.0) {
    return 0.0;
  }
  vec3 worldPosition = ecefToWorld(rayPosition);
  int cascadeIndex = getFadedCascadeIndex(
    viewMatrix,
    worldPosition,
    shadowIntervals,
    cameraNear,
    shadowFar,
    jitter
  );
  return cascadeIndex >= 0
    ? sampleShadowOpticalDepthPCF(
      worldPosition,
      distanceToTop,
      distanceOffset,
      radius,
      cascadeIndex
    )
    : 0.0;
}

#ifdef DEBUG_SHOW_SHADOW_MAP
vec4 getCascadedShadowMaps(vec2 uv) {
  vec4 coord = vec4(vUv, vUv - 0.5) * 2.0;
  vec4 shadow = vec4(0.0);
  if (uv.y > 0.5) {
    if (uv.x < 0.5) {
      shadow = texture(shadowBuffer, vec3(coord.xw, 0.0));
    } else {
      #if SHADOW_CASCADE_COUNT > 1
      shadow = texture(shadowBuffer, vec3(coord.zw, 1.0));
      #endif // SHADOW_CASCADE_COUNT > 1
    }
  } else {
    if (uv.x < 0.5) {
      #if SHADOW_CASCADE_COUNT > 2
      shadow = texture(shadowBuffer, vec3(coord.xy, 2.0));
      #endif // SHADOW_CASCADE_COUNT > 2
    } else {
      #if SHADOW_CASCADE_COUNT > 3
      shadow = texture(shadowBuffer, vec3(coord.zy, 3.0));
      #endif // SHADOW_CASCADE_COUNT > 3
    }
  }

  #if !defined(DEBUG_SHOW_SHADOW_MAP_TYPE)
  #define DEBUG_SHOW_SHADOW_MAP_TYPE 0
  #endif // !defined(DEBUG_SHOW_SHADOW_MAP_TYPE

  const float frontDepthScale = 1e-5;
  const float meanExtinctionScale = 10.0;
  const float maxOpticalDepthScale = 0.01;
  vec3 color;
  #if DEBUG_SHOW_SHADOW_MAP_TYPE == 1
  color = vec3(shadow.r * frontDepthScale);
  #elif DEBUG_SHOW_SHADOW_MAP_TYPE == 2
  color = vec3(shadow.g * meanExtinctionScale);
  #elif DEBUG_SHOW_SHADOW_MAP_TYPE == 3
  color = vec3((shadow.b + shadow.a) * maxOpticalDepthScale);
  #else // DEBUG_SHOW_SHADOW_MAP_TYPE
  color =
    (shadow.rgb + vec3(0.0, 0.0, shadow.a)) *
    vec3(frontDepthScale, meanExtinctionScale, maxOpticalDepthScale);
  #endif // DEBUG_SHOW_SHADOW_MAP_TYPE
  return vec4(color, 1.0);
}
#endif // DEBUG_SHOW_SHADOW_MAP

vec2 henyeyGreenstein(const vec2 g, const float cosTheta) {
  vec2 g2 = g * g;
  // prettier-ignore
  return RECIPROCAL_PI4 *
    ((1.0 - g2) / max(vec2(1e-7), pow(1.0 + g2 - 2.0 * g * cosTheta, vec2(1.5))));
}

#ifdef ACCURATE_PHASE_FUNCTION

float draine(float u, float g, float a) {
  float g2 = g * g;
  // prettier-ignore
  return (1.0 - g2) *
    (1.0 + a * u * u) /
    (4.0 * (1.0 + a * (1.0 + 2.0 * g2) / 3.0) * PI * pow(1.0 + g2 - 2.0 * g * u, 1.5));
}

// Numerically-fitted large particles (d=10) phase function It won't be
// plausible without a more precise multiple scattering.
// Reference: https://research.nvidia.com/labs/rtr/approximate-mie/
float phaseFunction(const float cosTheta, const float attenuation) {
  const float gHG = 0.988176691700256; // exp(-0.0990567/(d-1.67154))
  const float gD = 0.5556712547839497; // exp(-2.20679/(d+3.91029) - 0.428934)
  const float alpha = 21.995520856274638; // exp(3.62489 - 8.29288/(d+5.52825))
  const float weight = 0.4819554318404214; // exp(-0.599085/(d-0.641583)-0.665888)
  return mix(
    henyeyGreenstein(vec2(gHG) * attenuation, cosTheta).x,
    draine(cosTheta, gD * attenuation, alpha),
    weight
  );
}

#else // ACCURATE_PHASE_FUNCTION

float phaseFunction(const float cosTheta, const float attenuation) {
  const vec2 g = scatterAnisotropy;
  const vec2 weights = vec2(1.0 - scatterAnisotropyMix, scatterAnisotropyMix);
  // A similar approximation is described in the Frostbite's paper, where phase
  // angle is attenuated instead of anisotropy.
  return dot(henyeyGreenstein(g * attenuation, cosTheta), weights);
}

#endif // ACCURATE_PHASE_FUNCTION

float phaseFunction(const float cosTheta) {
  return phaseFunction(cosTheta, 1.0);
}

float marchOpticalDepth(
  const vec3 rayOrigin,
  const vec3 rayDirection,
  const int maxIterationCount,
  const float mipLevel,
  const float jitter,
  out float rayDistance
) {
  int iterationCount = int(
    max(0.0, remap(mipLevel, 0.0, 1.0, float(maxIterationCount + 1), 1.0) - jitter)
  );
  if (iterationCount == 0) {
    // Fudge factor to approximate the mean optical depth.
    // TODO: Remove it.
    return 0.5;
  }
  float stepSize = minSecondaryStepSize / float(iterationCount);
  float nextDistance = stepSize * jitter;
  float opticalDepth = 0.0;
  for (int i = 0; i < iterationCount; ++i) {
    rayDistance = nextDistance;
    vec3 position = rayDistance * rayDirection + rayOrigin;
    vec2 uv = getGlobeUv(position);
    float height = length(position) - bottomRadius;
    WeatherSample weather = sampleWeather(uv, height, mipLevel);
    MediaSample media = sampleMedia(weather, position, uv, mipLevel, jitter);
    opticalDepth += media.extinction * stepSize;
    nextDistance += stepSize;
    stepSize *= secondaryStepScale;
  }
  return opticalDepth;
}

float marchOpticalDepth(
  const vec3 rayOrigin,
  const vec3 rayDirection,
  const int maxIterationCount,
  const float mipLevel,
  const float jitter
) {
  float rayDistance;
  return marchOpticalDepth(
    rayOrigin,
    rayDirection,
    maxIterationCount,
    mipLevel,
    jitter,
    rayDistance
  );
}

float approximateMultipleScattering(const float opticalDepth, const float cosTheta) {
  // Multiple scattering approximation
  // See: https://fpsunflower.github.io/ckulla/data/oz_volumes.pdf
  // a: attenuation, b: contribution, c: phase attenuation
  vec3 coeffs = vec3(1.0); // [a, b, c]
  const vec3 attenuation = vec3(0.5, 0.5, 0.5); // Should satisfy a <= b
  float scattering = 0.0;
  float beerLambert;
  #pragma unroll_loop_start
  for (int i = 0; i < 12; ++i) {
    #if UNROLLED_LOOP_INDEX < MULTI_SCATTERING_OCTAVES
    beerLambert = exp(-opticalDepth * coeffs.y);
    scattering += coeffs.x * beerLambert * phaseFunction(cosTheta, coeffs.z);
    coeffs *= attenuation;
    #endif // UNROLLED_LOOP_INDEX < MULTI_SCATTERING_OCTAVES
  }
  #pragma unroll_loop_end
  return scattering;
}

// TODO: Construct spherical harmonics of degree 2 using 2 sample points
// positioned near the horizon occlusion points on the sun direction plane.
vec3 getGroundSunSkyIrradiance(
  const vec3 position,
  const vec3 surfaceNormal,
  const float height,
  out vec3 skyIrradiance
) {
  #ifdef ACCURATE_SUN_SKY_LIGHT
  return GetSunAndSkyIrradiance(
    (position - surfaceNormal * height) * METER_TO_LENGTH_UNIT,
    surfaceNormal,
    sunDirection,
    skyIrradiance
  );
  #else // ACCURATE_SUN_SKY_LIGHT
  skyIrradiance = vGroundIrradiance.sky;
  return vGroundIrradiance.sun;
  #endif // ACCURATE_SUN_SKY_LIGHT
}

vec3 getCloudsSunSkyIrradiance(const vec3 position, const float height, out vec3 skyIrradiance) {
  #ifdef ACCURATE_SUN_SKY_LIGHT
  return GetSunAndSkyScalarIrradiance(position * METER_TO_LENGTH_UNIT, sunDirection, skyIrradiance);
  #else // ACCURATE_SUN_SKY_LIGHT
  float alpha = remapClamped(height, minHeight, maxHeight);
  skyIrradiance = mix(vCloudsIrradiance.minSky, vCloudsIrradiance.maxSky, alpha);
  return mix(vCloudsIrradiance.minSun, vCloudsIrradiance.maxSun, alpha);
  #endif // ACCURATE_SUN_SKY_LIGHT
}

#ifdef GROUND_BOUNCE
vec3 approximateRadianceFromGround(
  const vec3 position,
  const vec3 surfaceNormal,
  const float height,
  const float mipLevel,
  const float jitter
) {
  float opticalDepthToGround = marchOpticalDepth(
    position,
    -surfaceNormal,
    maxIterationCountToGround,
    mipLevel,
    jitter
  );
  vec3 skyIrradiance;
  vec3 sunIrradiance = getGroundSunSkyIrradiance(position, surfaceNormal, height, skyIrradiance);
  const float groundAlbedo = 0.3;
  vec3 groundIrradiance = skyIrradiance + (1.0 - coverage) * sunIrradiance;
  vec3 bouncedRadiance = groundAlbedo * RECIPROCAL_PI * groundIrradiance;
  return bouncedRadiance * exp(-opticalDepthToGround);
}
#endif // GROUND_BOUNCE

vec4 marchClouds(
  const vec3 rayOrigin,
  const vec3 rayDirection,
  const vec2 rayNearFar,
  const float cosTheta,
  const float jitter,
  const float rayStartTexelsPerPixel,
  out float frontDepth,
  out ivec3 sampleCount
) {
  vec3 radianceIntegral = vec3(0.0);
  float transmittanceIntegral = 1.0;
  float weightedDistanceSum = 0.0;
  float transmittanceSum = 0.0;

  float maxRayDistance = rayNearFar.y - rayNearFar.x;
  float stepSize = minStepSize + (perspectiveStepScale - 1.0) * rayNearFar.x;
  // I don't understand why spatial aliasing remains unless doubling the jitter.
  float rayDistance = stepSize * jitter * 2.0;

  for (int i = 0; i < maxIterationCount; ++i) {
    if (rayDistance > maxRayDistance) {
      break; // Termination
    }

    vec3 position = rayDistance * rayDirection + rayOrigin;
    float height = length(position) - bottomRadius;
    float mipLevel = log2(max(1.0, rayStartTexelsPerPixel + rayDistance * 1e-5));

    #if !defined(DEBUG_MARCH_INTERVALS)
    if (insideLayerIntervals(height)) {
      stepSize *= perspectiveStepScale;
      rayDistance += mix(stepSize, maxStepSize, min(1.0, mipLevel));
      continue;
    }
    #endif // !defined(DEBUG_MARCH_INTERVALS)

    // Sample rough weather.
    vec2 uv = getGlobeUv(position);
    WeatherSample weather = sampleWeather(uv, height, mipLevel);

    #ifdef DEBUG_SHOW_SAMPLE_COUNT
    ++sampleCount.x;
    #endif // DEBUG_SHOW_SAMPLE_COUNT

    if (!any(greaterThan(weather.density, vec4(minDensity)))) {
      // Step longer in empty space.
      // TODO: This produces banding artifacts.
      // Possible improvement: Binary search refinement
      stepSize *= perspectiveStepScale;
      rayDistance += mix(stepSize, maxStepSize, min(1.0, mipLevel));
      continue;
    }

    // Sample detailed participating media.
    MediaSample media = sampleMedia(weather, position, uv, mipLevel, jitter, sampleCount);

    if (media.extinction > minExtinction) {
      vec3 skyIrradiance;
      vec3 sunIrradiance = getCloudsSunSkyIrradiance(position, height, skyIrradiance);
      vec3 surfaceNormal = normalize(position);

      // March optical depth to the sun for finer details, which BSM lacks.
      float sunRayDistance = 0.0;
      float opticalDepth = marchOpticalDepth(
        position,
        sunDirection,
        maxIterationCountToSun,
        mipLevel,
        jitter,
        sunRayDistance
      );

      if (height < shadowTopHeight) {
        // Obtain the optical depth from BSM at the ray position.
        opticalDepth += sampleShadowOpticalDepth(
          position,
          // Take account of only positions further than the marched ray
          // distance.
          sunRayDistance,
          // Apply PCF only when the sun is close to the horizon.
          maxShadowFilterRadius * remapClamped(dot(sunDirection, surfaceNormal), 0.1, 0.0),
          jitter
        );
      }

      vec3 radiance = sunIrradiance * approximateMultipleScattering(opticalDepth, cosTheta);

      #ifdef GROUND_BOUNCE
      // Fudge factor for the irradiance from ground.
      if (height < shadowTopHeight && mipLevel < 0.5) {
        vec3 groundRadiance = approximateRadianceFromGround(
          position,
          surfaceNormal,
          height,
          mipLevel,
          jitter
        );
        radiance += groundRadiance * RECIPROCAL_PI4 * groundBounceScale;
      }
      #endif // GROUND_BOUNCE

      // Crude approximation of sky gradient. Better than none in the shadows.
      float skyGradient = dot(weather.heightFraction * 0.5 + 0.5, media.weight);
      radiance += skyIrradiance * RECIPROCAL_PI4 * skyGradient * skyLightScale;

      // Finally multiply by scattering.
      radiance *= media.scattering;

      #ifdef POWDER
      radiance *= 1.0 - powderScale * exp(-media.extinction * powderExponent);
      #endif // POWDER

      #ifdef DEBUG_SHOW_CASCADES
      if (height < shadowTopHeight) {
        radiance = 1e-3 * getFadedCascadeColor(position, jitter);
      }
      #endif // DEBUG_SHOW_CASCADES

      // Energy-conserving analytical integration of scattered light
      // See 5.6.3 in https://media.contentapi.ea.com/content/dam/eacom/frostbite/files/s2016-pbs-frostbite-sky-clouds-new.pdf
      float transmittance = exp(-media.extinction * stepSize);
      float clampedExtinction = max(media.extinction, 1e-7);
      vec3 scatteringIntegral = (radiance - radiance * transmittance) / clampedExtinction;
      radianceIntegral += transmittanceIntegral * scatteringIntegral;
      transmittanceIntegral *= transmittance;

      // Aerial perspective affecting clouds
      // See 5.9.1 in https://media.contentapi.ea.com/content/dam/eacom/frostbite/files/s2016-pbs-frostbite-sky-clouds-new.pdf
      weightedDistanceSum += rayDistance * transmittanceIntegral;
      transmittanceSum += transmittanceIntegral;
    }

    if (transmittanceIntegral <= minTransmittance) {
      break; // Early termination
    }

    // Take a shorter step because we've already hit the clouds.
    stepSize *= perspectiveStepScale;
    rayDistance += stepSize;
  }

  // The final product of 5.9.1 and we'll evaluate this in aerial perspective.
  frontDepth = transmittanceSum > 0.0 ? weightedDistanceSum / transmittanceSum : -1.0;

  return vec4(radianceIntegral, remapClamped(transmittanceIntegral, 1.0, minTransmittance));
}

#ifdef SHADOW_LENGTH

float marchShadowLength(
  const vec3 rayOrigin,
  const vec3 rayDirection,
  const vec2 rayNearFar,
  const float jitter
) {
  float shadowLength = 0.0;
  float maxRayDistance = rayNearFar.y - rayNearFar.x;
  float stepSize = minShadowLengthStepSize;
  float rayDistance = stepSize * jitter;
  const float attenuationFactor = 1.0 - 5e-4;
  float attenuation = 1.0;

  // TODO: This march is closed, and sample resolution can be much lower.
  // Refining the termination by binary search will make it much more efficient.
  for (int i = 0; i < maxShadowLengthIterationCount; ++i) {
    if (rayDistance > maxRayDistance) {
      break; // Termination
    }
    vec3 position = rayDistance * rayDirection + rayOrigin;
    float opticalDepth = sampleShadowOpticalDepth(position, 0.0, 0.0, jitter);
    shadowLength += (1.0 - exp(-opticalDepth)) * stepSize * attenuation;
    stepSize *= perspectiveStepScale;
    rayDistance += stepSize;
  }
  return shadowLength;
}

#endif // SHADOW_LENGTH

#ifdef HAZE

vec4 approximateHaze(
  const vec3 rayOrigin,
  const vec3 rayDirection,
  const float maxRayDistance,
  const float cosTheta,
  const float shadowLength
) {
  float modulation = remapClamped(coverage, 0.2, 0.4);
  if (cameraHeight * modulation < 0.0) {
    return vec4(0.0);
  }
  float density = modulation * hazeDensityScale * exp(-cameraHeight * hazeExponent);
  if (density < 1e-7) {
    return vec4(0.0); // Prevent artifact in views from space
  }

  // Blend two normals by the difference in angle so that normal near the
  // ground becomes that of the origin, and in the sky that of the horizon.
  vec3 normalAtOrigin = normalize(rayOrigin);
  vec3 normalAtHorizon = (rayOrigin - dot(rayOrigin, rayDirection) * rayDirection) / bottomRadius;
  float alpha = remapClamped(dot(normalAtOrigin, normalAtHorizon), 0.9, 1.0);
  vec3 normal = mix(normalAtOrigin, normalAtHorizon, alpha);

  // Analytical optical depth where density exponentially decreases with height.
  // Based on: https://iquilezles.org/articles/fog/
  float angle = max(dot(normal, rayDirection), 1e-5);
  float exponent = angle * hazeExponent;
  float linearTerm = density / hazeExponent / angle;

  // Derive the optical depths separately for with and without shadow length.
  float expTerm = 1.0 - exp(-maxRayDistance * exponent);
  float shadowExpTerm = 1.0 - exp(-min(maxRayDistance, shadowLength) * exponent);
  float opticalDepth = expTerm * linearTerm;
  float shadowOpticalDepth = max((expTerm - shadowExpTerm) * linearTerm, 0.0);
  float transmittance = saturate(1.0 - exp(-opticalDepth));
  float shadowTransmittance = saturate(1.0 - exp(-shadowOpticalDepth));

  vec3 skyIrradiance = vGroundIrradiance.sky;
  vec3 sunIrradiance = vGroundIrradiance.sun;
  vec3 inscatter = sunIrradiance * phaseFunction(cosTheta) * shadowTransmittance;
  inscatter += skyIrradiance * RECIPROCAL_PI4 * skyLightScale * transmittance;
  inscatter *= hazeScatteringCoefficient / (hazeAbsorptionCoefficient + hazeScatteringCoefficient);
  return vec4(inscatter, transmittance);
}

#endif // HAZE

void applyAerialPerspective(
  const vec3 cameraPosition,
  const vec3 frontPosition,
  const float shadowLength,
  inout vec4 color
) {
  vec3 transmittance;
  vec3 inscatter = GetSkyRadianceToPoint(
    cameraPosition * METER_TO_LENGTH_UNIT,
    frontPosition * METER_TO_LENGTH_UNIT,
    shadowLength * METER_TO_LENGTH_UNIT,
    sunDirection,
    transmittance
  );
  color.rgb = color.rgb * transmittance + inscatter * color.a;
}

bool rayIntersectsGround(const vec3 cameraPosition, const vec3 rayDirection) {
  float r = length(cameraPosition);
  float mu = dot(cameraPosition, rayDirection) / r;
  return mu < 0.0 && r * r * (mu * mu - 1.0) + bottomRadius * bottomRadius >= 0.0;
}

struct IntersectionResult {
  bool ground;
  vec4 first;
  vec4 second;
};

IntersectionResult getIntersections(const vec3 cameraPosition, const vec3 rayDirection) {
  IntersectionResult intersections;
  intersections.ground = rayIntersectsGround(cameraPosition, rayDirection);
  raySphereIntersections(
    cameraPosition,
    rayDirection,
    bottomRadius + vec4(0.0, minHeight, maxHeight, shadowTopHeight),
    intersections.first,
    intersections.second
  );
  return intersections;
}

vec2 getRayNearFar(const IntersectionResult intersections) {
  vec2 nearFar;
  if (cameraHeight < minHeight) {
    // View below the clouds
    if (intersections.ground) {
      nearFar = vec2(-1.0); // No clouds to the ground
    } else {
      nearFar = vec2(intersections.second.y, intersections.second.z);
      nearFar.y = min(nearFar.y, maxRayDistance);
    }
  } else if (cameraHeight < maxHeight) {
    // View inside the total cloud layer
    if (intersections.ground) {
      nearFar = vec2(cameraNear, intersections.first.y);
    } else {
      nearFar = vec2(cameraNear, intersections.second.z);
    }
  } else {
    // View above the clouds
    nearFar = vec2(intersections.first.z, intersections.second.z);
    if (intersections.ground) {
      // Clamp the ray at the min height.
      nearFar.y = intersections.first.y;
    }
  }
  return nearFar;
}

#ifdef SHADOW_LENGTH
vec2 getShadowRayNearFar(const IntersectionResult intersections) {
  vec2 nearFar;
  if (cameraHeight < shadowTopHeight) {
    if (intersections.ground) {
      nearFar = vec2(cameraNear, intersections.first.x);
    } else {
      nearFar = vec2(cameraNear, intersections.second.w);
    }
  } else {
    nearFar = vec2(intersections.first.w, intersections.second.w);
    if (intersections.ground) {
      // Clamp the ray at the ground.
      nearFar.y = intersections.first.x;
    }
  }
  nearFar.y = min(nearFar.y, maxShadowLengthRayDistance);
  return nearFar;
}
#endif // SHADOW_LENGTH

#ifdef HAZE
vec2 getHazeRayNearFar(const IntersectionResult intersections) {
  vec2 nearFar;
  if (cameraHeight < maxHeight) {
    if (intersections.ground) {
      nearFar = vec2(cameraNear, intersections.first.x);
    } else {
      nearFar = vec2(cameraNear, intersections.second.z);
    }
  } else {
    nearFar = vec2(cameraNear, intersections.second.z);
    if (intersections.ground) {
      // Clamp the ray at the ground.
      nearFar.y = intersections.first.x;
    }
  }
  return nearFar;
}
#endif // HAZE

float getRayDistanceToScene(const vec3 rayDirection, out float viewZ) {
  float depth = readDepthValue(depthBuffer, vUv * targetUvScale + temporalJitter);
  if (depth < 1.0 - 1e-7) {
    depth = reverseLogDepth(depth, cameraNear, cameraFar);
    viewZ = getViewZ(depth);
    return -viewZ / dot(rayDirection, vCameraDirection);
  }
  viewZ = 0.0;
  return 0.0;
}

void main() {
  #ifdef DEBUG_SHOW_SHADOW_MAP
  outputColor = getCascadedShadowMaps(vUv);
  outputDepthVelocity = vec3(0.0);
  #ifdef SHADOW_LENGTH
  outputShadowLength = 0.0;
  #endif // SHADOW_LENGTH
  return;
  #endif // DEBUG_SHOW_SHADOW_MAP

  vec3 cameraPosition = vCameraPosition + altitudeCorrection;
  vec3 rayDirection = normalize(vRayDirection);
  float cosTheta = dot(sunDirection, rayDirection);

  IntersectionResult intersections = getIntersections(cameraPosition, rayDirection);
  vec2 rayNearFar = getRayNearFar(intersections);
  #ifdef SHADOW_LENGTH
  vec2 shadowRayNearFar = getShadowRayNearFar(intersections);
  #endif // SHADOW_LENGTH
  #ifdef HAZE
  vec2 hazeRayNearFar = getHazeRayNearFar(intersections);
  #endif // HAZE

  float sceneViewZ;
  float rayDistanceToScene = getRayDistanceToScene(rayDirection, sceneViewZ);
  if (rayDistanceToScene > 0.0) {
    rayNearFar.y = min(rayNearFar.y, rayDistanceToScene);
    #ifdef SHADOW_LENGTH
    shadowRayNearFar.y = min(shadowRayNearFar.y, rayDistanceToScene);
    #endif // SHADOW_LENGTH
    #ifdef HAZE
    hazeRayNearFar.y = min(hazeRayNearFar.y, rayDistanceToScene);
    #endif // HAZE
  }

  bool intersectsGround = any(lessThan(rayNearFar, vec2(0.0)));
  bool intersectsScene = rayNearFar.y < rayNearFar.x;

  float stbn = getSTBN();

  vec4 color = vec4(0.0);
  float frontDepth = rayNearFar.y;
  vec3 depthVelocity = vec3(0.0);
  float shadowLength = 0.0;
  bool hitClouds = false;

  if (!intersectsGround && !intersectsScene) {
    vec3 rayOrigin = rayNearFar.x * rayDirection + cameraPosition;

    vec2 globeUv = getGlobeUv(rayOrigin);
    #ifdef DEBUG_SHOW_UV
    outputColor = vec4(vec3(checker(globeUv, localWeatherRepeat + localWeatherOffset)), 1.0);
    outputDepthVelocity = vec3(0.0);
    #ifdef SHADOW_LENGTH
    outputShadowLength = 0.0;
    #endif // SHADOW_LENGTH
    return;
    #endif // DEBUG_SHOW_UV

    float mipLevel = getMipLevel(globeUv * localWeatherRepeat) * mipLevelScale;
    mipLevel = mix(0.0, mipLevel, min(1.0, 0.2 * cameraHeight / maxHeight));

    float marchedFrontDepth;
    ivec3 sampleCount = ivec3(0);
    color = marchClouds(
      rayOrigin,
      rayDirection,
      rayNearFar,
      cosTheta,
      stbn,
      pow(2.0, mipLevel),
      marchedFrontDepth,
      sampleCount
    );

    #ifdef DEBUG_SHOW_SAMPLE_COUNT
    outputColor = vec4(vec3(sampleCount) / vec3(500.0, 5.0, 5.0), 1.0);
    outputDepthVelocity = vec3(0.0);
    #ifdef SHADOW_LENGTH
    outputShadowLength = 0.0;
    #endif // SHADOW_LENGTH
    return;
    #endif // DEBUG_SHOW_SAMPLE_COUNT

    // Front depth will be -1.0 when no samples are accumulated.
    hitClouds = marchedFrontDepth >= 0.0;
    if (hitClouds) {
      frontDepth = rayNearFar.x + marchedFrontDepth;

      #ifdef SHADOW_LENGTH
      // Clamp the shadow length ray at the clouds.
      shadowRayNearFar.y = mix(
        shadowRayNearFar.y,
        min(frontDepth, shadowRayNearFar.y),
        color.a // Interpolate by the alpha for smoother edges.
      );

      // Shadow length must be computed before applying aerial perspective.
      if (all(greaterThanEqual(shadowRayNearFar, vec2(0.0)))) {
        shadowLength = marchShadowLength(
          shadowRayNearFar.x * rayDirection + cameraPosition,
          rayDirection,
          shadowRayNearFar,
          stbn
        );
      }
      #endif // SHADOW_LENGTH

      #ifdef HAZE
      // Clamp the haze ray at the clouds.
      hazeRayNearFar.y = mix(
        hazeRayNearFar.y,
        min(frontDepth, hazeRayNearFar.y),
        color.a // Interpolate by the alpha for smoother edges.
      );
      #endif // HAZE

      // Apply aerial perspective.
      vec3 frontPosition = cameraPosition + frontDepth * rayDirection;
      applyAerialPerspective(cameraPosition, frontPosition, shadowLength, color);

      // Velocity for temporal resolution.
      vec3 frontPositionWorld = ecefToWorld(frontPosition);
      vec4 prevClip = reprojectionMatrix * vec4(frontPositionWorld, 1.0);
      prevClip /= prevClip.w;
      vec2 prevUv = prevClip.xy * 0.5 + 0.5;
      vec2 velocity = vUv - prevUv;
      depthVelocity = vec3(frontDepth, velocity);
    }
  }

  if (!hitClouds) {
    #ifdef SHADOW_LENGTH
    if (all(greaterThanEqual(shadowRayNearFar, vec2(0.0)))) {
      shadowLength = marchShadowLength(
        shadowRayNearFar.x * rayDirection + cameraPosition,
        rayDirection,
        shadowRayNearFar,
        stbn
      );
    }
    #endif // SHADOW_LENGTH

    // Velocity for temporal resolution. Here reproject in the view space for
    // greatly reducing the precision errors.
    frontDepth = sceneViewZ < 0.0 ? -sceneViewZ : cameraFar;
    vec3 frontView = vViewPosition * frontDepth;
    vec4 prevClip = viewReprojectionMatrix * vec4(frontView, 1.0);
    prevClip /= prevClip.w;
    vec2 prevUv = prevClip.xy * 0.5 + 0.5;
    vec2 velocity = vUv - prevUv;
    depthVelocity = vec3(frontDepth, velocity);
  }

  #ifdef DEBUG_SHOW_FRONT_DEPTH
  outputColor = vec4(turbo(frontDepth / maxRayDistance), 1.0);
  outputDepthVelocity = vec3(0.0);
  #ifdef SHADOW_LENGTH
  outputShadowLength = 0.0;
  #endif // SHADOW_LENGTH
  return;
  #endif // DEBUG_SHOW_FRONT_DEPTH

  #ifdef HAZE
  vec4 haze = approximateHaze(
    cameraNear * rayDirection + cameraPosition,
    rayDirection,
    hazeRayNearFar.y - hazeRayNearFar.x,
    cosTheta,
    shadowLength
  );
  color.rgb = mix(color.rgb, haze.rgb, haze.a);
  color.a = color.a * (1.0 - haze.a) + haze.a;
  #endif // HAZE

  outputColor = color;
  outputDepthVelocity = depthVelocity;
  #ifdef SHADOW_LENGTH
  outputShadowLength = shadowLength * METER_TO_LENGTH_UNIT;
  #endif // SHADOW_LENGTH
}
`,so=`float getSTBN() {
  ivec3 size = textureSize(stbnTexture, 0);
  vec3 scale = 1.0 / vec3(size);
  return texture(stbnTexture, vec3(gl_FragCoord.xy, float(frame % size.z)) * scale).r;
}

// Straightforward spherical mapping
vec2 getSphericalUv(const vec3 position) {
  vec2 st = normalize(position.yx);
  float phi = atan(st.x, st.y);
  float theta = asin(normalize(position).z);
  return vec2(phi * RECIPROCAL_PI2 + 0.5, theta * RECIPROCAL_PI + 0.5);
}

vec2 getCubeSphereUv(const vec3 position) {
  // Cube-sphere relaxation by: http://mathproofs.blogspot.com/2005/07/mapping-cube-to-sphere.html
  // TODO: Tile and fix seams.
  // Possible improvements:
  // https://iquilezles.org/articles/texturerepetition/
  // https://gamedev.stackexchange.com/questions/184388/fragment-shader-map-dot-texture-repeatedly-over-the-sphere
  // https://github.com/mmikk/hextile-demo

  vec3 n = normalize(position);
  vec3 f = abs(n);
  vec3 c = n / max(f.x, max(f.y, f.z));
  vec2 m;
  if (all(greaterThan(f.yy, f.xz))) {
    m = c.y > 0.0 ? vec2(-n.x, n.z) : n.xz;
  } else if (all(greaterThan(f.xx, f.yz))) {
    m = c.x > 0.0 ? n.yz : vec2(-n.y, n.z);
  } else {
    m = c.z > 0.0 ? n.xy : vec2(n.x, -n.y);
  }

  vec2 m2 = m * m;
  float q = dot(m2.xy, vec2(-2.0, 2.0)) - 3.0;
  float q2 = q * q;
  vec2 uv;
  uv.x = sqrt(1.5 + m2.x - m2.y - 0.5 * sqrt(-24.0 * m2.x + q2)) * (m.x > 0.0 ? 1.0 : -1.0);
  uv.y = sqrt(6.0 / (3.0 - uv.x * uv.x)) * m.y;
  return uv * 0.5 + 0.5;
}

vec2 getGlobeUv(const vec3 position) {
  return getCubeSphereUv(position);
}

float getMipLevel(const vec2 uv) {
  const float mipLevelScale = 0.1;
  vec2 coord = uv * resolution;
  vec2 ddx = dFdx(coord);
  vec2 ddy = dFdy(coord);
  float deltaMaxSqr = max(dot(ddx, ddx), dot(ddy, ddy)) * mipLevelScale;
  return max(0.0, 0.5 * log2(max(1.0, deltaMaxSqr)));
}

bool insideLayerIntervals(const float height) {
  bvec3 gt = greaterThan(vec3(height), minIntervalHeights);
  bvec3 lt = lessThan(vec3(height), maxIntervalHeights);
  return any(bvec3(gt.x && lt.x, gt.y && lt.y, gt.z && lt.z));
}

struct WeatherSample {
  vec4 heightFraction; // Normalized height of each layer
  vec4 density;
};

vec4 shapeAlteringFunction(const vec4 heightFraction, const vec4 bias) {
  // Apply a semi-circle transform to round the clouds towards the top.
  vec4 biased = pow(heightFraction, bias);
  vec4 x = clamp(biased * 2.0 - 1.0, -1.0, 1.0);
  return 1.0 - x * x;
}

WeatherSample sampleWeather(const vec2 uv, const float height, const float mipLevel) {
  WeatherSample weather;
  weather.heightFraction = remapClamped(vec4(height), minLayerHeights, maxLayerHeights);

  vec4 localWeather = pow(
    textureLod(
      localWeatherTexture,
      uv * localWeatherRepeat + localWeatherOffset,
      mipLevel
    ).LOCAL_WEATHER_CHANNELS,
    weatherExponents
  );
  #ifdef SHADOW
  localWeather *= shadowLayerMask;
  #endif // SHADOW

  vec4 heightScale = shapeAlteringFunction(weather.heightFraction, shapeAlteringBiases);

  // Modulation to control weather by coverage parameter.
  // Reference: https://github.com/Prograda/Skybolt/blob/master/Assets/Core/Shaders/Clouds.h#L63
  vec4 factor = 1.0 - coverage * heightScale;
  weather.density = remapClamped(
    mix(localWeather, vec4(1.0), coverageFilterWidths),
    factor,
    factor + coverageFilterWidths
  );

  return weather;
}

vec4 getLayerDensity(const vec4 heightFraction) {
  // prettier-ignore
  return densityProfile.expTerms * exp(densityProfile.exponents * heightFraction) +
    densityProfile.linearTerms * heightFraction +
    densityProfile.constantTerms;
}

struct MediaSample {
  float density;
  vec4 weight;
  float scattering;
  float extinction;
};

MediaSample sampleMedia(
  const WeatherSample weather,
  const vec3 position,
  const vec2 uv,
  const float mipLevel,
  const float jitter,
  out ivec3 sampleCount
) {
  vec4 density = weather.density;

  // TODO: Define in physical length.
  vec3 surfaceNormal = normalize(position);
  float localWeatherSpeed = length(localWeatherOffset);
  vec3 evolution = -surfaceNormal * localWeatherSpeed * 2e4;

  vec3 turbulence = vec3(0.0);
  #ifdef TURBULENCE
  vec2 turbulenceUv = uv * localWeatherRepeat * turbulenceRepeat;
  turbulence =
    turbulenceDisplacement *
    (texture(turbulenceTexture, turbulenceUv).rgb * 2.0 - 1.0) *
    dot(density, remapClamped(weather.heightFraction, vec4(0.3), vec4(0.0)));
  #endif // TURBULENCE

  vec3 shapePosition = (position + evolution + turbulence) * shapeRepeat + shapeOffset;
  float shape = texture(shapeTexture, shapePosition).r;
  density = remapClamped(density, vec4(1.0 - shape) * shapeAmounts, vec4(1.0));

  #ifdef DEBUG_SHOW_SAMPLE_COUNT
  ++sampleCount.y;
  #endif // DEBUG_SHOW_SAMPLE_COUNT

  #ifdef SHAPE_DETAIL
  if (mipLevel * 0.5 + (jitter - 0.5) * 0.5 < 0.5) {
    vec3 detailPosition = (position + turbulence) * shapeDetailRepeat + shapeDetailOffset;
    float detail = texture(shapeDetailTexture, detailPosition).r;
    // Fluffy at the top and whippy at the bottom.
    vec4 modifier = mix(
      vec4(pow(detail, 6.0)),
      vec4(1.0 - detail),
      remapClamped(weather.heightFraction, vec4(0.2), vec4(0.4))
    );
    modifier = mix(vec4(0.0), modifier, shapeDetailAmounts);
    density = remapClamped(density * 2.0, vec4(modifier * 0.5), vec4(1.0));

    #ifdef DEBUG_SHOW_SAMPLE_COUNT
    ++sampleCount.z;
    #endif // DEBUG_SHOW_SAMPLE_COUNT
  }
  #endif // SHAPE_DETAIL

  // Apply the density profiles.
  density = saturate(density * densityScales * getLayerDensity(weather.heightFraction));

  MediaSample media;
  float densitySum = density.x + density.y + density.z + density.w;
  media.weight = density / densitySum;
  media.scattering = densitySum * scatteringCoefficient;
  media.extinction = densitySum * absorptionCoefficient + media.scattering;
  return media;
}

MediaSample sampleMedia(
  const WeatherSample weather,
  const vec3 position,
  const vec2 uv,
  const float mipLevel,
  const float jitter
) {
  ivec3 sampleCount;
  return sampleMedia(weather, position, uv, mipLevel, jitter, sampleCount);
}
`,zu=`precision highp float;
precision highp sampler3D;

#include "atmosphere/bruneton/definitions"

uniform AtmosphereParameters ATMOSPHERE;
uniform vec3 SUN_SPECTRAL_RADIANCE_TO_LUMINANCE;
uniform vec3 SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;

uniform sampler2D transmittance_texture;
uniform sampler3D scattering_texture;
uniform sampler2D irradiance_texture;
uniform sampler3D single_mie_scattering_texture;
uniform sampler3D higher_order_scattering_texture;

#include "atmosphere/bruneton/common"
#include "atmosphere/bruneton/runtime"

#include "types"

uniform mat4 inverseProjectionMatrix;
uniform mat4 inverseViewMatrix;
uniform vec3 cameraPosition;
uniform mat4 worldToECEFMatrix;
uniform vec3 altitudeCorrection;

// Atmosphere
uniform float bottomRadius;
uniform vec3 sunDirection;

// Cloud layers
uniform float minHeight;
uniform float maxHeight;

layout(location = 0) in vec3 position;

out vec2 vUv;
out vec3 vCameraPosition;
out vec3 vCameraDirection; // Direction to the center of screen
out vec3 vRayDirection; // Direction to the texel
out vec3 vViewPosition;

out GroundIrradiance vGroundIrradiance;
out CloudsIrradiance vCloudsIrradiance;

void sampleSunSkyIrradiance(const vec3 positionECEF) {
  vGroundIrradiance.sun = GetSunAndSkyScalarIrradiance(
    positionECEF * METER_TO_LENGTH_UNIT,
    sunDirection,
    vGroundIrradiance.sky
  );

  vec3 surfaceNormal = normalize(positionECEF);
  vec2 radii = (bottomRadius + vec2(minHeight, maxHeight)) * METER_TO_LENGTH_UNIT;
  vCloudsIrradiance.minSun = GetSunAndSkyScalarIrradiance(
    surfaceNormal * radii.x,
    sunDirection,
    vCloudsIrradiance.minSky
  );
  vCloudsIrradiance.maxSun = GetSunAndSkyScalarIrradiance(
    surfaceNormal * radii.y,
    sunDirection,
    vCloudsIrradiance.maxSky
  );
}

void main() {
  vUv = position.xy * 0.5 + 0.5;

  vec3 viewPosition = (inverseProjectionMatrix * vec4(position, 1.0)).xyz;
  vec3 worldDirection = (inverseViewMatrix * vec4(viewPosition.xyz, 0.0)).xyz;
  vec3 cameraDirection = normalize((inverseViewMatrix * vec4(0.0, 0.0, -1.0, 0.0)).xyz);
  vCameraPosition = (worldToECEFMatrix * vec4(cameraPosition, 1.0)).xyz;
  vCameraDirection = (worldToECEFMatrix * vec4(cameraDirection, 0.0)).xyz;
  vRayDirection = (worldToECEFMatrix * vec4(worldDirection, 0.0)).xyz;
  vViewPosition = viewPosition;

  sampleSunSkyIrradiance(vCameraPosition + altitudeCorrection);

  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`,co=`uniform vec2 resolution;
uniform int frame;
uniform sampler3D stbnTexture;

// Atmosphere
uniform float bottomRadius;
uniform mat4 worldToECEFMatrix;
uniform mat4 ecefToWorldMatrix;
uniform vec3 altitudeCorrection;
uniform vec3 sunDirection;

// Participating medium
uniform float scatteringCoefficient;
uniform float absorptionCoefficient;

// Primary raymarch
uniform float minDensity;
uniform float minExtinction;
uniform float minTransmittance;

// Shape and weather
uniform sampler2D localWeatherTexture;
uniform vec2 localWeatherRepeat;
uniform vec2 localWeatherOffset;
uniform float coverage;
uniform sampler3D shapeTexture;
uniform vec3 shapeRepeat;
uniform vec3 shapeOffset;

#ifdef SHAPE_DETAIL
uniform sampler3D shapeDetailTexture;
uniform vec3 shapeDetailRepeat;
uniform vec3 shapeDetailOffset;
#endif // SHAPE_DETAIL

#ifdef TURBULENCE
uniform sampler2D turbulenceTexture;
uniform vec2 turbulenceRepeat;
uniform float turbulenceDisplacement;
#endif // TURBULENCE

// Haze
#ifdef HAZE
uniform float hazeDensityScale;
uniform float hazeExponent;
uniform float hazeScatteringCoefficient;
uniform float hazeAbsorptionCoefficient;
#endif // HAZE

// Cloud layers
uniform vec4 minLayerHeights;
uniform vec4 maxLayerHeights;
uniform vec3 minIntervalHeights;
uniform vec3 maxIntervalHeights;
uniform vec4 densityScales;
uniform vec4 shapeAmounts;
uniform vec4 shapeDetailAmounts;
uniform vec4 weatherExponents;
uniform vec4 shapeAlteringBiases;
uniform vec4 coverageFilterWidths;
uniform float minHeight;
uniform float maxHeight;
uniform float shadowTopHeight;
uniform float shadowBottomHeight;
uniform vec4 shadowLayerMask;
uniform CloudDensityProfile densityProfile;
`,Oi=`struct GroundIrradiance {
  vec3 sun;
  vec3 sky;
};

struct CloudsIrradiance {
  vec3 minSun;
  vec3 minSky;
  vec3 maxSun;
  vec3 maxSky;
};

struct CloudDensityProfile {
  vec4 expTerms;
  vec4 exponents;
  vec4 linearTerms;
  vec4 constantTerms;
};
`;var Wu=Object.defineProperty,Ce=(t,e,r,i)=>{for(var n=void 0,o=t.length-1,s;o>=0;o--)(s=t[o])&&(n=s(e,r,n)||n);return n&&Wu(e,r,n),n};const ku=new D,Vu=new wa;class ye extends lr{constructor({parameterUniforms:e,layerUniforms:r,atmosphereUniforms:i},n=Yr.DEFAULT){super({name:"CloudsMaterial",glslVersion:Ut,vertexShader:it(zu,{atmosphere:{bruneton:{common:oa,definitions:sa,runtime:aa}},types:Oi}),fragmentShader:cr(it(Bu,{core:{depth:qa,math:$i,turbo:Qa,generators:Zl,raySphereIntersection:zr,cascadedShadowMaps:Za,interleavedGradientNoise:Ka,vogelDisk:Ja},atmosphere:{bruneton:{common:oa,definitions:sa,runtime:aa}},types:Oi,parameters:co,clouds:so})),uniforms:{...e,...r,...i,depthBuffer:new d(null),viewMatrix:new d(new W),inverseProjectionMatrix:new d(new W),inverseViewMatrix:new d(new W),reprojectionMatrix:new d(new W),viewReprojectionMatrix:new d(new W),resolution:new d(new k),cameraNear:new d(0),cameraFar:new d(0),cameraHeight:new d(0),frame:new d(0),temporalJitter:new d(new k),targetUvScale:new d(new k),mipLevelScale:new d(1),stbnTexture:new d(null),skyLightScale:new d(1),groundBounceScale:new d(1),powderScale:new d(.8),powderExponent:new d(150),maxIterationCount:new d(M.clouds.maxIterationCount),minStepSize:new d(M.clouds.minStepSize),maxStepSize:new d(M.clouds.maxStepSize),maxRayDistance:new d(M.clouds.maxRayDistance),perspectiveStepScale:new d(M.clouds.perspectiveStepScale),minDensity:new d(M.clouds.minDensity),minExtinction:new d(M.clouds.minExtinction),minTransmittance:new d(M.clouds.minTransmittance),maxIterationCountToSun:new d(M.clouds.maxIterationCountToSun),maxIterationCountToGround:new d(M.clouds.maxIterationCountToGround),minSecondaryStepSize:new d(M.clouds.minSecondaryStepSize),secondaryStepScale:new d(M.clouds.secondaryStepScale),shadowBuffer:new d(null),shadowTexelSize:new d(new k),shadowIntervals:new d(Array.from({length:4},()=>new k)),shadowMatrices:new d(Array.from({length:4},()=>new W)),shadowFar:new d(0),maxShadowFilterRadius:new d(6),shadowLayerMask:new d(new Re().setScalar(1)),maxShadowLengthIterationCount:new d(M.clouds.maxShadowLengthIterationCount),minShadowLengthStepSize:new d(M.clouds.minShadowLengthStepSize),maxShadowLengthRayDistance:new d(M.clouds.maxShadowLengthRayDistance),hazeDensityScale:new d(3e-5),hazeExponent:new d(.001),hazeScatteringCoefficient:new d(.9),hazeAbsorptionCoefficient:new d(.5)}},n),this.temporalUpscale=!0,this.depthPacking=0,this.localWeatherChannels="rgba",this.shapeDetail=M.shapeDetail,this.turbulence=M.turbulence,this.shadowLength=M.lightShafts,this.haze=M.haze,this.multiScatteringOctaves=M.clouds.multiScatteringOctaves,this.accurateSunSkyLight=M.clouds.accurateSunSkyLight,this.accuratePhaseFunction=M.clouds.accuratePhaseFunction,this.shadowCascadeCount=M.shadow.cascadeCount,this.shadowSampleCount=8,this.scatterAnisotropy1=.7,this.scatterAnisotropy2=-.2,this.scatterAnisotropyMix=.5}onBeforeRender(e,r,i,n,o,s){const l=this.defines.USE_LOGARITHMIC_DEPTH_BUFFER!=null,h=e.capabilities.logarithmicDepthBuffer;h!==l&&(h?this.defines.USE_LOGARITHMIC_DEPTH_BUFFER="1":delete this.defines.USE_LOGARITHMIC_DEPTH_BUFFER);const f=this.defines.POWDER!=null,g=this.uniforms.powderScale.value>0;g!==f&&(g?this.defines.POWDER="1":delete this.defines.POWDER,this.needsUpdate=!0);const y=this.defines.GROUND_BOUNCE!=null;(this.uniforms.groundBounceScale.value>0&&this.uniforms.maxIterationCountToGround.value>0)!==y&&(g?this.defines.GROUND_BOUNCE="1":delete this.defines.GROUND_BOUNCE,this.needsUpdate=!0)}copyCameraSettings(e){e.isPerspectiveCamera===!0?this.defines.PERSPECTIVE_CAMERA!=="1"&&(this.defines.PERSPECTIVE_CAMERA="1",this.needsUpdate=!0):this.defines.PERSPECTIVE_CAMERA!=null&&(delete this.defines.PERSPECTIVE_CAMERA,this.needsUpdate=!0);const r=this.uniforms;r.viewMatrix.value.copy(e.matrixWorldInverse),r.inverseViewMatrix.value.copy(e.matrixWorld);const i=this.previousProjectionMatrix??e.projectionMatrix,n=this.previousViewMatrix??e.matrixWorldInverse,o=r.inverseProjectionMatrix.value,s=r.inverseViewMatrix.value,l=r.reprojectionMatrix.value,h=r.viewReprojectionMatrix.value;if(this.temporalUpscale){const y=r.frame.value%16,R=r.resolution.value,P=oo[y],B=(P.x-.5)/R.x*4,H=(P.y-.5)/R.y*4;r.temporalJitter.value.set(B,H),r.mipLevelScale.value=.25,o.copy(e.projectionMatrix),o.elements[8]+=B*2,o.elements[9]+=H*2,o.invert(),l.copy(i),l.elements[8]+=B*2,l.elements[9]+=H*2,l.multiply(n),h.copy(l).multiply(s)}else r.temporalJitter.value.setScalar(0),r.mipLevelScale.value=1,o.copy(e.projectionMatrixInverse),l.copy(i).multiply(n),h.copy(l).multiply(s);r.cameraNear.value=e.near,r.cameraFar.value=e.far;const f=e.getWorldPosition(r.cameraPosition.value),g=ku.copy(f).applyMatrix4(r.worldToECEFMatrix.value);try{r.cameraHeight.value=Vu.setFromECEF(g).height}catch{}}copyReprojectionMatrix(e){this.previousProjectionMatrix??=new W,this.previousViewMatrix??=new W,this.previousProjectionMatrix.copy(e.projectionMatrix),this.previousViewMatrix.copy(e.matrixWorldInverse)}setSize(e,r,i,n){this.uniforms.resolution.value.set(e,r),i!=null&&n!=null?this.uniforms.targetUvScale.value.set(e/i,r/n):this.uniforms.targetUvScale.value.setScalar(1),this.previousProjectionMatrix=void 0,this.previousViewMatrix=void 0}setShadowSize(e,r){this.uniforms.shadowTexelSize.value.set(1/e,1/r)}get depthBuffer(){return this.uniforms.depthBuffer.value}set depthBuffer(e){this.uniforms.depthBuffer.value=e}}Ce([Tt("DEPTH_PACKING")],ye.prototype,"depthPacking");Ce([Xa("LOCAL_WEATHER_CHANNELS",{validate:t=>/^[rgba]{4}$/.test(t)})],ye.prototype,"localWeatherChannels");Ce([Y("SHAPE_DETAIL")],ye.prototype,"shapeDetail");Ce([Y("TURBULENCE")],ye.prototype,"turbulence");Ce([Y("SHADOW_LENGTH")],ye.prototype,"shadowLength");Ce([Y("HAZE")],ye.prototype,"haze");Ce([Tt("MULTI_SCATTERING_OCTAVES",{min:1,max:12})],ye.prototype,"multiScatteringOctaves");Ce([Y("ACCURATE_SUN_SKY_LIGHT")],ye.prototype,"accurateSunSkyLight");Ce([Y("ACCURATE_PHASE_FUNCTION")],ye.prototype,"accuratePhaseFunction");Ce([Tt("SHADOW_CASCADE_COUNT",{min:1,max:4})],ye.prototype,"shadowCascadeCount");Ce([Tt("SHADOW_SAMPLE_COUNT",{min:1,max:16})],ye.prototype,"shadowSampleCount");Ce([ji("SCATTER_ANISOTROPY_1")],ye.prototype,"scatterAnisotropy1");Ce([ji("SCATTER_ANISOTROPY_2")],ye.prototype,"scatterAnisotropy2");Ce([ji("SCATTER_ANISOTROPY_MIX")],ye.prototype,"scatterAnisotropyMix");const Yu=`// Taken from https://gist.github.com/TheRealMJP/c83b8c0f46b63f3a88a5986f4fa982b1
// TODO: Use 5-taps version: https://www.shadertoy.com/view/MtVGWz
// Or even 4 taps (requires preprocessing in the input buffer):
// https://www.shadertoy.com/view/4tyGDD

/**
 * MIT License
 *
 * Copyright (c) 2019 MJP
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

vec4 textureCatmullRom(sampler2D tex, vec2 uv) {
  vec2 texSize = vec2(textureSize(tex, 0));

  // We're going to sample a a 4x4 grid of texels surrounding the target UV
  // coordinate. We'll do this by rounding down the sample location to get the
  // exact center of our "starting" texel. The starting texel will be at
  // location [1, 1] in the grid, where [0, 0] is the top left corner.
  vec2 samplePos = uv * texSize;
  vec2 texPos1 = floor(samplePos - 0.5) + 0.5;

  // Compute the fractional offset from our starting texel to our original
  // sample location, which we'll feed into the Catmull-Rom spline function to
  // get our filter weights.
  vec2 f = samplePos - texPos1;

  // Compute the Catmull-Rom weights using the fractional offset that we
  // calculated earlier. These equations are pre-expanded based on our knowledge
  // of where the texels will be located, which lets us avoid having to evaluate
  // a piece-wise function.
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);

  // Work out weighting factors and sampling offsets that will let us use
  // bilinear filtering to simultaneously evaluate the middle 2 samples from the
  // 4x4 grid.
  vec2 w12 = w1 + w2;
  vec2 offset12 = w2 / (w1 + w2);

  // Compute the final UV coordinates we'll use for sampling the texture
  vec2 texPos0 = texPos1 - 1.0;
  vec2 texPos3 = texPos1 + 2.0;
  vec2 texPos12 = texPos1 + offset12;

  texPos0 /= texSize;
  texPos3 /= texSize;
  texPos12 /= texSize;

  vec4 result = vec4(0.0);
  result += texture(tex, vec2(texPos0.x, texPos0.y)) * w0.x * w0.y;
  result += texture(tex, vec2(texPos12.x, texPos0.y)) * w12.x * w0.y;
  result += texture(tex, vec2(texPos3.x, texPos0.y)) * w3.x * w0.y;

  result += texture(tex, vec2(texPos0.x, texPos12.y)) * w0.x * w12.y;
  result += texture(tex, vec2(texPos12.x, texPos12.y)) * w12.x * w12.y;
  result += texture(tex, vec2(texPos3.x, texPos12.y)) * w3.x * w12.y;

  result += texture(tex, vec2(texPos0.x, texPos3.y)) * w0.x * w3.y;
  result += texture(tex, vec2(texPos12.x, texPos3.y)) * w12.x * w3.y;
  result += texture(tex, vec2(texPos3.x, texPos3.y)) * w3.x * w3.y;

  return result;
}

vec4 textureCatmullRom(sampler2DArray tex, vec3 uv) {
  vec2 texSize = vec2(textureSize(tex, 0));
  vec2 samplePos = uv.xy * texSize;
  vec2 texPos1 = floor(samplePos - 0.5) + 0.5;
  vec2 f = samplePos - texPos1;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2;
  vec2 offset12 = w2 / (w1 + w2);
  vec2 texPos0 = texPos1 - 1.0;
  vec2 texPos3 = texPos1 + 2.0;
  vec2 texPos12 = texPos1 + offset12;
  texPos0 /= texSize;
  texPos3 /= texSize;
  texPos12 /= texSize;
  vec4 result = vec4(0.0);
  result += texture(tex, vec3(texPos0.x, texPos0.y, uv.z)) * w0.x * w0.y;
  result += texture(tex, vec3(texPos12.x, texPos0.y, uv.z)) * w12.x * w0.y;
  result += texture(tex, vec3(texPos3.x, texPos0.y, uv.z)) * w3.x * w0.y;
  result += texture(tex, vec3(texPos0.x, texPos12.y, uv.z)) * w0.x * w12.y;
  result += texture(tex, vec3(texPos12.x, texPos12.y, uv.z)) * w12.x * w12.y;
  result += texture(tex, vec3(texPos3.x, texPos12.y, uv.z)) * w3.x * w12.y;
  result += texture(tex, vec3(texPos0.x, texPos3.y, uv.z)) * w0.x * w3.y;
  result += texture(tex, vec3(texPos12.x, texPos3.y, uv.z)) * w12.x * w3.y;
  result += texture(tex, vec3(texPos3.x, texPos3.y, uv.z)) * w3.x * w3.y;
  return result;
}
`,ju=`precision highp float;
precision highp sampler2DArray;

#include "core/turbo"
#include "catmullRomSampling"
#include "varianceClipping"

uniform sampler2D colorBuffer;
uniform sampler2D depthVelocityBuffer;
uniform sampler2D colorHistoryBuffer;

#ifdef SHADOW_LENGTH
uniform sampler2D shadowLengthBuffer;
uniform sampler2D shadowLengthHistoryBuffer;
#endif // SHADOW_LENGTH

uniform vec2 texelSize;
uniform int frame;
uniform float varianceGamma;
uniform float temporalAlpha;
uniform vec2 jitterOffset;

in vec2 vUv;

layout(location = 0) out vec4 outputColor;
#ifdef SHADOW_LENGTH
layout(location = 1) out float outputShadowLength;
#endif // SHADOW_LENGTH

const ivec2 neighborOffsets[9] = ivec2[9](
  ivec2(-1, -1),
  ivec2(-1, 0),
  ivec2(-1, 1),
  ivec2(0, -1),
  ivec2(0, 0),
  ivec2(0, 1),
  ivec2(1, -1),
  ivec2(1, 0),
  ivec2(1, 1)
);

const ivec4[4] bayerIndices = ivec4[4](
  ivec4(0, 12, 3, 15),
  ivec4(8, 4, 11, 7),
  ivec4(2, 14, 1, 13),
  ivec4(10, 6, 9, 5)
);

vec4 getClosestFragment(const ivec2 coord) {
  vec4 result = vec4(1e7, 0.0, 0.0, 0.0);
  vec4 neighbor;
  #pragma unroll_loop_start
  for (int i = 0; i < 9; ++i) {
    neighbor = texelFetchOffset(depthVelocityBuffer, coord, 0, neighborOffsets[i]);
    if (neighbor.r < result.r) {
      result = neighbor;
    }
  }
  #pragma unroll_loop_end
  return result;
}

void temporalUpscale(
  const ivec2 coord,
  const ivec2 lowResCoord,
  const bool currentFrame,
  out vec4 outputColor,
  out float outputShadowLength
) {
  vec4 currentColor = texelFetch(colorBuffer, lowResCoord, 0);
  #ifdef SHADOW_LENGTH
  vec4 currentShadowLength = vec4(texelFetch(shadowLengthBuffer, lowResCoord, 0).rgb, 1.0);
  #endif // SHADOW_LENGTH

  if (currentFrame) {
    // Use the texel just rendered without any accumulation.
    outputColor = currentColor;
    #ifdef SHADOW_LENGTH
    outputShadowLength = currentShadowLength.r;
    #endif // SHADOW_LENGTH
    return;
  }

  vec4 depthVelocity = getClosestFragment(lowResCoord);
  vec2 velocity = depthVelocity.gb;
  vec2 prevUv = vUv - velocity;
  if (prevUv.x < 0.0 || prevUv.x > 1.0 || prevUv.y < 0.0 || prevUv.y > 1.0) {
    outputColor = currentColor;
    #ifdef SHADOW_LENGTH
    outputShadowLength = currentShadowLength.r;
    #endif // SHADOW_LENGTH
    return; // Rejection
  }

  // Variance clipping with a large variance gamma seems to work fine for
  // upsampling. This increases ghosting, of course, but it's hard to notice on
  // clouds.
  // vec4 historyColor = textureCatmullRom(colorHistoryBuffer, prevUv);
  vec4 historyColor = texture(colorHistoryBuffer, prevUv);
  vec4 clippedColor = varianceClipping(colorBuffer, vUv, currentColor, historyColor, varianceGamma);
  outputColor = clippedColor;

  #ifdef SHADOW_LENGTH
  // Sampling the shadow length history using scene depth doesn't make much
  // sense, but it's too hard to derive it properly. At least this approach
  // resolves the edges of scene objects.
  // vec4 historyShadowLength = vec4(textureCatmullRom(shadowLengthHistoryBuffer, prevUv).rgb, 1.0);
  vec4 historyShadowLength = vec4(texture(shadowLengthHistoryBuffer, prevUv).rgb, 1.0);
  vec4 clippedShadowLength = varianceClipping(
    shadowLengthBuffer,
    vUv,
    currentShadowLength,
    historyShadowLength,
    varianceGamma
  );
  outputShadowLength = clippedShadowLength.r;
  #endif // SHADOW_LENGTH
}

void temporalAntialiasing(const ivec2 coord, out vec4 outputColor, out float outputShadowLength) {
  vec4 currentColor = texelFetch(colorBuffer, coord, 0);
  #ifdef SHADOW_LENGTH
  vec4 currentShadowLength = vec4(texelFetch(shadowLengthBuffer, coord, 0).rgb, 1.0);
  #endif // SHADOW_LENGTH

  vec4 depthVelocity = getClosestFragment(coord);
  vec2 velocity = depthVelocity.gb;

  vec2 prevUv = vUv - velocity;
  if (prevUv.x < 0.0 || prevUv.x > 1.0 || prevUv.y < 0.0 || prevUv.y > 1.0) {
    outputColor = currentColor;
    #ifdef SHADOW_LENGTH
    outputShadowLength = currentShadowLength.r;
    #endif // SHADOW_LENGTH
    return; // Rejection
  }

  vec4 historyColor = texture(colorHistoryBuffer, prevUv);
  vec4 clippedColor = varianceClipping(colorBuffer, coord, currentColor, historyColor);
  outputColor = mix(clippedColor, currentColor, temporalAlpha);

  #ifdef SHADOW_LENGTH
  vec4 historyShadowLength = vec4(texture(shadowLengthHistoryBuffer, prevUv).rgb, 1.0);
  vec4 clippedShadowLength = varianceClipping(
    shadowLengthBuffer,
    coord,
    currentShadowLength,
    historyShadowLength
  );
  outputShadowLength = mix(clippedShadowLength.r, currentShadowLength.r, temporalAlpha);
  #endif // SHADOW_LENGTH
}

void main() {
  ivec2 coord = ivec2(gl_FragCoord.xy);

  #if !defined(SHADOW_LENGTH)
  float outputShadowLength;
  #endif // !defined(SHADOW_LENGTH)

  #ifdef TEMPORAL_UPSCALE
  ivec2 lowResCoord = coord / 4;
  int bayerValue = bayerIndices[coord.x % 4][coord.y % 4];
  bool currentFrame = bayerValue == frame % 16;
  temporalUpscale(coord, lowResCoord, currentFrame, outputColor, outputShadowLength);
  #else // TEMPORAL_UPSCALE
  temporalAntialiasing(coord, outputColor, outputShadowLength);
  #endif // TEMPORAL_UPSCALE

  #if defined(SHADOW_LENGTH) && defined(DEBUG_SHOW_SHADOW_LENGTH)
  outputColor = vec4(turbo(outputShadowLength * 0.05), 1.0);
  #endif // defined(SHADOW_LENGTH) && defined(DEBUG_SHOW_SHADOW_LENGTH)

  #ifdef DEBUG_SHOW_VELOCITY
  outputColor.rgb = outputColor.rgb + vec3(abs(texture(depthVelocityBuffer, vUv).gb) * 10.0, 0.0);
  #endif // DEBUG_SHOW_VELOCITY
}
`,$u=`precision highp float;

layout(location = 0) in vec3 position;

out vec2 vUv;

void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`,lo=`#ifdef VARIANCE_9_SAMPLES
#define VARIANCE_OFFSET_COUNT 8
const ivec2 varianceOffsets[8] = ivec2[8](
  ivec2(-1, -1),
  ivec2(-1, 1),
  ivec2(1, -1),
  ivec2(1, 1),
  ivec2(1, 0),
  ivec2(0, -1),
  ivec2(0, 1),
  ivec2(-1, 0)
);
#else // VARIANCE_9_SAMPLES
#define VARIANCE_OFFSET_COUNT 4
const ivec2 varianceOffsets[4] = ivec2[4](ivec2(1, 0), ivec2(0, -1), ivec2(0, 1), ivec2(-1, 0));
#endif // VARIANCE_9_SAMPLES

// Reference: https://github.com/playdeadgames/temporal
vec4 clipAABB(const vec4 current, const vec4 history, const vec4 minColor, const vec4 maxColor) {
  vec3 pClip = 0.5 * (maxColor.rgb + minColor.rgb);
  vec3 eClip = 0.5 * (maxColor.rgb - minColor.rgb) + 1e-7;
  vec4 vClip = history - vec4(pClip, current.a);
  vec3 vUnit = vClip.xyz / eClip;
  vec3 aUnit = abs(vUnit);
  float maUnit = max(aUnit.x, max(aUnit.y, aUnit.z));
  if (maUnit > 1.0) {
    return vec4(pClip, current.a) + vClip / maUnit;
  }
  return history;
}

#ifdef VARIANCE_SAMPLER_ARRAY
#define VARIANCE_SAMPLER sampler2DArray
#define VARIANCE_SAMPLER_COORD ivec3
#else // VARIANCE_SAMPLER_ARRAY
#define VARIANCE_SAMPLER sampler2D
#define VARIANCE_SAMPLER_COORD ivec2
#endif // VARIANCE_SAMPLER_ARRAY

// Variance clipping
// Reference: https://developer.download.nvidia.com/gameworks/events/GDC2016/msalvi_temporal_supersampling.pdf
vec4 varianceClipping(
  const VARIANCE_SAMPLER inputBuffer,
  const VARIANCE_SAMPLER_COORD coord,
  const vec4 current,
  const vec4 history,
  const float gamma
) {
  vec4 moment1 = current;
  vec4 moment2 = current * current;
  vec4 neighbor;
  #pragma unroll_loop_start
  for (int i = 0; i < 8; ++i) {
    #if UNROLLED_LOOP_INDEX < VARIANCE_OFFSET_COUNT
    neighbor = texelFetchOffset(inputBuffer, coord, 0, varianceOffsets[i]);
    moment1 += neighbor;
    moment2 += neighbor * neighbor;
    #endif // UNROLLED_LOOP_INDEX < VARIANCE_OFFSET_COUNT
  }
  #pragma unroll_loop_end

  const float N = float(VARIANCE_OFFSET_COUNT + 1);
  vec4 mean = moment1 / N;
  vec4 varianceGamma = sqrt(max(moment2 / N - mean * mean, 0.0)) * gamma;
  vec4 minColor = mean - varianceGamma;
  vec4 maxColor = mean + varianceGamma;
  return clipAABB(clamp(mean, minColor, maxColor), history, minColor, maxColor);
}

vec4 varianceClipping(
  const VARIANCE_SAMPLER inputBuffer,
  const VARIANCE_SAMPLER_COORD coord,
  const vec4 current,
  const vec4 history
) {
  return varianceClipping(inputBuffer, coord, current, history, 1.0);
}

vec4 varianceClipping(
  const sampler2D inputBuffer,
  const vec2 coord,
  const vec4 current,
  const vec4 history,
  const float gamma
) {
  vec4 moment1 = current;
  vec4 moment2 = current * current;
  vec4 neighbor;
  #pragma unroll_loop_start
  for (int i = 0; i < 8; ++i) {
    #if UNROLLED_LOOP_INDEX < VARIANCE_OFFSET_COUNT
    neighbor = textureOffset(inputBuffer, coord, varianceOffsets[i]);
    moment1 += neighbor;
    moment2 += neighbor * neighbor;
    #endif // UNROLLED_LOOP_INDEX < VARIANCE_OFFSET_COUNT
  }
  #pragma unroll_loop_end

  const float N = float(VARIANCE_OFFSET_COUNT + 1);
  vec4 mean = moment1 / N;
  vec4 varianceGamma = sqrt(max(moment2 / N - mean * mean, 0.0)) * gamma;
  vec4 minColor = mean - varianceGamma;
  vec4 maxColor = mean + varianceGamma;
  return clipAABB(clamp(mean, minColor, maxColor), history, minColor, maxColor);
}

vec4 varianceClipping(
  const sampler2D inputBuffer,
  const vec2 coord,
  const vec4 current,
  const vec4 history
) {
  return varianceClipping(inputBuffer, coord, current, history, 1.0);
}
`;var Xu=Object.defineProperty,uo=(t,e,r,i)=>{for(var n=void 0,o=t.length-1,s;o>=0;o--)(s=t[o])&&(n=s(e,r,n)||n);return n&&Xu(e,r,n),n};class sn extends Pr{constructor({colorBuffer:e=null,depthVelocityBuffer:r=null,shadowLengthBuffer:i=null,colorHistoryBuffer:n=null,shadowLengthHistoryBuffer:o=null}={}){super({name:"CloudsResolveMaterial",glslVersion:Ut,vertexShader:$u,fragmentShader:cr(it(ju,{core:{turbo:Qa},catmullRomSampling:Yu,varianceClipping:lo})),uniforms:{colorBuffer:new d(e),depthVelocityBuffer:new d(r),shadowLengthBuffer:new d(i),colorHistoryBuffer:new d(n),shadowLengthHistoryBuffer:new d(o),texelSize:new d(new k),frame:new d(0),jitterOffset:new d(new k),varianceGamma:new d(2),temporalAlpha:new d(.1)}}),this.temporalUpscale=!0,this.shadowLength=!0}setSize(e,r){this.uniforms.texelSize.value.set(1/e,1/r)}onBeforeRender(e,r,i,n,o,s){const l=this.uniforms.frame.value%16,h=oo[l],f=(h.x-.5)*4,g=(h.y-.5)*4;this.uniforms.jitterOffset.value.set(f,g)}}uo([Y("TEMPORAL_UPSCALE")],sn.prototype,"temporalUpscale");uo([Y("SHADOW_LENGTH")],sn.prototype,"shadowLength");class ho extends Le{constructor(e,r){super(e),this._mainCamera=new Ui;const{shadow:i}=r;this.shadow=i}get mainCamera(){return this._mainCamera}set mainCamera(e){this._mainCamera=e}}function ui(t,{depthVelocity:e,shadowLength:r}){const i=new rt(1,1,{depthBuffer:!1,type:Ve});i.texture.minFilter=Te,i.texture.magFilter=Te,i.texture.name=t;let n;e&&(n=i.texture.clone(),n.isRenderTargetTexture=!0,i.depthVelocity=n,i.textures.push(n));let o;return r&&(o=i.texture.clone(),o.isRenderTargetTexture=!0,o.format=St,i.shadowLength=o,i.textures.push(o)),Object.assign(i,{depthVelocity:n??null,shadowLength:o??null})}class Zu extends ho{constructor({parameterUniforms:e,layerUniforms:r,atmosphereUniforms:i,...n},o){super("CloudsPass",n),this.atmosphere=o,this.width=0,this.height=0,this.currentMaterial=new ye({parameterUniforms:e,layerUniforms:r,atmosphereUniforms:i},o),this.currentPass=new Si(this.currentMaterial),this.resolveMaterial=new sn,this.resolvePass=new Si(this.resolveMaterial),this.initRenderTargets({depthVelocity:!0,shadowLength:M.lightShafts})}copyCameraSettings(e){this.currentMaterial.copyCameraSettings(e)}initialize(e,r,i){this.currentPass.initialize(e,r,i),this.resolvePass.initialize(e,r,i)}initRenderTargets(e){this.currentRenderTarget?.dispose(),this.resolveRenderTarget?.dispose(),this.historyRenderTarget?.dispose();const r=ui("Clouds",e),i=ui("Clouds.A",{...e,depthVelocity:!1}),n=ui("Clouds.B",{...e,depthVelocity:!1});this.currentRenderTarget=r,this.resolveRenderTarget=i,this.historyRenderTarget=n;const o=this.resolveMaterial.uniforms;o.colorBuffer.value=r.texture,o.depthVelocityBuffer.value=r.depthVelocity,o.shadowLengthBuffer.value=r.shadowLength,o.colorHistoryBuffer.value=n.texture,o.shadowLengthHistoryBuffer.value=n.shadowLength}copyShadow(){const e=this.shadow,r=this.currentMaterial.uniforms;for(let i=0;i<e.cascadeCount;++i){const n=e.cascades[i];r.shadowIntervals.value[i].copy(n.interval),r.shadowMatrices.value[i].copy(n.matrix)}r.shadowFar.value=e.far}copyReprojection(){this.currentMaterial.copyReprojectionMatrix(this.mainCamera)}swapBuffers(){const e=this.historyRenderTarget,r=this.resolveRenderTarget;this.resolveRenderTarget=e,this.historyRenderTarget=r;const i=this.resolveMaterial.uniforms;i.colorHistoryBuffer.value=r.texture,i.shadowLengthHistoryBuffer.value=r.shadowLength}update(e,r,i){this.currentMaterial.uniforms.frame.value=r,this.resolveMaterial.uniforms.frame.value=r,this.copyCameraSettings(this.mainCamera),this.copyShadow(),this.currentPass.render(e,null,this.currentRenderTarget),this.resolvePass.render(e,null,this.resolveRenderTarget),this.copyReprojection(),this.swapBuffers()}setSize(e,r){if(this.width=e,this.height=r,this.temporalUpscale){const i=Math.ceil(e/4),n=Math.ceil(r/4);this.currentRenderTarget.setSize(i,n),this.currentMaterial.setSize(i*4,n*4,e,r)}else this.currentRenderTarget.setSize(e,r),this.currentMaterial.setSize(e,r);this.resolveRenderTarget.setSize(e,r),this.resolveMaterial.setSize(e,r),this.historyRenderTarget.setSize(e,r)}setShadowSize(e,r,i){this.currentMaterial.shadowCascadeCount=i,this.currentMaterial.setShadowSize(e,r)}setDepthTexture(e,r){this.currentMaterial.depthBuffer=e,this.currentMaterial.depthPacking=r??0}get outputBuffer(){return this.historyRenderTarget.texture}get shadowBuffer(){return this.currentMaterial.uniforms.shadowBuffer.value}set shadowBuffer(e){this.currentMaterial.uniforms.shadowBuffer.value=e}get shadowLengthBuffer(){return this.historyRenderTarget.shadowLength}get temporalUpscale(){return this.currentMaterial.temporalUpscale}set temporalUpscale(e){e!==this.temporalUpscale&&(this.currentMaterial.temporalUpscale=e,this.resolveMaterial.temporalUpscale=e,this.setSize(this.width,this.height))}get lightShafts(){return this.currentMaterial.shadowLength}set lightShafts(e){e!==this.lightShafts&&(this.currentMaterial.shadowLength=e,this.resolveMaterial.shadowLength=e,this.initRenderTargets({depthVelocity:!0,shadowLength:e}),this.setSize(this.width,this.height))}}function qu(t,e){const r=t.properties.get(e.texture).__webglTexture,i=t.getContext();dt(i instanceof WebGL2RenderingContext),t.setRenderTarget(e);const n=[];if(r!=null)for(let o=0;o<e.depth;++o)i.framebufferTextureLayer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+o,r,0,o),n.push(i.COLOR_ATTACHMENT0+o);i.drawBuffers(n)}class da extends Si{render(e,r,i,n,o){const s=this.fullscreenMaterial.uniforms;r!==null&&s?.[this.input]!=null&&(s[this.input].value=r.texture),qu(e,i),e.render(this.scene,this.camera)}}const Ku=`precision highp float;
precision highp sampler3D;

#include <common>

#include "core/math"
#include "core/raySphereIntersection"
#include "types"
#include "parameters"
#include "structuredSampling"
#include "clouds"

uniform mat4 inverseShadowMatrices[CASCADE_COUNT];
uniform mat4 reprojectionMatrices[CASCADE_COUNT];

// Primary raymarch
uniform int maxIterationCount;
uniform float minStepSize;
uniform float maxStepSize;
uniform float opticalDepthTailScale;

in vec2 vUv;

layout(location = 0) out vec4 outputColor[CASCADE_COUNT];

// Redundant notation for prettier.
#if CASCADE_COUNT == 1
layout(location = 1) out vec3 outputDepthVelocity[CASCADE_COUNT];
#elif CASCADE_COUNT == 2
layout(location = 2) out vec3 outputDepthVelocity[CASCADE_COUNT];
#elif CASCADE_COUNT == 3
layout(location = 3) out vec3 outputDepthVelocity[CASCADE_COUNT];
#elif CASCADE_COUNT == 4
layout(location = 4) out vec3 outputDepthVelocity[CASCADE_COUNT];
#endif // CASCADE_COUNT

vec4 marchClouds(
  const vec3 rayOrigin,
  const vec3 rayDirection,
  const float maxRayDistance,
  const float jitter,
  const float mipLevel
) {
  // Setup structured volume sampling (SVS).
  // While SVS introduces spatial aliasing, it is indeed temporally stable,
  // which is important for lower-resolution shadow maps where a flickering
  // single pixel can be highly noticeable.
  vec3 normal = getStructureNormal(rayDirection, jitter);
  float rayDistance;
  float stepSize;
  intersectStructuredPlanes(
    normal,
    rayOrigin,
    rayDirection,
    clamp(maxRayDistance / float(maxIterationCount), minStepSize, maxStepSize),
    rayDistance,
    stepSize
  );

  #ifdef TEMPORAL_JITTER
  rayDistance -= stepSize * jitter;
  #endif // TEMPORAL_JITTER

  float extinctionSum = 0.0;
  float maxOpticalDepth = 0.0;
  float maxOpticalDepthTail = 0.0;
  float transmittanceIntegral = 1.0;
  float weightedDistanceSum = 0.0;
  float transmittanceSum = 0.0;

  int sampleCount = 0;
  for (int i = 0; i < maxIterationCount; ++i) {
    if (rayDistance > maxRayDistance) {
      break; // Termination
    }

    vec3 position = rayDistance * rayDirection + rayOrigin;
    float height = length(position) - bottomRadius;

    #if !defined(DEBUG_MARCH_INTERVALS)
    if (insideLayerIntervals(height)) {
      rayDistance += stepSize;
      continue;
    }
    #endif // !defined(DEBUG_MARCH_INTERVALS)

    // Sample rough weather.
    vec2 uv = getGlobeUv(position);
    WeatherSample weather = sampleWeather(uv, height, mipLevel);

    if (any(greaterThan(weather.density, vec4(minDensity)))) {
      // Sample detailed participating media.
      // Note this assumes an homogeneous medium.
      MediaSample media = sampleMedia(weather, position, uv, mipLevel, jitter);
      if (media.extinction > minExtinction) {
        extinctionSum += media.extinction;
        maxOpticalDepth += media.extinction * stepSize;
        transmittanceIntegral *= exp(-media.extinction * stepSize);
        weightedDistanceSum += rayDistance * transmittanceIntegral;
        transmittanceSum += transmittanceIntegral;
        ++sampleCount;
      }
    }

    if (transmittanceIntegral <= minTransmittance) {
      // A large amount of optical depth accumulates in the tail, beyond the
      // point of minimum transmittance. The expected optical depth seems to
      // decrease exponentially with the number of samples taken before reaching
      // the minimum transmittance.
      // See the discussion here: https://x.com/shotamatsuda/status/1886259549931520437
      maxOpticalDepthTail = min(
        opticalDepthTailScale * stepSize * exp(float(1 - sampleCount)),
        stepSize * 0.5 // Excessive optical depth only introduces aliasing.
      );
      break; // Early termination
    }
    rayDistance += stepSize;
  }

  if (sampleCount == 0) {
    return vec4(maxRayDistance, 0.0, 0.0, 0.0);
  }
  float frontDepth = min(weightedDistanceSum / transmittanceSum, maxRayDistance);
  float meanExtinction = extinctionSum / float(sampleCount);
  return vec4(frontDepth, meanExtinction, maxOpticalDepth, maxOpticalDepthTail);
}

void getRayNearFar(
  const vec3 sunPosition,
  const vec3 rayDirection,
  out float rayNear,
  out float rayFar
) {
  vec4 firstIntersections = raySphereFirstIntersection(
    sunPosition,
    rayDirection,
    vec3(0.0),
    bottomRadius + vec4(shadowTopHeight, shadowBottomHeight, 0.0, 0.0)
  );
  rayNear = max(0.0, firstIntersections.x);
  rayFar = firstIntersections.y;
  if (rayFar < 0.0) {
    rayFar = 1e6;
  }
}

void cascade(
  const int cascadeIndex,
  const float mipLevel,
  out vec4 outputColor,
  out vec3 outputDepthVelocity
) {
  vec2 clip = vUv * 2.0 - 1.0;
  vec4 point = inverseShadowMatrices[cascadeIndex] * vec4(clip.xy, -1.0, 1.0);
  point /= point.w;
  vec3 sunPosition = (worldToECEFMatrix * vec4(point.xyz, 1.0)).xyz + altitudeCorrection;

  vec3 rayDirection = normalize(-sunDirection);
  float rayNear;
  float rayFar;
  getRayNearFar(sunPosition, rayDirection, rayNear, rayFar);

  vec3 rayOrigin = rayNear * rayDirection + sunPosition;
  float stbn = getSTBN();
  vec4 color = marchClouds(rayOrigin, rayDirection, rayFar - rayNear, stbn, mipLevel);
  outputColor = color;

  // Velocity for temporal resolution.
  #ifdef TEMPORAL_PASS
  vec3 frontPosition = color.x * rayDirection + rayOrigin;
  vec3 frontPositionWorld = (ecefToWorldMatrix * vec4(frontPosition - altitudeCorrection, 1.0)).xyz;
  vec4 prevClip = reprojectionMatrices[cascadeIndex] * vec4(frontPositionWorld, 1.0);
  prevClip /= prevClip.w;
  vec2 prevUv = prevClip.xy * 0.5 + 0.5;
  vec2 velocity = (vUv - prevUv) * resolution;
  outputDepthVelocity = vec3(color.x, velocity);
  #else // TEMPORAL_PASS
  outputDepthVelocity = vec3(0.0);
  #endif // TEMPORAL_PASS
}

// TODO: Calculate from the main camera frustum perhaps?
const float mipLevels[4] = float[4](0.0, 0.5, 1.0, 2.0);

void main() {
  #pragma unroll_loop_start
  for (int i = 0; i < 4; ++i) {
    #if UNROLLED_LOOP_INDEX < CASCADE_COUNT
    cascade(UNROLLED_LOOP_INDEX, mipLevels[i], outputColor[i], outputDepthVelocity[i]);
    #endif // UNROLLED_LOOP_INDEX < CASCADE_COUNT
  }
  #pragma unroll_loop_end
}
`,Qu=`precision highp float;

layout(location = 0) in vec3 position;

out vec2 vUv;

void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`,Ju=`// Implements Structured Volume Sampling in fragment shader:
// https://github.com/huwb/volsample
// Implementation reference:
// https://www.shadertoy.com/view/ttVfDc

void getIcosahedralVertices(const vec3 direction, out vec3 v1, out vec3 v2, out vec3 v3) {
  // Normalization scalers to fit dodecahedron to unit sphere.
  const float a = 0.85065080835204; // phi / sqrt(2 + phi)
  const float b = 0.5257311121191336; // 1 / sqrt(2 + phi)

  // Derive the vertices of icosahedron where triangle intersects the direction.
  // See: https://www.ppsloan.org/publications/AmbientDice.pdf
  const float kT = 0.6180339887498948; // 1 / phi
  const float kT2 = 0.38196601125010515; // 1 / phi^2
  vec3 absD = abs(direction);
  float selector1 = dot(absD, vec3(1.0, kT2, -kT));
  float selector2 = dot(absD, vec3(-kT, 1.0, kT2));
  float selector3 = dot(absD, vec3(kT2, -kT, 1.0));
  v1 = selector1 > 0.0 ? vec3(a, b, 0.0) : vec3(-b, 0.0, a);
  v2 = selector2 > 0.0 ? vec3(0.0, a, b) : vec3(a, -b, 0.0);
  v3 = selector3 > 0.0 ? vec3(b, 0.0, a) : vec3(0.0, a, -b);
  vec3 octantSign = sign(direction);
  v1 *= octantSign;
  v2 *= octantSign;
  v3 *= octantSign;
}

void swapIfBigger(inout vec4 a, inout vec4 b) {
  if (a.w > b.w) {
    vec4 t = a;
    a = b;
    b = t;
  }
}

void sortVertices(inout vec3 a, inout vec3 b, inout vec3 c) {
  const vec3 base = vec3(0.5, 0.5, 1.0);
  vec4 aw = vec4(a, dot(a, base));
  vec4 bw = vec4(b, dot(b, base));
  vec4 cw = vec4(c, dot(c, base));
  swapIfBigger(aw, bw);
  swapIfBigger(bw, cw);
  swapIfBigger(aw, bw);
  a = aw.xyz;
  b = bw.xyz;
  c = cw.xyz;
}

vec3 getPentagonalWeights(const vec3 direction, const vec3 v1, const vec3 v2, const vec3 v3) {
  float d1 = dot(v1, direction);
  float d2 = dot(v2, direction);
  float d3 = dot(v3, direction);
  vec3 w = exp(vec3(d1, d2, d3) * 40.0);
  return w / (w.x + w.y + w.z);
}

vec3 getStructureNormal(
  const vec3 direction,
  const float jitter,
  out vec3 a,
  out vec3 b,
  out vec3 c,
  out vec3 weights
) {
  getIcosahedralVertices(direction, a, b, c);
  sortVertices(a, b, c);
  weights = getPentagonalWeights(direction, a, b, c);
  return jitter < weights.x
    ? a
    : jitter < weights.x + weights.y
      ? b
      : c;
}

vec3 getStructureNormal(const vec3 direction, const float jitter) {
  vec3 a, b, c, weights;
  return getStructureNormal(direction, jitter, a, b, c, weights);
}

// Reference: https://github.com/huwb/volsample/blob/master/src/unity/Assets/Shaders/RayMarchCore.cginc
void intersectStructuredPlanes(
  const vec3 normal,
  const vec3 rayOrigin,
  const vec3 rayDirection,
  const float samplePeriod,
  out float stepOffset,
  out float stepSize
) {
  float NoD = dot(rayDirection, normal);
  stepSize = samplePeriod / abs(NoD);

  // Skips leftover bit to get from rayOrigin to first strata plane.
  stepOffset = -mod(dot(rayOrigin, normal), samplePeriod) / NoD;

  // mod() gives different results depending on if the arg is negative or
  // positive. This line makes it consistent, and ensures the first sample is in
  // front of the viewer.
  if (stepOffset < 0.0) {
    stepOffset += stepSize;
  }
}
`;var eh=Object.defineProperty,Gt=(t,e,r,i)=>{for(var n=void 0,o=t.length-1,s;o>=0;o--)(s=t[o])&&(n=s(e,r,n)||n);return n&&eh(e,r,n),n};class xt extends Pr{constructor({parameterUniforms:e,layerUniforms:r,atmosphereUniforms:i}){super({name:"ShadowMaterial",glslVersion:Ut,vertexShader:Qu,fragmentShader:cr(it(Ku,{core:{math:$i,raySphereIntersection:zr},types:Oi,parameters:co,structuredSampling:Ju,clouds:so})),uniforms:{...e,...r,...i,inverseShadowMatrices:new d(Array.from({length:4},()=>new W)),reprojectionMatrices:new d(Array.from({length:4},()=>new W)),resolution:new d(new k),frame:new d(0),stbnTexture:new d(null),maxIterationCount:new d(M.shadow.maxIterationCount),minStepSize:new d(M.shadow.minStepSize),maxStepSize:new d(M.shadow.maxStepSize),minDensity:new d(M.shadow.minDensity),minExtinction:new d(M.shadow.minExtinction),minTransmittance:new d(M.shadow.minTransmittance),opticalDepthTailScale:new d(2)},defines:{SHADOW:"1",TEMPORAL_PASS:"1",TEMPORAL_JITTER:"1"}}),this.localWeatherChannels="rgba",this.cascadeCount=M.shadow.cascadeCount,this.temporalPass=!0,this.temporalJitter=!0,this.shapeDetail=M.shapeDetail,this.turbulence=M.turbulence,this.cascadeCount=M.shadow.cascadeCount}setSize(e,r){this.uniforms.resolution.value.set(e,r)}}Gt([Xa("LOCAL_WEATHER_CHANNELS",{validate:t=>/^[rgba]{4}$/.test(t)})],xt.prototype,"localWeatherChannels");Gt([Tt("CASCADE_COUNT",{min:1,max:4})],xt.prototype,"cascadeCount");Gt([Y("TEMPORAL_PASS")],xt.prototype,"temporalPass");Gt([Y("TEMPORAL_JITTER")],xt.prototype,"temporalJitter");Gt([Y("SHAPE_DETAIL")],xt.prototype,"shapeDetail");Gt([Y("TURBULENCE")],xt.prototype,"turbulence");const th=`precision highp float;
precision highp sampler2DArray;

#define VARIANCE_9_SAMPLES 1
#define VARIANCE_SAMPLER_ARRAY 1

#include "varianceClipping"

uniform sampler2DArray inputBuffer;
uniform sampler2DArray historyBuffer;

uniform vec2 texelSize;
uniform float varianceGamma;
uniform float temporalAlpha;

in vec2 vUv;

layout(location = 0) out vec4 outputColor[CASCADE_COUNT];

const ivec2 neighborOffsets[9] = ivec2[9](
  ivec2(-1, -1),
  ivec2(-1, 0),
  ivec2(-1, 1),
  ivec2(0, -1),
  ivec2(0, 0),
  ivec2(0, 1),
  ivec2(1, -1),
  ivec2(1, 0),
  ivec2(1, 1)
);

vec4 getClosestFragment(const ivec3 coord) {
  vec4 result = vec4(1e7, 0.0, 0.0, 0.0);
  vec4 neighbor;
  #pragma unroll_loop_start
  for (int i = 0; i < 9; ++i) {
    neighbor = texelFetchOffset(
      inputBuffer,
      coord + ivec3(0, 0, CASCADE_COUNT),
      0,
      neighborOffsets[i]
    );
    if (neighbor.r < result.r) {
      result = neighbor;
    }
  }
  #pragma unroll_loop_end
  return result;
}

void cascade(const int cascadeIndex, out vec4 outputColor) {
  ivec3 coord = ivec3(gl_FragCoord.xy, cascadeIndex);
  vec4 current = texelFetch(inputBuffer, coord, 0);

  vec4 depthVelocity = getClosestFragment(coord);
  vec2 velocity = depthVelocity.gb * texelSize;
  vec2 prevUv = vUv - velocity;
  if (prevUv.x < 0.0 || prevUv.x > 1.0 || prevUv.y < 0.0 || prevUv.y > 1.0) {
    outputColor = current;
    return; // Rejection
  }

  vec4 history = texture(historyBuffer, vec3(prevUv, float(cascadeIndex)));
  vec4 clippedHistory = varianceClipping(inputBuffer, coord, current, history, varianceGamma);
  outputColor = mix(clippedHistory, current, temporalAlpha);
}

void main() {
  #pragma unroll_loop_start
  for (int i = 0; i < 4; ++i) {
    #if UNROLLED_LOOP_INDEX < CASCADE_COUNT
    cascade(UNROLLED_LOOP_INDEX, outputColor[i]);
    #endif // UNROLLED_LOOP_INDEX < CASCADE_COUNT
  }
  #pragma unroll_loop_end
}
`,rh=`precision highp float;

layout(location = 0) in vec3 position;

out vec2 vUv;

void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;var ih=Object.defineProperty,nh=(t,e,r,i)=>{for(var n=void 0,o=t.length-1,s;o>=0;o--)(s=t[o])&&(n=s(e,r,n)||n);return n&&ih(e,r,n),n};class mo extends Pr{constructor({inputBuffer:e=null,historyBuffer:r=null}={}){super({name:"ShadowResolveMaterial",glslVersion:Ut,vertexShader:rh,fragmentShader:cr(it(th,{varianceClipping:lo})),uniforms:{inputBuffer:new d(e),historyBuffer:new d(r),texelSize:new d(new k),varianceGamma:new d(1),temporalAlpha:new d(.01)},defines:{}}),this.cascadeCount=M.shadow.cascadeCount}setSize(e,r){this.uniforms.texelSize.value.set(1/e,1/r)}}nh([Tt("CASCADE_COUNT",{min:1,max:4})],mo.prototype,"cascadeCount");function hi(t){const e=new ls(1,1,1,{depthBuffer:!1});return e.texture.type=Ve,e.texture.minFilter=Te,e.texture.magFilter=Te,e.texture.name=t,e}class ah extends ho{constructor({parameterUniforms:e,layerUniforms:r,atmosphereUniforms:i,...n}){super("ShadowPass",n),this.width=0,this.height=0,this.currentMaterial=new xt({parameterUniforms:e,layerUniforms:r,atmosphereUniforms:i}),this.currentPass=new da(this.currentMaterial),this.resolveMaterial=new mo,this.resolvePass=new da(this.resolveMaterial),this.initRenderTargets()}initialize(e,r,i){this.currentPass.initialize(e,r,i),this.resolvePass.initialize(e,r,i)}initRenderTargets(){this.currentRenderTarget?.dispose(),this.resolveRenderTarget?.dispose(),this.historyRenderTarget?.dispose();const e=hi("Shadow"),r=this.temporalPass?hi("Shadow.A"):null,i=this.temporalPass?hi("Shadow.B"):null;this.currentRenderTarget=e,this.resolveRenderTarget=r,this.historyRenderTarget=i;const n=this.resolveMaterial.uniforms;n.inputBuffer.value=e.texture,n.historyBuffer.value=i?.texture??null}copyShadow(){const e=this.shadow,r=this.currentMaterial.uniforms;for(let i=0;i<e.cascadeCount;++i){const n=e.cascades[i];r.inverseShadowMatrices.value[i].copy(n.inverseMatrix)}}copyReprojection(){const e=this.shadow,r=this.currentMaterial.uniforms;for(let i=0;i<e.cascadeCount;++i){const n=e.cascades[i];r.reprojectionMatrices.value[i].copy(n.matrix)}}swapBuffers(){dt(this.historyRenderTarget!=null),dt(this.resolveRenderTarget!=null);const e=this.historyRenderTarget,r=this.resolveRenderTarget;this.resolveRenderTarget=e,this.historyRenderTarget=r,this.resolveMaterial.uniforms.historyBuffer.value=r.texture}update(e,r,i){this.currentMaterial.uniforms.frame.value=r,this.copyShadow(),this.currentPass.render(e,null,this.currentRenderTarget),this.temporalPass&&(dt(this.resolveRenderTarget!=null),this.resolvePass.render(e,null,this.resolveRenderTarget),this.copyReprojection(),this.swapBuffers())}setSize(e,r,i=this.shadow.cascadeCount){this.width=e,this.height=r,this.currentMaterial.cascadeCount=i,this.resolveMaterial.cascadeCount=i,this.currentMaterial.setSize(e,r),this.resolveMaterial.setSize(e,r),this.currentRenderTarget.setSize(e,r,this.temporalPass?i*2:i),this.resolveRenderTarget?.setSize(e,r,i),this.historyRenderTarget?.setSize(e,r,i)}get outputBuffer(){return this.temporalPass?(dt(this.historyRenderTarget!=null),this.historyRenderTarget.texture):this.currentRenderTarget.texture}get temporalPass(){return this.currentMaterial.temporalPass}set temporalPass(e){e!==this.temporalPass&&(this.currentMaterial.temporalPass=e,this.initRenderTargets(),this.setSize(this.width,this.height))}}function oh(t){return{scatteringCoefficient:new d(1),absorptionCoefficient:new d(0),coverage:new d(.3),localWeatherTexture:new d(t.localWeatherTexture),localWeatherRepeat:new d(t.localWeatherRepeat),localWeatherOffset:new d(t.localWeatherOffset),shapeTexture:new d(t.shapeTexture),shapeRepeat:new d(t.shapeRepeat),shapeOffset:new d(t.shapeOffset),shapeDetailTexture:new d(t.shapeDetailTexture),shapeDetailRepeat:new d(t.shapeDetailRepeat),shapeDetailOffset:new d(t.shapeDetailOffset),turbulenceTexture:new d(t.turbulenceTexture),turbulenceRepeat:new d(t.turbulenceRepeat),turbulenceDisplacement:new d(350)}}function sh(){return{minLayerHeights:new d(new Re),maxLayerHeights:new d(new Re),minIntervalHeights:new d(new D),maxIntervalHeights:new d(new D),densityScales:new d(new Re),shapeAmounts:new d(new Re),shapeDetailAmounts:new d(new Re),weatherExponents:new d(new Re),shapeAlteringBiases:new d(new Re),coverageFilterWidths:new d(new Re),minHeight:new d(0),maxHeight:new d(0),shadowTopHeight:new d(0),shadowBottomHeight:new d(0),shadowLayerMask:new d(new Re),densityProfile:new d({expTerms:new Re,exponents:new Re,linearTerms:new Re,constantTerms:new Re})}}const di=[0,0,0,0];function ch(t,e){e.packValues("altitude",t.minLayerHeights.value),e.packSums("altitude","height",t.maxLayerHeights.value),e.packIntervalHeights(t.minIntervalHeights.value,t.maxIntervalHeights.value),e.packValues("densityScale",t.densityScales.value),e.packValues("shapeAmount",t.shapeAmounts.value),e.packValues("shapeDetailAmount",t.shapeDetailAmounts.value),e.packValues("weatherExponent",t.weatherExponents.value),e.packValues("shapeAlteringBias",t.shapeAlteringBiases.value),e.packValues("coverageFilterWidth",t.coverageFilterWidths.value);const r=t.densityProfile.value;e.packDensityProfiles("expTerm",r.expTerms),e.packDensityProfiles("exponent",r.exponents),e.packDensityProfiles("linearTerm",r.linearTerms),e.packDensityProfiles("constantTerm",r.constantTerms);let i=1/0,n=0,o=1/0,s=0;di.fill(0);for(let l=0;l<e.length;++l){const{altitude:h,height:f,shadow:g}=e[l],y=h+f;f>0&&(h<i&&(i=h),g&&h<o&&(o=h),y>n&&(n=y),g&&y>s&&(s=y)),di[l]=g?1:0}i!==1/0?(t.minHeight.value=i,t.maxHeight.value=n):(dt(n===0),t.minHeight.value=0),o!==1/0?(t.shadowBottomHeight.value=o,t.shadowTopHeight.value=s):(dt(s===0),t.shadowBottomHeight.value=0),t.shadowLayerMask.value.fromArray(di)}function lh(t,e){return{bottomRadius:new d(t.bottomRadius),topRadius:new d(t.topRadius),worldToECEFMatrix:new d(e.worldToECEFMatrix),ecefToWorldMatrix:new d(e.ecefToWorldMatrix),altitudeCorrection:new d(e.altitudeCorrection),sunDirection:new d(e.sunDirection)}}const uh=`uniform sampler2D cloudsBuffer;

void mainImage(const vec4 inputColor, const vec2 uv, out vec4 outputColor) {
  #ifdef SKIP_RENDERING
  outputColor = inputColor;
  #else // SKIP_RENDERING
  vec4 clouds = texture(cloudsBuffer, uv);
  outputColor.rgb = inputColor.rgb * (1.0 - clouds.a) + clouds.rgb;
  outputColor.a = inputColor.a * (1.0 - clouds.a) + clouds.a;
  #endif // SKIP_RENDERING
}
`;var hh=Object.defineProperty,dh=(t,e,r,i)=>{for(var n=void 0,o=t.length-1,s;o>=0;o--)(s=t[o])&&(n=s(e,r,n)||n);return n&&hh(e,r,n),n};const Xt=new D,mh=new k,ph=new ss,fh=["maxIterationCount","minStepSize","maxStepSize","maxRayDistance","perspectiveStepScale","minDensity","minExtinction","minTransmittance","maxIterationCountToSun","maxIterationCountToGround","minSecondaryStepSize","secondaryStepScale","maxShadowFilterRadius","maxShadowLengthIterationCount","minShadowLengthStepSize","maxShadowLengthRayDistance","hazeDensityScale","hazeExponent","hazeScatteringCoefficient","hazeAbsorptionCoefficient"],vh=["multiScatteringOctaves","accurateSunSkyLight","accuratePhaseFunction"],gh=["maxIterationCount","minStepSize","maxStepSize","minDensity","minExtinction","minTransmittance","opticalDepthTailScale"],Sh=["temporalJitter"],_h=["temporalPass"],Eh=["cascadeCount","mapSize","maxFar","farScale","splitMode","splitLambda"],Ze={type:"change"},Th={resolutionScale:M.resolutionScale,width:Ot.AUTO_SIZE,height:Ot.AUTO_SIZE};class po extends tr{constructor(e=new Ui,r,i=Yr.DEFAULT){super("CloudsEffect",uh,{attributes:tt.DEPTH,uniforms:new Map([["cloudsBuffer",new d(null)]])}),this.camera=e,this.atmosphere=i,this.cloudLayers=Du.DEFAULT.clone(),this.correctAltitude=!0,this.localWeatherRepeat=new k().setScalar(100),this.localWeatherOffset=new k,this.shapeRepeat=new D().setScalar(3e-4),this.shapeOffset=new D,this.shapeDetailRepeat=new D().setScalar(.006),this.shapeDetailOffset=new D,this.turbulenceRepeat=new k().setScalar(20),this.worldToECEFMatrix=new W,this.ecefToWorldMatrix=new W,this.altitudeCorrection=new D,this.sunDirection=new D,this.localWeatherVelocity=new k,this.shapeVelocity=new D,this.shapeDetailVelocity=new D,this._atmosphereOverlay=null,this._atmosphereShadow=null,this._atmosphereShadowLength=null,this.events=new Lr,this.frame=0,this.shadowCascadeCount=0,this.shadowMapSize=new k,this.onResolutionChange=()=>{this.setSize(this.resolution.baseWidth,this.resolution.baseHeight)},this.skipRendering=!0;const{resolutionScale:n,width:o,height:s,resolutionX:l=o,resolutionY:h=s}={...Th,...r};this.shadowMaps=new Hu({cascadeCount:M.shadow.cascadeCount,mapSize:M.shadow.mapSize,splitLambda:.6}),this.parameterUniforms=oh({localWeatherTexture:this.proceduralLocalWeather?.texture??null,localWeatherRepeat:this.localWeatherRepeat,localWeatherOffset:this.localWeatherOffset,shapeTexture:this.proceduralShape?.texture??null,shapeRepeat:this.shapeRepeat,shapeOffset:this.shapeOffset,shapeDetailTexture:this.proceduralShapeDetail?.texture??null,shapeDetailRepeat:this.shapeDetailRepeat,shapeDetailOffset:this.shapeDetailOffset,turbulenceTexture:this.proceduralTurbulence?.texture??null,turbulenceRepeat:this.turbulenceRepeat}),this.layerUniforms=sh(),this.atmosphereUniforms=lh(i,{worldToECEFMatrix:this.worldToECEFMatrix,ecefToWorldMatrix:this.ecefToWorldMatrix,altitudeCorrection:this.altitudeCorrection,sunDirection:this.sunDirection});const f={shadow:this.shadowMaps,parameterUniforms:this.parameterUniforms,layerUniforms:this.layerUniforms,atmosphereUniforms:this.atmosphereUniforms};this.shadowPass=new ah(f),this.shadowPass.mainCamera=e,this.cloudsPass=new Zu(f,i),this.cloudsPass.mainCamera=e,this.clouds=Zn(qn({},this.cloudsPass.currentMaterial,fh),this.cloudsPass.currentMaterial,vh),this.shadow=Zn(qn({},this.shadowPass.currentMaterial,gh),this.shadowPass.currentMaterial,Sh,this.shadowPass,_h,this.shadowMaps,Eh),this.resolution=new Ot(this,l,h,n),this.resolution.addEventListener("change",this.onResolutionChange)}get mainCamera(){return this.camera}set mainCamera(e){this.camera=e,this.shadowPass.mainCamera=e,this.cloudsPass.mainCamera=e}initialize(e,r,i){this.shadowPass.initialize(e,r,i),this.cloudsPass.initialize(e,r,i)}updateSharedUniforms(e){ch(this.layerUniforms,this.cloudLayers);const{parameterUniforms:r}=this;r.localWeatherOffset.value.add(mh.copy(this.localWeatherVelocity).multiplyScalar(e)),r.shapeOffset.value.add(Xt.copy(this.shapeVelocity).multiplyScalar(e)),r.shapeDetailOffset.value.add(Xt.copy(this.shapeDetailVelocity).multiplyScalar(e));const i=this.worldToECEFMatrix;this.ecefToWorldMatrix.copy(i).invert();const n=this.camera.getWorldPosition(Xt).applyMatrix4(this.worldToECEFMatrix),o=this.altitudeCorrection;this.correctAltitude?rn(n,this.atmosphere.bottomRadius,this.ellipsoid,o):o.setScalar(0);const s=this.ellipsoid.getSurfaceNormal(n,Xt),l=this.sunDirection.dot(s),h=$a(1e6,1e3,l),f=ph.setFromMatrix4(i).transpose();this.shadowMaps.update(this.camera,Xt.copy(this.sunDirection).applyMatrix3(f),h)}updateWeatherTextureChannels(){const e=this.cloudLayers.localWeatherChannels;this.cloudsPass.currentMaterial.localWeatherChannels=e,this.shadowPass.currentMaterial.localWeatherChannels=e}updateAtmosphereComposition(){const{shadowMaps:e,shadowPass:r,cloudsPass:i}=this,n=r.currentMaterial.uniforms,o=i.currentMaterial.uniforms,s=this._atmosphereOverlay,l=Object.assign(this._atmosphereOverlay??{},{map:i.outputBuffer});s!==l&&(this._atmosphereOverlay=l,Ze.target=this,Ze.property="atmosphereOverlay",this.events.dispatchEvent(Ze));const h=this._atmosphereShadow,f=Object.assign(this._atmosphereShadow??{},{map:r.outputBuffer,mapSize:e.mapSize,cascadeCount:e.cascadeCount,intervals:o.shadowIntervals.value,matrices:o.shadowMatrices.value,inverseMatrices:n.inverseShadowMatrices.value,far:e.far,topHeight:o.shadowTopHeight.value});h!==f&&(this._atmosphereShadow=f,Ze.target=this,Ze.property="atmosphereShadow",this.events.dispatchEvent(Ze));const g=this._atmosphereShadowLength,y=i.shadowLengthBuffer!=null?Object.assign(this._atmosphereShadowLength??{},{map:i.shadowLengthBuffer}):null;g!==y&&(this._atmosphereShadowLength=y,Ze.target=this,Ze.property="atmosphereShadowLength",this.events.dispatchEvent(Ze))}update(e,r,i=0){const{shadowMaps:n,shadowPass:o,cloudsPass:s}=this;if(n.cascadeCount!==this.shadowCascadeCount||!n.mapSize.equals(this.shadowMapSize)){const{width:l,height:h}=n.mapSize,f=n.cascadeCount;this.shadowMapSize.set(l,h),this.shadowCascadeCount=f,o.setSize(l,h,f),s.setShadowSize(l,h,f)}this.proceduralLocalWeather?.render(e,i),this.proceduralShape?.render(e,i),this.proceduralShapeDetail?.render(e,i),this.proceduralTurbulence?.render(e,i),++this.frame,this.updateSharedUniforms(i),this.updateWeatherTextureChannels(),o.update(e,this.frame,i),s.shadowBuffer=o.outputBuffer,s.update(e,this.frame,i),this.updateAtmosphereComposition(),this.uniforms.get("cloudsBuffer").value=this.cloudsPass.outputBuffer}setSize(e,r){const{resolution:i}=this;i.setBaseSize(e,r);const{width:n,height:o}=i;this.cloudsPass.setSize(n,o)}setDepthTexture(e,r){this.shadowPass.setDepthTexture(e,r),this.cloudsPass.setDepthTexture(e,r)}set qualityPreset(e){const{clouds:r,shadow:i,...n}=Gu[e];Object.assign(this,n),Object.assign(this.clouds,r),Object.assign(this.shadow,i)}get localWeatherTexture(){return this.proceduralLocalWeather??this.parameterUniforms.localWeatherTexture.value}set localWeatherTexture(e){e instanceof wr||e==null?(this.proceduralLocalWeather=void 0,this.parameterUniforms.localWeatherTexture.value=e):(this.proceduralLocalWeather=e,this.parameterUniforms.localWeatherTexture.value=e.texture)}get shapeTexture(){return this.proceduralShape??this.parameterUniforms.shapeTexture.value}set shapeTexture(e){e instanceof et||e==null?(this.proceduralShape=void 0,this.parameterUniforms.shapeTexture.value=e):(this.proceduralShape=e,this.parameterUniforms.shapeTexture.value=e.texture)}get shapeDetailTexture(){return this.proceduralShapeDetail??this.parameterUniforms.shapeDetailTexture.value}set shapeDetailTexture(e){e instanceof et||e==null?(this.proceduralShapeDetail=void 0,this.parameterUniforms.shapeDetailTexture.value=e):(this.proceduralShapeDetail=e,this.parameterUniforms.shapeDetailTexture.value=e.texture)}get turbulenceTexture(){return this.proceduralTurbulence??this.parameterUniforms.turbulenceTexture.value}set turbulenceTexture(e){e instanceof wr||e==null?(this.proceduralTurbulence=void 0,this.parameterUniforms.turbulenceTexture.value=e):(this.proceduralTurbulence=e,this.parameterUniforms.turbulenceTexture.value=e.texture)}get stbnTexture(){return this.cloudsPass.currentMaterial.uniforms.stbnTexture.value}set stbnTexture(e){this.cloudsPass.currentMaterial.uniforms.stbnTexture.value=e,this.shadowPass.currentMaterial.uniforms.stbnTexture.value=e}get resolutionScale(){return this.resolution.scale}set resolutionScale(e){this.resolution.scale=e}get temporalUpscale(){return this.cloudsPass.temporalUpscale}set temporalUpscale(e){this.cloudsPass.temporalUpscale=e}get lightShafts(){return this.cloudsPass.lightShafts}set lightShafts(e){this.cloudsPass.lightShafts=e}get shapeDetail(){return this.cloudsPass.currentMaterial.shapeDetail}set shapeDetail(e){this.cloudsPass.currentMaterial.shapeDetail=e,this.shadowPass.currentMaterial.shapeDetail=e}get turbulence(){return this.cloudsPass.currentMaterial.turbulence}set turbulence(e){this.cloudsPass.currentMaterial.turbulence=e,this.shadowPass.currentMaterial.turbulence=e}get haze(){return this.cloudsPass.currentMaterial.haze}set haze(e){this.cloudsPass.currentMaterial.haze=e}get scatteringCoefficient(){return this.parameterUniforms.scatteringCoefficient.value}set scatteringCoefficient(e){this.parameterUniforms.scatteringCoefficient.value=e}get absorptionCoefficient(){return this.parameterUniforms.absorptionCoefficient.value}set absorptionCoefficient(e){this.parameterUniforms.absorptionCoefficient.value=e}get coverage(){return this.parameterUniforms.coverage.value}set coverage(e){this.parameterUniforms.coverage.value=e}get turbulenceDisplacement(){return this.parameterUniforms.turbulenceDisplacement.value}set turbulenceDisplacement(e){this.parameterUniforms.turbulenceDisplacement.value=e}get scatterAnisotropy1(){return this.cloudsPass.currentMaterial.scatterAnisotropy1}set scatterAnisotropy1(e){this.cloudsPass.currentMaterial.scatterAnisotropy1=e}get scatterAnisotropy2(){return this.cloudsPass.currentMaterial.scatterAnisotropy2}set scatterAnisotropy2(e){this.cloudsPass.currentMaterial.scatterAnisotropy2=e}get scatterAnisotropyMix(){return this.cloudsPass.currentMaterial.scatterAnisotropyMix}set scatterAnisotropyMix(e){this.cloudsPass.currentMaterial.scatterAnisotropyMix=e}get skyLightScale(){return this.cloudsPass.currentMaterial.uniforms.skyLightScale.value}set skyLightScale(e){this.cloudsPass.currentMaterial.uniforms.skyLightScale.value=e}get groundBounceScale(){return this.cloudsPass.currentMaterial.uniforms.groundBounceScale.value}set groundBounceScale(e){this.cloudsPass.currentMaterial.uniforms.groundBounceScale.value=e}get powderScale(){return this.cloudsPass.currentMaterial.uniforms.powderScale.value}set powderScale(e){this.cloudsPass.currentMaterial.uniforms.powderScale.value=e}get powderExponent(){return this.cloudsPass.currentMaterial.uniforms.powderExponent.value}set powderExponent(e){this.cloudsPass.currentMaterial.uniforms.powderExponent.value=e}get atmosphereOverlay(){return this._atmosphereOverlay}get atmosphereShadow(){return this._atmosphereShadow}get atmosphereShadowLength(){return this._atmosphereShadowLength}get irradianceTexture(){return this.cloudsPass.currentMaterial.irradianceTexture}set irradianceTexture(e){this.cloudsPass.currentMaterial.irradianceTexture=e}get scatteringTexture(){return this.cloudsPass.currentMaterial.scatteringTexture}set scatteringTexture(e){this.cloudsPass.currentMaterial.scatteringTexture=e}get transmittanceTexture(){return this.cloudsPass.currentMaterial.transmittanceTexture}set transmittanceTexture(e){this.cloudsPass.currentMaterial.transmittanceTexture=e}get singleMieScatteringTexture(){return this.cloudsPass.currentMaterial.singleMieScatteringTexture}set singleMieScatteringTexture(e){this.cloudsPass.currentMaterial.singleMieScatteringTexture=e}get higherOrderScatteringTexture(){return this.cloudsPass.currentMaterial.higherOrderScatteringTexture}set higherOrderScatteringTexture(e){this.cloudsPass.currentMaterial.higherOrderScatteringTexture=e}get ellipsoid(){return this.cloudsPass.currentMaterial.ellipsoid}set ellipsoid(e){this.cloudsPass.currentMaterial.ellipsoid=e}get sunAngularRadius(){return this.cloudsPass.currentMaterial.sunAngularRadius}set sunAngularRadius(e){this.cloudsPass.currentMaterial.sunAngularRadius=e}}dh([Y("SKIP_RENDERING")],po.prototype,"skipRendering");const xh=128,wh=32,yh=([t,e,r],i=new D)=>i.set(t,r,e),Rh=new W().set(0,1,0,0,0,0,1,0,1,0,0,0,0,0,0,1),Ah=new W().makeScale(1/Nt,1/Nt,1/Nt),ma=new W,er=(t,e)=>[t[e],t[4+e],t[8+e],t[12+e]],Tr=(t,e)=>[t[1]*e[2]-t[2]*e[1],t[2]*e[0]-t[0]*e[2],t[0]*e[1]-t[1]*e[0]],bi=(t,e)=>t[0]*e[0]+t[1]*e[1]+t[2]*e[2],Ch=t=>{const e=er(t,0),r=er(t,1),i=er(t,3),n=Tr(r,i),o=Tr(i,e),s=Tr(e,r),l=bi(e,n);return!Number.isFinite(l)||Math.abs(l)<1e-30?null:[-(e[3]*n[0]+r[3]*o[0]+i[3]*s[0])/l,-(e[3]*n[1]+r[3]*o[1]+i[3]*s[1])/l,-(e[3]*n[2]+r[3]*o[2]+i[3]*s[2])/l]},Ih=(t,e)=>{ma.fromArray(t).multiply(Ah).multiply(Rh);const r=ma.elements,i=Ch(r);if(!i||!i.every(Number.isFinite))return null;const n=er(r,3),o=Math.hypot(n[0],n[1],n[2]);if(!(o>0))return null;const s=[-n[0]/o,-n[1]/o,-n[2]/o],l=P=>{const B=er(r,P),H=[B[0]/o,B[1]/o,B[2]/o],ee=bi(H,s),ne=[H[0]-s[0]*ee,H[1]-s[1]*ee,H[2]-s[2]*ee],Q=Math.hypot(ne[0],ne[1],ne[2]);return{axis:ne.map(X=>X/Q),scale:Q,off:ee}},h=l(0),f=l(1);if(!(h.scale>0)||!(f.scale>0))return null;bi(Tr(h.axis,f.axis),s)<0&&(f.axis=f.axis.map(P=>-P),f.scale=-f.scale,f.off=-f.off);const g=Math.hypot(i[0],i[1],i[2])-Nt,y=Math.max(100,g*.02),R=4*(g+2*Nt);return e.matrixWorld.set(h.axis[0],f.axis[0],s[0],i[0],h.axis[1],f.axis[1],s[1],i[1],h.axis[2],f.axis[2],s[2],i[2],0,0,0,1),e.matrixWorldInverse.copy(e.matrixWorld).invert(),e.position.set(i[0],i[1],i[2]),e.near=y,e.far=R,e.projectionMatrix.set(h.scale,0,h.off,0,0,f.scale,f.off,0,0,0,-(R+y)/(R-y),-2*R*y/(R-y),0,0,-1,0),e.projectionMatrixInverse.copy(e.projectionMatrix).invert(),g},Dh=[{altitude:1e3,height:1e3,densityScale:.2,shapeAmount:.8,weatherExponent:.6,shadow:!0},{altitude:2e3,height:800,densityScale:.1,shapeAmount:.8,shapeAlteringBias:.5},{altitude:2e3,height:2e3,densityScale:.002,shapeAmount:.3,veil:!0},{altitude:0,height:0}],mi=4096,pi=2048,pa=16,Nh={agx:he.AGX,neutral:he.NEUTRAL,aces:he.ACES_FILMIC,reinhard:he.REINHARD2,linear:he.LINEAR},fa="return getCubeSphereUv(position);",Oh="return getSphericalUv(position);",bh=`precision highp float;
varying vec2 v_uv;
uniform vec2 u_weatherRange;   // field values that become weather 0 and weather 1
${Es}
${Ts}
void main() {
  float lon = (v_uv.x - 0.5) * 6.28318530718;
  float lat = (v_uv.y - 0.5) * 3.14159265359;
  vec3 p = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
  float field = advectedField(equirectUV(p, u_drift), lat);
  gl_FragColor = vec4(vec3(smoothstep(u_weatherRange.x, u_weatherRange.y, field)), 1.0);
}`,Lh=(t,e,r)=>{const i=ps(t,_s,bh,"tm-cloud-weather",{es300:!0}),n=t.getAttribLocation(i,"a_corner"),o=Object.fromEntries(fs.map(B=>[B,t.getUniformLocation(i,`u_${B}`)])),s=t.getUniformLocation(i,"u_weatherRange"),l=vs(t),h=t.createTexture();t.bindTexture(t.TEXTURE_2D,h),t.texImage2D(t.TEXTURE_2D,0,t.R8,mi,pi,0,t.RED,t.UNSIGNED_BYTE,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.REPEAT),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR);const f=t.createFramebuffer();t.bindFramebuffer(t.FRAMEBUFFER,f),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,h,0);const g=t.checkFramebufferStatus(t.FRAMEBUFFER)===t.FRAMEBUFFER_COMPLETE;if(t.bindFramebuffer(t.FRAMEBUFFER,null),!g)throw new Error("weather texture is not renderable");const y={field:e.fieldUrl?ei(t,e.fieldUrl,r,{channels:1}):null,wind:e.windUrl?ei(t,e.windUrl,r):null,patches:e.patchUrl?ei(t,e.patchUrl,r,{channels:1}):null};let R=-1,P="";return{texture:h,framebuffer:f,get hasSource(){return!!(y.field?.ready||y.patches?.ready)},get baked(){return R>=0},restart(){R=-1},bake(B){if(!this.hasSource)return;const H=Object.values(y).map(ne=>ne?.ready?1:0).join("");H!==P&&(P=H,R=-1),t.bindFramebuffer(t.FRAMEBUFFER,f),t.viewport(0,0,mi,pi),t.useProgram(i),t.disable(t.BLEND),t.disable(t.DEPTH_TEST),t.depthMask(!1);const ee=pi/pa;R>=0&&(t.enable(t.SCISSOR_TEST),t.scissor(0,R*ee,mi,ee)),t.uniform2f(s,B.weatherLow,B.weatherHigh),gs(t,o,B,{seconds:performance.now()*.001,...y},0,1,2),Ss(t,l,n),t.disable(t.SCISSOR_TEST),t.depthMask(!0),R=(R+1)%pa},dispose(){Object.values(y).forEach(B=>B?.release()),t.deleteTexture(h),t.deleteFramebuffer(f),t.deleteBuffer(l),t.deleteProgram(i)}}},va=t=>{if(!t.fragmentShader.includes(fa))throw new Error("Takram's weather lookup has changed; the shader swap no longer applies");t.fragmentShader=t.fragmentShader.replace(fa,Oh),t.needsUpdate=!0},$h=({map:t,gl:e,assetsUrl:r,state:i,onReady:n,onError:o})=>{let s=i;const l=t.getCanvas(),h=Nt,f=new _a({canvas:l,context:e,depth:!0,alpha:!0,antialias:!1});f.autoClear=!1,f.setPixelRatio(1),f.toneMapping=us;const g=new ga;g.matrixAutoUpdate=!1,g.matrixWorldAutoUpdate=!1;const y=new fi,R=new po(g);R.skipRendering=!1,R.haze=!1,R.ellipsoid=new ir(h,h,h),R.localWeatherRepeat.set(1,1),va(R.cloudsPass.currentMaterial),va(R.shadowPass.currentMaterial);const P=Lh(e,s,n);R.localWeatherTexture=new hs(P.texture);const B=new Ec({mode:he.AGX}),H=new Ns(f,{frameBufferType:Ve,multisampling:0,alpha:!0}),ee=new fc(y,g);ee.clearPass.overrideClearColor=null,ee.clearPass.overrideClearAlpha=0,H.addPass(ee),H.addPass(new Nn(g,R));const ne=new tr("StraightAlpha",`
    uniform vec3 whiteBalance;
    void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
      outputColor = inputColor.a > 1e-4
        ? vec4(inputColor.rgb / inputColor.a * whiteBalance, inputColor.a) : vec4(0.0);
    }`,{uniforms:new Map([["whiteBalance",new d(new D(1,1,1))]])}),Q=new tr("EncodePremultiplied",`
    void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
      vec3 c = clamp(inputColor.rgb, 0.0, 1.0);
      vec3 srgb = mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
      outputColor = vec4(srgb * inputColor.a, inputColor.a);
    }`),X=new Nn(g,ne,B,Q);X.fullscreenMaterial.encodeOutput=!1,Object.assign(X.fullscreenMaterial,{transparent:!0,blending:ms,blendEquation:ds,blendSrc:An,blendDst:Rn,blendSrcAlpha:An,blendDstAlpha:Rn,depthTest:!1,depthWrite:!1}),H.addPass(X);let ue=null,le=-1;const Ne=()=>{R.temporalUpscale=!!(s.upscale??le>0)},Me=()=>{const G=Math.max(1,s.scale);s.preset!==ue&&(R.qualityPreset=ue=s.preset),Ne(),Dh.forEach(({veil:zt,...Be},at)=>{R.cloudLayers[at].set({channel:"r",...Be,altitude:Be.altitude*G,height:Be.height*G,densityScale:(Be.densityScale??.2)*(zt?s.veil:1)/G,shadow:!!Be.shadow&&!!s.shadows})}),R.shapeRepeat.setScalar(3e-4/G),R.shapeDetailRepeat.setScalar(.006/G),R.clouds.minStepSize=50*G,R.clouds.maxStepSize=1e3*G,R.clouds.perspectiveStepScale=s.stepScale,R.shadow.maxFar=1e5*G,R.coverage=s.coverage,R.skyLightScale=s.skyLight,ne.uniforms.get("whiteBalance").value.fromArray(s.whiteBalance),B.mode=Nh[s.tone]??he.AGX,R.sunDirection.copy(yh(s.sun)).normalize(),f.toneMappingExposure=s.exposure};Me();let _e=0,Ee=!1;const Fe=()=>{_e--,n?.()},Ge=G=>()=>{Ee||(Ee=!0,o?.(`could not load ${G}`))},ge=G=>(G.format=St,G.minFilter=G.magFilter=Te,G.wrapS=G.wrapT=G.wrapR=Er,G.colorSpace=Li,G.needsUpdate=!0,G),Bt=G=>({width:G,height:G,depth:G});_e++,Object.assign(R,new gu({format:"binary",higherOrderScattering:!1}).setType(f).load(`${r}/atmosphere`,Fe,void 0,Ge("the atmosphere tables"))),_e++,new gt(et,Qn,Bt(xh)).load(`${r}/clouds/shape.bin`,G=>{R.shapeTexture=ge(G),Fe()},void 0,Ge("the cloud shape")),_e++,new gt(et,Qn,Bt(wh)).load(`${r}/clouds/shape_detail.bin`,G=>{R.shapeDetailTexture=ge(G),Fe()},void 0,Ge("the cloud detail")),_e++,new Dc().load(`${r}/core/stbn.bin`,G=>{R.stbnTexture=G,Fe()},void 0,Ge("the blue noise"));const $e=new k;return{get ready(){return _e===0&&!Ee&&P.hasSource},render(G,zt,Be,at){if(Ih(G,g)===null||(P.bake(s),!P.baked))return!1;if(f.getDrawingBufferSize($e),($e.x!==l.width||$e.y!==l.height)&&(f.setSize(l.width,l.height,!1),H.setSize(l.width,l.height,!1)),at!==le){le=at;const $r=l.clientWidth>0?l.clientWidth/l.width:1;R.resolutionScale=Math.min(1,$r)*(at>0?.5:1),Ne()}return R.blendMode.opacity.value=zt,f.resetState(),H.render(Be),f.resetState(),!0},setOptions(G){(G.weatherLow!==s.weatherLow||G.weatherHigh!==s.weatherHigh)&&P.restart(),s=G,Me()},dispose(){H.dispose(),R.dispose(),P.dispose(),f.resetState()},debug:()=>({renderer:f,composer:H,clouds:R,camera:g,tone:B,weather:P,gl:e})}};export{$h as createCloudEngine};
