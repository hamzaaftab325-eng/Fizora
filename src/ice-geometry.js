import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export function makeIceRng(seed=1){
 let state=Math.max(1,seed|0);
 return ()=>{state=state*16807%2147483647;return(state-1)/2147483646;};
}

export function createIceGeometry(seed=1,melt=.205){
 const geometry=new RoundedBoxGeometry(1,1,1,18,melt);
 const position=geometry.attributes.position;
 const phase=seed*1.917;

 for(let i=0;i<position.count;i++){
  let x=position.getX(i),y=position.getY(i),z=position.getZ(i);
  const edge=Math.max(Math.abs(x),Math.abs(y),Math.abs(z));
  const corner=Math.pow(Math.min(1,(Math.abs(x)+Math.abs(y)+Math.abs(z))/1.14),3.55);

  // Large melt waves + small surface waviness. The amplitude is intentionally tiny:
  // real ice is imperfect without looking carved or rock-like.
  const broad=Math.sin(x*(3.15+seed*.055)+y*2.18+phase)*Math.sin(z*3.82-x*1.92-phase*.29);
  const mid=Math.sin(x*7.05+z*5.72-y*3.9+phase*.48);
  const fine=Math.sin(x*15.7-z*12.15+y*8.8+phase*1.53);
  const surface=(broad*.0128+mid*.0035+fine*.0010)*(.24+edge*.98);

  const asymX=1+Math.sin(y*1.92+phase)*.024;
  const asymY=1+Math.cos(x*2.94-z*1.22+phase)*.019;
  const asymZ=1+Math.sin(y*2.52+x*1.28-phase)*.024;
  const cornerMelt=1-corner*(.020+.010*Math.max(0,Math.sin((x-z)*6.8+phase)));

  x*=(1+surface)*asymX*cornerMelt;
  y*=(1+surface)*asymY*(1-corner*.0065);
  z*=(1+surface)*asymZ*cornerMelt;

  // Soften each face independently. This breaks the acrylic-box silhouette while
  // preserving the recognizable cube shape from the approved visual reference.
  if(y>.398)y-=.0105+(Math.cos(x*3.7+phase)+Math.sin(z*3.28-phase))*.0045+corner*.006;
  if(y<-.398)y+=.007+(Math.sin(x*3.35-phase)+Math.cos(z*3.74+phase))*.0035+corner*.0038;
  if(x>.418)x-=.0052+Math.sin(y*3.72+z*3.05+phase)*.0028;
  if(x<-.418)x+=.0052+Math.cos(y*3.55-z*2.95-phase)*.0027;
  if(z>.418)z-=.0048+Math.sin(x*3.46+y*3.64-phase)*.0026;
  if(z<-.418)z+=.0048+Math.cos(x*3.18-y*3.40+phase)*.0026;

  // Keep the procedural deformation within the unit-cube footprint used by tests.
  x=THREE.MathUtils.clamp(x,-.515,.515);
  y=THREE.MathUtils.clamp(y,-.515,.515);
  z=THREE.MathUtils.clamp(z,-.515,.515);
  position.setXYZ(i,x,y,z);
 }

 position.needsUpdate=true;
 geometry.computeVertexNormals();
 geometry.computeBoundingSphere();
 return geometry;
}

export function createFractureSheetGeometry(random,scale=.18){
 const points=[];
 const sides=6+Math.floor(random()*4);
 for(let i=0;i<sides;i++){
  const a=i/sides*Math.PI*2;
  const r=scale*(.44+random()*.56);
  points.push(new THREE.Vector2(Math.cos(a)*r,Math.sin(a)*r));
 }
 return new THREE.ShapeGeometry(new THREE.Shape(points),1);
}
