import test from 'node:test';
import assert from 'node:assert/strict';
import {createIceGeometry} from './ice-scene.js';
import {createCanBodyGeometry,CAN_MIN_Y,CAN_BODY_HEIGHT} from './can-geometry.js';

test('melted ice geometry has finite unit normals and remains inside its intended footprint',()=>{
 const geometry=createIceGeometry(),p=geometry.attributes.position,n=geometry.attributes.normal;
 assert.ok(p.count>1000);
 for(let i=0;i<p.count;i++){
  for(const v of [p.getX(i),p.getY(i),p.getZ(i)])assert.ok(Number.isFinite(v)&&Math.abs(v)<.52);
  assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.0001);
 }
 geometry.dispose();
});

test('label UV height follows the can wall and stays within the wrap',()=>{
 const geometry=createCanBodyGeometry(),p=geometry.attributes.position,uv=geometry.attributes.uv;
 for(let i=0;i<p.count;i++){
  assert.ok(Math.abs(uv.getY(i)-(p.getY(i)-CAN_MIN_Y)/CAN_BODY_HEIGHT)<.00001);
  assert.ok(uv.getX(i)>=0&&uv.getX(i)<=1);
 }
 geometry.dispose();
});


test('ice and aluminum reflections are continuous across coincident UV seams',()=>{
 for(const geometry of [createIceGeometry(2),createCanBodyGeometry()]){
  const p=geometry.attributes.position,n=geometry.attributes.normal,known=new Map();let shared=0;
  for(let i=0;i<p.count;i++){
   const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join(',');
   const normal=[n.getX(i),n.getY(i),n.getZ(i)];
   if(known.has(key)){shared++;assert.ok(normal.every((v,j)=>Math.abs(v-known.get(key)[j])<1e-6));}else known.set(key,normal);
  }
  assert.ok(shared>10);geometry.dispose();
 }
});
