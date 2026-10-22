import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

function makeRng(seed){
 let state=Math.max(1,seed|0);
 return ()=>{state=state*16807%2147483647;return(state-1)/2147483646;};
}

export function createIceGeometry(seed=1,melt=.13){
 const geometry=new RoundedBoxGeometry(1,1,1,8,melt);
 const p=geometry.attributes.position;
 const phase=seed*1.913;
 for(let i=0;i<p.count;i++){
  let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  const low=Math.sin(x*(5.1+seed*.11)+y*3.9+phase)*Math.sin(z*6.2-x*3.5-phase*.4);
  const high=Math.sin(x*16.7-z*12.9+y*8.6+phase*2.1);
  const asymX=1+Math.sin(y*3.2+phase)*.012;
  const asymY=1+Math.cos(x*4.6-z*2.3+phase)*.010;
  const asymZ=1+Math.sin(y*4.1+x*2.2-phase)*.013;
  const deformation=1+low*.014+high*.0032;
  // The lower half melts slightly flatter/heavier, matching gravity-softened real ice.
  const bottomCompression=y<-.18?1-(Math.abs(y+.18)*.012):1;
  x*=deformation*asymX;
  y*=deformation*asymY*bottomCompression;
  z*=deformation*asymZ;
  p.setXYZ(i,x,y,z);
 }
 p.needsUpdate=true;
 geometry.computeVertexNormals();
 geometry.computeBoundingSphere();
 return geometry;
}

function createFractures(random,intensity=1){
 const vertices=[];
 const families=2+Math.floor(random()*2);
 for(let family=0;family<families;family++){
  const origin=new THREE.Vector3((random()-.5)*.15,(random()-.5)*.18,(random()-.5)*.15);
  const branches=4+Math.floor(random()*4);
  for(let branch=0;branch<branches;branch++){
   let point=origin.clone();
   let direction=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize();
   const steps=2+Math.floor(random()*3);
   for(let step=0;step<steps;step++){
    direction.add(new THREE.Vector3((random()-.5)*.22,(random()-.5)*.20,(random()-.5)*.22)).normalize();
    const length=(.055+random()*.095)*intensity;
    const next=point.clone().addScaledVector(direction,length);
    next.clampScalar(-.38,.38);
    vertices.push(...point.toArray(),...next.toArray());
    point=next;
   }
  }
 }
 return new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
}

export function createIceScene(scene,glass){
 const root=new THREE.Group();scene.add(root);
 const outerMaterials=[
  glass.material({distortion:.049,roughness:.025,frost:.016,absorption:.060,dispersion:.013}),
  glass.material({distortion:.052,roughness:.029,frost:.020,absorption:.066,dispersion:.014}),
  glass.material({distortion:.047,roughness:.024,frost:.014,absorption:.056,dispersion:.012}),
  glass.material({distortion:.054,roughness:.031,frost:.022,absorption:.070,dispersion:.014})
 ];
 const innerMaterial=new THREE.MeshPhysicalMaterial({
  color:0xeafaff,metalness:0,roughness:.31,transparent:true,opacity:.052,depthWrite:false,
  ior:1.31,envMapIntensity:.62,clearcoat:.10,clearcoatRoughness:.18
 });
 const veinMaterial=new THREE.LineBasicMaterial({color:0xf5ffff,transparent:true,opacity:.24,depthWrite:false});
 const faintVeinMaterial=new THREE.LineBasicMaterial({color:0xdff8ff,transparent:true,opacity:.105,depthWrite:false});
 const airMaterial=new THREE.MeshPhysicalMaterial({color:0xf8ffff,roughness:.08,transparent:true,opacity:.16,depthWrite:false,ior:1.0});
 const beadGeometry=new THREE.SphereGeometry(1,10,7);
 const meltDropMaterial=glass.material({distortion:.0065,roughness:.017,frost:.001,absorption:.009,dispersion:.003});
 const cubes=[];
 const layout=[[-1.05,.84,-.28,.55],[1.04,1.00,-.46,.60],[-1.06,-.92,.03,.60],[1.03,-.78,.20,.64]];
 const geometries=[];
 let masterSeed=29;

 layout.forEach(([x,y,z,size],i)=>{
  const random=makeRng(masterSeed+i*73);
  const geometry=createIceGeometry(i+1,.125+i*.006);geometries.push(geometry);
  const carrier=new THREE.Group();
  const cube=new THREE.Mesh(geometry,outerMaterials[i]);cube.renderOrder=2;carrier.add(cube);

  // Cloudy center: real ice is usually clearest near the surface, not uniformly transparent.
  const core=new THREE.Mesh(geometry,innerMaterial);
  core.scale.set(.73+random()*.06,.76+random()*.07,.71+random()*.08);
  core.position.set((random()-.5)*.05,(random()-.5)*.05,(random()-.5)*.05);
  core.rotation.set((random()-.5)*.18,(random()-.5)*.18,(random()-.5)*.18);
  core.renderOrder=1;carrier.add(core);
  root.add(carrier);

  // Primary star cracks plus a fainter secondary network.
  const veins=new THREE.LineSegments(createFractures(random,1),veinMaterial);veins.renderOrder=4;carrier.add(veins);
  const hairlines=new THREE.LineSegments(createFractures(random,.68),faintVeinMaterial);hairlines.rotation.set(.3,-.2,.15);hairlines.renderOrder=4;carrier.add(hairlines);

  // Trapped air concentrates toward the cloudy core rather than filling the whole cube uniformly.
  const airCount=22+Math.floor(random()*10);
  const air=new THREE.InstancedMesh(beadGeometry,airMaterial,airCount),dummy=new THREE.Object3D();
  for(let j=0;j<airCount;j++){
   const radius=Math.pow(random(),.62)*.34;
   const direction=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize().multiplyScalar(radius);
   dummy.position.copy(direction);
   const r=.0035+Math.pow(random(),2.2)*.019;
   dummy.scale.set(r,r*(.68+random()*1.0),r*(.82+random()*.35));
   dummy.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);dummy.updateMatrix();air.setMatrixAt(j,dummy.matrix);
  }
  air.instanceMatrix.needsUpdate=true;air.renderOrder=4;carrier.add(air);

  // Surface melt beads favor the underside and lower sidewalls, following gravity.
  const dropCount=18+Math.floor(random()*8);
  const meltDrops=new THREE.InstancedMesh(beadGeometry,meltDropMaterial,dropCount),drop=new THREE.Object3D();
  for(let j=0;j<dropCount;j++){
   const under=random()<.42;
   const a=(random()-.5)*.75,b=(random()-.5)*.75,edge=.505;
   if(under){drop.position.set(a,-edge,b);}
   else{
    const side=Math.floor(random()*4),lower=-.42+random()*.55;
    if(side===0)drop.position.set(edge,lower,b);else if(side===1)drop.position.set(-edge,lower,b);
    else if(side===2)drop.position.set(a,lower,edge);else drop.position.set(a,lower,-edge);
   }
   const r=.008+Math.pow(random(),1.4)*.020;
   drop.scale.set(r,r*(1.15+random()*.7),r*.62);drop.updateMatrix();meltDrops.setMatrixAt(j,drop.matrix);
  }
  meltDrops.instanceMatrix.needsUpdate=true;meltDrops.renderOrder=5;carrier.add(meltDrops);

  cubes.push({carrier,x,y,z,size,phase:i*1.72,spin:.070+random()*.040,drift:.028+random()*.018});
 });

 const sprayRandom=makeRng(911);
 const spray=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,7),glass.material({distortion:.0058,roughness:.016,absorption:.007,dispersion:.002}),52);
 spray.renderOrder=3;root.add(spray);
 const spraySeeds=Array.from({length:52},()=>({
  side:sprayRandom()>.5?1:-1,x:.76+sprayRandom()*.75,y:(sprayRandom()-.5)*3.42,z:sprayRandom()*.78-.33,
  r:.006+Math.pow(sprayRandom(),1.7)*.023,phase:sprayRandom()*Math.PI*2,stretch:.90+sprayRandom()*.62
 }));
 const sprayDummy=new THREE.Object3D();
 glass.exclude(root);
 let impulseAt=-100;

 return {
  root,
  impulse(time){impulseAt=time;},
  update(time,pose,energy=0){
   root.position.set(pose.x,pose.y,0);root.scale.setScalar(pose.size);
   const age=Math.max(0,time-impulseAt),kick=Math.sin(age*8.5)*Math.exp(-age*3.4)*.085;
   spraySeeds.forEach((s,i)=>{
    sprayDummy.position.set(s.side*(s.x+kick*.36),s.y+Math.sin(time*.54+s.phase)*.032,s.z);
    sprayDummy.scale.set(s.r,s.r*s.stretch,s.r*.80);sprayDummy.updateMatrix();spray.setMatrixAt(i,sprayDummy.matrix);
   });spray.instanceMatrix.needsUpdate=true;

   for(const c of cubes){
    const drift=Math.sin(time*.46+c.phase)*c.drift;
    c.carrier.position.set(c.x+Math.sign(c.x)*(kick+energy*.036),c.y+drift,c.z+Math.cos(time*.31+c.phase)*.041);
    c.carrier.scale.setScalar(c.size);
    // Lower angular velocity and imperfect axes make the cubes feel heavy, not decorative.
    c.carrier.rotation.set(.31+Math.sin(time*.17+c.phase)*.115,c.phase+time*c.spin,.22+Math.cos(time*.23+c.phase)*.13);
   }
  },
  dispose(){geometries.forEach(g=>g.dispose());}
 };
}

// Screen-space refraction tuned for wet ice/water: subtle dispersion, thickness-like absorption,
// edge Fresnel and frost-dependent multi-sampling. It remains much cheaper than ray tracing.
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
  material({distortion=.012,roughness=.05,frost=0,absorption=.018,dispersion=.004}={}){
   const material=new THREE.MeshPhysicalMaterial({
    depthWrite:false,color:0xffffff,metalness:0,roughness,ior:1.333,
    clearcoat:.94,clearcoatRoughness:.025,envMapIntensity:1.42,specularIntensity:1
   });
   material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{
     glassScene:source,glassResolution:resolution,glassDistortion:{value:distortion},glassFrost:{value:frost},
     glassAbsorption:{value:absorption},glassDispersion:{value:dispersion}
    });
    shader.fragmentShader='uniform sampler2D glassScene;uniform vec2 glassResolution;uniform float glassDistortion;uniform float glassFrost;uniform float glassAbsorption;uniform float glassDispersion;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',`
     vec2 glassUv=gl_FragCoord.xy/glassResolution;
     float viewDistance=max(length(vViewPosition),.001);
     vec2 offset=normal.xy*glassDistortion/max(viewDistance*.15,.42);
     offset.x*=glassResolution.y/glassResolution.x;
     vec2 uvR=clamp(glassUv-offset*(1.+glassDispersion),vec2(.002),vec2(.998));
     vec2 uvG=clamp(glassUv-offset,vec2(.002),vec2(.998));
     vec2 uvB=clamp(glassUv-offset*(1.-glassDispersion),vec2(.002),vec2(.998));
     vec3 transmitted=vec3(texture2D(glassScene,uvR).r,texture2D(glassScene,uvG).g,texture2D(glassScene,uvB).b);
     float facing=clamp(dot(normal,normalize(vViewPosition)),0.,1.);
     float edge=pow(1.-facing,1.55);
     if(glassFrost>.006){
      vec2 texel=1.35/glassResolution;
      vec3 blur=(texture2D(glassScene,uvG+vec2(texel.x,0.)).rgb+texture2D(glassScene,uvG-vec2(texel.x,0.)).rgb+texture2D(glassScene,uvG+vec2(0.,texel.y)).rgb+texture2D(glassScene,uvG-vec2(0.,texel.y)).rgb)*.25;
      transmitted=mix(transmitted,blur,clamp(glassFrost*9.5,0.,.30));
     }
     float thicknessProxy=.18+edge*1.25+glassFrost*2.2;
     vec3 sigma=vec3(1.38,.43,.18);
     transmitted*=exp(-sigma*glassAbsorption*thicknessProxy*4.2);
     float fresnel=.0204+.9796*pow(1.-facing,5.);
     vec3 scatter=transmitted*.72+vec3(.19,.225,.24);
     vec3 cloudy=mix(transmitted,scatter,clamp(glassFrost*(1.7+edge*3.0),0.,.46));
     vec3 outgoingLight=cloudy*(1.-fresnel*.54)+totalSpecular*(1.16+fresnel*1.06);
    `);
   };
   material.customProgramCacheKey=()=>`fizora-glass-v5-${distortion}-${frost}-${absorption}-${dispersion}`;
   return material;
  },
  resize(){
   const size=renderer.getDrawingBufferSize(new THREE.Vector2());resolution.value.copy(size);
   const scale=innerWidth<760?.52:.70;
   target.setSize(Math.max(1,Math.min(1920,Math.round(size.x*scale))),Math.max(1,Math.min(1080,Math.round(size.y*scale))));
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
