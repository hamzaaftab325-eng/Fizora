import * as THREE from 'three';
import {createIceGeometry,createFractureSheetGeometry,makeIceRng} from './ice-geometry.js';
import {createIceMaterialSet,createRefractionScene} from './ice-materials.js';

export {createIceGeometry} from './ice-geometry.js';
export {createRefractionScene} from './ice-materials.js';

export function createIceScene(scene,glass){
 const root=new THREE.Group();scene.add(root);
 const materials=createIceMaterialSet(glass);

 const frostPlaneGeometry=new THREE.PlaneGeometry(.78,.90,1,1);
 const cloudParticleGeometry=new THREE.IcosahedronGeometry(1,1);
 const beadGeometry=new THREE.SphereGeometry(1,14,9);
 const microBeadGeometry=new THREE.SphereGeometry(1,8,6);
 const geometries=[frostPlaneGeometry,cloudParticleGeometry,beadGeometry,microBeadGeometry];
 const fractureGeometries=[];

 const layout=[
  [-1.05,.84,-.28,.56],
  [1.04,1.00,-.46,.61],
  [-1.06,-.92,.03,.60],
  [1.03,-.78,.20,.65]
 ];
 const cubes=[];

 layout.forEach(([x,y,z,size],i)=>{
  const random=makeIceRng(41+i*97);
  const geometry=createIceGeometry(i+1,.195+i*.007);geometries.push(geometry);
  const carrier=new THREE.Group();

  const shell=new THREE.Mesh(geometry,materials.outerMaterials[i]);
  shell.renderOrder=2;carrier.add(shell);

  const wetFilm=new THREE.Mesh(geometry,materials.wetFilmMaterial);
  wetFilm.scale.setScalar(1.00125);wetFilm.renderOrder=10;carrier.add(wetFilm);

  const center=new THREE.Vector3((random()-.5)*.055,(random()-.5)*.055,(random()-.5)*.055);
  const axis=new THREE.Vector3((random()-.5)*.15,1,(random()-.5)*.15).normalize();

  const frostCount=7;
  for(let p=0;p<frostCount;p++){
   const frost=new THREE.Mesh(frostPlaneGeometry,materials.frostMaterials[i]);
   frost.position.copy(center).add(new THREE.Vector3((random()-.5)*.085,(random()-.5)*.10,(random()-.5)*.085));
   frost.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);
   frost.scale.set(.72+random()*.30,.80+random()*.34,1);
   frost.renderOrder=1;carrier.add(frost);
  }

  const cloudCount=105+Math.floor(random()*30);
  const cloud=new THREE.InstancedMesh(cloudParticleGeometry,materials.cloudParticleMaterial,cloudCount);
  const cloudDummy=new THREE.Object3D();
  for(let c=0;c<cloudCount;c++){
   const along=(random()-.5)*.60;
   const spread=.018+Math.pow(random(),2.0)*.145;
   const radial=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize().multiplyScalar(spread);
   cloudDummy.position.copy(center).addScaledVector(axis,along).add(radial);
   const r=.009+Math.pow(random(),1.8)*.028;
   cloudDummy.scale.set(r*(.70+random()*.85),r*(1.0+random()*1.7),r*(.70+random()*.85));
   cloudDummy.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);cloudDummy.updateMatrix();cloud.setMatrixAt(c,cloudDummy.matrix);
  }
  cloud.instanceMatrix.needsUpdate=true;cloud.renderOrder=1;carrier.add(cloud);

  const fractureCount=4;
  for(let p=0;p<fractureCount;p++){
   const fractureGeometry=createFractureSheetGeometry(random,.12+random()*.105);fractureGeometries.push(fractureGeometry);
   const sheet=new THREE.Mesh(fractureGeometry,materials.fractureMaterials[i]);
   sheet.position.copy(center).add(new THREE.Vector3((random()-.5)*.28,(random()-.5)*.30,(random()-.5)*.28));
   sheet.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);
   sheet.scale.set(1,.15+random()*.34,1);sheet.renderOrder=3;carrier.add(sheet);
  }

  const microCount=300+Math.floor(random()*90);
  const micro=new THREE.InstancedMesh(microBeadGeometry,materials.microBubbleMaterial,microCount);
  const microDummy=new THREE.Object3D();
  for(let j=0;j<microCount;j++){
   const along=(random()-.5)*.68;
   const spread=.004+Math.pow(random(),2.7)*.125;
   const radial=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize().multiplyScalar(spread);
   microDummy.position.copy(center).addScaledVector(axis,along).add(radial);
   const r=.00085+Math.pow(random(),1.65)*.0049;
   microDummy.scale.set(r,r*(.58+random()*1.15),r);microDummy.updateMatrix();micro.setMatrixAt(j,microDummy.matrix);
  }
  micro.instanceMatrix.needsUpdate=true;micro.renderOrder=4;carrier.add(micro);

  const airCount=30+Math.floor(random()*14);
  const air=new THREE.InstancedMesh(beadGeometry,materials.airMaterial,airCount);
  const airDummy=new THREE.Object3D();
  for(let j=0;j<airCount;j++){
   const along=(random()-.5)*.56;
   const spread=.018+Math.pow(random(),1.7)*.17;
   const radial=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize().multiplyScalar(spread);
   airDummy.position.copy(center).addScaledVector(axis,along).add(radial);
   const r=.0030+Math.pow(random(),2.0)*.018;
   airDummy.scale.set(r,r*(.70+random()*1.30),r*(.80+random()*.45));
   airDummy.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);airDummy.updateMatrix();air.setMatrixAt(j,airDummy.matrix);
  }
  air.instanceMatrix.needsUpdate=true;air.renderOrder=4;carrier.add(air);

  const dropCount=32+Math.floor(random()*14);
  const drops=new THREE.InstancedMesh(beadGeometry,materials.meltDropMaterial,dropCount);
  const drop=new THREE.Object3D();
  for(let j=0;j<dropCount;j++){
   const face=Math.floor(random()*6),a=(random()-.5)*.68,b=(random()-.5)*.68,edge=.508;
   if(face<=1)drop.position.set(a,-edge,b);
   else if(face===2)drop.position.set(edge,-.43+random()*.64,b);
   else if(face===3)drop.position.set(-edge,-.43+random()*.64,b);
   else if(face===4)drop.position.set(a,-.43+random()*.64,edge);
   else drop.position.set(a,-.43+random()*.64,-edge);
   const r=.0052+Math.pow(random(),1.3)*.021;
   drop.scale.set(r,r*(1.05+random()*.88),r*.54);drop.updateMatrix();drops.setMatrixAt(j,drop.matrix);
  }
  drops.instanceMatrix.needsUpdate=true;drops.renderOrder=11;carrier.add(drops);

  root.add(carrier);
  cubes.push({carrier,x,y,z,size,phase:i*1.79,spin:.013+random()*.008,drift:.004+random()*.0035});
 });

 const sprayRandom=makeIceRng(911);
 const sprayGeometry=new THREE.SphereGeometry(1,10,7);geometries.push(sprayGeometry);
 const spray=new THREE.InstancedMesh(sprayGeometry,materials.meltDropMaterial,18);
 spray.renderOrder=3;root.add(spray);
 const spraySeeds=Array.from({length:18},()=>({
  side:sprayRandom()>.5?1:-1,
  x:.88+sprayRandom()*.50,
  y:(sprayRandom()-.5)*3.02,
  z:sprayRandom()*.58-.23,
  r:.0034+Math.pow(sprayRandom(),1.9)*.013,
  phase:sprayRandom()*Math.PI*2,
  stretch:1+sprayRandom()*.24
 }));
 const sprayDummy=new THREE.Object3D();
 glass.exclude(root);
 let impulseAt=-100;

 return {
  root,
  impulse(time){impulseAt=time;},
  update(time,pose,energy=0){
   root.position.set(pose.x,pose.y,0);root.scale.setScalar(pose.size);
   const age=Math.max(0,time-impulseAt);
   const kick=Math.sin(age*6.5)*Math.exp(-age*5.0)*.032;

   spraySeeds.forEach((s,i)=>{
    sprayDummy.position.set(s.side*(s.x+kick*.18),s.y+Math.sin(time*.22+s.phase)*.008,s.z);
    sprayDummy.scale.set(s.r,s.r*s.stretch,s.r*.76);sprayDummy.updateMatrix();spray.setMatrixAt(i,sprayDummy.matrix);
   });
   spray.instanceMatrix.needsUpdate=true;

   for(const cube of cubes){
    const drift=Math.sin(time*.20+cube.phase)*cube.drift;
    cube.carrier.position.set(
     cube.x+Math.sign(cube.x)*(kick+energy*.009),
     cube.y+drift,
     cube.z+Math.cos(time*.14+cube.phase)*.008
    );
    cube.carrier.scale.setScalar(cube.size);
    cube.carrier.rotation.set(
     .22+Math.sin(time*.052+cube.phase)*.022,
     cube.phase+time*cube.spin,
     .14+Math.cos(time*.078+cube.phase)*.024
    );
   }
  },
  dispose(){
   geometries.forEach(g=>g.dispose());fractureGeometries.forEach(g=>g.dispose());materials.dispose();
  }
 };
}
