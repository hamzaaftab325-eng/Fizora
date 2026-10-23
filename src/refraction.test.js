import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRefractionScene} from './ice-materials.js';

test('refraction captures internal detail once and restores scene state even on render failure',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),shell=new THREE.Group(),core=new THREE.Group();scene.add(shell,core);
 let target=null,captured=null,fail=false;
 const renderer={toneMapping:THREE.ACESFilmicToneMapping,getDrawingBufferSize:v=>v.set(3440,1440),getRenderTarget:()=>target,setRenderTarget:t=>{target=t;if(t)captured=t;},render(){assert.equal(shell.visible,false);assert.equal(core.visible,true);if(fail)throw Error('test failure');}};
 const previousWidth=globalThis.innerWidth;globalThis.innerWidth=1720;
 const glass=createRefractionScene(renderer,scene,camera,[new THREE.Texture(),new THREE.Texture(),new THREE.Texture()]);
 try{
  glass.exclude(shell);glass.interior(core);glass.resize();glass.capture();
  assert.equal(shell.visible,true);assert.equal(core.visible,false);assert.equal(target,null);
  assert.ok(Math.abs(captured.width/captured.height-3440/1440)<.003);
  fail=true;assert.throws(()=>glass.capture(),/test failure/);
  assert.equal(target,null);assert.equal(renderer.toneMapping,THREE.ACESFilmicToneMapping);assert.equal(shell.visible,true);assert.equal(core.visible,false);
 }finally{glass.dispose();if(previousWidth===undefined)delete globalThis.innerWidth;else globalThis.innerWidth=previousWidth;}
});
