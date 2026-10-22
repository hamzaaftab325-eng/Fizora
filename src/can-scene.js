import {createBubbles} from './bubbles';
import {preparePackaging} from './can-labels';
export {preparePackaging} from './can-labels';
import * as THREE from 'three';
import {createIceScene,createRefractionScene} from './ice-scene';
import {createStudioEnvironment} from './studio-environment';
import {createCanBodyGeometry} from './can-geometry';
import {clamp,cinematicEase,damp,advanceShowcase} from './motion';
import {createBuoyancy} from './liquid-field';

const H=3.04;

function addCan(scene,textures,glass){
 const group=new THREE.Group();scene.add(group);
 const metal=new THREE.MeshPhysicalMaterial({
  color:0xd5d9d8,metalness:1,roughness:.205,clearcoat:.10,clearcoatRoughness:.14,
  envMapIntensity:2.05
 });
 const brushedMetal=new THREE.MeshPhysicalMaterial({
  color:0xb8bfbd,metalness:1,roughness:.285,clearcoat:.05,clearcoatRoughness:.2,
  envMapIntensity:1.65
 });
 const darkMetal=new THREE.MeshStandardMaterial({color:0x303a37,metalness:.92,roughness:.33,envMapIntensity:1.2});
 const panel=new THREE.MeshPhysicalMaterial({
  map:textures[0],metalness:.46,roughness:.295,clearcoat:.82,clearcoatRoughness:.16,
  envMapIntensity:1.14
 });
 const blend={map:{value:textures[1]},amount:{value:0}};
 panel.onBeforeCompile=shader=>{
  shader.uniforms.flavorMap=blend.map;shader.uniforms.flavorMix=blend.amount;
  shader.fragmentShader='uniform sampler2D flavorMap;\nuniform float flavorMix;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
   vec4 labelA=texture2D(map,vMapUv);
   vec4 labelB=texture2D(flavorMap,vMapUv);
   diffuseColor *= mix(labelA,labelB,flavorMix);
  #endif`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   #ifdef USE_MAP
    float microGrain=fract(sin(dot(vMapUv*vec2(783.31,421.17),vec2(12.9898,78.233)))*43758.5453);
    float printVariation=(microGrain-.5)*.048;
    roughnessFactor=clamp(roughnessFactor+printVariation,.19,.48);
   #endif`);
 };
 panel.customProgramCacheKey=()=> 'fizora-label-blend-realism-v4';

 const body=new THREE.Mesh(createCanBodyGeometry(),panel);body.castShadow=true;group.add(body);
 function ring(radius,tube,y,mat=metal){
  const o=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,16,128),mat);o.rotation.x=Math.PI/2;o.position.y=y;o.castShadow=true;group.add(o);return o;
 }
 function disc(radius,height,y,mat=metal){
  const o=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,128),mat);o.position.y=y;o.castShadow=true;group.add(o);return o;
 }

 disc(.575,.026,1.425,brushedMetal);ring(.578,.025,1.443,metal);ring(.542,.010,1.454,brushedMetal);
 disc(.526,.010,1.446,brushedMetal);ring(.490,.0045,1.453,darkMetal);
 ring(.468,.0020,1.456,metal);ring(.454,.0014,1.456,metal);
 ring(.552,.026,-1.430,metal);ring(.521,.012,-1.459,brushedMetal);
 const base=new THREE.Mesh(new THREE.LatheGeometry([[0,-1.375],[.22,-1.375],[.34,-1.388],[.40,-1.41],[.465,-1.45],[.52,-1.459]].map(v=>new THREE.Vector2(...v)),128),metal);
 base.castShadow=true;group.add(base);ring(.398,.006,-1.411,brushedMetal);ring(.505,.005,1.461,metal);

 const score=ring(.151,.0042,1.458,darkMetal);score.position.z=-.235;score.scale.set(1,1.43,1);
 const aperture=new THREE.Mesh(new THREE.CircleGeometry(.134,64),new THREE.MeshStandardMaterial({color:0x151b19,metalness:.45,roughness:.47}));
 aperture.rotation.x=-Math.PI/2;aperture.scale.y=1.35;aperture.position.set(0,1.456,-.235);group.add(aperture);
 const apertureLip=ring(.139,.0025,1.460,brushedMetal);apertureLip.position.z=-.235;apertureLip.scale.set(1,1.35,1);

 const pull=new THREE.Group();pull.position.set(0,1.482,.04);group.add(pull);
 const outer=new THREE.Shape();outer.absellipse(0,0,.116,.226,0,Math.PI*2,false,0);
 const hole=new THREE.Path();hole.absellipse(0,.04,.066,.122,0,Math.PI*2,true,0);outer.holes.push(hole);
 const tabGeometry=new THREE.ExtrudeGeometry(outer,{depth:.016,bevelEnabled:true,bevelSize:.007,bevelThickness:.005,bevelSegments:3,steps:1,curveSegments:48});
 const tab=new THREE.Mesh(tabGeometry,brushedMetal);tab.rotation.x=-Math.PI/2;tab.castShadow=true;pull.add(tab);
 const rivet=new THREE.Mesh(new THREE.SphereGeometry(.037,24,12),metal);rivet.scale.set(1,.31,1);rivet.position.set(0,1.492,-.09);group.add(rivet);
 const rivetRing=ring(.052,.002,1.486,brushedMetal);rivetRing.position.z=-.09;

 const tinyDropMat=glass.material({distortion:.0045,roughness:.032,frost:.001,absorption:.008});
 const bigDropMat=glass.material({distortion:.0075,roughness:.022,frost:.001,absorption:.012});
 let seed=83;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
 const dummy=new THREE.Object3D();
 const tiny=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,7),tinyDropMat,720);
 for(let i=0;i<720;i++){
  const cluster=Math.floor(random()*11),clusterTheta=cluster/11*Math.PI*2+(random()-.5)*.42;
  const theta=(clusterTheta+random()*Math.PI*2*.22)%(Math.PI*2),y=(random()-.5)*2.20;
  const r=.0034+Math.pow(random(),4.2)*.015;
  dummy.position.set(Math.sin(theta)*.661,y,Math.cos(theta)*.661);
  dummy.scale.set(r,r*(.92+random()*.34),r*.56);dummy.rotation.y=theta;dummy.updateMatrix();tiny.setMatrixAt(i,dummy.matrix);
 }
 tiny.instanceMatrix.needsUpdate=true;tiny.renderOrder=3;group.add(tiny);glass.exclude(tiny);

 const large=new THREE.InstancedMesh(new THREE.SphereGeometry(1,16,10),bigDropMat,138);
 for(let i=0;i<138;i++){
  const theta=random()*Math.PI*2,y=(random()-.5)*2.08;
  const r=.010+Math.pow(random(),2.5)*.031,gravity=1.05+random()*1.3;
  dummy.position.set(Math.sin(theta)*.664,y,Math.cos(theta)*.664);
  dummy.scale.set(r,r*gravity,r*.48);dummy.rotation.y=theta;dummy.rotation.z=(random()-.5)*.12;dummy.updateMatrix();large.setMatrixAt(i,dummy.matrix);
 }
 large.instanceMatrix.needsUpdate=true;large.renderOrder=4;group.add(large);glass.exclude(large);

 const runs=new THREE.InstancedMesh(new THREE.SphereGeometry(1,14,9),bigDropMat,18);
 for(let i=0;i<18;i++){
  const theta=random()*Math.PI*2,y=(random()-.5)*1.85,r=.011+random()*.012;
  dummy.position.set(Math.sin(theta)*.665,y,Math.cos(theta)*.665);
  dummy.scale.set(r,r*(2.6+random()*3.2),r*.42);dummy.rotation.y=theta;dummy.updateMatrix();runs.setMatrixAt(i,dummy.matrix);
 }
 runs.instanceMatrix.needsUpdate=true;runs.renderOrder=4;group.add(runs);glass.exclude(runs);
 return {group,panel,blend};
}

export async function createCanScene(canvas,assets){
 const artwork=assets??await preparePackaging();
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance',premultipliedAlpha:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<760?1.5:2));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.02;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(29,innerWidth/innerHeight,.1,50);camera.position.set(0,0,8);
 const environment=createStudioEnvironment(renderer);scene.environment=environment.texture;

 scene.add(new THREE.HemisphereLight(0xf5fbf8,0x233c31,.29));
 const key=new THREE.DirectionalLight(0xfff8ee,2.35);key.position.set(-3.7,5.3,5.7);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);
 const edge=new THREE.DirectionalLight(0xeefbff,2.72);edge.position.set(5.4,2.1,-3.2);scene.add(edge);
 const fill=new THREE.DirectionalLight(0xffffff,.42);fill.position.set(.5,-.2,5.5);scene.add(fill);
 const topLight=new THREE.PointLight(0xffffff,.55,14,2);topLight.position.set(0,5,2.5);scene.add(topLight);

 const textures=artwork.canvases.map(label=>{
  const t=new THREE.CanvasTexture(label);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;
  t.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;return t;
 });
 const loader=new THREE.TextureLoader();
 const backgrounds=await Promise.all(['citrus','berry','tropical'].map(async name=>{
  const texture=await loader.loadAsync(`/images/${name}-studio.svg`);texture.colorSpace=THREE.SRGBColorSpace;return texture;
 }));
 const glass=createRefractionScene(renderer,scene,camera,backgrounds);
 const {group,panel,blend}=addCan(scene,textures,glass);
 group.traverse(o=>{if(o.isMesh)o.castShadow=true;});

 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.0,.72),new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,
  uniforms:{alpha:{value:.16},stretch:{value:1}},
  vertexShader:'varying vec2 coord;void main(){coord=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`varying vec2 coord;uniform float alpha;uniform float stretch;void main(){vec2 p=(coord-.5)*2.;p.x/=stretch;float core=exp(-(p.x*p.x*2.2+p.y*p.y*7.8));float tail=exp(-((p.x+.34)*(p.x+.34)*1.15+p.y*p.y*10.5))*.34;float a=(core+tail)*alpha;gl_FragColor=vec4(.025,.045,.032,a);}`
 }));
 shadow.position.z=-.72;scene.add(shadow);

 const bubbleSystem=createBubbles(scene,innerWidth<760?22:34),bubbles=bubbleSystem.mesh;
 let dead=false,contextLost=false,px=0,py=0,sx=0,sy=0,lastI=-1;
 let pausedFrameKey=null;
 let view='auto',inspectionYaw=null,lastRotation=0,wasPaused=false,pauseOrientation=null;
 let sceneTime=0,showcase=-.28,lastP=null,scrollEnergy=0,pose=null;
 const buoyancy=createBuoyancy();
 const rimColors=[new THREE.Color('#e9ffc3'),new THREE.Color('#f8bdff'),new THREE.Color('#ffe3b2')];
 const rimTint=new THREE.Color();
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
  impulse(x,y){ice.impulse(sceneTime);buoyancy.impulse(x,y);const halfH=Math.tan(THREE.MathUtils.degToRad(14.5))*8;bubbleSystem.impulse(x*halfH*camera.aspect,y*halfH,sceneTime);},
  render(s,time,dt,paused){
   if(dead||contextLost||s.visibility<.005)return;
   const frameKey=`${s.p}:${view}:${innerWidth}:${innerHeight}`;
   if(paused&&pausedFrameKey===frameKey)return;
   pausedFrameKey=paused?frameKey:null;
   lastRotation=s.rotation;dt=clamp(dt,0,.05);const mobile=innerWidth<760;
   const halfH=Math.tan(THREE.MathUtils.degToRad(14.5))*8,halfW=halfH*camera.aspect;
   const speed=lastP===null?0:Math.abs(s.p-lastP)/Math.max(dt,.001);lastP=s.p;
   scrollEnergy=damp(scrollEnergy,paused?0:clamp(speed*.8),5,dt);
   if(paused&&!wasPaused){pauseOrientation=pose?{yaw:pose.yaw,pitch:pose.pitch,roll:pose.roll}:{yaw:Math.PI,pitch:.12,roll:0};sceneTime=Math.max(sceneTime,1.9);}
   if(!paused&&wasPaused&&pose)showcase=pose.yaw-Math.PI-s.rotation;
   wasPaused=paused;
   if(!paused){sceneTime+=dt;if(view==='auto')showcase=advanceShowcase(showcase,dt,Math.max(s.arc,scrollEnergy));}
   const entrance=paused?1:cinematicEase(clamp(sceneTime/1.9));
   sx=damp(sx,paused?0:px,3,dt);sy=damp(sy,paused?0:py,3,dt);
   const float=paused?(buoyancy.reset(),buoyancy.state):buoyancy.update(dt);
   const target={
    x:s.x*halfW+sx*.075+float.x,
    y:s.y*halfH+(paused?0:Math.sin(sceneTime*1.1)*.038+Math.sin(sceneTime*.47)*.012)+float.y-(1-entrance)*.45,
    size:halfH*2*(mobile?Math.min(.40,360/innerHeight):.68)/H*(1+(paused?0:s.push))*(.82+.18*entrance),
    yaw:Math.PI+(paused?0:s.rotation+showcase)+sx*.14-(1-entrance)*1.05,
    pitch:(paused?.14:s.pitch)+sy*.055+(1-entrance)*.25,
    roll:paused?0:s.tilt+Math.sin(sceneTime*.75)*.015+float.roll+(1-entrance)*-.22
   };
   if(paused&&pauseOrientation&&view==='auto')Object.assign(target,pauseOrientation);
   if(view!=='auto'){
    if(inspectionYaw===null){const face=view==='front'?Math.PI:0;inspectionYaw=face+Math.round(((pose?.yaw??target.yaw)-face)/(2*Math.PI))*2*Math.PI;}
    target.yaw=inspectionYaw;target.pitch=.12;target.roll=0;
   }
   if(!pose||paused)pose={...target};else for(const k of Object.keys(target))pose[k]=damp(pose[k],target[k],k==='yaw'?9:7,dt);
   group.scale.setScalar(pose.size);group.position.set(pose.x,pose.y,0);group.rotation.set(pose.pitch,pose.yaw,pose.roll,'YXZ');
   if(lastI!==s.i){panel.map=textures[s.i];blend.map.value=textures[s.i+1];lastI=s.i;}
   blend.amount.value=cinematicEase(clamp((s.t-.34)/.32));

   key.position.x=-3.7+(paused?0:Math.sin(sceneTime*.28)*.72+s.arc*1.45);
   key.position.y=5.3+(paused?0:Math.sin(sceneTime*.19)*.22);
   edge.position.x=5.4-(paused?0:s.arc*1.8);
   rimTint.copy(rimColors[s.i]).lerp(rimColors[s.i+1],s.t);edge.color.copy(rimTint);
   edge.intensity=2.72+(paused?0:s.arc*.42);
   shadow.position.x=pose.x+.06;shadow.position.y=pose.y-pose.size*1.69;
   shadow.scale.set(pose.size*(1.0+s.push*.52),pose.size*(1-s.push*.18),1);
   shadow.material.uniforms.alpha.value=(s.i===1&&s.t<.5?.09:.16)*(1-s.arc*.24);
   shadow.material.uniforms.stretch.value=1+s.arc*.28;
   bubbleSystem.update(sceneTime,pose,Math.max(s.arc,scrollEnergy*.4),rimTint);
   ice.update(sceneTime,pose,Math.max(s.arc,scrollEnergy*.4));
   glass.setFlavor(s.i,s.t);glass.capture();renderer.render(scene,camera);
  },
  dispose(){
   if(dead)return;dead=true;canvas.removeEventListener('webglcontextlost',lost);
   const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
   geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());environment.dispose();glass.dispose();renderer.dispose();
  }
 };
}
