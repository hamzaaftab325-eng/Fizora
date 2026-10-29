import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {preparePackaging} from './can-labels';
import {createBottomGeometry,createCanBodyGeometry,createLidGeometry} from './can-geometry';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const damp=(v,t,r,dt)=>lerp(v,t,1-Math.exp(-r*Math.max(0,dt)));
const MODEL_HEIGHT=3.02;
const PLACEHOLDERS=[
 {base:'#eef55c',ink:'#143c27',flavor:'CITRUS SPARK'},
 {base:'#76269d',ink:'#fff5df',flavor:'BERRY BURST'},
 {base:'#ffae6e',ink:'#642035',flavor:'TROPICAL RUSH'}
];

function makeCanvasTexture(renderer,canvas){
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=THREE.RepeatWrapping;
 texture.wrapT=THREE.ClampToEdgeWrapping;
 texture.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());
 texture.minFilter=THREE.LinearMipmapLinearFilter;
 texture.magFilter=THREE.LinearFilter;
 texture.needsUpdate=true;
 return texture;
}

function makePlaceholderTexture(renderer,index){
 const spec=PLACEHOLDERS[index];
 const canvas=document.createElement('canvas');
 canvas.width=1024;canvas.height=2048;
 const c=canvas.getContext('2d');
 const g=c.createLinearGradient(0,0,canvas.width,canvas.height);
 g.addColorStop(0,spec.base);g.addColorStop(.55,spec.base);g.addColorStop(1,spec.ink);
 c.fillStyle=g;c.fillRect(0,0,canvas.width,canvas.height);
 c.fillStyle=spec.ink;c.globalAlpha=.18;
 c.beginPath();c.moveTo(0,180);c.bezierCurveTo(260,80,620,320,1024,120);c.lineTo(1024,330);c.bezierCurveTo(670,500,260,260,0,410);c.closePath();c.fill();
 c.globalAlpha=1;c.textAlign='center';c.fillStyle=spec.ink;
 c.font='italic 900 190px "Barlow Condensed", Impact, sans-serif';c.fillText('FIZORA',512,900,820);
 c.font='800 58px "Barlow Condensed", Impact, sans-serif';c.fillText(spec.flavor,512,995,720);
 c.font='700 28px "DM Sans", sans-serif';c.fillText('SPARKLING DRINK · 330 mL',512,1080,720);
 return makeCanvasTexture(renderer,canvas);
}

function makeShadowTexture(){
 const c=document.createElement('canvas');c.width=1024;c.height=256;
 const x=c.getContext('2d'),g=x.createRadialGradient(512,128,20,512,128,460);
 g.addColorStop(0,'rgba(4,20,16,.30)');g.addColorStop(.42,'rgba(4,20,16,.12)');g.addColorStop(1,'rgba(4,20,16,0)');
 x.fillStyle=g;x.fillRect(0,0,c.width,c.height);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

function tabGeometry(){
 const s=new THREE.Shape();s.absellipse(0,0,.122,.218,0,Math.PI*2,false,0);
 const h=new THREE.Path();h.absellipse(0,.032,.062,.106,0,Math.PI*2,true,0);s.holes.push(h);
 const g=new THREE.ExtrudeGeometry(s,{depth:.014,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:2,curveSegments:32});g.center();return g;
}

function addMetal(group){
 const metal=new THREE.MeshPhysicalMaterial({color:0xe6ebe9,metalness:1,roughness:.20,clearcoat:.06,clearcoatRoughness:.20,envMapIntensity:.96});
 const groove=new THREE.MeshStandardMaterial({color:0xaab2af,metalness:.96,roughness:.32,envMapIntensity:.82});
 const geometries=[];
 const add=(g,m=metal)=>{const o=new THREE.Mesh(g,m);o.castShadow=o.receiveShadow=true;group.add(o);geometries.push(g);return o;};
 add(createLidGeometry(192));
 add(createBottomGeometry(192));
 const torus=(r,t,y,m=metal)=>{const o=add(new THREE.TorusGeometry(r,t,16,128),m);o.rotation.x=Math.PI/2;o.position.y=y;return o;};
 torus(.516,.015,1.438);torus(.474,.0055,1.419,groove);torus(.566,.018,-1.440);torus(.510,.007,-1.454,groove);
 const tab=add(tabGeometry());tab.rotation.x=-Math.PI/2;tab.position.set(.01,1.430,.018);tab.scale.setScalar(.93);
 const rivet=add(new THREE.CylinderGeometry(.032,.032,.014,32));rivet.position.set(0,1.424,-.070);
 return{materials:[metal,groove],geometries};
}

export function createCanScene(canvas){
 if(!canvas)throw new Error('Can canvas not found');
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance',premultipliedAlpha:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<760?1.25:1.7));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.NoToneMapping;
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;

 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(28,innerWidth/innerHeight,.1,40);
 camera.position.set(0,0,8.2);
 const pmrem=new THREE.PMREMGenerator(renderer);
 const room=new RoomEnvironment();
 const env=pmrem.fromScene(room,.03);
 scene.environment=env.texture;
 room.dispose();pmrem.dispose();

 scene.add(new THREE.HemisphereLight(0xffffff,0x17231f,.58));
 const key=new THREE.DirectionalLight(0xfffaf3,1.32);key.position.set(-4.2,5.1,6.2);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.bias=-.00024;key.shadow.normalBias=.02;scene.add(key);
 const rim=new THREE.DirectionalLight(0xe7f4ff,.68);rim.position.set(5.2,2.2,-4.4);scene.add(rim);
 const fill=new THREE.DirectionalLight(0xffffff,.20);fill.position.set(.7,-.4,5.2);scene.add(fill);
 const topFill=new THREE.DirectionalLight(0xffffff,.42);topFill.position.set(0,6.4,4.4);scene.add(topFill);

 const placeholderTextures=PLACEHOLDERS.map((_,i)=>makePlaceholderTexture(renderer,i));
 let packagingTextures=[];
 let textures=placeholderTextures;
 let dead=false,current=-1,requestedFlavor=0,pose=null,px=0,py=0,sx=0,sy=0;

 const group=new THREE.Group();scene.add(group);
 const bodyGeometry=createCanBodyGeometry(192);
 const bodyMaterial=new THREE.MeshPhysicalMaterial({map:textures[0],color:0xffffff,metalness:.035,roughness:.42,clearcoat:.10,clearcoatRoughness:.28,envMapIntensity:.24});
 const body=new THREE.Mesh(bodyGeometry,bodyMaterial);body.castShadow=true;body.receiveShadow=true;group.add(body);
 const metal=addMetal(group);

 const sTex=makeShadowTexture();
 const sMat=new THREE.MeshBasicMaterial({map:sTex,transparent:true,depthWrite:false,opacity:.58,toneMapped:false});
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.85,.82),sMat);shadow.position.z=-.78;scene.add(shadow);

 const resize=()=>{
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<760?1.25:1.7));
  renderer.setSize(innerWidth,innerHeight,false);
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
 };
 resize();

 const setFlavor=i=>{
  requestedFlavor=clamp(i,0,2)|0;
  if(requestedFlavor===current&&bodyMaterial.map===textures[requestedFlavor])return;
  current=requestedFlavor;
  bodyMaterial.map=textures[current]||placeholderTextures[current];
  bodyMaterial.needsUpdate=true;
 };
 setFlavor(0);

 // Build the full front/back packaging after the renderer is already live.
 // The hero never waits on label generation, so the can cannot disappear during page reveal.
 preparePackaging().then(({canvases})=>{
  if(dead)return;
  packagingTextures=canvases.map(c=>makeCanvasTexture(renderer,c));
  textures=packagingTextures;
  current=-1;
  setFlavor(requestedFlavor);
  window.dispatchEvent(new Event('fizora:packaging-ready'));
 }).catch(error=>console.warn('FIZORA packaging texture fallback active',error));

 return{
  resize,
  pointer(x,y){px=x;py=y;},
  impulse(){},
  render(state,time,dt,paused){
   if(dead||state.visibility<.005)return;
   dt=clamp(dt,0,.05);
   const mobile=innerWidth<760;
   const halfH=Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))*camera.position.z;
   const halfW=halfH*camera.aspect;
   sx=damp(sx,paused?0:px,3.2,dt);sy=damp(sy,paused?0:py,3.2,dt);
   setFlavor(state.t<.5?state.i:Math.min(state.i+1,2));
   const target={
    x:state.x*halfW+sx*.035,
    y:-state.arc*halfH*(mobile?.07:.15)+(paused?0:Math.sin(time*.75)*.018),
    size:halfH*2*(mobile?.42:.64)/MODEL_HEIGHT*(1+state.arc*(mobile?.025:.05)),
    yaw:Math.PI+state.rotation+sx*.03,
    pitch:.035+state.pitch*.12+sy*.018,
    roll:state.tilt*.62
   };
   if(!pose||paused)pose={...target};
   else for(const k of Object.keys(target))pose[k]=damp(pose[k],target[k],k==='yaw'?9:7.2,dt);
   group.position.set(pose.x,pose.y,0);group.scale.setScalar(pose.size);group.rotation.set(pose.pitch,pose.yaw,pose.roll,'YXZ');
   shadow.position.x=pose.x+.02;shadow.position.y=pose.y-pose.size*1.63;shadow.scale.set(pose.size*(1+state.arc*.24),pose.size*(.96-state.arc*.04),1);sMat.opacity=.58-state.arc*.10;
   key.position.x=-4.2+state.arc*.4;rim.intensity=.68+state.arc*.08;topFill.intensity=.42+state.arc*.05;
   renderer.render(scene,camera);
  },
  dispose(){
   if(dead)return;dead=true;
   bodyGeometry.dispose();bodyMaterial.dispose();
   metal.geometries.forEach(g=>g.dispose());metal.materials.forEach(m=>m.dispose());
   shadow.geometry.dispose();sMat.dispose();sTex.dispose();
   [...new Set([...placeholderTextures,...packagingTextures])].forEach(t=>t.dispose());
   env.dispose();renderer.dispose();
  }
 };
}
