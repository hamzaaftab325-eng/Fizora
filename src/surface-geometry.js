import * as THREE from 'three';

// RoundedBoxGeometry is non-indexed. Average coincident-vertex normals across
// triangle and UV seams without changing the UVs or melting the silhouette.
export function smoothSurfaceNormals(geometry){
 geometry.computeVertexNormals();
 const p=geometry.attributes.position,n=geometry.attributes.normal,groups=new Map();
 for(let i=0;i<p.count;i++){
  const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join(',');
  let group=groups.get(key);if(!group){group={normal:new THREE.Vector3(),indices:[]};groups.set(key,group);}
  group.normal.add(new THREE.Vector3(n.getX(i),n.getY(i),n.getZ(i)));group.indices.push(i);
 }
 for(const {normal,indices} of groups.values()){normal.normalize();for(const i of indices)n.setXYZ(i,normal.x,normal.y,normal.z);}
 n.needsUpdate=true;
}
