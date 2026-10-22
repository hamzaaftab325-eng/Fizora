import {createBubbles} from './bubbles';
import {preparePackaging} from './can-labels';
export {preparePackaging} from './can-labels';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createCanBodyGeometry} from './can-geometry';
import {clamp,cinematicEase,damp,advanceShowcase} from './motion';
import {createBuoyancy} from './liquid-field';
const H=3.04;
function addCan(scene,textures){
 const group=new THREE.Group();scene.add(group);
 const metal=new THREE.MeshStandardMaterial({color:0xe4e8e8,metalness:1,roughness:.22,envMapIntensity:1.35});
 const darkMetal=new THREE.MeshStandardMaterial({color:0x86938e,metalness:1,roughness:.35});
 const panel=new THREE.MeshPhysicalMaterial({map:textures[0],metalness:.02,roughness:.29,clearcoat:.7,clearcoatRoughness:.12,envMapIntensity:.65});
 const blend={map:{value:textures[1]},amount:{value:0}};
 panel.onBeforeCompile=shader=>{shader.uniforms.flavorMap=blend.map;shader.uniforms.flavorMix=blend.amount;shader.fragmentShader='uniform sampler2D flavorMap;\nuniform float flavorMix;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
  vec4 labelA=texture2D(map,vMapUv);
  vec4 labelB=texture2D(flavorMap,vMapUv);
  diffuseColor *= mix(labelA,labelB,flavorMix);
 #endif`);};panel.customProgramCacheKey=()=> 'fizora-label-blend-v2';
 const body=new THREE.Mesh(createCanBodyGeometry(),panel);group.add(body);
 function ring(radius,tube,y,mat=metal){const o=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,12,96),mat);o.rotation.x=Math.PI/2;o.position.y=y;group.add(o);return o;}
 function disc(radius,height,y,mat=metal){const o=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,96),mat);o.position.y=y;group.add(o);return o;}
 disc(.575,.028,1.425);ring(.577,.025,1.443);ring(.54,.009,1.454);disc(.525,.012,1.445);ring(.49,.004,1.453,darkMetal);
 ring(.55,.026,-1.43);ring(.52,.012,-1.459);
 const base=new THREE.Mesh(new THREE.LatheGeometry([[0,-1.38],[.25,-1.38],[.38,-1.40],[.46,-1.45],[.52,-1.459]].map(v=>new THREE.Vector2(...v)),96),metal);group.add(base);
 ring(.40,.006,-1.411);ring(.505,.005,1.461);
 // Scored drinking opening and embossed pull tab, all actual geometry.
 const score=ring(.15,.004,1.458,darkMetal);score.position.z=-.235;score.scale.set(1,1.4,1);
 const pull=new THREE.Group();pull.position.set(0,1.48,.04);group.add(pull);
 const outer=new THREE.Shape();outer.absellipse(0,0,.115,.225,0,Math.PI*2,false,0);
 const hole=new THREE.Path();hole.absellipse(0,.04,.066,.122,0,Math.PI*2,true,0);outer.holes.push(hole);
 const tabGeometry=new THREE.ExtrudeGeometry(outer,{depth:.018,bevelEnabled:true,bevelSize:.008,bevelThickness:.006,bevelSegments:2,steps:1,curveSegments:32});
 const tab=new THREE.Mesh(tabGeometry,metal);tab.rotation.x=-Math.PI/2;pull.add(tab);
 const rivet=new THREE.Mesh(new THREE.SphereGeometry(.036,16,8),metal);rivet.scale.set(1,.35,1);rivet.position.set(0,1.49,-.09);group.add(rivet);
 // Instanced condensation keeps the entire droplet layer to one draw call.
 const dropMat=new THREE.MeshPhysicalMaterial({color:0xf2fff7,metalness:0,roughness:.055,transparent:true,opacity:.52,clearcoat:1,clearcoatRoughness:.05,envMapIntensity:1.6,depthWrite:false});
 const drops=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,8),dropMat,480);let seed=83;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};const dummy=new THREE.Object3D();
 for(let i=0;i<480;i++){const theta=random()*Math.PI*2,y=(random()-.5)*2.2,r=.004+Math.pow(random(),3)*.029;dummy.position.set(Math.sin(theta)*.658,y,Math.cos(theta)*.658);dummy.scale.set(r,r*(1+random()*.7),r*.6);dummy.rotation.y=theta;dummy.updateMatrix();drops.setMatrixAt(i,dummy.matrix);}drops.instanceMatrix.needsUpdate=true;group.add(drops);
 return {group,panel,blend};
}
export async function createCanScene(canvas,assets){
 const artwork=assets??await preparePackaging();
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<760?1.5:1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.82;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(30,innerWidth/innerHeight,.1,50);camera.position.set(0,0,8);
 const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xffffff,0x3a5849,.65));const key=new THREE.DirectionalLight(0xfffaf1,1.7);key.position.set(-3,5,6);scene.add(key);const edge=new THREE.DirectionalLight(0xffffff,2.5);edge.position.set(5,2,-3);scene.add(edge);const fill=new THREE.DirectionalLight(0xffffff,.32);fill.position.set(0,0,5);scene.add(fill);
 const textures=artwork.canvases.map(label=>{const t=new THREE.CanvasTexture(label);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;t.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());return t;});
 const {group,panel,blend}=addCan(scene,textures);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.5,.5),new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{alpha:{value:.13}},vertexShader:'varying vec2 coord; void main(){coord=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 coord;uniform float alpha;void main(){float d=length((coord-.5)*2.);gl_FragColor=vec4(.05,.10,.06,pow(max(0.,1.-d),2.)*alpha);}'}));shadow.position.z=-.6;scene.add(shadow);
 const bubbleSystem=createBubbles(scene,innerWidth<760?22:34),bubbles=bubbleSystem.mesh;
 let dead=false,contextLost=false,px=0,py=0,sx=0,sy=0,lastI=-1;
 let view='auto',inspectionYaw=null,lastRotation=0,wasPaused=false,pauseOrientation=null;
 let sceneTime=0,showcase=-.28,lastP=null,scrollEnergy=0,pose=null;
 const buoyancy=createBuoyancy();
 const rimColors=[new THREE.Color('#e9ffc3'),new THREE.Color('#f8bdff'),new THREE.Color('#ffe3b2')];
 const rimTint=new THREE.Color();
 const catalogShots=[];
 try{
  renderer.setPixelRatio(1);renderer.setSize(480,720,false);camera.aspect=2/3;camera.updateProjectionMatrix();
  group.rotation.set(.12,Math.PI,0,'YXZ');group.scale.setScalar(1.28);shadow.visible=false;bubbles.visible=false;
  for(let i=0;i<3;i++){panel.map=textures[i];blend.map.value=textures[i];blend.amount.value=0;renderer.render(scene,camera);catalogShots.push(canvas.toDataURL('image/png'));}
 }catch{catalogShots.length=0;}
 shadow.visible=true;bubbles.visible=true;renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<760?1.5:1.75));
 const resize=()=>{renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();};resize();
 const lost=e=>{e.preventDefault();contextLost=true;canvas.style.opacity='0';canvas.parentElement.classList.remove('is-ready');};canvas.addEventListener('webglcontextlost',lost);
 return {
  catalogShots,resize,setView(mode){if(['auto','front','back'].includes(mode)){if(mode==='auto'&&pose)showcase=pose.yaw-Math.PI-lastRotation;view=mode;inspectionYaw=null;}},pointer(x,y){px=x;py=y;},
  impulse(x,y){buoyancy.impulse(x,y);const halfH=Math.tan(THREE.MathUtils.degToRad(15))*8;bubbleSystem.impulse(x*halfH*camera.aspect,y*halfH,sceneTime);},
  render(s,time,dt,paused){
   if(dead||contextLost||s.visibility<.005)return;
   lastRotation=s.rotation;dt=clamp(dt,0,.05);const mobile=innerWidth<760;
   const halfH=Math.tan(THREE.MathUtils.degToRad(15))*8,halfW=halfH*camera.aspect;
   const speed=lastP===null?0:Math.abs(s.p-lastP)/Math.max(dt,.001);lastP=s.p;
   scrollEnergy=damp(scrollEnergy,paused?0:clamp(speed*.8),5,dt);
   if(paused&&!wasPaused){pauseOrientation=pose?{yaw:pose.yaw,pitch:pose.pitch,roll:pose.roll}:{yaw:Math.PI,pitch:.12,roll:0};sceneTime=Math.max(sceneTime,1.9);}
   if(!paused&&wasPaused&&pose)showcase=pose.yaw-Math.PI-s.rotation;
   wasPaused=paused;
   if(!paused){sceneTime+=dt;if(view==='auto')showcase=advanceShowcase(showcase,dt,Math.max(s.arc,scrollEnergy));}
   const entrance=paused?1:cinematicEase(clamp(sceneTime/1.9));
   sx=damp(sx,paused?0:px,3,dt);sy=damp(sy,paused?0:py,3,dt);
   const float=paused?(buoyancy.reset(),buoyancy.state):buoyancy.update(dt);
   const target={x:s.x*halfW+sx*.075+float.x,
    y:s.y*halfH+(paused?0:Math.sin(sceneTime*1.1)*.042+Math.sin(sceneTime*.47)*.014)+float.y-(1-entrance)*.45,
    size:halfH*2*(mobile?Math.min(.40,360/innerHeight):.68)/H*(1+(paused?0:s.push))*(.82+.18*entrance),
    yaw:Math.PI+(paused?0:s.rotation+showcase)+sx*.14-(1-entrance)*1.05,
    pitch:(paused?.14:s.pitch)+sy*.055+(1-entrance)*.25,
    roll:paused?0:s.tilt+Math.sin(sceneTime*.75)*.018+float.roll+(1-entrance)*-.22};
   if(paused&&pauseOrientation&&view==='auto')Object.assign(target,pauseOrientation);
   if(view!=='auto'){
    if(inspectionYaw===null){const face=view==='front'?Math.PI:0;inspectionYaw=face+Math.round(((pose?.yaw??target.yaw)-face)/(2*Math.PI))*2*Math.PI;}
    target.yaw=inspectionYaw;target.pitch=.12;target.roll=0;
   }
   if(!pose||paused)pose={...target};
   else for(const k of Object.keys(target))pose[k]=damp(pose[k],target[k],k==='yaw'?9:7,dt);
   group.scale.setScalar(pose.size);group.position.set(pose.x,pose.y,0);
   group.rotation.set(pose.pitch,pose.yaw,pose.roll,'YXZ');
   if(lastI!==s.i){panel.map=textures[s.i];blend.map.value=textures[s.i+1];lastI=s.i;}
   blend.amount.value=cinematicEase(clamp((s.t-.34)/.32));
   // A moving key light reveals the lacquer, droplets and rolled metal edges.
   key.position.x=-3+(paused?0:Math.sin(sceneTime*.32)*1.2+s.arc*2);
   edge.position.x=5-(paused?0:s.arc*2.5);
   rimTint.copy(rimColors[s.i]).lerp(rimColors[s.i+1],s.t);edge.color.copy(rimTint);
   edge.intensity=2.5+(paused?0:s.arc*.65);
   shadow.position.x=pose.x;shadow.position.y=pose.y-pose.size*1.68;
   shadow.scale.set(pose.size*(1+s.push*.7),pose.size*(1-s.push),1);
   shadow.material.uniforms.alpha.value=(s.i===1&&s.t<.5?.07:.13)*(1-s.arc*.35);
   bubbleSystem.update(sceneTime,pose,Math.max(s.arc,scrollEnergy*.4),rimTint);
   renderer.render(scene,camera);
  },
  dispose(){if(dead)return;dead=true;canvas.removeEventListener('webglcontextlost',lost);const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());environment.dispose();renderer.dispose();}
 };
}
