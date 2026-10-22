import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

function makeRng(seed){
 let state=Math.max(1,seed|0);
 return ()=>{state=state*16807%2147483647;return(state-1)/2147483646;};
}

export function createIceGeometry(seed=1,melt=.20){
 const geometry=new RoundedBoxGeometry(1,1,1,16,melt);
 const p=geometry.attributes.position;
 const phase=seed*1.917;
 for(let i=0;i<p.count;i++){
  let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  const edge=Math.max(Math.abs(x),Math.abs(y),Math.abs(z));
  const corner=Math.pow(Math.min(1,(Math.abs(x)+Math.abs(y)+Math.abs(z))/1.16),3.8);
  const broad=Math.sin(x*(3.4+seed*.06)+y*2.35+phase)*Math.sin(z*4.1-x*2.05-phase*.31);
  const mid=Math.sin(x*7.4+z*6.15-y*4.2+phase*.51);
  const fine=Math.sin(x*16.1-z*12.8+y*9.3+phase*1.61);
  const surface=(broad*.012+mid*.0038+fine*.00115)*(.26+edge*.92);
  const asymX=1+Math.sin(y*2.0+phase)*.023;
  const asymY=1+Math.cos(x*3.1-z*1.3+phase)*.019;
  const asymZ=1+Math.sin(y*2.65+x*1.4-phase)*.023;
  const meltBias=1-corner*(.017+.010*Math.max(0,Math.sin((x-z)*7.1+phase)));
  x*=(1+surface)*asymX*meltBias;
  y*=(1+surface)*asymY*(1-corner*.006);
  z*=(1+surface)*asymZ*meltBias;

  // Melting rounds and slightly scallops every face; no rigid acrylic-flat surfaces.
  if(y>.405)y-=.009+(Math.cos(x*4.0+phase)+Math.sin(z*3.55-phase))*.0042+corner*.0055;
  if(y<-.405)y+=.006+(Math.sin(x*3.7-phase)+Math.cos(z*4.15+phase))*.0032+corner*.0035;
  if(x>.425)x-=.0045+Math.sin(y*4.1+z*3.4+phase)*.0025;
  if(x<-.425)x+=.0045+Math.cos(y*3.9-z*3.2-phase)*.0024;
  if(z>.425)z-=.0040+Math.sin(x*3.8+y*4.0-phase)*.0023;
  if(z<-.425)z+=.0040+Math.cos(x*3.5-y*3.7+phase)*.0023;
  p.setXYZ(i,x,y,z);
 }
 p.needsUpdate=true;
 geometry.computeVertexNormals();
 geometry.computeBoundingSphere();
 return geometry;
}

function createSurfaceBump(seed=301){
 const random=makeRng(seed);
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 const ctx=canvas.getContext('2d');const image=ctx.createImageData(256,256);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const i=(y*256+x)*4;
  const broad=Math.sin(x*.10+y*.067)*5+Math.sin(x*.037-y*.081)*4;
  const noise=(random()-.5)*13;
  const v=Math.max(0,Math.min(255,128+broad+noise));
  image.data[i]=image.data[i+1]=image.data[i+2]=v;image.data[i+3]=255;
 }
 ctx.putImageData(image,0,0);
 for(let i=0;i<85;i++){
  const x=random()*256,y=random()*256,r=1+random()*5;
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,'rgba(86,86,86,.25)');g.addColorStop(.55,'rgba(150,150,150,.12)');g.addColorStop(1,'rgba(128,128,128,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
 }
 const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1.35,1.35);
 texture.colorSpace=THREE.NoColorSpace;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
 return texture;
}

function createFrostTexture(seed=1){
 const random=makeRng(900+seed*97);
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,256,256);
 ctx.globalCompositeOperation='source-over';
 for(let i=0;i<48;i++){
  const x=128+(random()-.5)*90,y=128+(random()-.5)*125;
  const rx=7+random()*26,ry=14+random()*54;
  const g=ctx.createRadialGradient(x,y,0,x,y,Math.max(rx,ry));
  const alpha=.035+random()*.075;
  g.addColorStop(0,`rgba(255,255,255,${alpha})`);g.addColorStop(.45,`rgba(245,252,252,${alpha*.55})`);g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g;ctx.save();ctx.translate(x,y);ctx.rotate((random()-.5)*.8);ctx.scale(rx/Math.max(rx,ry),ry/Math.max(rx,ry));ctx.beginPath();ctx.arc(0,0,Math.max(rx,ry),0,Math.PI*2);ctx.fill();ctx.restore();
 }
 ctx.lineCap='round';
 for(let f=0;f<24;f++){
  let x=105+random()*46,y=72+random()*112;
  ctx.beginPath();ctx.moveTo(x,y);
  const steps=2+Math.floor(random()*4);
  for(let s=0;s<steps;s++){x+=(random()-.5)*30;y+=(random()-.5)*34;ctx.lineTo(x,y);}
  ctx.strokeStyle=`rgba(255,255,255,${.035+random()*.075})`;ctx.lineWidth=.45+random()*1.15;ctx.stroke();
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.NoColorSpace;
 texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
 return texture;
}

function createFracturePlane(random,scale=.18){
 const points=[];const sides=5+Math.floor(random()*4);
 for(let i=0;i<sides;i++){
  const a=i/sides*Math.PI*2;const r=scale*(.46+random()*.54);
  points.push(new THREE.Vector2(Math.cos(a)*r,Math.sin(a)*r));
 }
 return new THREE.ShapeGeometry(new THREE.Shape(points),1);
}

function makeFractureMaterial(opacity=.046){
 return new THREE.MeshPhysicalMaterial({
  color:0xffffff,roughness:.18,transparent:true,opacity,depthWrite:false,
  side:THREE.DoubleSide,metalness:0,ior:1.309,envMapIntensity:.82,
  clearcoat:.56,clearcoatRoughness:.035,specularIntensity:1
 });
}

function makeFrostMaterial(texture,opacity=.30){
 return new THREE.MeshPhysicalMaterial({
  color:0xfaffff,map:texture,alphaMap:texture,transparent:true,opacity,
  depthWrite:false,side:THREE.DoubleSide,metalness:0,roughness:.72,
  transmission:.035,thickness:.18,ior:1.309,envMapIntensity:.18,
  clearcoat:.02,clearcoatRoughness:.45,specularIntensity:.20
 });
}

export function createIceScene(scene,glass){
 const root=new THREE.Group();scene.add(root);
 const bumpTexture=createSurfaceBump();
 const frostTextures=[0,1,2,3].map(i=>createFrostTexture(i+1));
 const frostMaterials=frostTextures.map((t,i)=>makeFrostMaterial(t,.27+i*.012));
 const fractureMaterials=[.050,.043,.054,.047].map(makeFractureMaterial);

 const outerMaterials=[
  glass.material({distortion:.061,roughness:.010,frost:.0012,absorption:.0048,dispersion:0}),
  glass.material({distortion:.065,roughness:.011,frost:.0015,absorption:.0054,dispersion:0}),
  glass.material({distortion:.058,roughness:.009,frost:.0010,absorption:.0044,dispersion:0}),
  glass.material({distortion:.068,roughness:.012,frost:.0017,absorption:.0058,dispersion:0})
 ];
 for(const material of outerMaterials){material.bumpMap=bumpTexture;material.bumpScale=.010;material.needsUpdate=true;}

 const wetFilmMaterial=new THREE.MeshPhysicalMaterial({
  color:0xffffff,metalness:0,roughness:.004,transparent:true,opacity:.022,depthWrite:false,
  ior:1.333,clearcoat:1,clearcoatRoughness:.0015,envMapIntensity:2.25,specularIntensity:1
 });
 const airMaterial=new THREE.MeshPhysicalMaterial({
  color:0xffffff,roughness:.025,transparent:true,opacity:.30,depthWrite:false,ior:1.0,
  specularIntensity:1,envMapIntensity:.64
 });
 const microBubbleMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.19,depthWrite:false});
 const beadGeometry=new THREE.SphereGeometry(1,14,9);
 const microBeadGeometry=new THREE.SphereGeometry(1,8,6);
 const meltDropMaterial=glass.material({distortion:.0058,roughness:.003,frost:0,absorption:.001,dispersion:0});
 const frostPlaneGeometry=new THREE.PlaneGeometry(.74,.86,1,1);
 const cubes=[];
 const layout=[[-1.05,.84,-.28,.55],[1.04,1.00,-.46,.60],[-1.06,-.92,.03,.60],[1.03,-.78,.20,.64]];
 const geometries=[frostPlaneGeometry];
 const fractureGeometries=[];
 const masterSeed=29;

 layout.forEach(([x,y,z,size],i)=>{
  const random=makeRng(masterSeed+i*73);
  const geometry=createIceGeometry(i+1,.185+i*.008);geometries.push(geometry);
  const carrier=new THREE.Group();
  const cube=new THREE.Mesh(geometry,outerMaterials[i]);cube.renderOrder=2;carrier.add(cube);
  const wetFilm=new THREE.Mesh(geometry,wetFilmMaterial);wetFilm.scale.setScalar(1.0014);wetFilm.renderOrder=9;carrier.add(wetFilm);

  const center=new THREE.Vector3((random()-.5)*.045,(random()-.5)*.05,(random()-.5)*.045);
  const planeCount=6;
  for(let p=0;p<planeCount;p++){
   const frost=new THREE.Mesh(frostPlaneGeometry,frostMaterials[i]);
   frost.position.copy(center).add(new THREE.Vector3((random()-.5)*.075,(random()-.5)*.08,(random()-.5)*.075));
   frost.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);
   frost.scale.set(.78+random()*.28,.84+random()*.30,1);
   frost.renderOrder=1;carrier.add(frost);
  }

  const fractureCount=3+Math.floor(random()*2);
  for(let p=0;p<fractureCount;p++){
   const g=createFracturePlane(random,.12+random()*.10);fractureGeometries.push(g);
   const sheet=new THREE.Mesh(g,fractureMaterials[i]);
   sheet.position.copy(center).add(new THREE.Vector3((random()-.5)*.28,(random()-.5)*.28,(random()-.5)*.28));
   sheet.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);
   sheet.scale.set(1,.16+random()*.34,1);sheet.renderOrder=3;carrier.add(sheet);
  }

  const microCount=250+Math.floor(random()*100);
  const micro=new THREE.InstancedMesh(microBeadGeometry,microBubbleMaterial,microCount),microDummy=new THREE.Object3D();
  const axis=new THREE.Vector3((random()-.5)*.18,1,(random()-.5)*.18).normalize();
  for(let j=0;j<microCount;j++){
   const along=(random()-.5)*.66;
   const spread=.004+Math.pow(random(),2.7)*.125;
   const radial=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize().multiplyScalar(spread);
   microDummy.position.copy(center).addScaledVector(axis,along).add(radial);
   const r=.0008+Math.pow(random(),1.75)*.0048;
   microDummy.scale.set(r,r*(.58+random()*1.12),r);microDummy.updateMatrix();micro.setMatrixAt(j,microDummy.matrix);
  }
  micro.instanceMatrix.needsUpdate=true;micro.renderOrder=4;carrier.add(micro);

  const airCount=26+Math.floor(random()*12);
  const air=new THREE.InstancedMesh(beadGeometry,airMaterial,airCount),airDummy=new THREE.Object3D();
  for(let j=0;j<airCount;j++){
   const along=(random()-.5)*.52;
   const spread=.018+Math.pow(random(),1.7)*.16;
   const radial=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize().multiplyScalar(spread);
   airDummy.position.copy(center).addScaledVector(axis,along).add(radial);
   const r=.0032+Math.pow(random(),2.0)*.017;
   airDummy.scale.set(r,r*(.72+random()*1.2),r*(.80+random()*.42));airDummy.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);airDummy.updateMatrix();air.setMatrixAt(j,airDummy.matrix);
  }
  air.instanceMatrix.needsUpdate=true;air.renderOrder=4;carrier.add(air);

  const dropCount=26+Math.floor(random()*12);
  const drops=new THREE.InstancedMesh(beadGeometry,meltDropMaterial,dropCount),drop=new THREE.Object3D();
  for(let j=0;j<dropCount;j++){
   const face=Math.floor(random()*5),a=(random()-.5)*.68,b=(random()-.5)*.68,edge=.507;
   if(face===0)drop.position.set(a,-edge,b);
   else if(face===1)drop.position.set(edge,-.40+random()*.56,b);
   else if(face===2)drop.position.set(-edge,-.40+random()*.56,b);
   else if(face===3)drop.position.set(a,-.40+random()*.56,edge);
   else drop.position.set(a,-.40+random()*.56,-edge);
   const r=.0055+Math.pow(random(),1.35)*.020;
   drop.scale.set(r,r*(1.05+random()*.82),r*.55);drop.updateMatrix();drops.setMatrixAt(j,drop.matrix);
  }
  drops.instanceMatrix.needsUpdate=true;drops.renderOrder=10;carrier.add(drops);

  root.add(carrier);
  cubes.push({carrier,x,y,z,size,phase:i*1.72,spin:.016+random()*.009,drift:.005+random()*.004});
 });

 const sprayRandom=makeRng(911);
 const spray=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,7),glass.material({distortion:.0031,roughness:.004,absorption:.001,dispersion:0}),20);
 spray.renderOrder=3;root.add(spray);
 const spraySeeds=Array.from({length:20},()=>({
  side:sprayRandom()>.5?1:-1,x:.86+sprayRandom()*.54,y:(sprayRandom()-.5)*3.12,z:sprayRandom()*.60-.24,
  r:.0035+Math.pow(sprayRandom(),1.9)*.014,phase:sprayRandom()*Math.PI*2,stretch:1+sprayRandom()*.27
 }));
 const sprayDummy=new THREE.Object3D();
 glass.exclude(root);
 let impulseAt=-100;

 return {
  root,
  impulse(time){impulseAt=time;},
  update(time,pose,energy=0){
   root.position.set(pose.x,pose.y,0);root.scale.setScalar(pose.size);
   const age=Math.max(0,time-impulseAt),kick=Math.sin(age*6.8)*Math.exp(-age*4.8)*.036;
   spraySeeds.forEach((s,i)=>{
    sprayDummy.position.set(s.side*(s.x+kick*.20),s.y+Math.sin(time*.25+s.phase)*.009,s.z);
    sprayDummy.scale.set(s.r,s.r*s.stretch,s.r*.76);sprayDummy.updateMatrix();spray.setMatrixAt(i,sprayDummy.matrix);
   });spray.instanceMatrix.needsUpdate=true;
   for(const c of cubes){
    const drift=Math.sin(time*.22+c.phase)*c.drift;
    c.carrier.position.set(c.x+Math.sign(c.x)*(kick+energy*.011),c.y+drift,c.z+Math.cos(time*.15+c.phase)*.010);
    c.carrier.scale.setScalar(c.size);
    c.carrier.rotation.set(.23+Math.sin(time*.060+c.phase)*.026,c.phase+time*c.spin,.145+Math.cos(time*.088+c.phase)*.028);
   }
  },
  dispose(){
   geometries.forEach(g=>g.dispose());fractureGeometries.forEach(g=>g.dispose());
   frostMaterials.forEach(m=>m.dispose());fractureMaterials.forEach(m=>m.dispose());frostTextures.forEach(t=>t.dispose());
   bumpTexture.dispose();wetFilmMaterial.dispose();
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
  material({distortion=.012,roughness=.04,frost=0,absorption=.006,dispersion=0}={}){
   const material=new THREE.MeshPhysicalMaterial({
    depthWrite:false,color:0xffffff,metalness:0,roughness,ior:1.309,
    clearcoat:1,clearcoatRoughness:.004,envMapIntensity:1.92,specularIntensity:1
   });
   material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{
     glassScene:source,glassResolution:resolution,glassDistortion:{value:distortion},glassFrost:{value:frost},glassAbsorption:{value:absorption}
    });
    shader.fragmentShader='uniform sampler2D glassScene;uniform vec2 glassResolution;uniform float glassDistortion;uniform float glassFrost;uniform float glassAbsorption;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',`
     vec2 glassUv=gl_FragCoord.xy/glassResolution;
     float viewDistance=max(length(vViewPosition),.001);
     vec2 offset=normal.xy*glassDistortion/max(viewDistance*.15,.42);
     offset.x*=glassResolution.y/glassResolution.x;
     vec2 uv=clamp(glassUv-offset,vec2(.002),vec2(.998));
     vec3 transmitted=texture2D(glassScene,uv).rgb;
     float facing=clamp(dot(normal,normalize(vViewPosition)),0.,1.);
     float edge=pow(1.-facing,1.24);
     vec2 texel=.72/glassResolution;
     vec3 blur=(texture2D(glassScene,uv+vec2(texel.x,0.)).rgb+texture2D(glassScene,uv-vec2(texel.x,0.)).rgb+texture2D(glassScene,uv+vec2(0.,texel.y)).rgb+texture2D(glassScene,uv-vec2(0.,texel.y)).rgb)*.25;
     transmitted=mix(transmitted,blur,clamp(glassFrost*2.4,0.,.025));
     float luma=dot(transmitted,vec3(.2126,.7152,.0722));
     transmitted=mix(transmitted,vec3(luma)*vec3(1.0,1.008,1.014),.055+edge*.035);
     vec3 sigma=vec3(.28,.10,.04);
     transmitted*=exp(-sigma*glassAbsorption*(.16+edge*.56)*1.9);
     float fresnel=.020+.980*pow(1.-facing,5.0);
     vec3 rim=vec3(1.0,.998,.994)*pow(1.-facing,2.35)*.175;
     vec3 volume=transmitted+rim;
     vec3 outgoingLight=volume*(1.-fresnel*.22)+totalSpecular*(1.36+fresnel*1.86);
    `);
   };
   material.customProgramCacheKey=()=>`fizora-photoreal-ice-v12-${distortion}-${frost}-${absorption}`;
   return material;
  },
  resize(){
   const size=renderer.getDrawingBufferSize(new THREE.Vector2());resolution.value.copy(size);
   const scale=innerWidth<760?.60:.82;
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
