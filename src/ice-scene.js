import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

function makeRng(seed){
 let state=Math.max(1,seed|0);
 return ()=>{state=state*16807%2147483647;return(state-1)/2147483646;};
}

export function createIceGeometry(seed=1,melt=.19){
 const geometry=new RoundedBoxGeometry(1,1,1,14,melt);
 const p=geometry.attributes.position;
 const phase=seed*1.913;
 for(let i=0;i<p.count;i++){
  let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  const edge=Math.max(Math.abs(x),Math.abs(y),Math.abs(z));
  const corner=Math.pow(Math.min(1,(Math.abs(x)+Math.abs(y)+Math.abs(z))/1.18),4.0);
  const broad=Math.sin(x*(3.7+seed*.07)+y*2.65+phase)*Math.sin(z*4.45-x*2.35-phase*.36);
  const mid=Math.sin(x*8.1+z*6.6-y*4.8+phase*.57);
  const fine=Math.sin(x*17.6-z*13.7+y*10.1+phase*1.71);
  const surface=(broad*.0105+mid*.0035+fine*.0011)*(.32+edge*.86);
  const asymX=1+Math.sin(y*2.25+phase)*.021;
  const asymY=1+Math.cos(x*3.45-z*1.45+phase)*.017;
  const asymZ=1+Math.sin(y*2.95+x*1.55-phase)*.021;
  const cornerMelt=1-corner*(.014+.009*Math.max(0,Math.sin((x-z)*7.8+phase)));
  const bottomCompression=y<-.04?1-Math.min(.040,Math.abs(y+.04)*.036):1;
  x*=(1+surface)*asymX*cornerMelt;
  y*=(1+surface)*asymY*bottomCompression;
  z*=(1+surface)*asymZ*cornerMelt;
  if(y<-.452)y=Math.max(y,-.486+Math.sin((x+z)*6.2+phase)*.006+Math.sin(x*14.2-z*10.5)*.0018);
  if(y>.418){
   const crown=(Math.cos(x*4.2+phase)+Math.sin(z*3.8-phase))*.0036;
   y-=.008+crown+corner*.005;
  }
  p.setXYZ(i,x,y,z);
 }
 p.needsUpdate=true;
 geometry.computeVertexNormals();
 geometry.computeBoundingSphere();
 return geometry;
}

function createFracturePlane(random,scale=.19){
 const points=[];
 const sides=5+Math.floor(random()*4);
 for(let i=0;i<sides;i++){
  const a=i/sides*Math.PI*2;
  const r=scale*(.48+random()*.52);
  points.push(new THREE.Vector2(Math.cos(a)*r,Math.sin(a)*r));
 }
 return new THREE.ShapeGeometry(new THREE.Shape(points),1);
}

function createFineCrack(random,intensity=.34){
 const vertices=[];
 const origin=new THREE.Vector3((random()-.5)*.07,(random()-.5)*.09,(random()-.5)*.07);
 const branches=2+Math.floor(random()*2);
 for(let branch=0;branch<branches;branch++){
  let point=origin.clone();
  let direction=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize();
  const steps=2+Math.floor(random()*2);
  for(let step=0;step<steps;step++){
   direction.add(new THREE.Vector3((random()-.5)*.12,(random()-.5)*.12,(random()-.5)*.12)).normalize();
   const next=point.clone().addScaledVector(direction,(.032+random()*.050)*intensity);
   next.clampScalar(-.28,.28);
   vertices.push(...point.toArray(),...next.toArray());
   point=next;
  }
 }
 return new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
}

function makeCloudMaterial(opacity=.14){
 return new THREE.MeshPhysicalMaterial({
  color:0xf8fbfb,metalness:0,roughness:.96,transmission:.02,thickness:.42,
  attenuationColor:new THREE.Color(0xf2f9fa),attenuationDistance:.34,
  transparent:true,opacity,depthWrite:false,ior:1.309,envMapIntensity:.12,
  clearcoat:0,clearcoatRoughness:.7,specularIntensity:.12
 });
}

function makeFractureMaterial(opacity=.045){
 return new THREE.MeshPhysicalMaterial({
  color:0xf9ffff,roughness:.22,transparent:true,opacity,depthWrite:false,
  side:THREE.DoubleSide,metalness:0,ior:1.309,envMapIntensity:.72,
  clearcoat:.42,clearcoatRoughness:.06,specularIntensity:.92
 });
}

export function createIceScene(scene,glass){
 const root=new THREE.Group();scene.add(root);

 const outerMaterials=[
  glass.material({distortion:.054,roughness:.012,frost:.0020,absorption:.0065,dispersion:0}),
  glass.material({distortion:.058,roughness:.014,frost:.0025,absorption:.0075,dispersion:0}),
  glass.material({distortion:.051,roughness:.011,frost:.0018,absorption:.0060,dispersion:0}),
  glass.material({distortion:.060,roughness:.015,frost:.0028,absorption:.0080,dispersion:0})
 ];
 const cloudMaterials=[makeCloudMaterial(.135),makeCloudMaterial(.145),makeCloudMaterial(.125),makeCloudMaterial(.15)];
 const fractureMaterials=[makeFractureMaterial(.046),makeFractureMaterial(.040),makeFractureMaterial(.050),makeFractureMaterial(.044)];
 const fineCrackMaterial=new THREE.LineBasicMaterial({color:0xf7ffff,transparent:true,opacity:.014,depthWrite:false});
 const airMaterial=new THREE.MeshPhysicalMaterial({
  color:0xffffff,roughness:.04,transparent:true,opacity:.31,depthWrite:false,ior:1.0,
  specularIntensity:1,envMapIntensity:.58
 });
 const microBubbleMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.17,depthWrite:false});
 const wetFilmMaterial=new THREE.MeshPhysicalMaterial({
  color:0xffffff,metalness:0,roughness:.006,transparent:true,opacity:.028,depthWrite:false,
  ior:1.333,clearcoat:1,clearcoatRoughness:.002,envMapIntensity:2.1,specularIntensity:1
 });
 const cloudGeometry=new THREE.IcosahedronGeometry(1,2);
 const beadGeometry=new THREE.SphereGeometry(1,12,8);
 const microBeadGeometry=new THREE.SphereGeometry(1,8,6);
 const meltDropMaterial=glass.material({distortion:.0054,roughness:.004,frost:0,absorption:.0015,dispersion:0});
 const cubes=[];
 const layout=[[-1.05,.84,-.28,.55],[1.04,1.00,-.46,.60],[-1.06,-.92,.03,.60],[1.03,-.78,.20,.64]];
 const geometries=[cloudGeometry];
 const fractureGeometries=[];
 const crackGeometries=[];
 const masterSeed=29;

 layout.forEach(([x,y,z,size],i)=>{
  const random=makeRng(masterSeed+i*73);
  const geometry=createIceGeometry(i+1,.18+i*.008);geometries.push(geometry);
  const carrier=new THREE.Group();
  const cube=new THREE.Mesh(geometry,outerMaterials[i]);cube.renderOrder=2;carrier.add(cube);

  const wetFilm=new THREE.Mesh(geometry,wetFilmMaterial);
  wetFilm.scale.set(1.0016,1.0016,1.0016);wetFilm.renderOrder=8;carrier.add(wetFilm);

  // Real freezer ice has a dispersed cloudy volume, not one white spherical core.
  const cloudCount=58+Math.floor(random()*24);
  const clouds=new THREE.InstancedMesh(cloudGeometry,cloudMaterials[i],cloudCount);
  const cloudDummy=new THREE.Object3D();
  const coreCenter=new THREE.Vector3((random()-.5)*.055,(random()-.5)*.040,(random()-.5)*.055);
  const plumeTilt=new THREE.Vector3((random()-.5)*.10,1,(random()-.5)*.10).normalize();
  for(let c=0;c<cloudCount;c++){
   const along=(random()-.5)*.58;
   const spread=.025+Math.pow(random(),1.9)*.19;
   const radial=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize().multiplyScalar(spread);
   cloudDummy.position.copy(coreCenter).addScaledVector(plumeTilt,along).add(radial);
   const base=.025+Math.pow(random(),1.7)*.070;
   cloudDummy.scale.set(base*(.75+random()*.95),base*(1.0+random()*1.9),base*(.75+random()*.95));
   cloudDummy.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);
   cloudDummy.updateMatrix();clouds.setMatrixAt(c,cloudDummy.matrix);
  }
  clouds.instanceMatrix.needsUpdate=true;clouds.renderOrder=1;carrier.add(clouds);
  root.add(carrier);

  // Sparse broad fracture sheets; nearly invisible until they catch a highlight.
  const planeCount=3+Math.floor(random()*2);
  for(let p=0;p<planeCount;p++){
   const planeGeometry=createFracturePlane(random,.12+random()*.095);fractureGeometries.push(planeGeometry);
   const plane=new THREE.Mesh(planeGeometry,fractureMaterials[i]);
   plane.position.set((random()-.5)*.24,(random()-.5)*.28,(random()-.5)*.24);
   plane.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);
   plane.scale.set(1,.18+random()*.35,1);plane.renderOrder=3;carrier.add(plane);
  }
  const crackGeometry=createFineCrack(random,.28);crackGeometries.push(crackGeometry);
  const crack=new THREE.LineSegments(crackGeometry,fineCrackMaterial);crack.renderOrder=4;carrier.add(crack);

  // Larger trapped bubbles cluster through the central freezing channel.
  const airCount=32+Math.floor(random()*14);
  const air=new THREE.InstancedMesh(beadGeometry,airMaterial,airCount),dummy=new THREE.Object3D();
  for(let j=0;j<airCount;j++){
   const along=(random()-.5)*.55;
   const spread=.020+Math.pow(random(),1.6)*.16;
   const radial=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize().multiplyScalar(spread);
   dummy.position.copy(coreCenter).addScaledVector(plumeTilt,along).add(radial);
   const r=.0030+Math.pow(random(),2.0)*.017;
   dummy.scale.set(r,r*(.70+random()*1.35),r*(.80+random()*.42));
   dummy.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);dummy.updateMatrix();air.setMatrixAt(j,dummy.matrix);
  }
  air.instanceMatrix.needsUpdate=true;air.renderOrder=4;carrier.add(air);

  // Dense micro bubbles create the milky frozen center without an opaque blob.
  const microCount=210+Math.floor(random()*80);
  const micro=new THREE.InstancedMesh(microBeadGeometry,microBubbleMaterial,microCount),microDummy=new THREE.Object3D();
  for(let j=0;j<microCount;j++){
   const along=(random()-.5)*.64;
   const spread=.006+Math.pow(random(),2.5)*.12;
   const radial=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize().multiplyScalar(spread);
   microDummy.position.copy(coreCenter).addScaledVector(plumeTilt,along).add(radial);
   const r=.0009+Math.pow(random(),1.7)*.0046;
   microDummy.scale.set(r,r*(.58+random()*1.10),r);microDummy.updateMatrix();micro.setMatrixAt(j,microDummy.matrix);
  }
  micro.instanceMatrix.needsUpdate=true;micro.renderOrder=4;carrier.add(micro);

  // Surface melt beads cling mainly to the lower perimeter and corners.
  const dropCount=30+Math.floor(random()*12);
  const meltDrops=new THREE.InstancedMesh(beadGeometry,meltDropMaterial,dropCount),drop=new THREE.Object3D();
  for(let j=0;j<dropCount;j++){
   const face=Math.floor(random()*5);
   const a=(random()-.5)*.70,b=(random()-.5)*.70,edge=.506;
   if(face===0)drop.position.set(a,-edge,b);
   else if(face===1)drop.position.set(edge,-.42+random()*.55,b);
   else if(face===2)drop.position.set(-edge,-.42+random()*.55,b);
   else if(face===3)drop.position.set(a,-.42+random()*.55,edge);
   else drop.position.set(a,-.42+random()*.55,-edge);
   const r=.0055+Math.pow(random(),1.3)*.021;
   drop.scale.set(r,r*(1.05+random()*.90),r*.55);drop.updateMatrix();meltDrops.setMatrixAt(j,drop.matrix);
  }
  meltDrops.instanceMatrix.needsUpdate=true;meltDrops.renderOrder=9;carrier.add(meltDrops);

  cubes.push({carrier,x,y,z,size,phase:i*1.72,spin:.018+random()*.010,drift:.006+random()*.005});
 });

 const sprayRandom=makeRng(911);
 const spray=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,7),glass.material({distortion:.0032,roughness:.005,absorption:.0015,dispersion:0}),22);
 spray.renderOrder=3;root.add(spray);
 const spraySeeds=Array.from({length:22},()=>({
  side:sprayRandom()>.5?1:-1,x:.84+sprayRandom()*.58,y:(sprayRandom()-.5)*3.16,z:sprayRandom()*.62-.25,
  r:.0038+Math.pow(sprayRandom(),1.9)*.015,phase:sprayRandom()*Math.PI*2,stretch:.98+sprayRandom()*.30
 }));
 const sprayDummy=new THREE.Object3D();
 glass.exclude(root);
 let impulseAt=-100;

 return {
  root,
  impulse(time){impulseAt=time;},
  update(time,pose,energy=0){
   root.position.set(pose.x,pose.y,0);root.scale.setScalar(pose.size);
   const age=Math.max(0,time-impulseAt),kick=Math.sin(age*7.0)*Math.exp(-age*4.6)*.040;
   spraySeeds.forEach((s,i)=>{
    sprayDummy.position.set(s.side*(s.x+kick*.22),s.y+Math.sin(time*.28+s.phase)*.010,s.z);
    sprayDummy.scale.set(s.r,s.r*s.stretch,s.r*.76);sprayDummy.updateMatrix();spray.setMatrixAt(i,sprayDummy.matrix);
   });spray.instanceMatrix.needsUpdate=true;
   for(const c of cubes){
    const drift=Math.sin(time*.25+c.phase)*c.drift;
    c.carrier.position.set(c.x+Math.sign(c.x)*(kick+energy*.013),c.y+drift,c.z+Math.cos(time*.17+c.phase)*.012);
    c.carrier.scale.setScalar(c.size);
    c.carrier.rotation.set(.24+Math.sin(time*.065+c.phase)*.030,c.phase+time*c.spin,.15+Math.cos(time*.095+c.phase)*.032);
   }
  },
  dispose(){
   geometries.forEach(g=>g.dispose());fractureGeometries.forEach(g=>g.dispose());crackGeometries.forEach(g=>g.dispose());
   cloudMaterials.forEach(m=>m.dispose());fractureMaterials.forEach(m=>m.dispose());wetFilmMaterial.dispose();
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
  material({distortion=.012,roughness=.04,frost=0,absorption=.008,dispersion=0}={}){
   const material=new THREE.MeshPhysicalMaterial({
    depthWrite:false,color:0xffffff,metalness:0,roughness,ior:1.309,
    clearcoat:1,clearcoatRoughness:.006,envMapIntensity:1.82,specularIntensity:1
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
     vec2 uv=clamp(glassUv-offset,vec2(.002),vec2(.998));
     vec3 transmitted=texture2D(glassScene,uv).rgb;
     float facing=clamp(dot(normal,normalize(vViewPosition)),0.,1.);
     float edge=pow(1.-facing,1.30);
     vec2 texel=.82/glassResolution;
     vec3 blur=(texture2D(glassScene,uv+vec2(texel.x,0.)).rgb+texture2D(glassScene,uv-vec2(texel.x,0.)).rgb+texture2D(glassScene,uv+vec2(0.,texel.y)).rgb+texture2D(glassScene,uv-vec2(0.,texel.y)).rgb)*.25;
     transmitted=mix(transmitted,blur,clamp(glassFrost*3.0,0.,.035));
     vec3 sigma=vec3(.34,.12,.05);
     transmitted*=exp(-sigma*glassAbsorption*(.18+edge*.62)*2.1);
     float fresnel=.020+.980*pow(1.-facing,5.0);
     vec3 rim=vec3(1.0,.998,.992)*pow(1.-facing,2.65)*.145;
     vec3 volume=transmitted+rim;
     vec3 outgoingLight=volume*(1.-fresnel*.25)+totalSpecular*(1.30+fresnel*1.72);
    `);
   };
   material.customProgramCacheKey=()=>`fizora-real-floating-ice-v11-${distortion}-${frost}-${absorption}`;
   return material;
  },
  resize(){
   const size=renderer.getDrawingBufferSize(new THREE.Vector2());resolution.value.copy(size);
   const scale=innerWidth<760?.60:.80;
   target.setSize(Math.max(1,Math.min(2048,Math.round(size.x*scale))),Math.max(1,Math.min(1152,Math.round(size.y*scale))));
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
