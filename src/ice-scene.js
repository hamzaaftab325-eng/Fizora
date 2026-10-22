import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

function makeRng(seed){
 let state=Math.max(1,seed|0);
 return ()=>{state=state*16807%2147483647;return(state-1)/2147483646;};
}

export function createIceGeometry(seed=1,melt=.14){
 const geometry=new RoundedBoxGeometry(1,1,1,10,melt);
 const p=geometry.attributes.position;
 const phase=seed*1.913;
 for(let i=0;i<p.count;i++){
  let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  const edgeBias=Math.max(Math.abs(x),Math.abs(y),Math.abs(z));
  const low=Math.sin(x*(4.6+seed*.09)+y*3.4+phase)*Math.sin(z*5.7-x*3.2-phase*.43);
  const medium=Math.sin(x*10.8+z*8.9-y*6.4+phase*.71);
  const high=Math.sin(x*22.7-z*17.2+y*13.1+phase*2.17);
  const waviness=(low*.012+medium*.0042+high*.0014)*(0.55+edgeBias*.65);
  const asymX=1+Math.sin(y*3.0+phase)*.014;
  const asymY=1+Math.cos(x*4.3-z*2.0+phase)*.011;
  const asymZ=1+Math.sin(y*3.8+x*2.1-phase)*.014;
  const bottomCompression=y<-.10?1-Math.min(.022,Math.abs(y+.10)*.020):1;
  const corner=Math.pow(Math.min(1,(Math.abs(x)+Math.abs(y)+Math.abs(z))/1.32),5);
  const chipWave=Math.sin((x+z)*17+seed*2.7)*Math.sin((y-z)*13-seed)*.0032*corner;
  const deformation=1+waviness-chipWave;
  x*=deformation*asymX;
  y*=deformation*asymY*bottomCompression;
  z*=deformation*asymZ;
  if(y<-.475)y=Math.max(y,-.492+Math.sin((x+z)*8+phase)*.003);
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
  const origin=new THREE.Vector3((random()-.5)*.12,(random()-.5)*.15,(random()-.5)*.12);
  const branches=3+Math.floor(random()*4);
  for(let branch=0;branch<branches;branch++){
   let point=origin.clone();
   let direction=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize();
   const steps=2+Math.floor(random()*3);
   for(let step=0;step<steps;step++){
    direction.add(new THREE.Vector3((random()-.5)*.18,(random()-.5)*.16,(random()-.5)*.18)).normalize();
    const length=(.045+random()*.078)*intensity;
    const next=point.clone().addScaledVector(direction,length);
    next.clampScalar(-.36,.36);
    vertices.push(...point.toArray(),...next.toArray());
    point=next;
   }
  }
 }
 return new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
}

function createFracturePlane(random,scale=.28){
 const points=[];
 const sides=5+Math.floor(random()*3);
 for(let i=0;i<sides;i++){
  const a=i/sides*Math.PI*2;
  const r=scale*(.58+random()*.42);
  points.push(new THREE.Vector2(Math.cos(a)*r,Math.sin(a)*r));
 }
 const shape=new THREE.Shape(points);
 return new THREE.ShapeGeometry(shape,1);
}

function makeCloudMaterial(){
 return new THREE.MeshPhysicalMaterial({
  color:0xe8f6f8,metalness:0,roughness:.48,transmission:.34,thickness:.46,
  attenuationColor:new THREE.Color(0xd9f1f3),attenuationDistance:.72,
  transparent:true,opacity:.19,depthWrite:false,ior:1.309,envMapIntensity:.52,
  clearcoat:.04,clearcoatRoughness:.30
 });
}

export function createIceScene(scene,glass){
 const root=new THREE.Group();scene.add(root);
 const outerMaterials=[
  glass.material({distortion:.043,roughness:.020,frost:.026,absorption:.048,dispersion:.0026}),
  glass.material({distortion:.046,roughness:.024,frost:.032,absorption:.052,dispersion:.0030}),
  glass.material({distortion:.041,roughness:.019,frost:.023,absorption:.045,dispersion:.0022}),
  glass.material({distortion:.047,roughness:.025,frost:.035,absorption:.055,dispersion:.0030})
 ];
 const cloudMaterials=[makeCloudMaterial(),makeCloudMaterial(),makeCloudMaterial(),makeCloudMaterial()];
 cloudMaterials[1].opacity=.22;cloudMaterials[1].roughness=.53;
 cloudMaterials[2].opacity=.16;cloudMaterials[2].transmission=.42;
 cloudMaterials[3].opacity=.235;cloudMaterials[3].roughness=.56;
 const veinMaterial=new THREE.LineBasicMaterial({color:0xeaf9fb,transparent:true,opacity:.095,depthWrite:false});
 const faintVeinMaterial=new THREE.LineBasicMaterial({color:0xd7eef1,transparent:true,opacity:.045,depthWrite:false});
 const fractureMaterial=new THREE.MeshPhysicalMaterial({
  color:0xf5ffff,roughness:.42,transparent:true,opacity:.075,depthWrite:false,
  side:THREE.DoubleSide,metalness:0,ior:1.309,envMapIntensity:.55
 });
 const airMaterial=new THREE.MeshPhysicalMaterial({
  color:0xf9ffff,roughness:.14,transparent:true,opacity:.24,depthWrite:false,ior:1.0,
  specularIntensity:.65
 });
 const microBubbleMaterial=new THREE.MeshBasicMaterial({color:0xf5ffff,transparent:true,opacity:.12,depthWrite:false});
 const beadGeometry=new THREE.SphereGeometry(1,10,7);
 const microBeadGeometry=new THREE.SphereGeometry(1,7,5);
 const meltDropMaterial=glass.material({distortion:.0055,roughness:.012,frost:.001,absorption:.006,dispersion:.001});
 const cubes=[];
 const layout=[[-1.05,.84,-.28,.55],[1.04,1.00,-.46,.60],[-1.06,-.92,.03,.60],[1.03,-.78,.20,.64]];
 const geometries=[];
 const fractureGeometries=[];
 const meltSkirts=[];
 const masterSeed=29;

 layout.forEach(([x,y,z,size],i)=>{
  const random=makeRng(masterSeed+i*73);
  const geometry=createIceGeometry(i+1,.135+i*.007);geometries.push(geometry);
  const carrier=new THREE.Group();
  const cube=new THREE.Mesh(geometry,outerMaterials[i]);cube.renderOrder=2;carrier.add(cube);
  const core=new THREE.Mesh(geometry,cloudMaterials[i]);
  core.scale.set(.58+random()*.09,.64+random()*.10,.56+random()*.10);
  core.position.set((random()-.5)*.06,(random()-.5)*.08,(random()-.5)*.06);
  core.rotation.set((random()-.5)*.18,(random()-.5)*.18,(random()-.5)*.18);
  core.renderOrder=1;carrier.add(core);
  const cloudCount=2+Math.floor(random()*2);
  for(let c=0;c<cloudCount;c++){
   const bloom=new THREE.Mesh(new THREE.IcosahedronGeometry(.18+random()*.08,2),cloudMaterials[i]);
   bloom.scale.set(.85+random()*.55,.70+random()*.65,.80+random()*.55);
   bloom.position.set((random()-.5)*.30,(random()-.5)*.33,(random()-.5)*.30);
   bloom.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);
   bloom.material=cloudMaterials[i];bloom.renderOrder=1;carrier.add(bloom);
  }
  root.add(carrier);
  const veins=new THREE.LineSegments(createFractures(random,.85),veinMaterial);veins.renderOrder=4;carrier.add(veins);
  const hairlines=new THREE.LineSegments(createFractures(random,.48),faintVeinMaterial);hairlines.rotation.set(.3,-.2,.15);hairlines.renderOrder=4;carrier.add(hairlines);
  const planeCount=2+Math.floor(random()*2);
  for(let p=0;p<planeCount;p++){
   const planeGeometry=createFracturePlane(random,.16+random()*.12);fractureGeometries.push(planeGeometry);
   const plane=new THREE.Mesh(planeGeometry,fractureMaterial);
   plane.position.set((random()-.5)*.26,(random()-.5)*.28,(random()-.5)*.26);
   plane.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);
   plane.scale.set(1,.45+random()*.65,1);plane.renderOrder=3;carrier.add(plane);
  }
  const airCount=18+Math.floor(random()*9);
  const air=new THREE.InstancedMesh(beadGeometry,airMaterial,airCount),dummy=new THREE.Object3D();
  for(let j=0;j<airCount;j++){
   const radius=Math.pow(random(),.70)*.29;
   const direction=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize().multiplyScalar(radius);
   dummy.position.copy(direction);
   const r=.004+Math.pow(random(),2.4)*.018;
   dummy.scale.set(r,r*(.72+random()*.9),r*(.82+random()*.32));
   dummy.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);dummy.updateMatrix();air.setMatrixAt(j,dummy.matrix);
  }
  air.instanceMatrix.needsUpdate=true;air.renderOrder=4;carrier.add(air);
  const microCount=46+Math.floor(random()*24);
  const micro=new THREE.InstancedMesh(microBeadGeometry,microBubbleMaterial,microCount),microDummy=new THREE.Object3D();
  const clusterAxis=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize();
  for(let j=0;j<microCount;j++){
   const along=(random()-.5)*.50;
   const radial=new THREE.Vector3(random()-.5,random()-.5,random()-.5).multiplyScalar(.055+random()*.08);
   microDummy.position.copy(clusterAxis).multiplyScalar(along).add(radial);
   const r=.0018+random()*.0054;microDummy.scale.setScalar(r);microDummy.updateMatrix();micro.setMatrixAt(j,microDummy.matrix);
  }
  micro.instanceMatrix.needsUpdate=true;micro.renderOrder=4;carrier.add(micro);
  const dropCount=16+Math.floor(random()*8);
  const meltDrops=new THREE.InstancedMesh(beadGeometry,meltDropMaterial,dropCount),drop=new THREE.Object3D();
  for(let j=0;j<dropCount;j++){
   const under=random()<.55;
   const a=(random()-.5)*.72,b=(random()-.5)*.72,edge=.505;
   if(under)drop.position.set(a,-edge,b);
   else{
    const side=Math.floor(random()*4),lower=-.43+random()*.46;
    if(side===0)drop.position.set(edge,lower,b);else if(side===1)drop.position.set(-edge,lower,b);
    else if(side===2)drop.position.set(a,lower,edge);else drop.position.set(a,lower,-edge);
   }
   const r=.007+Math.pow(random(),1.5)*.018;
   drop.scale.set(r,r*(1.12+random()*.62),r*.60);drop.updateMatrix();meltDrops.setMatrixAt(j,drop.matrix);
  }
  meltDrops.instanceMatrix.needsUpdate=true;meltDrops.renderOrder=5;carrier.add(meltDrops);
  const skirtGeometry=new THREE.SphereGeometry(.44,28,12);meltSkirts.push(skirtGeometry);
  const skirt=new THREE.Mesh(skirtGeometry,meltDropMaterial);
  skirt.scale.set(1,.055,.92);skirt.position.y=-.496;skirt.renderOrder=4;carrier.add(skirt);
  cubes.push({carrier,x,y,z,size,phase:i*1.72,spin:.052+random()*.026,drift:.020+random()*.013});
 });

 const sprayRandom=makeRng(911);
 const spray=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,7),glass.material({distortion:.0048,roughness:.013,absorption:.005,dispersion:.001}),42);
 spray.renderOrder=3;root.add(spray);
 const spraySeeds=Array.from({length:42},()=>({
  side:sprayRandom()>.5?1:-1,x:.78+sprayRandom()*.72,y:(sprayRandom()-.5)*3.36,z:sprayRandom()*.74-.31,
  r:.005+Math.pow(sprayRandom(),1.8)*.020,phase:sprayRandom()*Math.PI*2,stretch:.92+sprayRandom()*.50
 }));
 const sprayDummy=new THREE.Object3D();
 glass.exclude(root);
 let impulseAt=-100;

 return {
  root,
  impulse(time){impulseAt=time;},
  update(time,pose,energy=0){
   root.position.set(pose.x,pose.y,0);root.scale.setScalar(pose.size);
   const age=Math.max(0,time-impulseAt),kick=Math.sin(age*8.1)*Math.exp(-age*3.7)*.070;
   spraySeeds.forEach((s,i)=>{
    sprayDummy.position.set(s.side*(s.x+kick*.32),s.y+Math.sin(time*.43+s.phase)*.022,s.z);
    sprayDummy.scale.set(s.r,s.r*s.stretch,s.r*.78);sprayDummy.updateMatrix();spray.setMatrixAt(i,sprayDummy.matrix);
   });spray.instanceMatrix.needsUpdate=true;
   for(const c of cubes){
    const drift=Math.sin(time*.40+c.phase)*c.drift;
    c.carrier.position.set(c.x+Math.sign(c.x)*(kick+energy*.027),c.y+drift,c.z+Math.cos(time*.27+c.phase)*.030);
    c.carrier.scale.setScalar(c.size);
    c.carrier.rotation.set(.29+Math.sin(time*.13+c.phase)*.080,c.phase+time*c.spin,.20+Math.cos(time*.18+c.phase)*.090);
   }
  },
  dispose(){
   geometries.forEach(g=>g.dispose());fractureGeometries.forEach(g=>g.dispose());meltSkirts.forEach(g=>g.dispose());
   cloudMaterials.forEach(m=>m.dispose());
  }
 };
}

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
  material({distortion=.012,roughness=.05,frost=0,absorption=.018,dispersion=.002}={}){
   const material=new THREE.MeshPhysicalMaterial({
    depthWrite:false,color:0xfafdff,metalness:0,roughness,ior:1.309,
    clearcoat:.97,clearcoatRoughness:.018,envMapIntensity:1.48,specularIntensity:1
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
     float edge=pow(1.-facing,1.42);
     vec2 texel=1.15/glassResolution;
     vec3 blur4=(texture2D(glassScene,uvG+vec2(texel.x,0.)).rgb+texture2D(glassScene,uvG-vec2(texel.x,0.)).rgb+texture2D(glassScene,uvG+vec2(0.,texel.y)).rgb+texture2D(glassScene,uvG-vec2(0.,texel.y)).rgb)*.25;
     vec3 blurDiag=(texture2D(glassScene,uvG+texel).rgb+texture2D(glassScene,uvG-texel).rgb+texture2D(glassScene,uvG+vec2(texel.x,-texel.y)).rgb+texture2D(glassScene,uvG+vec2(-texel.x,texel.y)).rgb)*.25;
     float frostMix=clamp(glassFrost*(7.6+edge*5.5),0.,.34);
     transmitted=mix(transmitted,mix(blur4,blurDiag,.45),frostMix);
     float thicknessProxy=.22+edge*1.18+glassFrost*3.15;
     vec3 sigma=vec3(1.16,.36,.16);
     transmitted*=exp(-sigma*glassAbsorption*thicknessProxy*4.0);
     float fresnel=.020+.980*pow(1.-facing,5.0);
     vec3 milkTint=vec3(.205,.235,.242);
     vec3 scatter=transmitted*.68+milkTint;
     float cloudy=clamp(glassFrost*(1.85+edge*2.2),0.,.40);
     vec3 volume=mix(transmitted,scatter,cloudy);
     vec3 outgoingLight=volume*(1.-fresnel*.48)+totalSpecular*(1.12+fresnel*1.20);
    `);
   };
   material.customProgramCacheKey=()=>`fizora-ice-water-v7-${distortion}-${frost}-${absorption}-${dispersion}`;
   return material;
  },
  resize(){
   const size=renderer.getDrawingBufferSize(new THREE.Vector2());resolution.value.copy(size);
   const scale=innerWidth<760?.54:.72;
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
