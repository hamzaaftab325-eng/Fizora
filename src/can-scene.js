import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {flavors} from './assets';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const damp=(v,t,r,dt)=>lerp(v,t,1-Math.exp(-r*Math.max(0,dt)));
const HEIGHT=3.28,RADIUS=.66;

function shadowTexture(){
 const c=document.createElement('canvas');c.width=512;c.height=128;
 const x=c.getContext('2d'),g=x.createRadialGradient(256,64,10,256,64,240);
 g.addColorStop(0,'rgba(4,24,16,.38)');g.addColorStop(.42,'rgba(4,24,16,.16)');g.addColorStop(1,'rgba(4,24,16,0)');
 x.fillStyle=g;x.fillRect(0,0,c.width,c.height);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

function addMetal(group){
 const metal=new THREE.MeshPhysicalMaterial({color:0xd8dddc,metalness:1,roughness:.24,clearcoat:.12,clearcoatRoughness:.18,envMapIntensity:1.05});
 const dark=new THREE.MeshStandardMaterial({color:0x414846,metalness:.9,roughness:.38});
 const lid=new THREE.Mesh(new THREE.CylinderGeometry(.635,.635,.045,96),metal);lid.position.y=HEIGHT/2+.006;group.add(lid);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(.63,.655,.055,96),metal);base.position.y=-HEIGHT/2+.012;group.add(base);
 const ring=(r,t,y,m=metal)=>{const o=new THREE.Mesh(new THREE.TorusGeometry(r,t,12,96),m);o.rotation.x=Math.PI/2;o.position.y=y;group.add(o);return o;};
 ring(.665,.025,HEIGHT/2+.025);ring(.625,.010,HEIGHT/2+.032,dark);ring(.655,.024,-HEIGHT/2+.015);ring(.615,.009,-HEIGHT/2+.006,dark);
 const shape=new THREE.Shape();shape.absellipse(0,0,.115,.21,0,Math.PI*2,false,0);const hole=new THREE.Path();hole.absellipse(0,.035,.06,.108,0,Math.PI*2,true,0);shape.holes.push(hole);
 const tab=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.014,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:2,curveSegments:32}),metal);tab.rotation.x=-Math.PI/2;tab.position.set(0,HEIGHT/2+.055,.03);tab.scale.set(.92,.92,.92);group.add(tab);
 const rivet=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.015,32),metal);rivet.position.set(0,HEIGHT/2+.066,-.08);group.add(rivet);
 return [metal,dark];
}

function addCondensation(group){
 const material=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.08,transmission:.16,transparent:true,opacity:.18,clearcoat:1,clearcoatRoughness:.04,depthWrite:false,ior:1.33});
 const geometry=new THREE.SphereGeometry(1,8,6),count=72,drops=new THREE.InstancedMesh(geometry,material,count),dummy=new THREE.Object3D();
 let seed=321;const rnd=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
 for(let i=0;i<count;i++){
  const theta=rnd()*Math.PI*2,y=(rnd()-.5)*2.55,r=.005+Math.pow(rnd(),3.2)*.021;
  dummy.position.set(Math.sin(theta)*(RADIUS+.008),y,Math.cos(theta)*(RADIUS+.008));dummy.scale.set(r,r*(.9+rnd()*.7),r*.48);dummy.rotation.y=theta;dummy.updateMatrix();drops.setMatrixAt(i,dummy.matrix);
 }
 drops.instanceMatrix.needsUpdate=true;drops.renderOrder=3;group.add(drops);return {geometry,material};
}

export async function createCanScene(canvas){
 if(!canvas)throw new Error('Can canvas not found');
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance',premultipliedAlpha:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<760?1.25:1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(29,innerWidth/innerHeight,.1,40);camera.position.set(0,0,8);
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.04);scene.environment=env.texture;room.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xffffff,0x18261f,1.05));
 const key=new THREE.DirectionalLight(0xfff8ec,2.25);key.position.set(-4.5,5.5,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.bias=-.00025;key.shadow.normalBias=.018;scene.add(key);
 const rim=new THREE.DirectionalLight(0xeaf5ff,1.65);rim.position.set(5.2,2.8,-4.6);scene.add(rim);
 const fill=new THREE.DirectionalLight(0xffffff,.42);fill.position.set(1,-1,5.5);scene.add(fill);
 const loader=new THREE.TextureLoader();
 const textures=await Promise.all(flavors.map(async f=>{const t=await loader.loadAsync(f.label);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;return t;}));
 const group=new THREE.Group();scene.add(group);
 const bodyMaterial=new THREE.MeshStandardMaterial({map:textures[0],color:0xffffff,metalness:.08,roughness:.36,envMapIntensity:.42});
 const bodyGeometry=new THREE.CylinderGeometry(RADIUS,RADIUS*.985,HEIGHT,128,1,true,Math.PI,Math.PI*2),body=new THREE.Mesh(bodyGeometry,bodyMaterial);body.castShadow=body.receiveShadow=true;group.add(body);
 const glossMaterial=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.14,clearcoat:1,clearcoatRoughness:.12,transparent:true,opacity:.075,depthWrite:false,envMapIntensity:.68});
 const gloss=new THREE.Mesh(new THREE.CylinderGeometry(RADIUS+.006,RADIUS*.985+.006,HEIGHT*.992,128,1,true,Math.PI,Math.PI*2),glossMaterial);gloss.renderOrder=2;group.add(gloss);
 const metalMaterials=addMetal(group),condensation=addCondensation(group);
 const sTex=shadowTexture(),sMat=new THREE.MeshBasicMaterial({map:sTex,transparent:true,depthWrite:false,opacity:.64,toneMapped:false}),shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.9,.72),sMat);shadow.position.z=-.76;scene.add(shadow);
 let dead=false,currentFlavor=-1,pose=null,px=0,py=0,sx=0,sy=0;
 const resize=()=>{renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<760?1.25:1.7));renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();};resize();
 const setFlavor=i=>{const next=clamp(i,0,textures.length-1)|0;if(next===currentFlavor)return;currentFlavor=next;bodyMaterial.map=textures[next];bodyMaterial.needsUpdate=true;};setFlavor(0);
 return {
  resize,pointer(x,y){px=x;py=y;},impulse(){},
  render(state,time,dt,paused){
   if(dead||state.visibility<.005)return;dt=clamp(dt,0,.05);const mobile=innerWidth<760,halfH=Math.tan(THREE.MathUtils.degToRad(14.5))*8,halfW=halfH*camera.aspect;
   sx=damp(sx,paused?0:px,3.4,dt);sy=damp(sy,paused?0:py,3.4,dt);setFlavor(state.t<.5?state.i:Math.min(state.i+1,2));
   const target={x:state.x*halfW+sx*.05,y:-state.arc*halfH*(mobile?.08:.18)+(paused?0:Math.sin(time*.8)*.022),size:halfH*2*(mobile?.39:.62)/HEIGHT*(1+state.arc*(mobile?.035:.075)),yaw:state.rotation+sx*.045,pitch:.055+state.pitch*.16+sy*.025,roll:state.tilt*.72};
   if(!pose||paused)pose={...target};else for(const k of Object.keys(target))pose[k]=damp(pose[k],target[k],k==='yaw'?10:7.5,dt);
   group.position.set(pose.x,pose.y,0);group.scale.setScalar(pose.size);group.rotation.set(pose.pitch,pose.yaw,pose.roll,'YXZ');
   shadow.position.x=pose.x+.03;shadow.position.y=pose.y-pose.size*(HEIGHT*.53);shadow.scale.set(pose.size*(1+state.arc*.34),pose.size*(1-state.arc*.08),1);sMat.opacity=.62-state.arc*.15;key.position.x=-4.5+state.arc*.7;rim.intensity=1.5+state.arc*.22;
   renderer.render(scene,camera);
  },
  dispose(){if(dead)return;dead=true;bodyGeometry.dispose();bodyMaterial.dispose();gloss.geometry.dispose();glossMaterial.dispose();condensation.geometry.dispose();condensation.material.dispose();metalMaterials.forEach(m=>m.dispose());shadow.geometry.dispose();sMat.dispose();sTex.dispose();textures.forEach(t=>t.dispose());env.dispose();renderer.dispose();}
 };
}
