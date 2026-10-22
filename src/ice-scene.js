import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Reusable geometry and seeded detail keep the scene deterministic and inexpensive.
export function createIceGeometry(){
 const geometry=new RoundedBoxGeometry(1,1,1,5,.14);
 const p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  const melt=1+.018*Math.sin(x*9+y*7)*Math.sin(z*8-x*5);
  p.setXYZ(i,x*melt,y*melt,z*melt);
 }
 geometry.computeVertexNormals();geometry.computeBoundingSphere();
 return geometry;
}

export function createIceScene(scene,glass){
 const root=new THREE.Group();scene.add(root);
 const geometry=createIceGeometry();
 const material=glass.material({distortion:.035,roughness:.12,frost:.045});
 const cubes=[];
 // Outboard cubes stay clear of the label and page copy, also on narrow screens.
 const layout=[[-1.02,.86,-.3,.53],[1.02,1.02,-.48,.58],[-1.04,-.93,.05,.58],[1.01,-.79,.2,.62]];
 const veinMaterial=new THREE.LineBasicMaterial({color:0xe8ffff,transparent:true,opacity:.18,depthWrite:false});
 const airMaterial=new THREE.MeshPhysicalMaterial({color:0xeaffff,roughness:.22,transparent:true,opacity:.14,depthWrite:false});
 const beadGeometry=new THREE.SphereGeometry(1,8,6);
 let seed=29;const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
 layout.forEach(([x,y,z,size],i)=>{
  const carrier=new THREE.Group(),cube=new THREE.Mesh(geometry,material);cube.renderOrder=1;carrier.add(cube);root.add(carrier);
  // Fractures and air pockets are actual internal geometry, not a surface photograph.
  const vertices=[];
  for(let j=0;j<9;j++){
   let a=new THREE.Vector3((random()-.5)*.65,(random()-.5)*.65,(random()-.5)*.65);
   for(let k=0;k<3;k++){const b=a.clone().add(new THREE.Vector3((random()-.5)*.17,(random()-.5)*.18,(random()-.5)*.15));vertices.push(...a.toArray(),...b.toArray());a=b;}
  }
  const veins=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3)),veinMaterial);veins.renderOrder=3;carrier.add(veins);
  const air=new THREE.InstancedMesh(beadGeometry,airMaterial,18),dummy=new THREE.Object3D();
  for(let j=0;j<18;j++){dummy.position.set((random()-.5)*.65,(random()-.5)*.65,(random()-.5)*.65);dummy.scale.setScalar(.006+random()*.013);dummy.updateMatrix();air.setMatrixAt(j,dummy.matrix);}
  air.instanceMatrix.needsUpdate=true;air.renderOrder=3;carrier.add(air);
  cubes.push({carrier,x,y,z,size,phase:i*1.72});
 });
 // Smaller free droplets connect the cubes without a flat splash ring.
 const spray=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,8),glass.material({distortion:.005}),40);
 spray.renderOrder=2;root.add(spray);
 const spraySeeds=Array.from({length:40},()=>({side:random()>.5?1:-1,x:.78+random()*.7,y:(random()-.5)*3.4,z:random()*.7-.3,r:.012+random()*.025,phase:random()*Math.PI*2}));
 const sprayDummy=new THREE.Object3D();
 glass.exclude(root);
 let impulseAt=-100;
 return {root,impulse(time){impulseAt=time;},update(time,pose,energy=0){
  root.position.set(pose.x,pose.y,0);root.scale.setScalar(pose.size);
  const age=Math.max(0,time-impulseAt),kick=Math.sin(age*9)*Math.exp(-age*3)*.1;
  spraySeeds.forEach((s,i)=>{sprayDummy.position.set(s.side*(s.x+kick*.4),s.y+Math.sin(time*.75+s.phase)*.06,s.z);sprayDummy.scale.set(s.r,s.r*1.2,s.r);sprayDummy.updateMatrix();spray.setMatrixAt(i,sprayDummy.matrix);});spray.instanceMatrix.needsUpdate=true;
  for(const c of cubes){const drift=Math.sin(time*.62+c.phase)*.045;
   c.carrier.position.set(c.x+Math.sign(c.x)*(kick+energy*.05),c.y+drift,c.z+Math.cos(time*.4+c.phase)*.06);
   c.carrier.scale.setScalar(c.size);
   c.carrier.rotation.set(.35+Math.sin(time*.23+c.phase)*.18,c.phase+time*.12,.25+Math.cos(time*.3+c.phase)*.2);
  }
 }};
}

// Glass samples a half-resolution scene pass, including the can behind it.
// The backdrop exists only in that pass: the interactive liquid canvas remains visible.
export function createRefractionScene(renderer,scene,camera,backgroundTextures){
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true});
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
  material({distortion=.012,roughness=.07,frost=0}={}){
   const material=new THREE.MeshPhysicalMaterial({depthWrite:false,color:0xffffff,metalness:0,roughness,ior:1.31,clearcoat:.65,clearcoatRoughness:.06,envMapIntensity:1.25});
   material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{glassScene:source,glassResolution:resolution,glassDistortion:{value:distortion},glassFrost:{value:frost}});
    shader.fragmentShader='uniform sampler2D glassScene;uniform vec2 glassResolution;uniform float glassDistortion;uniform float glassFrost;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',`
     vec2 glassUv=gl_FragCoord.xy/glassResolution;
     vec2 offset=normal.xy*glassDistortion/max(length(vViewPosition)*.15, .4);
     offset.x*=glassResolution.y/glassResolution.x;
     vec3 transmitted=texture2D(glassScene,clamp(glassUv-offset,vec2(.002),vec2(.998))).rgb;
     float facing=clamp(dot(normal,normalize(vViewPosition)),0.,1.);
     float fresnel=.025+.975*pow(1.-facing,5.);
     vec3 outgoingLight=mix(transmitted,transmitted*.78+vec3(.22),glassFrost)*(1.-fresnel*.65)+totalSpecular*1.35;
    `);
   };
   material.customProgramCacheKey=()=>`fizora-glass-${distortion}-${frost}`;
   return material;
  },
  resize(){const size=renderer.getDrawingBufferSize(new THREE.Vector2());resolution.value.copy(size);target.setSize(Math.max(1,Math.round(size.x*.5)),Math.max(1,Math.round(size.y*.5)));uniforms.aspect.value=size.x/size.y;},
  setFlavor(i,t){uniforms.imageA.value=backgroundTextures[i];uniforms.imageB.value=backgroundTextures[i+1];uniforms.blend.value=t;},
  capture(){const visibility=hidden.map(o=>o.visible);hidden.forEach(o=>o.visible=false);backdrop.visible=true;
   const previousTarget=renderer.getRenderTarget(),tone=renderer.toneMapping;
   try{renderer.toneMapping=THREE.NoToneMapping;renderer.setRenderTarget(target);renderer.render(scene,camera);}
   finally{renderer.setRenderTarget(previousTarget);renderer.toneMapping=tone;backdrop.visible=false;hidden.forEach((o,i)=>o.visible=visibility[i]);}
  },
  dispose(){target.dispose();backgroundTextures.forEach(t=>t.dispose());}
 };
}
