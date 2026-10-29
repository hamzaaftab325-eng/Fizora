import * as THREE from 'three';

// One instanced draw call; transparent centers and Fresnel rims replace solid balls.
export function createBubbles(scene,count=30){
 const material=new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,toneMapped:false,
  uniforms:{tint:{value:new THREE.Color('#efffb9')}},
  vertexShader:`varying vec2 vUv;
   void main(){vUv=uv;vec4 p=vec4(position,1.0);
    #ifdef USE_INSTANCING
     p=instanceMatrix*p;
    #endif
    gl_Position=projectionMatrix*modelViewMatrix*p;
   }`,
  fragmentShader:`varying vec2 vUv;uniform vec3 tint;
   void main(){
    vec2 q=(vUv-.5)*2.;float r=length(q);if(r>.99)discard;
    float z=sqrt(max(0.,1.-r*r));
    float rim=pow(1.-z,3.5);
    float band=exp(-pow((r-.87)/.09,2.));
    float h=exp(-dot((q-vec2(-.36,.5))*vec2(6.,10.),(q-vec2(-.36,.5))*vec2(6.,10.)));
    float h2=exp(-dot((q-vec2(.4,-.52))*vec2(8.,12.),(q-vec2(.4,-.52))*vec2(8.,12.)));
    float alpha=(rim*.30+band*.13+h*.85+h2*.34+.006)*(1.-smoothstep(.965,.99,r));
    vec3 color=mix(tint,vec3(1.),clamp(h+h2+rim*.5,0.,1.));
    gl_FragColor=vec4(color,alpha);
    #include <colorspace_fragment>
   }`
 });
 const mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),material,count);
 mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.renderOrder=2;scene.add(mesh);
 const dummy=new THREE.Object3D();
 const disturbances=[];
 const data=Array.from({length:count},(_,i)=>({phase:((i*.61803398875)%1),speed:.035+(i%5)*.008,side:i%2?1:-1,lane:.78+((i*7)%11)*.065,size:.035+Math.pow(((i*13)%29)/29,2)*.15}));
 return {mesh,impulse(x,y,time){disturbances.push({x,y,time});if(disturbances.length>4)disturbances.shift();},update(time,pose,arc,tint){
  material.uniforms.tint.value.copy(tint);
  while(disturbances.length&&time-disturbances[0].time>2.8)disturbances.shift();
  data.forEach((d,i)=>{
   const cycle=(d.phase+time*d.speed)%1,fade=Math.min(1,cycle*9,(1-cycle)*9);
   const sway=Math.sin(time*.6+i*2.7)*(.055+arc*.07);
   let x=pose.x+(d.side*d.lane+sway)*pose.size,y=pose.y+(cycle-.5)*3.7*pose.size;
   for(const impact of disturbances){const age=time-impact.time,dx=x-impact.x,dy=y-impact.y,distance=Math.hypot(dx,dy),wave=Math.exp(-Math.pow((distance-age*1.7)/.45,2))*Math.exp(-age*1.4)*.19;
    x+=dx/Math.max(.1,distance)*wave;y+=dy/Math.max(.1,distance)*wave;
   }
   dummy.position.set(x,y,-.45+(i%4)*.16);
   const size=d.size*pose.size*(.7+.3*fade)*(1+arc*.2)*fade;
   dummy.scale.set(size*(1+Math.sin(time+i)*.025),size*(1-Math.sin(time+i)*.025),1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  });mesh.instanceMatrix.needsUpdate=true;
 }};
}
