import * as THREE from 'three';
import {preparePackaging} from './can-labels';
export {preparePackaging} from './can-labels';
import {createStudioEnvironment} from './studio-environment';
import {createCanBodyGeometry,createLidGeometry} from './can-geometry';
import {clamp,damp} from './motion';

const H=3.04;

function createShadowTexture(){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=192;
 const c=canvas.getContext('2d');const g=c.createRadialGradient(256,96,10,256,96,220);
 g.addColorStop(0,'rgba(6,22,16,.32)');g.addColorStop(.48,'rgba(6,22,16,.14)');g.addColorStop(1,'rgba(6,22,16,0)');
 c.fillStyle=g;c.fillRect(0,0,canvas.width,canvas.height);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

function addCan(scene,textures){
 const group=new THREE.Group();scene.add(group);
 const bodyMaterial=new THREE.MeshPhysicalMaterial({
  map:textures[0],metalness:.035,roughness:.30,clearcoat:.46,clearcoatRoughness:.20,
  envMapIntensity:.82,specularIntensity:.68,ior:1.46
 });
 const body=new THREE.Mesh(createCanBodyGeometry(),bodyMaterial);body.castShadow=body.receiveShadow=true;group.add(body);

 const rimMaterial=new THREE.MeshPhysicalMaterial({color:0xc8cfcd,metalness:1,roughness:.22,envMapIntensity:1.45,clearcoat:.05});
 const brushedMaterial=new THREE.MeshPhysicalMaterial({color:0xb8c0bd,metalness:1,roughness:.29,envMapIntensity:1.25,anisotropy:.6,anisotropyRotation:Math.PI/2});
 const darkMaterial=new THREE.MeshStandardMaterial({color:0x303936,metalness:.86,roughness:.38,envMapIntensity:.8});

 const lid=new THREE.Mesh(createLidGeometry(),brushedMaterial);lid.castShadow=lid.receiveShadow=true;group.add(lid);
 const ring=(radius,tube,y,material=rimMaterial)=>{const mesh=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,14,96),material);mesh.rotation.x=Math.PI/2;mesh.position.y=y;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;};
 ring(.579,.024,1.444);ring(.547,.009,1.454,brushedMaterial);ring(.551,.024,-1.431);ring(.520,.010,-1.458,brushedMaterial);
 const base=new THREE.Mesh(new THREE.LatheGeometry([[0,-1.375],[.22,-1.375],[.34,-1.389],[.42,-1.418],[.50,-1.459]].map(v=>new THREE.Vector2(...v)),96),rimMaterial);base.castShadow=base.receiveShadow=true;group.add(base);

 const cavity=new THREE.Mesh(new THREE.CircleGeometry(.13,48),new THREE.MeshStandardMaterial({color:0x111714,metalness:.22,roughness:.55}));cavity.rotation.x=-Math.PI/2;cavity.scale.y=1.32;cavity.position.set(0,1.448,-.23);group.add(cavity);
 const tabShape=new THREE.Shape();tabShape.absellipse(0,0,.105,.205,0,Math.PI*2,false,0);const hole=new THREE.Path();hole.absellipse(0,.035,.058,.108,0,Math.PI*2,true,0);tabShape.holes.push(hole);
 const tab=new THREE.Mesh(new THREE.ExtrudeGeometry(tabShape,{depth:.012,bevelEnabled:true,bevelSize:.005,bevelThickness:.004,bevelSegments:3,curveSegments:40}),brushedMaterial);tab.rotation.x=-Math.PI/2;tab.position.set(0,1.477,.035);tab.castShadow=true;group.add(tab);
 const rivet=new THREE.Mesh(new THREE.SphereGeometry(.035,20,10),rimMaterial);rivet.scale.set(1,.28,1);rivet.position.set(0,1.488,-.085);group.add(rivet);

 return {group,bodyMaterial};
}

export async function createCanScene(canvas,assets){
 const artwork=assets??await preparePackaging();
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance',premultipliedAlpha:true});
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.90;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<760?1.45:2));

 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(28.5,innerWidth/innerHeight,.1,40);camera.position.set(0,0,8);
 const environment=createStudioEnvironment(renderer);scene.environment=environment.texture;
 scene.add(new THREE.HemisphereLight(0xf8fbf7,0x183027,.10));
 const key=new THREE.DirectionalLight(0xfff8ee,1.35);key.position.set(-3.8,5.1,5.4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.bias=-.0002;key.shadow.normalBias=.016;scene.add(key);
 const rim=new THREE.DirectionalLight(0xf4f8ff,.92);rim.position.set(4.8,2.0,-3.0);scene.add(rim);
 const fill=new THREE.DirectionalLight(0xffffff,.12);fill.position.set(.5,.1,4.8);scene.add(fill);

 const textures=artwork.canvases.map(label=>{const t=new THREE.CanvasTexture(label);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;t.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;return t;});
 const {group,bodyMaterial}=addCan(scene,textures);

 const shadowTexture=createShadowTexture();
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.0,.82),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,toneMapped:false}));shadow.position.z=-.82;scene.add(shadow);

 let dead=false,contextLost=false,px=0,py=0,sx=0,sy=0,pose=null,currentFlavor=-1,lastP=null,scrollEnergy=0;
 const resize=()=>{renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();};resize();
 const lost=e=>{e.preventDefault();contextLost=true;canvas.style.opacity='0';canvas.parentElement?.classList.remove('is-ready');};canvas.addEventListener('webglcontextlost',lost);

 return {
  catalogShots:[],resize,setView(){},
  pointer(x,y){px=x;py=y;},
  impulse(){},
  render(s,time,dt,paused){
   if(dead||contextLost||s.visibility<.005)return;
   dt=clamp(dt,0,.05);const mobile=innerWidth<760;
   const halfH=Math.tan(THREE.MathUtils.degToRad(14.25))*8,halfW=halfH*camera.aspect;
   const speed=lastP===null?0:Math.abs(s.p-lastP)/Math.max(dt,.001);lastP=s.p;scrollEnergy=damp(scrollEnergy,paused?0:clamp(speed*.62),5.2,dt);
   sx=damp(sx,paused?0:px,4.5,dt);sy=damp(sy,paused?0:py,4.5,dt);
   const flavor=s.t<.5?s.i:s.i+1;if(flavor!==currentFlavor){currentFlavor=flavor;bodyMaterial.map=textures[flavor];bodyMaterial.needsUpdate=true;}
   const target={
    x:s.x*halfW+sx*(mobile?.025:.055),
    y:s.y*halfH+(paused?0:Math.sin(time*.72)*.018),
    size:halfH*2*(mobile?Math.min(.40,360/innerHeight):.68)/H*(1+s.push*.55),
    yaw:Math.PI+s.rotation+sx*(mobile?.025:.055),
    pitch:s.pitch+sy*(mobile?.012:.024),
    roll:s.tilt+(paused?0:Math.sin(time*.42)*.005)
   };
   if(!pose||paused)pose={...target};else for(const k of Object.keys(target))pose[k]=damp(pose[k],target[k],k==='yaw'?10:8,dt);
   group.position.set(pose.x,pose.y,0);group.scale.setScalar(pose.size);group.rotation.set(pose.pitch,pose.yaw,pose.roll,'YXZ');
   shadow.position.x=pose.x+.03;shadow.position.y=pose.y-pose.size*1.70;shadow.scale.set(pose.size*(1+s.arc*.16),pose.size*(1-s.arc*.10),1);shadow.material.opacity=.52-s.arc*.10;
   key.position.x=-3.8+s.arc*.42;rim.position.x=4.8-s.arc*.55;rim.intensity=.92+s.arc*.08;
   renderer.render(scene,camera);
  },
  dispose(){
   if(dead)return;dead=true;canvas.removeEventListener('webglcontextlost',lost);
   const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
   geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());shadowTexture.dispose();environment.dispose();renderer.dispose();
  }
 };
}
