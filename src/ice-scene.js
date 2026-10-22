import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

function makeRng(seed){
 let state=Math.max(1,seed|0);
 return ()=>{state=state*16807%2147483647;return(state-1)/2147483646;};
}

export function createIceGeometry(seed=1,melt=.185){
 const geometry=new RoundedBoxGeometry(1,1,1,14,melt);
 const p=geometry.attributes.position;
 const phase=seed*1.913;
 for(let i=0;i<p.count;i++){
  let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  const edge=Math.max(Math.abs(x),Math.abs(y),Math.abs(z));
  const corner=Math.pow(Math.min(1,(Math.abs(x)+Math.abs(y)+Math.abs(z))/1.20),4.2);
  const broad=Math.sin(x*(3.9+seed*.07)+y*2.8+phase)*Math.sin(z*4.7-x*2.5-phase*.37);
  const mid=Math.sin(x*8.6+z*7.1-y*5.1+phase*.59);
  const fine=Math.sin(x*18.2-z*14.3+y*10.8+phase*1.77);
  const surface=(broad*.0095+mid*.0033+fine*.0010)*(.35+edge*.82);
  const asymX=1+Math.sin(y*2.4+phase)*.020;
  const asymY=1+Math.cos(x*3.7-z*1.6+phase)*.016;
  const asymZ=1+Math.sin(y*3.1+x*1.7-phase)*.020;
  const cornerMelt=1-corner*(.012+.008*Math.max(0,Math.sin((x-z)*8.2+phase)));
  const bottomCompression=y<-.05?1-Math.min(.038,Math.abs(y+.05)*.034):1;
  x*=(1+surface)*asymX*cornerMelt;
  y*=(1+surface)*asymY*bottomCompression;
  z*=(1+surface)*asymZ*cornerMelt;
  // Real melting ice settles onto a slightly uneven, flattened wet base.
  if(y<-.455)y=Math.max(y,-.486+Math.sin((x+z)*6.7+phase)*.0055+Math.sin(x*15-z*11)*.0015);
  // The top face is never perfectly flat after melting.
  if(y>.425){
   const crown=(Math.cos(x*4.6+phase)+Math.sin(z*4.1-phase))*.0032;
   y-=.007+crown+corner*.0045;
  }
  p.setXYZ(i,x,y,z);
 }
 p.needsUpdate=true;
 geometry.computeVertexNormals();
 geometry.computeBoundingSphere();
 return geometry;
}

function createFracturePlane(random,scale=.20){
 const points=[];
 const sides=5+Math.floor(random()*4);
 for(let i=0;i<sides;i++){
  const a=i/sides*Math.PI*2;
  const r=scale*(.50+random()*.50);
  points.push(new THREE.Vector2(Math.cos(a)*r,Math.sin(a)*r));
 }
 return new THREE.ShapeGeometry(new THREE.Shape(points),1);
}

function createFineCrack(random,intensity=.40){
 const vertices=[];
 const origin=new THREE.Vector3((random()-.5)*.08,(random()-.5)*.10,(random()-.5)*.08);
 const branches=2+Math.floor(random()*2);
 for(let branch=0;branch<branches;branch++){
  let point=origin.clone();
  let direction=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize();
  const steps=2+Math.floor(random()*2);
  for(let step=0;step<steps;step++){
   direction.add(new THREE.Vector3((random()-.5)*.13,(random()-.5)*.13,(random()-.5)*.13)).normalize();
   const next=point.clone().addScaledVector(direction,(.035+random()*.055)*intensity);
   next.clampScalar(-.30,.30);
   vertices.push(...point.toArray(),...next.toArray());
   point=next;
  }
 }
 return new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
}

function makeCloudMaterial(opacity=.42){
 return new THREE.MeshPhysicalMaterial({
  color:0xf8fcfc,metalness:0,roughness:.92,transmission:.015,thickness:.95,
  attenuationColor:new THREE.Color(0xf1f9fa),attenuationDistance:.28,
  transparent:true,opacity,depthWrite:false,ior:1.309,envMapIntensity:.18,
  clearcoat:0,clearcoatRoughness:.6,specularIntensity:.20
 });
}

function makeFractureMaterial(opacity=.055){
 return new THREE.MeshPhysicalMaterial({
  color:0xf9ffff,roughness:.24,transparent:true,opacity,depthWrite:false,
  side:THREE.DoubleSide,metalness:0,ior:1.309,envMapIntensity:.62,
  clearcoat:.35,clearcoatRoughness:.08,specularIntensity:.82
 });
}

export function createIceScene(scene,glass){
 const root=new THREE.Group();scene.add(root);
 // Outer shell remains clear and wet. The cloudy mass is modeled separately inside.
 const outerMaterials=[
  glass.material({distortion:.052,roughness:.014,frost:.0040,absorption:.010,dispersion:0}),
  glass.material({distortion:.056,roughness:.016,frost:.0050,absorption:.012,dispersion:0}),
  glass.material({distortion:.049,roughness:.013,frost:.0035,absorption:.009,dispersion:0}),
  glass.material({distortion:.058,roughness:.017,frost:.0055,absorption:.013,dispersion:0})
 ];
 const cloudMaterials=[makeCloudMaterial(.46),makeCloudMaterial(.50),makeCloudMaterial(.42),makeCloudMaterial(.52)];
 const fractureMaterials=[makeFractureMaterial(.058),makeFractureMaterial(.050),makeFractureMaterial(.062),makeFractureMaterial(.054)];
 const fineCrackMaterial=new THREE.LineBasicMaterial({color:0xf4ffff,transparent:true,opacity:.020,depthWrite:false});
 const airMaterial=new THREE.MeshPhysicalMaterial({
  color:0xffffff,roughness:.06,transparent:true,opacity:.34,depthWrite:false,ior:1.0,
  specularIntensity:.92,envMapIntensity:.54
 });
 const microBubbleMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.20,depthWrite:false});
 const wetFilmMaterial=new THREE.MeshPhysicalMaterial({
  color:0xffffff,metalness:0,roughness:.008,transparent:true,opacity:.035,depthWrite:false,
  ior:1.333,clearcoat:1,clearcoatRoughness:.003,envMapIntensity:1.9,specularIntensity:1
 });
 const beadGeometry=new THREE.SphereGeometry(1,12,8);
 const microBeadGeometry=new THREE.SphereGeometry(1,8,6);
 const meltDropMaterial=glass.material({distortion:.0052,roughness:.006,frost:0,absorption:.002,dispersion:0});
 const cubes=[];
 const layout=[[-1.05,.84,-.28,.55],[1.04,1.00,-.46,.60],[-1.06,-.92,.03,.60],[1.03,-.78,.20,.64]];
 const geometries=[];
 const fractureGeometries=[];
 const crackGeometries=[];
 const puddleGeometries=[];
 const masterSeed=29;

 layout.forEach(([x,y,z,size],i)=>{
  const random=makeRng(masterSeed+i*73);
  const geometry=createIceGeometry(i+1,.175+i*.008);geometries.push(geometry);
  const carrier=new THREE.Group();
  const cube=new THREE.Mesh(geometry,outerMaterials[i]);cube.renderOrder=2;carrier.add(cube);

  // Extremely thin wet shell gives the crisp photographed-water highlight without whitening the cube.
  const wetFilm=new THREE.Mesh(geometry,wetFilmMaterial);
  wetFilm.scale.set(1.0018,1.0018,1.0018);wetFilm.renderOrder=7;carrier.add(wetFilm);

  // Build the frozen white center from overlapping irregular volumes instead of an inner cube.
  const cloudCount=7+Math.floor(random()*3);
  const coreCenter=new THREE.Vector3((random()-.5)*.045,(random()-.5)*.045,(random()-.5)*.045);
  for(let c=0;c<cloudCount;c++){
   const radius=.115+random()*.105;
   const cloudGeometry=new THREE.IcosahedronGeometry(radius,2);geometries.push(cloudGeometry);
   const cloud=new THREE.Mesh(cloudGeometry,cloudMaterials[i]);
   cloud.scale.set(.85+random()*.85,.72+random()*1.05,.82+random()*.90);
   const r=Math.pow(random(),1.5)*.20;
   const dir=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize().multiplyScalar(r);
   cloud.position.copy(coreCenter).add(dir);
   cloud.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);
   cloud.renderOrder=1;carrier.add(cloud);
  }
  // A softer vertical plume reproduces the cloudy air-rich freezing channel visible in real cubes.
  for(let c=0;c<3;c++){
   const plumeGeometry=new THREE.IcosahedronGeometry(.15+random()*.045,2);geometries.push(plumeGeometry);
   const plume=new THREE.Mesh(plumeGeometry,cloudMaterials[i]);
   plume.scale.set(.75+random()*.35,1.35+random()*.65,.75+random()*.35);
   plume.position.set(coreCenter.x+(random()-.5)*.08,(c-1)*.12+(random()-.5)*.05,coreCenter.z+(random()-.5)*.08);
   plume.rotation.set(random()*.4,random()*Math.PI,random()*.4);plume.renderOrder=1;carrier.add(plume);
  }
  root.add(carrier);

  // Real fracture sheets are sparse, broad and reflective; bright drawn lines are avoided.
  const planeCount=2+Math.floor(random()*2);
  for(let p=0;p<planeCount;p++){
   const planeGeometry=createFracturePlane(random,.14+random()*.095);fractureGeometries.push(planeGeometry);
   const plane=new THREE.Mesh(planeGeometry,fractureMaterials[i]);
   plane.position.set((random()-.5)*.22,(random()-.5)*.24,(random()-.5)*.22);
   plane.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);
   plane.scale.set(1,.24+random()*.40,1);plane.renderOrder=3;carrier.add(plane);
  }
  const crackGeometry=createFineCrack(random,.34);crackGeometries.push(crackGeometry);
  const crack=new THREE.LineSegments(crackGeometry,fineCrackMaterial);crack.renderOrder=4;carrier.add(crack);

  // Larger trapped bubbles stay concentrated around the frozen center.
  const airCount=28+Math.floor(random()*12);
  const air=new THREE.InstancedMesh(beadGeometry,airMaterial,airCount),dummy=new THREE.Object3D();
  const bubbleCenter=coreCenter.clone();
  for(let j=0;j<airCount;j++){
   const radius=Math.pow(random(),.78)*.28;
   const direction=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize().multiplyScalar(radius);
   dummy.position.copy(bubbleCenter).add(direction);
   const r=.0032+Math.pow(random(),2.0)*.018;
   dummy.scale.set(r,r*(.72+random()*1.25),r*(.80+random()*.45));
   dummy.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);dummy.updateMatrix();air.setMatrixAt(j,dummy.matrix);
  }
  air.instanceMatrix.needsUpdate=true;air.renderOrder=4;carrier.add(air);

  // Dense micro-bubble plume is one of the strongest real-ice cues in the photographic target.
  const microCount=170+Math.floor(random()*70);
  const micro=new THREE.InstancedMesh(microBeadGeometry,microBubbleMaterial,microCount),microDummy=new THREE.Object3D();
  const clusterAxis=new THREE.Vector3((random()-.5)*.16,1,(random()-.5)*.16).normalize();
  for(let j=0;j<microCount;j++){
   const along=(random()-.5)*.62;
   const radius=.010+Math.pow(random(),2.2)*.105;
   const radial=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize().multiplyScalar(radius);
   microDummy.position.copy(clusterAxis).multiplyScalar(along).add(radial).add(bubbleCenter);
   const r=.0010+Math.pow(random(),1.7)*.0048;
   microDummy.scale.set(r,r*(.62+random()*.95),r);microDummy.updateMatrix();micro.setMatrixAt(j,microDummy.matrix);
  }
  micro.instanceMatrix.needsUpdate=true;micro.renderOrder=4;carrier.add(micro);

  // Wet beads: fewer but brighter, concentrated at edges and underside like a melting macro photograph.
  const dropCount=26+Math.floor(random()*12);
  const meltDrops=new THREE.InstancedMesh(beadGeometry,meltDropMaterial,dropCount),drop=new THREE.Object3D();
  for(let j=0;j<dropCount;j++){
   const under=random()<.62;
   const a=(random()-.5)*.70,b=(random()-.5)*.70,edge=.505;
   if(under)drop.position.set(a,-edge,b);
   else{
    const side=Math.floor(random()*4),lower=-.44+random()*.60;
    if(side===0)drop.position.set(edge,lower,b);else if(side===1)drop.position.set(-edge,lower,b);
    else if(side===2)drop.position.set(a,lower,edge);else drop.position.set(a,lower,-edge);
   }
   const r=.006+Math.pow(random(),1.35)*.022;
   drop.scale.set(r,r*(1.08+random()*.82),r*.56);drop.updateMatrix();meltDrops.setMatrixAt(j,drop.matrix);
  }
  meltDrops.instanceMatrix.needsUpdate=true;meltDrops.renderOrder=8;carrier.add(meltDrops);

  // Thin asymmetric meltwater lens under the cube.
  const puddleGeometry=new THREE.SphereGeometry(.45,34,14);puddleGeometries.push(puddleGeometry);
  const puddle=new THREE.Mesh(puddleGeometry,meltDropMaterial);
  puddle.scale.set(1.08,.025,.96);puddle.position.set(.015,-.497,.01);puddle.renderOrder=5;carrier.add(puddle);

  cubes.push({carrier,x,y,z,size,phase:i*1.72,spin:.022+random()*.012,drift:.008+random()*.006});
 });

 const sprayRandom=makeRng(911);
 const spray=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,7),glass.material({distortion:.0035,roughness:.007,absorption:.002,dispersion:0}),26);
 spray.renderOrder=3;root.add(spray);
 const spraySeeds=Array.from({length:26},()=>({
  side:sprayRandom()>.5?1:-1,x:.82+sprayRandom()*.62,y:(sprayRandom()-.5)*3.22,z:sprayRandom()*.66-.27,
  r:.004+Math.pow(sprayRandom(),1.9)*.016,phase:sprayRandom()*Math.PI*2,stretch:.96+sprayRandom()*.34
 }));
 const sprayDummy=new THREE.Object3D();
 glass.exclude(root);
 let impulseAt=-100;

 return {
  root,
  impulse(time){impulseAt=time;},
  update(time,pose,energy=0){
   root.position.set(pose.x,pose.y,0);root.scale.setScalar(pose.size);
   const age=Math.max(0,time-impulseAt),kick=Math.sin(age*7.2)*Math.exp(-age*4.4)*.045;
   spraySeeds.forEach((s,i)=>{
    sprayDummy.position.set(s.side*(s.x+kick*.25),s.y+Math.sin(time*.32+s.phase)*.012,s.z);
    sprayDummy.scale.set(s.r,s.r*s.stretch,s.r*.76);sprayDummy.updateMatrix();spray.setMatrixAt(i,sprayDummy.matrix);
   });spray.instanceMatrix.needsUpdate=true;
   for(const c of cubes){
    const drift=Math.sin(time*.28+c.phase)*c.drift;
    c.carrier.position.set(c.x+Math.sign(c.x)*(kick+energy*.016),c.y+drift,c.z+Math.cos(time*.19+c.phase)*.015);
    c.carrier.scale.setScalar(c.size);
    // Heavy, almost-static movement keeps the cube photographic rather than decorative.
    c.carrier.rotation.set(.25+Math.sin(time*.075+c.phase)*.035,c.phase+time*c.spin,.16+Math.cos(time*.105+c.phase)*.038);
   }
  },
  dispose(){
   geometries.forEach(g=>g.dispose());fractureGeometries.forEach(g=>g.dispose());crackGeometries.forEach(g=>g.dispose());puddleGeometries.forEach(g=>g.dispose());
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
  material({distortion=.012,roughness=.04,frost=0,absorption=.010,dispersion=0}={}){
   const material=new THREE.MeshPhysicalMaterial({
    depthWrite:false,color:0xffffff,metalness:0,roughness,ior:1.309,
    clearcoat:1,clearcoatRoughness:.008,envMapIntensity:1.72,specularIntensity:1
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
     float edge=pow(1.-facing,1.36);
     vec2 texel=1.0/glassResolution;
     vec3 blur=(texture2D(glassScene,uv+vec2(texel.x,0.)).rgb+texture2D(glassScene,uv-vec2(texel.x,0.)).rgb+texture2D(glassScene,uv+vec2(0.,texel.y)).rgb+texture2D(glassScene,uv-vec2(0.,texel.y)).rgb)*.25;
     transmitted=mix(transmitted,blur,clamp(glassFrost*4.8,0.,.08));
     // Keep the shell optically clear; only a very mild cool attenuation appears in thicker grazing angles.
     vec3 sigma=vec3(.42,.16,.07);
     transmitted*=exp(-sigma*glassAbsorption*(.22+edge*.72)*2.5);
     float fresnel=.020+.980*pow(1.-facing,5.0);
     vec3 rim=vec3(1.0,.995,.985)*pow(1.-facing,3.0)*.11;
     vec3 volume=transmitted+rim;
     vec3 outgoingLight=volume*(1.-fresnel*.30)+totalSpecular*(1.24+fresnel*1.58);
    `);
   };
   material.customProgramCacheKey=()=>`fizora-photographic-ice-v10-${distortion}-${frost}-${absorption}`;
   return material;
  },
  resize(){
   const size=renderer.getDrawingBufferSize(new THREE.Vector2());resolution.value.copy(size);
   const scale=innerWidth<760?.58:.78;
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
