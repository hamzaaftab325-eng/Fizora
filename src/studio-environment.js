import * as THREE from 'three';

// Procedural softboxes supply long, continuous reflections on rolled aluminum.
// No photographic environment or ice textures are required.
export function createStudioEnvironment(renderer){
 const width=512,height=256,data=new Float32Array(width*height*4);
 const soft=(value,center,spread)=>Math.exp(-Math.pow((value-center)/spread,8));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=x/width,v=y/height;
  const key=soft(u,.20,.042)*soft(v,.48,.26)*4.5;
  const rim=soft(u,.69,.022)*soft(v,.5,.30)*6;
  const fill=soft(u,.91,.075)*soft(v,.46,.20)*1.8;
  const ceiling=Math.exp(-Math.pow((v-.12)/.14,2))*.45;
  const light=.12+key+rim+fill+ceiling,offset=(y*width+x)*4;
  data[offset]=light;data[offset+1]=light*.99;data[offset+2]=light*.97;data[offset+3]=1;
 }
 const source=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);
 source.mapping=THREE.EquirectangularReflectionMapping;source.needsUpdate=true;
 const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(source);
 source.dispose();pmrem.dispose();return environment;
}
