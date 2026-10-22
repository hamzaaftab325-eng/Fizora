import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

function makeRng(seed){
 let state=Math.max(1,seed|0);
 return ()=>{state=state*16807%2147483647;return(state-1)/2147483646;};
}

export function createIceGeometry(seed=1,melt=.165){
 const geometry=new RoundedBoxGeometry(1,1,1,12,melt);
 const p=geometry.attributes.position;
 const phase=seed*1.913;
 for(let i=0;i<p.count;i++){
  let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  const edge=Math.max(Math.abs(x),Math.abs(y),Math.abs(z));
  const corner=Math.pow(Math.min(1,(Math.abs(x)+Math.abs(y)+Math.abs(z))/1.24),4.5);
  const broad=Math.sin(x*(4.2+seed*.08)+y*3.15+phase)*Math.sin(z*5.1-x*2.8-phase*.41);
  const mid=Math.sin(x*9.7+z*7.8-y*5.7+phase*.67);
  const fine=Math.sin(x*20.4-z*15.8+y*11.9+phase*1.91);
  const meltWave=(broad*.0105+mid*.0036+fine*.0011)*(.45+edge*.72);
  const asymX=1+Math.sin(y*2.7+phase)*.017;
  const asymY=1+Math.cos(x*4.0-z*1.8+phase)*.013;
  const asymZ=1+Math.sin(y*3.5+x*1.9-phase)*.017;
  const cornerMelt=1-corner*(.008+.006*Math.max(0,Math.sin((x-z)*9+phase)));
  const bottomCompression=y<-.08?1-Math.min(.030,Math.abs(y+.08)*.027):1;
  x*= (1+meltWave)*asymX*cornerMelt;
  y*= (1+meltWave)*asymY*bottomCompression;
  z*= (1+meltWave)*asymZ*cornerMelt;
  if(y<-.466)y=Math.max(y,-.490+Math.sin((x+z)*7.4+phase)*.0045);
  if(y>.445){
   const crown=(Math.cos(x*5.1+phase)+Math.sin(z*4.7-phase))*.0024;
   y-=.0045+crown+corner*.0035;
  }
  p.setXYZ(i,x,y,z);
 }
 p.needsUpdate=true;
 geometry.computeVertexNormals();
 geometry.computeBoundingSphere();
 return geometry;
}

function createFracturePlane(random,scale=.22){
 const points=[];
 const sides=5+Math.floor(random()*3);
 for(let i=0;i<sides;i++){
  const a=i/sides*Math.PI*2;
  const r=scale*(.54+random()*.46);
  points.push(new THREE.Vector2(Math.cos(a)*r,Math.sin(a)*r));
 }
 return new THREE.ShapeGeometry(new THREE.Shape(points),1);
}

function createFineCrack(random,intensity=.55){
 const vertices=[];
 const origin=new THREE.Vector3((random()-.5)*.10,(random()-.5)*.12,(random()-.5)*.10);
 const branches=2+Math.floor(random()*3);
 for(let branch=0;branch<branches;branch++){
  let point=origin.clone();
  let direction=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize();
  const steps=2+Math.floor(random()*2);
  for(let step=0;step<steps;step++){
   direction.add(new THREE.Vector3((random()-.5)*.15,(random()-.5)*.15,(random()-.5)*.15)).normalize();
   const next=point.clone().addScaledVector(direction,(.040+random()*.065)*intensity);
   next.clampScalar(-.33,.33);
   vertices.push(...point.toArray(),...next.toArray());
   point=next;
  }
 }
 return new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
}

function makeCloudMaterial(opacity=.28){
 return new THREE.MeshPhysicalMaterial({
  color:0xf1fafb,metalness:0,roughness:.78,transmission:.08,thickness:.72,
  attenuationColor:new THREE.Color(0xe8f6f7),attenuationDistance:.42,
  transparent:true,opacity,depthWrite:false,ior:1.309,envMapIntensity:.32,
  clearcoat:.02,clearcoatRoughness:.44,specularIntensity:.36
 });
}

function makeFractureMaterial(opacity=.075){
 return new THREE.MeshPhysicalMaterial({
  color:0xf7ffff,roughness:.34,transparent:true,opacity,depthWrite:false,
  side:THREE.DoubleSide,metalness:0,ior:1.309,envMapIntensity:.50,
  clearcoat:.22,clearcoatRoughness:.10,specularIntensity:.72
 });
}

export function createIceScene(scene,glass){
 const root=new THREE.Group();scene.add(root);
 const outerMaterials=[
  glass.material({distortion:.038,roughness:.031,frost:.018,absorption:.030,dispersion:.00020}),
  glass.material({distortion:.041,roughness:.034,frost:.021,absorption:.033,dispersion:.00022}),
  glass.material({distortion:.036,roughness:.029,frost:.016,absorption:.028,dispersion:.00018}),
  glass.material({distortion:.043,roughness:.036,frost:.023,absorption:.035,dispersion:.00024})
 ];
 const cloudMaterials=[makeCloudMaterial(.31),makeCloudMaterial(.35),makeCloudMaterial(.27),makeCloudMaterial(.37)];
 const fractureMaterials=[makeFractureMaterial(.072),makeFractureMaterial(.062),makeFractureMaterial(.078),makeFractureMaterial(.068)];
 const fineCrackMaterial=new THREE.LineBasicMaterial({color:0xe9f7f8,transparent:true,opacity:.032,depthWrite:false});
 const airMaterial=new THREE.MeshPhysicalMaterial({
  color:0xfbffff,roughness:.12,transparent:true,opacity:.26,depthWrite:false,ior:1.0,
  specularIntensity:.70,envMapIntensity:.35
 });
 const microBubbleMaterial=new THREE.MeshBasicMaterial({color:0xf8ffff,transparent:true,opacity:.15,depthWrite:false});
 const wetFilmMaterial=new THREE.MeshPhysicalMaterial({
  color:0xffffff,metalness:0,roughness:.018,transparent:true,opacity:.055,depthWrite:false,
  ior:1.333,clearcoat:1,clearcoatRoughness:.007,envMapIntensity:1.45,specularIntensity:1
 });
 const beadGeometry=new THREE.SphereGeometry(1,10,7);
 const microBeadGeometry=new THREE.SphereGeometry(1,7,5);
 const meltDropMaterial=glass.material({distortion:.0046,roughness:.011,frost:.0005,absorption:.004,dispersion:.0001});
 const cubes=[];
 const layout=[[-1.05,.84,-.28,.55],[1.04,1.00,-.46,.60],[-1.06,-.92,.03,.60],[1.03,-.78,.20,.64]];
 const geometries=[];
 const fractureGeometries=[];
 const crackGeometries=[];
 const puddleGeometries=[];
 const masterSeed=29;

 layout.forEach(([x,y,z,size],i)=>{
  const random=makeRng(masterSeed+i*73);
  const geometry=createIceGeometry(i+1,.155+i*.008);geometries.push(geometry);
  const carrier=new THREE.Group();
  const cube=new THREE.Mesh(geometry,outerMaterials[i]);cube.renderOrder=2;carrier.add(cube);
  const wetFilm=new THREE.Mesh(geometry,wetFilmMaterial);
  wetFilm.scale.set(1.0025,1.0025,1.0025);wetFilm.renderOrder=5;carrier.add(wetFilm);
  const core=new THREE.Mesh(geometry,cloudMaterials[i]);
  core.scale.set(.61+random()*.07,.67+random()*.08,.59+random()*.08);
  core.position.set((random()-.5)*.045,(random()-.5)*.055,(random()-.5)*.045);
  core.rotation.set((random()-.5)*.12,(random()-.5)*.12,(random()-.5)*.12);
  core.renderOrder=1;carrier.add(core);
  const bloomCount=4+Math.floor(random()*3);
  for(let c=0;c<bloomCount;c++){
   const bloomGeometry=new THREE.IcosahedronGeometry(.13+random()*.095,2);geometries.push(bloomGeometry);
   const bloom=new THREE.Mesh(bloomGeometry,cloudMaterials[i]);
   bloom.scale.set(.70+random()*.90,.60+random()*.95,.70+random()*.85);
   bloom.position.set((random()-.5)*.28,(random()-.5)*.31,(random()-.5)*.28);
   bloom.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);
   bloom.renderOrder=1;carrier.add(bloom);
  }
  root.add(carrier);
  const planeCount=2+Math.floor(random()*2);
  for(let p=0;p<planeCount;p++){
   const planeGeometry=createFracturePlane(random,.13+random()*.10);fractureGeometries.push(planeGeometry);
   const plane=new THREE.Mesh(planeGeometry,fractureMaterials[i]);
   plane.position.set((random()-.5)*.23,(random()-.5)*.25,(random()-.5)*.23);
   plane.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);
   plane.scale.set(1,.30+random()*.50,1);plane.renderOrder=3;carrier.add(plane);
  }
  const crackGeometry=createFineCrack(random,.42);crackGeometries.push(crackGeometry);
  const crack=new THREE.LineSegments(crackGeometry,fineCrackMaterial);crack.renderOrder=4;carrier.add(crack);
  const airCount=24+Math.floor(random()*12);
  const air=new THREE.InstancedMesh(beadGeometry,airMaterial,airCount),dummy=new THREE.Object3D();
  const bubbleCenter=new THREE.Vector3((random()-.5)*.08,(random()-.5)*.08,(random()-.5)*.08);
  for(let j=0;j<airCount;j++){
   const radius=Math.pow(random(),.72)*.30;
   const direction=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize().multiplyScalar(radius);
   dummy.position.copy(bubbleCenter).add(direction);
   const r=.0038+Math.pow(random(),2.2)*.020;
   dummy.scale.set(r,r*(.74+random()*1.05),r*(.82+random()*.34));
   dummy.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);dummy.updateMatrix();air.setMatrixAt(j,dummy.matrix);
  }
  air.instanceMatrix.needsUpdate=true;air.renderOrder=4;carrier.add(air);
  const microCount=105+Math.floor(random()*55);
  const micro=new THREE.InstancedMesh(microBeadGeometry,microBubbleMaterial,microCount),microDummy=new THREE.Object3D();
  const clusterAxis=new THREE.Vector3((random()-.5)*.35,1,(random()-.5)*.35).normalize();
  for(let j=0;j<microCount;j++){
   const along=(random()-.5)*.58;
   const radius=.018+Math.pow(random(),1.7)*.105;
   const radial=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize().multiplyScalar(radius);
   microDummy.position.copy(clusterAxis).multiplyScalar(along).add(radial).add(bubbleCenter);
   const r=.0014+Math.pow(random(),1.8)*.0058;
   microDummy.scale.set(r,r*(.65+random()*.85),r);microDummy.updateMatrix();micro.setMatrixAt(j,microDummy.matrix);
  }
  micro.instanceMatrix.needsUpdate=true;micro.renderOrder=4;carrier.add(micro);
  const dropCount=22+Math.floor(random()*10);
  const meltDrops=new THREE.InstancedMesh(beadGeometry,meltDropMaterial,dropCount),drop=new THREE.Object3D();
  for(let j=0;j<dropCount;j++){
   const under=random()<.58;
   const a=(random()-.5)*.72,b=(random()-.5)*.72,edge=.505;
   if(under)drop.position.set(a,-edge,b);
   else{
    const side=Math.floor(random()*4),lower=-.45+random()*.53;
    if(side===0)drop.position.set(edge,lower,b);else if(side===1)drop.position.set(-edge,lower,b);
    else if(side===2)drop.position.set(a,lower,edge);else drop.position.set(a,lower,-edge);
   }
   const r=.0065+Math.pow(random(),1.45)*.020;
   drop.scale.set(r,r*(1.10+random()*.72),r*.58);drop.updateMatrix();meltDrops.setMatrixAt(j,drop.matrix);
  }
  meltDrops.instanceMatrix.needsUpdate=true;meltDrops.renderOrder=6;carrier.add(meltDrops);
  const puddleGeometry=new THREE.SphereGeometry(.45,30,12);puddleGeometries.push(puddleGeometry);
  const puddle=new THREE.Mesh(puddleGeometry,meltDropMaterial);
  puddle.scale.set(1.04,.037,.94);puddle.position.set(.02,-.499,.015);puddle.renderOrder=4;carrier.add(puddle);
  cubes.push({carrier,x,y,z,size,phase:i*1.72,spin:.035+random()*.019,drift:.012+random()*.009});
 });

 const sprayRandom=makeRng(911);
 const spray=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,7),glass.material({distortion:.0038,roughness:.012,absorption:.004,dispersion:.0001}),34);
 spray.renderOrder=3;root.add(spray);
 const spraySeeds=Array.from({length:34},()=>({
  side:sprayRandom()>.5?1:-1,x:.80+sprayRandom()*.66,y:(sprayRandom()-.5)*3.28,z:sprayRandom()*.70-.29,
  r:.0045+Math.pow(sprayRandom(),1.9)*.018,phase:sprayRandom()*Math.PI*2,stretch:.94+sprayRandom()*.42
 }));
 const sprayDummy=new THREE.Object3D();
 glass.exclude(root);
 let impulseAt=-100;

 return {
  root,
  impulse(time){impulseAt=time;},
  update(time,pose,energy=0){
   root.position.set(pose.x,pose.y,0);root.scale.setScalar(pose.size);
   const age=Math.max(0,time-impulseAt),kick=Math.sin(age*7.6)*Math.exp(-age*4.0)*.055;
   spraySeeds.forEach((s,i)=>{
    sprayDummy.position.set(s.side*(s.x+kick*.28),s.y+Math.sin(time*.37+s.phase)*.016,s.z);
    sprayDummy.scale.set(s.r,s.r*s.stretch,s.r*.78);sprayDummy.updateMatrix();spray.setMatrixAt(i,sprayDummy.matrix);
   });spray.instanceMatrix.needsUpdate=true;
   for(const c of cubes){
    const drift=Math.sin(time*.34+c.phase)*c.drift;
    c.carrier.position.set(c.x+Math.sign(c.x)*(kick+energy*.021),c.y+drift,c.z+Math.cos(time*.23+c.phase)*.021);
    c.carrier.scale.setScalar(c.size);
    c.carrier.rotation.set(.27+Math.sin(time*.10+c.phase)*.055,c.phase+time*c.spin,.18+Math.cos(time*.14+c.phase)*.060);
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
  material({distortion=.012,roughness=.05,frost=0,absorption=.018,dispersion=.0002}={}){
   const material=new THREE.MeshPhysicalMaterial({
    depthWrite:false,color:0xfcfeff,metalness:0,roughness,ior:1.309,
    clearcoat:.98,clearcoatRoughness:.015,envMapIntensity:1.54,specularIntensity:1
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
     float edge=pow(1.-facing,1.48);
     float luma=dot(transmitted,vec3(.2126,.7152,.0722));
     float neutrality=clamp(glassFrost*8.0+glassAbsorption*2.8+edge*.10,0.,.46);
     transmitted=mix(transmitted,vec3(luma)*vec3(.98,1.015,1.025),neutrality);
     vec2 texel=1.25/glassResolution;
     vec3 blur4=(texture2D(glassScene,uvG+vec2(texel.x,0.)).rgb+texture2D(glassScene,uvG-vec2(texel.x,0.)).rgb+texture2D(glassScene,uvG+vec2(0.,texel.y)).rgb+texture2D(glassScene,uvG-vec2(0.,texel.y)).rgb)*.25;
     vec3 blurDiag=(texture2D(glassScene,uvG+texel).rgb+texture2D(glassScene,uvG-texel).rgb+texture2D(glassScene,uvG+vec2(texel.x,-texel.y)).rgb+texture2D(glassScene,uvG+vec2(-texel.x,texel.y)).rgb)*.25;
     float frostMix=clamp(glassFrost*(6.2+edge*4.0),0.,.27);
     transmitted=mix(transmitted,mix(blur4,blurDiag,.38),frostMix);
     float thicknessProxy=.20+edge*1.06+glassFrost*2.7;
     vec3 sigma=vec3(.86,.24,.10);
     transmitted*=exp(-sigma*glassAbsorption*thicknessProxy*3.4);
     float fresnel=.020+.980*pow(1.-facing,5.0);
     vec3 milkTint=vec3(.235,.255,.258);
     vec3 scatter=transmitted*.61+milkTint;
     float cloudy=clamp(glassFrost*(2.05+edge*.65),0.,.38);
     vec3 volume=mix(transmitted,scatter,cloudy);
     vec3 outgoingLight=volume*(1.-fresnel*.42)+totalSpecular*(1.08+fresnel*1.28);
    `);
   };
   material.customProgramCacheKey=()=>`fizora-real-ice-v9-${distortion}-${frost}-${absorption}-${dispersion}`;
   return material;
  },
  resize(){
   const size=renderer.getDrawingBufferSize(new THREE.Vector2());resolution.value.copy(size);
   const scale=innerWidth<760?.56:.74;
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
