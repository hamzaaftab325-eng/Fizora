import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiquidField,createBuoyancy} from './liquid-field.js';
const peak=field=>Math.max(...field.values.map(Math.abs));

test('a tap propagates symmetrically and settles instead of amplifying',()=>{
 const field=createLiquidField(101,101);field.impulse(.5,.5,1.8,4.4);const initial=peak(field);
 for(let i=0;i<30;i++)field.update(1/60);
 assert.ok(Math.abs(field.values[50*101+65])>.001,'the wave reaches surrounding water');
 assert.ok(Math.abs(field.values[50*101+60]-field.values[60*101+50])<1e-6);
 for(let i=0;i<900;i++)field.update(1/60);
 assert.ok(peak(field)<initial*.01,'the surface returns to rest');
});

test('repeated clicks and uneven frame timing remain bounded',()=>{
 const field=createLiquidField(90,160);
 for(let i=0;i<3000;i++){if(i%3===0)field.impulse((i%17)/17,(i%11)/11,1.8,4.4);field.update(i%5===0?.05:1/60);}
 assert.ok(field.values.every(Number.isFinite));assert.ok(peak(field)<4);
 field.clear();assert.equal(peak(field),0);assert.ok(field.normals.every(n=>n===0));
});

test('can buoyancy has the same response at 30 and 120 FPS',()=>{
 const simulate=fps=>{const spring=createBuoyancy();spring.impulse(.8,.2);for(let i=0;i<fps;i++)spring.update(1/fps);return spring;};
 const slow=simulate(30),fast=simulate(120);
 for(const key of ['x','y','roll'])assert.ok(Math.abs(slow.state[key]-fast.state[key])<1e-6);
 slow.reset();assert.deepEqual(slow.state,{x:0,y:0,roll:0});
});
