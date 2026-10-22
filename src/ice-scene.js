import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createIceGeometry(){
 const geometry=new RoundedBoxGeometry(1,1,1,7,.13);
 const p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  const low=Math.sin(x*5.7+y*4.1+z*2.3)*Math.sin(z*6.4-x*3.8);
  const high=Math.sin(x*17.1-z*13.4+y*9.2);
  const melt=1+low*.013+high*.0035;
  p.setXYZ(i,x*melt,y*melt,z*melt);
 }
 geometry.computeVertexNormals();
 geometry.computeBoundingSphere();
 return geometry;
}

export function createIceScene(scene,glass){
 const root=new THREE.Group();scene.add(root);
 const geometry=createIceGeometry();
 const outerMaterial=glass.material({distortion:.052,roughness:.045,frost:.012,absorption:.055});
 const innerMaterial=new THREE.MeshPhysicalMaterial({
  color:0xe9fbff,metalness:0,roughness:.24,transparent:true,opacity:.055,
  depthWrite:false,ior:1.31,transmission:.06,thickness:.32,envMapIntensity:.7
 });
 const cubes=[];
 const layout=[[-1.05,.84,-.28,.55],[1.04,1.00,-.46,.60],[-1.06,-.92,.03,.60],[1.03,-.78,.20,.64]];
 const veinMaterial=new THREE.LineBasicMaterial({color:0xf4ffff,transparent:true,opacity:.26,depthWrite:false});
 const airMaterial=new THREE.MeshPhysicalMaterial({color:0xf5ffff,roughness:.12,transparent:true,opacity:.17,depthWrite:false,ior:1.0});
 const beadGeometry=new THREE.SphereGeometry(1,10,7);
 const meltDropMaterial=glass.material({distortion:.008,roughness:.025,frost:.002,absorption:.01});
 let seed=29;const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};

 layout.forEach(([x,y,z,size],i)=>{
  const carrier=new THREE.Group();
  const cube=new THREE.Mesh(geometry,outerMaterial);cube.renderOrder=2;carrier.add(cube);
  const core=new THREE.Mesh(geometry,innerMaterial);core.scale.set(.80,.84,.78);core.rotation.set(.12,-.09,.08);core.renderOrder=1;carrier.add(core);
  root.add(carrier);

  const vertices=[];
  for(let j=0;j<13;j++){
   let a=new THREE.Vector3((random()-.5)*.62,(random()-.5)*.62,(random()-.5)*.62);
   const branches=2+Math.floor(random()*3);
   for(let k=0;k<branches;k++){
    const b=a.clone().add(new THREE.Vector3((random()-.5)*.20,(random()-.5)*.19,(random()-.5)*.18));
    vertices.push(...a.toArray(),...b.toArray());a=b;
   }
  }
  const veins=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3)),veinMaterial);
  veins.renderOrder=4;carrier.add(veins);

  const air=new THREE.InstancedMesh(beadGeometry,airMaterial,24),dummy=new THREE.Object3D();
  for(let j=0;j<24;j++){
   dummy.position.set((random()-.5)*.60,(random()-.5)*.60,(random()-.5)*.60);
   const r=.004+Math.pow(random(),2)*.019;
   dummy.scale.set(r,r*(.75+random()*.8),r);dummy.updateMatrix();air.setMatrixAt(j,dummy.matrix);
  }
  air.instanceMatrix.needsUpdate=true;air.renderOrder=4;carrier.add(air);

  // Tiny beads on the cube surface sell melting ice at close range.
  const meltDrops=new THREE.InstancedMesh(beadGeometry,meltDropMaterial,14),drop=new THREE.Object3D();
  for(let j=0;j<14;j++){
   const face=Math.floor(random()*6),a=(random()-.5)*.78,b=(random()-.5)*.78,edge=.505;
   if(face===0)drop.position.set(edge,a,b);else if(face===1)drop.position.set(-edge,a,b);
   else if(face===2)drop.position.set(a,edge,b);else if(face===3)drop.position.set(a,-edge,b);
   else if(face===4)drop.position.set(a,b,edge);else drop.position.set(a,b,-edge);
   const r=.009+random()*.018;drop.scale.set(r,r*(1+random()*.35),r*.65);drop.updateMatrix();meltDrops.setMatrixAt(j,drop.matrix);
  }
  meltDrops.instanceMatrix.needsUpdate=true;meltDrops.renderOrder=5;carrier.add(meltDrops);
  cubes.push({carrier,x,y,z,size,phase:i*1.72});
 });

 const spray=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,7),glass.material({distortion:.007,roughness:.02,absorption:.008}),54);
 spray.renderOrder=3;root.add(spray);
 const spraySeeds=Array.from({length:54},()=>({
  side:random()>.5?1:-1,x:.74+random()*.78,y:(random()-.5)*3.45,z:random()*.82-.35,
  r:.007+Math.pow(random(),1.6)*.026,phase:random()*Math.PI*2,stretch:.85+random()*.75
 }));
 const sprayDummy=new THREE.Object3D();
 glass.exclude(root);
 let impulseAt=-100;
 return {root,impulse(time){impulseAt=time;},update(time,pose,energy=0){
  root.position.set(pose.x,pose.y,0);root.scale.setScalar(pose.size);
  const age=Math.max(0,time-impulseAt),kick=Math.sin(age*9)*Math.exp(-age*3)*.1;
  spraySeeds.forEach((s,i)=>{
   sprayDummy.position.set(s.side*(s.x+kick*.4),s.y+Math.sin(time*.72+s.phase)*.055,s.z);
   sprayDummy.scale.set(s.r,s.r*s.stretch,s.r*.82);sprayDummy.updateMatrix();spray.setMatrixAt(i,sprayDummy.matrix);
  });spray.instanceMatrix.needsUpdate=true;
  for(const c of cubes){
   const drift=Math.sin(time*.58+c.phase)*.038;
   c.carrier.position.set(c.x+Math.sign(c.x)*(kick+energy*.045),c.y+drift,c.z+Math.cos(time*.36+c.phase)*.055);
   c.carrier.scale.setScalar(c.size);
   c.carrier.rotation.set(.34+Math.sin(time*.21+c.phase)*.15,c.phase+time*.095,.24+Math.cos(time*.28+c.phase)*.17);
  }
 }};
}

// Screen-space scene refraction with a small RGB split, Fresnel reflection and absorption.
// This is still inexpensive enough for the page, but reads much closer to thick wet glass/ice.
export function createRefractionScene(renderer,scene,camera,backgroundTextures){
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true});
 target.texture.minFilter=THREE.LinearFilter;target.texture.magFilter=THREE.LinearFilter;
 const resolution={value:new THREE.Vector2(1,1)},source={value:target.texture};
 const hidden=[];
 const uniforms={imageA:{value:backgroundTextures[0]},imageB:{value:backgroundTextures[1]},blend:{value:0},aspect:{value:1}};
 const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({
  uniforms,depthWrite:false,depthTest:false,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,.9999,1.);}',
  fragmentShader:`varying vec2 vUv;uniform sampler2D imageA;uniform sampler2D imageB;uniform float blend;uniform float aspect;
  void main(){vec2 uv=vUv;float imageAspect=1.5;if(aspect>imageAspect)uv.y=(uv.y-.5)*imageAspect/aspect+.5;else uv.x=(uv.x-.5)*aspect/imageAspect+.5;gl_FragColor=mix(texture2D(imageA,uv),texture2D(imageB,uv),blend);}`
 }));
 backdrop.frustumCulled=false;backdrop.renderOrder=-100;backdrop.visible=false;scene.add(backdrop);
 return {
  exclude(object){hidden.push(object);},
  material({distortion=.012,roughness=.06,frost=0,absorption=.018}={}){
   const material=new THREE.MeshPhysicalMaterial({
    depthWrite:false,color:0xffffff,metalness:0,roughness,ior:1.333,
    clearcoat:.88,clearcoatRoughness:.035,envMapIntensity:1.35
   });
   material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{glassScene:source,glassResolution:resolution,glassDistortion:{value:distortion},glassFrost:{value:frost},glassAbsorption:{value:absorption}});
    shader.fragmentShader='uniform sampler2D glassScene;uniform vec2 glassResolution;uniform float glassDistortion;uniform float glassFrost;uniform float glassAbsorption;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',`
     vec2 glassUv=gl_FragCoord.xy/glassResolution;
     vec2 offset=normal.xy*glassDistortion/max(length(vViewPosition)*.15,.42);
     offset.x*=glassResolution.y/glassResolution.x;
     vec2 uvR=clamp(glassUv-offset*1.045,vec2(.002),vec2(.998));
     vec2 uvG=clamp(glassUv-offset,vec2(.002),vec2(.998));
     vec2 uvB=clamp(glassUv-offset*.955,vec2(.002),vec2(.998));
     vec3 transmitted=vec3(texture2D(glassScene,uvR).r,texture2D(glassScene,uvG).g,texture2D(glassScene,uvB).b);
     float facing=clamp(dot(normal,normalize(vViewPosition)),0.,1.);
     float fresnel=.021+.979*pow(1.-facing,5.);
     float edge=pow(1.-facing,1.7);
     vec3 absorbTint=vec3(.90,.975,1.0);
     transmitted*=mix(vec3(1.),absorbTint,clamp(glassAbsorption+edge*glassAbsorption*2.,0.,.42));
     vec3 cloudy=mix(transmitted,transmitted*.74+vec3(.22,.245,.255),glassFrost*(.72+edge*.8));
     vec3 outgoingLight=cloudy*(1.-fresnel*.58)+totalSpecular*(1.18+fresnel*.95);
    `);
   };
   material.customProgramCacheKey=()=>`fizora-glass-v3-${distortion}-${frost}-${absorption}`;
   return material;
  },
  resize(){
   const size=renderer.getDrawingBufferSize(new THREE.Vector2());resolution.value.copy(size);
   const scale=innerWidth<760?.52:.68;
   target.setSize(Math.max(1,Math.min(1600,Math.round(size.x*scale))),Math.max(1,Math.min(1000,Math.round(size.y*scale))));
   uniforms.aspect.value=size.x/size.y;
  },
  setFlavor(i,t){uniforms.imageA.value=backgroundTextures[i];uniforms.imageB.value=backgroundTextures[i+1];uniforms.blend.value=t;},
  capture(){
   const visibility=hidden.map(o=>o.visible);hidden.forEach(o=>o.visible=false);backdrop.visible=true;
   const previousTarget=renderer.getRenderTarget(),tone=renderer.toneMapping;
   try{renderer.toneMapping=THREE.NoToneMapping;renderer.setRenderTarget(target);renderer.render(scene,camera);}
   finally{renderer.setRenderTarget(previousTarget);renderer.toneMapping=tone;backdrop.visible=false;hidden.forEach((o,i)=>o.visible=visibility[i]);}
  },
  dispose(){target.dispose();backgroundTextures.forEach(t=>t.dispose());}
 };
}
