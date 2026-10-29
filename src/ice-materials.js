import * as THREE from 'three';
import {makeIceRng} from './ice-geometry.js';

function createSurfaceBump(seed=731){
 const random=makeIceRng(seed);
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 const ctx=canvas.getContext('2d');const image=ctx.createImageData(256,256);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const i=(y*256+x)*4;
  const low=Math.sin(x*.071+y*.051)*4.2+Math.sin(x*.026-y*.063)*3.5;
  const noise=(random()-.5)*9;
  const value=Math.max(0,Math.min(255,128+low+noise));
  image.data[i]=image.data[i+1]=image.data[i+2]=value;image.data[i+3]=255;
 }
 ctx.putImageData(image,0,0);

 for(let i=0;i<54;i++){
  const x=random()*256,y=random()*256,r=1.5+random()*5.5;
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,'rgba(92,92,92,.18)');
  g.addColorStop(.62,'rgba(145,145,145,.08)');
  g.addColorStop(1,'rgba(128,128,128,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
 }

 const texture=new THREE.CanvasTexture(canvas);
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1.18,1.18);
 texture.colorSpace=THREE.NoColorSpace;
 texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
 return texture;
}

function createFrostTexture(seed=1){
 const random=makeIceRng(2000+seed*131);
 const canvas=document.createElement('canvas');canvas.width=384;canvas.height=384;
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,384,384);

 for(let i=0;i<92;i++){
  const centerBias=Math.pow(random(),1.6);
  const x=192+(random()-.5)*(70+centerBias*90);
  const y=192+(random()-.5)*(190+centerBias*70);
  const rx=5+random()*22,ry=12+random()*58;
  const g=ctx.createRadialGradient(x,y,0,x,y,Math.max(rx,ry));
  const alpha=.018+random()*.054;
  g.addColorStop(0,`rgba(255,255,255,${alpha})`);
  g.addColorStop(.42,`rgba(247,252,252,${alpha*.48})`);
  g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g;ctx.save();ctx.translate(x,y);ctx.rotate((random()-.5)*1.2);
  ctx.scale(rx/Math.max(rx,ry),ry/Math.max(rx,ry));ctx.beginPath();ctx.arc(0,0,Math.max(rx,ry),0,Math.PI*2);ctx.fill();ctx.restore();
 }

 ctx.lineCap='round';
 for(let f=0;f<46;f++){
  let x=150+random()*84,y=80+random()*224;
  ctx.beginPath();ctx.moveTo(x,y);
  const steps=2+Math.floor(random()*5);
  for(let s=0;s<steps;s++){
   x+=(random()-.5)*34;y+=(random()-.5)*42;ctx.lineTo(x,y);
  }
  ctx.strokeStyle=`rgba(255,255,255,${.018+random()*.048})`;
  ctx.lineWidth=.35+random()*.95;ctx.stroke();
 }

 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.NoColorSpace;
 texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
 return texture;
}

function createFrostMaterial(texture,opacity=.34){
 return new THREE.MeshPhysicalMaterial({
  color:0xffffff,map:texture,alphaMap:texture,transparent:true,opacity,
  depthWrite:false,side:THREE.DoubleSide,metalness:0,roughness:.86,
  transmission:0,thickness:.10,ior:1.309,envMapIntensity:.13,
  clearcoat:0,clearcoatRoughness:.55,specularIntensity:.16
 });
}

function createFractureMaterial(opacity=.050){
 return new THREE.MeshPhysicalMaterial({
  color:0xffffff,roughness:.16,transparent:true,opacity,depthWrite:false,
  side:THREE.DoubleSide,metalness:0,ior:1.309,envMapIntensity:.95,
  clearcoat:.64,clearcoatRoughness:.024,specularIntensity:1
 });
}

export function createIceMaterialSet(glass){
 const bumpTexture=createSurfaceBump();
 const frostTextures=[1,2,3,4].map(createFrostTexture);
 const frostMaterials=frostTextures.map((texture,i)=>createFrostMaterial(texture,.30+i*.012));
 const fractureMaterials=[.052,.045,.056,.048].map(createFractureMaterial);

 const outerMaterials=[
  glass.material({thickness:.82,roughness:.075,frost:.0007,absorption:.0038,dispersion:0}),
  glass.material({thickness:.82,roughness:.082,frost:.0009,absorption:.0042,dispersion:0}),
  glass.material({thickness:.82,roughness:.065,frost:.0006,absorption:.0035,dispersion:0}),
  glass.material({thickness:.82,roughness:.09,frost:.0010,absorption:.0045,dispersion:0})
 ];
 for(const material of outerMaterials){
  material.bumpMap=bumpTexture;material.bumpScale=.0018;material.needsUpdate=true;
 }

 const cloudParticleMaterial=new THREE.MeshPhysicalMaterial({
  color:0xfcffff,metalness:0,roughness:.93,transparent:true,opacity:.085,depthWrite:false,
  transmission:0,thickness:.08,ior:1.309,envMapIntensity:.08,specularIntensity:.10
 });
 const airMaterial=new THREE.MeshPhysicalMaterial({
  color:0xffffff,roughness:.02,transparent:true,opacity:.28,depthWrite:false,ior:1,
  specularIntensity:1,envMapIntensity:.70
 });
 const microBubbleMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.18,depthWrite:false});
 const meltDropMaterial=glass.material({thickness:1.05,ior:1.333,roughness:.025,frost:0,absorption:.0008,dispersion:0});

 return {
  bumpTexture,frostTextures,frostMaterials,fractureMaterials,outerMaterials,
  cloudParticleMaterial,airMaterial,microBubbleMaterial,meltDropMaterial,
  dispose(){
   bumpTexture.dispose();frostTextures.forEach(t=>t.dispose());frostMaterials.forEach(m=>m.dispose());
   fractureMaterials.forEach(m=>m.dispose());outerMaterials.forEach(m=>m.dispose());
   cloudParticleMaterial.dispose();airMaterial.dispose();microBubbleMaterial.dispose();meltDropMaterial.dispose();
  }
 };
}

export function createRefractionScene(renderer,scene,camera,backgroundTextures){
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true});
 target.texture.minFilter=THREE.LinearFilter;target.texture.magFilter=THREE.LinearFilter;
 const resolution={value:new THREE.Vector2(1,1)},source={value:target.texture};
 const hidden=[],interiors=[];
 const uniforms={imageA:{value:backgroundTextures[0]},imageB:{value:backgroundTextures[1]},blend:{value:0},aspect:{value:1}};
 const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({
  uniforms,depthWrite:false,depthTest:false,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,.9999,1.);}',
  fragmentShader:`varying vec2 vUv;uniform sampler2D imageA;uniform sampler2D imageB;uniform float blend;uniform float aspect;\n  void main(){vec2 uv=vUv;float imageAspect=1.5;if(aspect>imageAspect)uv.y=(uv.y-.5)*imageAspect/aspect+.5;else uv.x=(uv.x-.5)*aspect/imageAspect+.5;gl_FragColor=mix(texture2D(imageA,uv),texture2D(imageB,uv),blend);}`
 }));
 backdrop.frustumCulled=false;backdrop.renderOrder=-100;backdrop.visible=false;scene.add(backdrop);

 return {
  exclude(object){hidden.push(object);},
  interior(object){interiors.push(object);object.visible=false;},
  material({thickness=.9,ior=1.309,roughness=.06,frost=0,absorption=.006,dispersion=0}={}){
   const material=new THREE.MeshPhysicalMaterial({
    depthWrite:true,color:0xffffff,metalness:0,roughness,ior,
    clearcoat:0,envMapIntensity:1,specularIntensity:1
   });
   material.userData.isGlass=true;
   material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{
     glassScene:source,glassResolution:resolution,glassProjection:{value:camera.projectionMatrix},
     glassThickness:{value:thickness},glassIor:{value:ior},glassFrost:{value:frost},
     glassAbsorption:{value:absorption},glassDispersion:{value:Math.min(dispersion,.006)}
    });
    shader.vertexShader='varying float vGlassScale;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
     vGlassScale=length(modelViewMatrix[2].xyz);
     #ifdef USE_INSTANCING
      vGlassScale*=length(instanceMatrix[2].xyz);
     #endif
    `);
    shader.fragmentShader=`varying float vGlassScale;
     uniform sampler2D glassScene;uniform vec2 glassResolution;uniform mat4 glassProjection;
     uniform float glassThickness;uniform float glassIor;uniform float glassFrost;
     uniform float glassAbsorption;uniform float glassDispersion;
    `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',`
     vec3 eye=normalize(vViewPosition);
     vec3 ray=refract(-eye,normal,1./glassIor);
     float facing=clamp(dot(normal,eye),0.,1.);
     float path=glassThickness*vGlassScale/max(abs(dot(ray,normal)),.35);
     vec4 projected=glassProjection*vec4(-vViewPosition+ray*path,1.);
     vec2 uv=clamp(projected.xy/projected.w*.5+.5,vec2(.002),vec2(.998));
     vec2 split=(uv-gl_FragCoord.xy/glassResolution)*glassDispersion;
     vec3 transmitted=vec3(texture2D(glassScene,uv+split).r,texture2D(glassScene,uv).g,texture2D(glassScene,uv-split).b);
     vec2 texel=1.5/glassResolution;
     vec3 blur=(texture2D(glassScene,uv+vec2(texel.x,0.)).rgb+texture2D(glassScene,uv-vec2(texel.x,0.)).rgb+texture2D(glassScene,uv+vec2(0.,texel.y)).rgb+texture2D(glassScene,uv-vec2(0.,texel.y)).rgb)*.25;
     transmitted=mix(transmitted,blur,clamp(glassFrost+roughnessFactor*.25,0.,.28));
     transmitted*=exp(-vec3(.24,.085,.032)*glassAbsorption*path);
     float f0=pow((glassIor-1.)/(glassIor+1.),2.);
     float fresnel=f0+(1.-f0)*pow(1.-facing,5.);
     // One Fresnel reflection, no painted white edge or extra reflective shell.
     vec3 outgoingLight=transmitted*(1.-fresnel)+totalSpecular;
    `);
   };
   material.customProgramCacheKey=()=>`fizora-volume-v13-${thickness}-${ior}-${frost}-${absorption}-${dispersion}`;
   return material;
  },
  resize(){
   const size=renderer.getDrawingBufferSize(new THREE.Vector2());resolution.value.copy(size);
   const scale=Math.min(innerWidth<760?.65:.85,2048/size.x,1536/size.y);
   target.setSize(Math.max(1,Math.round(size.x*scale)),Math.max(1,Math.round(size.y*scale)));
   uniforms.aspect.value=size.x/size.y;
  },
  setFlavor(i,t){uniforms.imageA.value=backgroundTextures[i];uniforms.imageB.value=backgroundTextures[i+1];uniforms.blend.value=t;},
  capture(){
   const visibility=hidden.map(o=>o.visible);hidden.forEach(o=>o.visible=false);interiors.forEach(o=>o.visible=true);backdrop.visible=true;
   const previousTarget=renderer.getRenderTarget(),tone=renderer.toneMapping;
   try{renderer.toneMapping=THREE.NoToneMapping;renderer.setRenderTarget(target);renderer.render(scene,camera);}
   finally{renderer.setRenderTarget(previousTarget);renderer.toneMapping=tone;backdrop.visible=false;interiors.forEach(o=>o.visible=false);hidden.forEach((o,i)=>o.visible=visibility[i]);}
  },
  dispose(){target.dispose();backgroundTextures.forEach(t=>t.dispose());}
 };
}
