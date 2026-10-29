import './hero-3d.css';
import * as THREE from 'three';
import {preparePackaging} from './can-labels.js';
import {createCanBodyGeometry,createLidGeometry} from './can-geometry.js';
import {createStudioEnvironment} from './studio-environment.js';
import {scrollState,lerp} from './motion.js';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const damp=(v,t,r,dt)=>lerp(v,t,1-Math.exp(-r*Math.max(0,dt)));

function waitForStage(){
 return new Promise(resolve=>{
  const found=document.querySelector('.can-stage');
  if(found)return resolve(found);
  const observer=new MutationObserver(()=>{
   const stage=document.querySelector('.can-stage');
   if(stage){observer.disconnect();resolve(stage);}
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
 });
}

function shadowTexture(){
 const c=document.createElement('canvas');c.width=256;c.height=64;
 const x=c.getContext('2d'),g=x.createRadialGradient(128,32,3,128,32,118);
 g.addColorStop(0,'rgba(5,25,16,.42)');g.addColorStop(.38,'rgba(5,25,16,.18)');g.addColorStop(1,'rgba(5,25,16,0)');
 x.fillStyle=g;x.fillRect(0,0,c.width,c.height);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

function addMetalDetails(group){
 const metal=new THREE.MeshPhysicalMaterial({color:0xd8dddc,metalness:1,roughness:.19,envMapIntensity:2.15,anisotropy:.65,anisotropyRotation:Math.PI/2});
 const dark=new THREE.MeshStandardMaterial({color:0x38413f,metalness:.92,roughness:.34,envMapIntensity:1.1});
 const lid=new THREE.Mesh(createLidGeometry(112),metal);group.add(lid);
 const ring=(radius,tube,y,mat=metal)=>{const m=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,10,96),mat);m.rotation.x=Math.PI/2;m.position.y=y;group.add(m);return m;};
 ring(.579,.025,1.444);ring(.548,.010,1.454);ring(.49,.004,1.455,dark);ring(.552,.025,-1.430);ring(.521,.011,-1.458);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(.50,.54,.055,96,1,true),metal);base.position.y=-1.43;group.add(base);
 const cavity=new THREE.Mesh(new THREE.CircleGeometry(.132,48),new THREE.MeshStandardMaterial({color:0x18201e,metalness:.35,roughness:.48}));
 cavity.rotation.x=-Math.PI/2;cavity.scale.y=1.34;cavity.position.set(0,1.448,-.235);group.add(cavity);
 const tabShape=new THREE.Shape();tabShape.absellipse(0,0,.105,.205,0,Math.PI*2,false,0);const hole=new THREE.Path();hole.absellipse(0,.035,.055,.108,0,Math.PI*2,true,0);tabShape.holes.push(hole);
 const tab=new THREE.Mesh(new THREE.ExtrudeGeometry(tabShape,{depth:.012,bevelEnabled:true,bevelSize:.005,bevelThickness:.004,bevelSegments:2,curveSegments:32}),metal);
 tab.rotation.x=-Math.PI/2;tab.position.set(0,1.476,.035);group.add(tab);
 return [metal,dark];
}

function addCondensation(group){
 const mat=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.03,metalness:0,transparent:true,opacity:.34,clearcoat:1,clearcoatRoughness:.01,ior:1.33,depthWrite:false});
 const geo=new THREE.SphereGeometry(1,8,6),count=104,drops=new THREE.InstancedMesh(geo,mat,count),dummy=new THREE.Object3D();
 let seed=83;const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
 for(let i=0;i<count;i++){
  const theta=random()*Math.PI*2,y=(random()-.5)*2.12,r=.004+Math.pow(random(),3.1)*.021;
  dummy.position.set(Math.sin(theta)*.663,y,Math.cos(theta)*.663);
  dummy.scale.set(r,r*(.9+random()*1.35),r*.48);dummy.rotation.y=theta;dummy.updateMatrix();drops.setMatrixAt(i,dummy.matrix);
 }
 drops.instanceMatrix.needsUpdate=true;drops.renderOrder=3;group.add(drops);return {geo,mat};
}

async function createHeroCan(canvas){
 const assets=await preparePackaging();
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance',premultipliedAlpha:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<760?1.05:1.35));
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(29,innerWidth/innerHeight,.1,30);camera.position.set(0,0,8);
 const environment=createStudioEnvironment(renderer);scene.environment=environment.texture;
 scene.add(new THREE.HemisphereLight(0xf8fbf8,0x203229,.36));
 const key=new THREE.DirectionalLight(0xfff6e8,2.5);key.position.set(-4.2,5.8,6);scene.add(key);
 const rim=new THREE.DirectionalLight(0xe7f6ff,2.85);rim.position.set(5.5,2.4,-3.8);scene.add(rim);
 const fill=new THREE.DirectionalLight(0xffffff,.46);fill.position.set(.6,-.2,5.7);scene.add(fill);

 const textures=assets.canvases.map(label=>{const t=new THREE.CanvasTexture(label);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;return t;});
 const flavorMap={value:textures[1]},flavorMix={value:0};
 const panel=new THREE.MeshPhysicalMaterial({map:textures[0],metalness:.055,roughness:.28,clearcoat:1,clearcoatRoughness:.085,envMapIntensity:1.35,ior:1.48,specularIntensity:.95});
 panel.onBeforeCompile=shader=>{
  shader.uniforms.flavorMap=flavorMap;shader.uniforms.flavorMix=flavorMix;
  shader.fragmentShader='uniform sampler2D flavorMap;\nuniform float flavorMix;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP\nvec4 a=texture2D(map,vMapUv);vec4 b=texture2D(flavorMap,vMapUv);diffuseColor*=mix(a,b,flavorMix);\n#endif`);
 };
 panel.customProgramCacheKey=()=> 'fizora-hero-3d-v1';
 const group=new THREE.Group();scene.add(group);
 const body=new THREE.Mesh(createCanBodyGeometry(128),panel);group.add(body);
 addMetalDetails(group);addCondensation(group);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.5,.62),new THREE.MeshBasicMaterial({map:shadowTexture(),transparent:true,depthWrite:false,opacity:.82}));shadow.position.z=-.72;scene.add(shadow);

 let lastI=-1,pose=null,px=0,py=0,sx=0,sy=0,dead=false;
 const resize=()=>{renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<760?1.05:1.35));renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();};resize();
 return {
  resize,pointer(x,y){px=x;py=y;},
  render(s,time,dt,paused){
   if(dead||s.visibility<.005)return;dt=clamp(dt,0,.05);const mobile=innerWidth<760;
   const halfH=Math.tan(THREE.MathUtils.degToRad(14.5))*8,halfW=halfH*camera.aspect;
   sx=damp(sx,paused?0:px,3.0,dt);sy=damp(sy,paused?0:py,3.0,dt);
   const idle=paused?0:Math.sin(time*.82)*.026;
   const target={
    x:s.x*halfW+sx*.055,
    y:-s.arc*halfH*(mobile?.12:.24)+idle+sy*.035,
    size:halfH*2*(mobile?.40:.64)/3.04*(1+s.arc*(mobile?.035:.075)),
    yaw:Math.PI+s.rotation+sx*.06,
    pitch:.07+s.arc*(mobile?.035:.065)+sy*.03,
    roll:s.tilt*.72+Math.sin(time*.52)*.009
   };
   if(!pose||paused)pose={...target};else for(const k of Object.keys(target))pose[k]=damp(pose[k],target[k],k==='yaw'?9.5:7.2,dt);
   group.position.set(pose.x,pose.y,0);group.scale.setScalar(pose.size);group.rotation.set(pose.pitch,pose.yaw,pose.roll,'YXZ');
   if(lastI!==s.i){panel.map=textures[s.i];flavorMap.value=textures[s.i+1];panel.needsUpdate=true;lastI=s.i;}
   const mix=clamp((s.t-.38)/.24);flavorMix.value=mix*mix*(3-2*mix);
   shadow.position.x=pose.x+.06;shadow.position.y=pose.y-pose.size*1.72;shadow.scale.set(pose.size*(1+s.arc*.35),pose.size*(1-s.arc*.08),1);shadow.material.opacity=.74-s.arc*.18;
   rim.intensity=2.65+s.arc*.34;renderer.render(scene,camera);
  },
  dispose(){dead=true;scene.traverse(o=>{o.geometry?.dispose?.();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{m.map?.dispose?.();m.dispose?.();});});textures.forEach(t=>t.dispose());environment.dispose();renderer.dispose();}
 };
}

async function boot(){
 const stage=await waitForStage();if(stage.querySelector('.hero-3d-canvas'))return;
 const canvas=document.createElement('canvas');canvas.className='hero-3d-canvas';canvas.setAttribute('aria-hidden','true');stage.prepend(canvas);
 let controller=null,frame=0,last=performance.now(),scroll=window.scrollY,elapsed=0,offsets=[],height=innerHeight,dead=false;
 const measure=()=>{height=innerHeight;const nodes=['citrus','berry','tropical','collection'].map(id=>document.getElementById(id));if(nodes.every(Boolean))offsets=nodes.map(n=>n.getBoundingClientRect().top+window.scrollY);controller?.resize();};
 try{controller=await createHeroCan(canvas);if(dead){controller.dispose();return;}measure();stage.classList.add('webgl-ready');}
 catch(error){console.warn('Fizora 3D can fallback active',error);canvas.remove();return;}
 const pointer=e=>{if(e.pointerType==='touch')return;controller?.pointer(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);};
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const animate=now=>{frame=requestAnimationFrame(animate);if(document.hidden||!offsets.length)return;const dt=Math.min((now-last)/1000,.05);last=now;const paused=reduced.matches||document.querySelector('.motion-toggle')?.getAttribute('aria-pressed')==='true';if(!paused)elapsed+=dt;scroll=paused?window.scrollY:lerp(scroll,window.scrollY,1-Math.exp(-dt*4.2));const state=scrollState(scroll,offsets,height,innerWidth<760);controller.render(state,elapsed,dt,paused);};
 addEventListener('resize',measure,{passive:true});addEventListener('pointermove',pointer,{passive:true});frame=requestAnimationFrame(animate);
 addEventListener('pagehide',()=>{dead=true;cancelAnimationFrame(frame);removeEventListener('resize',measure);removeEventListener('pointermove',pointer);controller?.dispose();},{once:true});
}

boot();
