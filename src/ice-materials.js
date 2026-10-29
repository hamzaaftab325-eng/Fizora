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

 // Soft melt pits, not sharp texture noise.
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

 // Cloudy freezing plume: many low-opacity elongated blooms rather than one white blob.
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

 // Fine frozen filaments and fracture wisps.
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
  transmission:.015,thickness:.10,ior:1.309,envMapIntensity:.13,
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
  glass.material({distortion:.064,roughness:.009,frost:.0007,absorption:.0038,dispersion:0}),
  glass.material({distortion:.068,roughness:.010,frost:.0009,absorption:.0042,dispersion:0}),
  glass.material({distortion:.061,roughness:.008,frost:.0006,absorption:.0035,dispersion:0}),
  glass.material({distortion:.071,roughness:.011,frost:.0010,absorption:.0045,dispersion:0})
 ];
 for(const material of outerMaterials){
  material.bumpMap=bumpTexture;material.bumpScale=.0075;material.needsUpdate=true;
 }

 const wetFilmMaterial=new THREE.MeshPhysicalMaterial({
  color:0xffffff,metalness:0,roughness:.003,transparent:true,opacity:.016,depthWrite:false,
  ior:1.333,clearcoat:1,clearcoatRoughness:.001,envMapIntensity:2.35,specularIntensity:1
 });
 const cloudParticleMaterial=new THREE.MeshPhysicalMaterial({
  color:0xfcffff,metalness:0,roughness:.93,transparent:true,opacity:.085,depthWrite:false,
  transmission:.01,thickness:.08,ior:1.309,envMapIntensity:.08,specularIntensity:.10
 });
 const airMaterial=new THREE.MeshPhysicalMaterial({
  color:0xffffff,roughness:.02,transparent:true,opacity:.28,depthWrite:false,ior:1,
  specularIntensity:1,envMapIntensity:.70
 });
 const microBubbleMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.18,depthWrite:false});
 const meltDropMaterial=glass.material({distortion:.0058,roughness:.0025,frost:0,absorption:.0008,dispersion:0});

 return {
  bumpTexture,frostTextures,frostMaterials,fractureMaterials,outerMaterials,
  wetFilmMaterial,cloudParticleMaterial,airMaterial,microBubbleMaterial,meltDropMaterial,
  dispose(){
   bumpTexture.dispose();frostTextures.forEach(t=>t.dispose());frostMaterials.forEach(m=>m.dispose());
   fractureMaterials.forEach(m=>m.dispose());outerMaterials.forEach(m=>m.dispose());
   wetFilmMaterial.dispose();cloudParticleMaterial.dispose();airMaterial.dispose();microBubbleMaterial.dispose();meltDropMaterial.dispose();
  }
 };
}

// Screen-space refraction tuned for real wet ice and water droplets. The shell remains optically
// clear and only uses subtle absorption; the cloudy center is modeled explicitly inside the cube.
export function createRefractionScene(renderer,scene,camera,backgroundTextures){
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true});
 target.texture.minFilter=THREE.LinearFilter;target.texture.magFilter=THREE.LinearFilter;
 const resolution={value:new THREE.Vector2(1,1)},source={value:target.texture};
 const hidden=[];
 const uniforms={imageA:{value:backgroundTextures[0]},imageB:{value:backgroundTextures[1]},blend:{value:0},aspect:{value:1}};
 const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({
  uniforms,depthWrite:false,depthTest:false,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,.9999,1.);}',
  fragmentShader:`varying vec2 vUv;uniform sampler2D imageA;uniform sampler2D imageB;uniform float blend;uniform float aspect;
  void main(){vec2 uv=vUv;float imageAspect=1.5;if(aspect>imageAspect)uv.y=(uv.y-.5)*imageAspect/aspect+.5;else uv.x=(uv.x-.5)*aspect/imageAspect+.5;gl_FragColor=mix(texture2D(imageA,uv),texture2D(imageB,uv),blend);}`
 }));
 backdrop.frustumCulled=false;backdrop.renderOrder=-100;backdrop.visible=false;scene.add(backdrop);

 return {
  exclude(object){hidden.push(object);},
  material({distortion=.012,roughness=.04,frost=0,absorption=.006,dispersion=0}={}){
   const material=new THREE.MeshPhysicalMaterial({
    depthWrite:false,color:0xffffff,metalness:0,roughness,ior:1.309,
    clearcoat:1,clearcoatRoughness:.004,envMapIntensity:1.90,specularIntensity:1
   });
   material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{
     glassScene:source,glassResolution:resolution,glassDistortion:{value:distortion},glassFrost:{value:frost},
     glassAbsorption:{value:absorption},glassDispersion:{value:dispersion}
    });
    shader.fragmentShader='uniform sampler2D glassScene;uniform vec2 glassResolution;uniform float glassDistortion;uniform float glassFrost;uniform float glassAbsorption;uniform float glassDispersion;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',`
     vec2 screenUv=gl_FragCoord.xy/glassResolution;
     float viewDistance=max(length(vViewPosition),.001);
     vec2 offset=normal.xy*glassDistortion/max(viewDistance*.15,.42);
     offset.x*=glassResolution.y/glassResolution.x;
     vec2 uv=clamp(screenUv-offset,vec2(.002),vec2(.998));
     vec3 transmitted=texture2D(glassScene,uv).rgb;
     float facing=clamp(dot(normal,normalize(vViewPosition)),0.,1.);
     float edge=pow(1.-facing,1.27);

     // Tiny blur only for deliberately frosted materials; droplets and clear ice remain sharp.
     vec2 texel=.70/glassResolution;
     vec3 blur=(texture2D(glassScene,uv+vec2(texel.x,0.)).rgb+texture2D(glassScene,uv-vec2(texel.x,0.)).rgb+texture2D(glassScene,uv+vec2(0.,texel.y)).rgb+texture2D(glassScene,uv-vec2(0.,texel.y)).rgb)*.25;
     transmitted=mix(transmitted,blur,clamp(glassFrost*2.0,0.,.018));

     vec3 sigma=vec3(.24,.085,.032);
     transmitted*=exp(-sigma*glassAbsorption*(.15+edge*.52)*1.8);
     float fresnel=.020+.980*pow(1.-facing,5.0);
     vec3 rim=vec3(1.0,.999,.996)*pow(1.-facing,2.45)*.18;
     vec3 outgoingLight=(transmitted+rim)*(1.-fresnel*.20)+totalSpecular*(1.36+fresnel*1.84);
    `);
   };
   material.customProgramCacheKey=()=>`fizora-clean-real-ice-v12-${distortion}-${frost}-${absorption}`;
   return material;
  },
  resize(){
   const size=renderer.getDrawingBufferSize(new THREE.Vector2());resolution.value.copy(size);
   const scale=innerWidth<760?.60:.80;
   target.setSize(Math.max(1,Math.min(2048,Math.round(size.x*scale))),Math.max(1,Math.min(1152,Math.round(size.y*scale))));
   uniforms.aspect.value=size.x/size.y;
  },
  setFlavor(i,t){uniforms.imageA.value=backgroundTextures[i];uniforms.imageB.value=backgroundTextures[i+1];uniforms.blend.value=t;},
  capture(){
   const visibility=hidden.map(o=>o.visible);hidden.forEach(o=>o.visible=false);backdrop.visible=true;
   const previousTarget=renderer.getRenderTarget(),tone=renderer.toneMapping;
   try{renderer.toneMapping=THREE.NoToneMapping;renderer.setRenderTarget(target);renderer.render(scene,camera);}
   finally{renderer.setRenderTarget(previousTarget);renderer.toneMapping=tone;backdrop.visible=false;hidden.forEach((o,i)=>o.visible=visibility[i]);}
  },
  dispose(){target.dispose();backgroundTextures.forEach(t=>t.dispose());}
 };
}
