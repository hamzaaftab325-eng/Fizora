import {createBubbles} from './bubbles';
import {preparePackaging} from './can-labels';
export {preparePackaging} from './can-labels';
import * as THREE from 'three';
import {createIceScene,createRefractionScene} from './ice-scene';
import {createStudioEnvironment} from './studio-environment';
import {createCanBodyGeometry,createLidGeometry} from './can-geometry';
import {clamp,cinematicEase,damp,advanceShowcase} from './motion';
import {createBuoyancy} from './liquid-field';

const H=3.04;

function makeRng(seed){
 let state=Math.max(1,seed|0);
 return ()=>{state=state*16807%2147483647;return(state-1)/2147483646;};
}

function createSurfaceTextures(){
 const width=256,height=512,random=makeRng(731);
 const bumpCanvas=document.createElement('canvas'),roughCanvas=document.createElement('canvas');
 bumpCanvas.width=roughCanvas.width=width;bumpCanvas.height=roughCanvas.height=height;
 const bctx=bumpCanvas.getContext('2d'),rctx=roughCanvas.getContext('2d');
 const bump=bctx.createImageData(width,height),rough=rctx.createImageData(width,height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4;
  const vertical=Math.sin(x*.73)+Math.sin(x*2.31)*.34+Math.sin(x*.13+y*.021)*.22;
  const draw=Math.sin(y*.33+x*.016)*.20;
  const noise=(random()-.5)*1.4;
  const bumpValue=Math.max(0,Math.min(255,128+vertical*8+draw*3+noise*4));
  const roughValue=Math.max(0,Math.min(255,218+vertical*3+(random()-.5)*12));
  bump.data[i]=bump.data[i+1]=bump.data[i+2]=bumpValue;bump.data[i+3]=255;
  rough.data[i]=rough.data[i+1]=rough.data[i+2]=roughValue;rough.data[i+3]=255;
 }
 bctx.putImageData(bump,0,0);rctx.putImageData(rough,0,0);
 bctx.globalAlpha=.10;bctx.strokeStyle='#dfe3e3';
 for(let i=0;i<34;i++){const x=Math.floor(random()*width);bctx.beginPath();bctx.moveTo(x,0);bctx.lineTo(x+(random()-.5)*2,height);bctx.stroke();}

 const bumpTexture=new THREE.CanvasTexture(bumpCanvas),roughTexture=new THREE.CanvasTexture(roughCanvas);
 for(const texture of [bumpTexture,roughTexture]){
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(5,1);texture.colorSpace=THREE.NoColorSpace;
  texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
 }

 const wetCanvas=document.createElement('canvas');wetCanvas.width=512;wetCanvas.height=1024;
 const wctx=wetCanvas.getContext('2d');wctx.fillStyle='black';wctx.fillRect(0,0,wetCanvas.width,wetCanvas.height);
 const wetRandom=makeRng(1831);
 wctx.globalCompositeOperation='lighter';
 for(let i=0;i<56;i++){
  const x=wetRandom()*wetCanvas.width,y=70+wetRandom()*(wetCanvas.height-140),rx=18+wetRandom()*58,ry=30+wetRandom()*110;
  const gradient=wctx.createRadialGradient(x,y,0,x,y,Math.max(rx,ry));
  const strength=.08+wetRandom()*.18;
  gradient.addColorStop(0,`rgba(255,255,255,${strength})`);gradient.addColorStop(.55,`rgba(220,220,220,${strength*.42})`);gradient.addColorStop(1,'rgba(0,0,0,0)');
  wctx.fillStyle=gradient;wctx.save();wctx.translate(x,y);wctx.scale(rx/Math.max(rx,ry),ry/Math.max(rx,ry));wctx.beginPath();wctx.arc(0,0,Math.max(rx,ry),0,Math.PI*2);wctx.fill();wctx.restore();
 }
 for(let i=0;i<18;i++){
  const x=wetRandom()*wetCanvas.width,y=120+wetRandom()*760,len=55+wetRandom()*190,w=2+wetRandom()*7;
  const gradient=wctx.createLinearGradient(x,y,x,y+len);gradient.addColorStop(0,'rgba(255,255,255,.04)');gradient.addColorStop(.22,'rgba(255,255,255,.20)');gradient.addColorStop(1,'rgba(255,255,255,0)');
  wctx.strokeStyle=gradient;wctx.lineWidth=w;wctx.lineCap='round';wctx.beginPath();wctx.moveTo(x,y);wctx.bezierCurveTo(x+(wetRandom()-.5)*10,y+len*.3,x+(wetRandom()-.5)*12,y+len*.65,x+(wetRandom()-.5)*7,y+len);wctx.stroke();
 }
 wctx.globalCompositeOperation='source-over';
 const wetTexture=new THREE.CanvasTexture(wetCanvas);wetTexture.wrapS=THREE.RepeatWrapping;wetTexture.colorSpace=THREE.NoColorSpace;
 wetTexture.minFilter=THREE.LinearMipmapLinearFilter;wetTexture.magFilter=THREE.LinearFilter;
 return {bumpTexture,roughTexture,wetTexture,dispose(){bumpTexture.dispose();roughTexture.dispose();wetTexture.dispose();}};
}

function addCan(scene,textures,glass){
 const group=new THREE.Group();scene.add(group);
 const surfaces=createSurfaceTextures();
 const metal=new THREE.MeshPhysicalMaterial({
  color:0xd9dddd,metalness:1,roughness:.185,clearcoat:.08,clearcoatRoughness:.12,
  envMapIntensity:2.25,anisotropy:.35
 });
 const brushedMetal=new THREE.MeshPhysicalMaterial({
  color:0xb9c0be,metalness:1,roughness:.255,clearcoat:.04,clearcoatRoughness:.18,
  envMapIntensity:1.92,anisotropy:.82,anisotropyRotation:Math.PI/2
 });
 const darkMetal=new THREE.MeshStandardMaterial({color:0x252d2b,metalness:.90,roughness:.36,envMapIntensity:1.12});

 const panel=new THREE.MeshPhysicalMaterial({
  map:textures[0],metalness:.055,roughness:.305,roughnessMap:surfaces.roughTexture,
  clearcoat:.96,clearcoatRoughness:.105,envMapIntensity:1.20,ior:1.49,specularIntensity:.93,
  bumpMap:surfaces.bumpTexture,bumpScale:.0045,anisotropy:.10
 });
 const blend={map:{value:textures[1]},amount:{value:0}};
 panel.onBeforeCompile=shader=>{
  shader.uniforms.flavorMap=blend.map;shader.uniforms.flavorMix=blend.amount;
  shader.fragmentShader='uniform sampler2D flavorMap;\nuniform float flavorMix;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
   vec4 labelA=texture2D(map,vMapUv);
   vec4 labelB=texture2D(flavorMap,vMapUv);
   vec4 labelMix=mix(labelA,labelB,flavorMix);
   diffuseColor *= labelMix;
  #endif`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   #ifdef USE_MAP
    vec3 labelRgb=mix(labelA.rgb,labelB.rgb,flavorMix);
    float hi=max(max(labelRgb.r,labelRgb.g),labelRgb.b),lo=min(min(labelRgb.r,labelRgb.g),labelRgb.b);
    float saturation=hi-lo;
    float microGrain=fract(sin(dot(vMapUv*vec2(783.31,421.17),vec2(12.9898,78.233)))*43758.5453);
    roughnessFactor=clamp(roughnessFactor+(microGrain-.5)*.032+saturation*.018,.17,.43);
   #endif`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
   #ifdef USE_MAP
    vec3 metalRgb=mix(labelA.rgb,labelB.rgb,flavorMix);
    float metalHi=max(max(metalRgb.r,metalRgb.g),metalRgb.b),metalLo=min(min(metalRgb.r,metalRgb.g),metalRgb.b);
    float metalSat=metalHi-metalLo;
    float luma=dot(metalRgb,vec3(.2126,.7152,.0722));
    float exposedAluminum=smoothstep(.74,.96,luma)*(1.-smoothstep(.08,.34,metalSat));
    metalnessFactor=mix(metalnessFactor,.42,exposedAluminum*.42);
   #endif`);
 };
 panel.customProgramCacheKey=()=> 'fizora-label-photoreal-v6';

 const bodyGeometry=createCanBodyGeometry();
 const body=new THREE.Mesh(bodyGeometry,panel);body.castShadow=body.receiveShadow=true;group.add(body);

 const wetMaterial=new THREE.MeshPhysicalMaterial({
  color:0xffffff,metalness:0,roughness:.026,clearcoat:1,clearcoatRoughness:.008,
  transparent:true,opacity:.115,alphaMap:surfaces.wetTexture,depthWrite:false,envMapIntensity:1.72,ior:1.333
 });
 const wetShell=new THREE.Mesh(bodyGeometry,wetMaterial);wetShell.scale.set(1.0017,1,1.0017);wetShell.renderOrder=1;group.add(wetShell);

 function ring(radius,tube,y,mat=metal,radial=128){
  const o=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,16,radial),mat);o.rotation.x=Math.PI/2;o.position.y=y;o.castShadow=o.receiveShadow=true;group.add(o);return o;
 }

 const lid=new THREE.Mesh(createLidGeometry(),brushedMetal);lid.castShadow=lid.receiveShadow=true;group.add(lid);
 ring(.579,.0255,1.444,metal);ring(.548,.0105,1.454,brushedMetal);ring(.490,.0045,1.454,darkMetal);
 ring(.463,.0018,1.456,metal);ring(.443,.0012,1.456,brushedMetal);ring(.552,.026,-1.430,metal);ring(.521,.012,-1.459,brushedMetal);
 const base=new THREE.Mesh(new THREE.LatheGeometry([[0,-1.375],[.21,-1.375],[.33,-1.387],[.405,-1.413],[.466,-1.450],[.52,-1.459]].map(v=>new THREE.Vector2(...v)),128),metal);
 base.castShadow=base.receiveShadow=true;group.add(base);ring(.398,.006,-1.411,brushedMetal);ring(.505,.005,1.461,metal);

 const cavity=new THREE.Mesh(new THREE.CircleGeometry(.132,72),new THREE.MeshStandardMaterial({color:0x0d1311,metalness:.22,roughness:.51}));
 cavity.rotation.x=-Math.PI/2;cavity.scale.y=1.34;cavity.position.set(0,1.448,-.235);group.add(cavity);
 const score=ring(.151,.0037,1.459,darkMetal);score.position.z=-.235;score.scale.set(1,1.43,1);
 const apertureLip=ring(.138,.0022,1.461,brushedMetal);apertureLip.position.z=-.235;apertureLip.scale.set(1,1.35,1);

 const pull=new THREE.Group();pull.position.set(0,1.482,.038);group.add(pull);
 const outer=new THREE.Shape();outer.absellipse(0,0,.116,.226,0,Math.PI*2,false,0);
 const hole=new THREE.Path();hole.absellipse(0,.04,.066,.122,0,Math.PI*2,true,0);outer.holes.push(hole);
 const tabGeometry=new THREE.ExtrudeGeometry(outer,{depth:.016,bevelEnabled:true,bevelSize:.007,bevelThickness:.005,bevelSegments:4,steps:1,curveSegments:56});
 const tab=new THREE.Mesh(tabGeometry,brushedMetal);tab.rotation.x=-Math.PI/2;tab.castShadow=tab.receiveShadow=true;pull.add(tab);
 const rivet=new THREE.Mesh(new THREE.SphereGeometry(.037,28,14),metal);rivet.scale.set(1,.30,1);rivet.position.set(0,1.492,-.09);rivet.castShadow=true;group.add(rivet);
 const rivetRing=ring(.052,.0018,1.486,brushedMetal);rivetRing.position.z=-.09;

 const tinyDropMat=glass.material({distortion:.0038,roughness:.018,frost:.001,absorption:.006,dispersion:.002});
 const bigDropMat=glass.material({distortion:.0068,roughness:.014,frost:.001,absorption:.010,dispersion:.003});
 const random=makeRng(83),dummy=new THREE.Object3D();
 const tinyCount=760;
 const tiny=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,7),tinyDropMat,tinyCount);
 for(let i=0;i<tinyCount;i++){
  const cluster=Math.floor(random()*13),clusterTheta=cluster/13*Math.PI*2+(random()-.5)*.34;
  const theta=(clusterTheta+(random()-.5)*.48)%(Math.PI*2),y=(random()-.5)*2.20;
  const r=.0032+Math.pow(random(),4.4)*.0145;
  dummy.position.set(Math.sin(theta)*.6615,y,Math.cos(theta)*.6615);
  dummy.scale.set(r,r*(.88+random()*.40),r*.50);dummy.rotation.y=theta;dummy.updateMatrix();tiny.setMatrixAt(i,dummy.matrix);
 }
 tiny.instanceMatrix.needsUpdate=true;tiny.renderOrder=3;group.add(tiny);glass.exclude(tiny);

 const mediumCount=168;
 const medium=new THREE.InstancedMesh(new THREE.SphereGeometry(1,16,10),bigDropMat,mediumCount);
 for(let i=0;i<mediumCount;i++){
  const theta=random()*Math.PI*2,y=(random()-.5)*2.05;
  const r=.009+Math.pow(random(),2.55)*.030,gravity=1.08+Math.pow(random(),1.7)*1.55;
  dummy.position.set(Math.sin(theta)*.6635,y,Math.cos(theta)*.6635);
  dummy.scale.set(r,r*gravity,r*.46);dummy.rotation.y=theta;dummy.rotation.z=(random()-.5)*.09;dummy.updateMatrix();medium.setMatrixAt(i,dummy.matrix);
 }
 medium.instanceMatrix.needsUpdate=true;medium.renderOrder=4;group.add(medium);glass.exclude(medium);

 const runCount=18,runGeometry=new THREE.SphereGeometry(1,16,10),runs=new THREE.InstancedMesh(runGeometry,bigDropMat,runCount);
 const runSeeds=Array.from({length:runCount},()=>({
  theta:random()*Math.PI*2,start:.82-random()*1.52,r:.010+random()*.013,
  stretch:2.5+random()*3.0,speed:.0035+random()*.0065,phase:random(),distance:.16+random()*.26
 }));
 const updateRuns=time=>{
  for(let i=0;i<runSeeds.length;i++){
   const s=runSeeds[i],progress=(s.phase+time*s.speed)%1,y=s.start-progress*s.distance;
   const pulse=.86+.14*Math.sin(progress*Math.PI);
   dummy.position.set(Math.sin(s.theta)*.6645,y,Math.cos(s.theta)*.6645);
   dummy.scale.set(s.r*pulse,s.r*s.stretch*(.92+progress*.20),s.r*.43);dummy.rotation.y=s.theta;dummy.updateMatrix();runs.setMatrixAt(i,dummy.matrix);
  }
  runs.instanceMatrix.needsUpdate=true;
 };
 updateRuns(0);runs.renderOrder=4;group.add(runs);glass.exclude(runs);

 return {
  group,panel,blend,surfaces,
  condensation:{update(time){updateRuns(time);}}
 };
}

export async function createCanScene(canvas,assets){
 const artwork=assets??await preparePackaging();
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance',premultipliedAlpha:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<760?1.5:2));
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.99;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(28.5,innerWidth/innerHeight,.1,50);camera.position.set(0,0,8);
 const environment=createStudioEnvironment(renderer);scene.environment=environment.texture;

 scene.add(new THREE.HemisphereLight(0xf7fbf8,0x1d3329,.24));
 const key=new THREE.DirectionalLight(0xfff8ee,2.18);key.position.set(-3.9,5.5,5.8);key.castShadow=true;
 key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.bias=-.00025;key.shadow.normalBias=.018;scene.add(key);
 const edge=new THREE.DirectionalLight(0xeaf8ff,2.48);edge.position.set(5.7,2.3,-3.3);scene.add(edge);
 const fill=new THREE.DirectionalLight(0xffffff,.34);fill.position.set(.7,-.15,5.6);scene.add(fill);
 const topLight=new THREE.PointLight(0xfffbf2,.42,14,2);topLight.position.set(-.8,5.2,2.8);scene.add(topLight);
 const floorBounce=new THREE.PointLight(0xdff5e8,.20,11,2);floorBounce.position.set(.7,-4.6,2.2);scene.add(floorBounce);

 const textures=artwork.canvases.map(label=>{
  const t=new THREE.CanvasTexture(label);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;
  t.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;return t;
 });
 const loader=new THREE.TextureLoader();
 const backgrounds=await Promise.all(['citrus','berry','tropical'].map(async name=>{
  const texture=await loader.loadAsync(`/images/${name}-studio.svg`);texture.colorSpace=THREE.SRGBColorSpace;return texture;
 }));
 const glass=createRefractionScene(renderer,scene,camera,backgrounds);
 const {group,panel,blend,surfaces,condensation}=addCan(scene,textures,glass);
 group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});

 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.15,.76),new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,
  uniforms:{alpha:{value:.155},stretch:{value:1},lean:{value:0}},
  vertexShader:'varying vec2 coord;void main(){coord=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`varying vec2 coord;uniform float alpha;uniform float stretch;uniform float lean;void main(){vec2 p=(coord-.5)*2.;p.x=(p.x-lean*p.y)/stretch;float contact=exp(-(p.x*p.x*3.2+p.y*p.y*19.0));float soft=exp(-((p.x+.30)*(p.x+.30)*1.20+p.y*p.y*6.0))*.42;float tail=exp(-((p.x+.68)*(p.x+.68)*.75+p.y*p.y*8.5))*.12;float a=(contact+soft+tail)*alpha;gl_FragColor=vec4(.018,.032,.024,a);}`
 }));
 shadow.position.z=-.74;scene.add(shadow);

 const bubbleSystem=createBubbles(scene,innerWidth<760?22:34),bubbles=bubbleSystem.mesh;
 let dead=false,contextLost=false,px=0,py=0,sx=0,sy=0,lastI=-1;
 let pausedFrameKey=null,view='auto',inspectionYaw=null,lastRotation=0,wasPaused=false,pauseOrientation=null;
 let sceneTime=0,showcase=-.28,lastP=null,scrollEnergy=0,pose=null;
 const buoyancy=createBuoyancy();
 const rimColors=[new THREE.Color('#e9ffc3'),new THREE.Color('#f8bdff'),new THREE.Color('#ffe3b2')],rimTint=new THREE.Color();
 const catalogShots=[];

 try{
  renderer.setPixelRatio(1);renderer.setSize(480,720,false);camera.aspect=2/3;camera.updateProjectionMatrix();
  group.rotation.set(.12,Math.PI,0,'YXZ');group.scale.setScalar(1.28);shadow.visible=false;bubbles.visible=false;
  for(let i=0;i<3;i++){
   panel.map=textures[i];blend.map.value=textures[i];blend.amount.value=0;glass.resize();glass.setFlavor(Math.min(i,1),i===2?1:0);glass.capture();renderer.render(scene,camera);catalogShots.push(canvas.toDataURL('image/png'));
  }
 }catch{catalogShots.length=0;}

 shadow.visible=true;bubbles.visible=true;renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<760?1.5:2));
 const ice=createIceScene(scene,glass);
 const resize=()=>{renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();glass.resize();};resize();
 const lost=e=>{e.preventDefault();contextLost=true;canvas.style.opacity='0';canvas.parentElement.classList.remove('is-ready');};canvas.addEventListener('webglcontextlost',lost);

 return {
  catalogShots,resize,
  setView(mode){if(['auto','front','back'].includes(mode)){if(mode==='auto'&&pose)showcase=pose.yaw-Math.PI-lastRotation;view=mode;inspectionYaw=null;}},
  pointer(x,y){px=x;py=y;},
  impulse(x,y){ice.impulse(sceneTime);buoyancy.impulse(x,y);const halfH=Math.tan(THREE.MathUtils.degToRad(14.25))*8;bubbleSystem.impulse(x*halfH*camera.aspect,y*halfH,sceneTime);},
  render(s,time,dt,paused){
   if(dead||contextLost||s.visibility<.005)return;
   const frameKey=`${s.p}:${view}:${innerWidth}:${innerHeight}`;
   if(paused&&pausedFrameKey===frameKey)return;
   pausedFrameKey=paused?frameKey:null;
   lastRotation=s.rotation;dt=clamp(dt,0,.05);const mobile=innerWidth<760;
   const halfH=Math.tan(THREE.MathUtils.degToRad(14.25))*8,halfW=halfH*camera.aspect;
   const speed=lastP===null?0:Math.abs(s.p-lastP)/Math.max(dt,.001);lastP=s.p;
   scrollEnergy=damp(scrollEnergy,paused?0:clamp(speed*.76),5.5,dt);
   if(paused&&!wasPaused){pauseOrientation=pose?{yaw:pose.yaw,pitch:pose.pitch,roll:pose.roll}:{yaw:Math.PI,pitch:.12,roll:0};sceneTime=Math.max(sceneTime,1.9);}
   if(!paused&&wasPaused&&pose)showcase=pose.yaw-Math.PI-s.rotation;
   wasPaused=paused;
   if(!paused){sceneTime+=dt;if(view==='auto')showcase=advanceShowcase(showcase,dt,Math.max(s.arc,scrollEnergy));}
   const entrance=paused?1:cinematicEase(clamp(sceneTime/1.9));
   sx=damp(sx,paused?0:px,3.4,dt);sy=damp(sy,paused?0:py,3.4,dt);
   const float=paused?(buoyancy.reset(),buoyancy.state):buoyancy.update(dt);
   const target={
    x:s.x*halfW+sx*.064+float.x,
    y:s.y*halfH+(paused?0:Math.sin(sceneTime*.83)*.026+Math.sin(sceneTime*.37)*.008)+float.y-(1-entrance)*.45,
    size:halfH*2*(mobile?Math.min(.40,360/innerHeight):.68)/H*(1+(paused?0:s.push))*(.82+.18*entrance),
    yaw:Math.PI+(paused?0:s.rotation+showcase)+sx*.115-(1-entrance)*1.05,
    pitch:(paused?.14:s.pitch)+sy*.042+(1-entrance)*.25,
    roll:paused?0:s.tilt+Math.sin(sceneTime*.52)*.010+float.roll+(1-entrance)*-.22
   };
   if(paused&&pauseOrientation&&view==='auto')Object.assign(target,pauseOrientation);
   if(view!=='auto'){
    if(inspectionYaw===null){const face=view==='front'?Math.PI:0;inspectionYaw=face+Math.round(((pose?.yaw??target.yaw)-face)/(2*Math.PI))*2*Math.PI;}
    target.yaw=inspectionYaw;target.pitch=.12;target.roll=0;
   }
   if(!pose||paused)pose={...target};else for(const k of Object.keys(target))pose[k]=damp(pose[k],target[k],k==='yaw'?8.5:7.5,dt);
   group.scale.setScalar(pose.size);group.position.set(pose.x,pose.y,0);group.rotation.set(pose.pitch,pose.yaw,pose.roll,'YXZ');
   if(lastI!==s.i){panel.map=textures[s.i];blend.map.value=textures[s.i+1];lastI=s.i;}
   blend.amount.value=cinematicEase(clamp((s.t-.34)/.32));

   key.position.x=-3.9+(paused?0:Math.sin(sceneTime*.18)*.38+s.arc*.92);key.position.y=5.5+(paused?0:Math.sin(sceneTime*.13)*.12);
   edge.position.x=5.7-(paused?0:s.arc*1.25);
   rimTint.copy(rimColors[s.i]).lerp(rimColors[s.i+1],s.t);edge.color.copy(rimTint);edge.intensity=2.48+(paused?0:s.arc*.30);
   shadow.position.x=pose.x+.05;shadow.position.y=pose.y-pose.size*1.69;
   shadow.scale.set(pose.size*(1+s.push*.44),pose.size*(1-s.push*.14),1);
   shadow.material.uniforms.alpha.value=(s.i===1&&s.t<.5?.088:.155)*(1-s.arc*.20);
   shadow.material.uniforms.stretch.value=1+s.arc*.22;shadow.material.uniforms.lean.value=pose.roll*.55;

   condensation.update(sceneTime);
   bubbleSystem.update(sceneTime,pose,Math.max(s.arc,scrollEnergy*.36),rimTint);
   ice.update(sceneTime,pose,Math.max(s.arc,scrollEnergy*.34));
   glass.setFlavor(s.i,s.t);glass.capture();renderer.render(scene,camera);
  },
  dispose(){
   if(dead)return;dead=true;canvas.removeEventListener('webglcontextlost',lost);
   const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
   geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());surfaces.dispose();environment.dispose();glass.dispose();renderer.dispose();
  }
 };
}
