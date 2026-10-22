import * as THREE from 'three';

// Product-photography environment: broad softboxes, narrow kickers and dark flags.
// The dark bands are deliberate; perfectly even reflections make aluminum read as CG.
export function createStudioEnvironment(renderer){
 const width=768,height=384,data=new Float32Array(width*height*4);
 const soft=(value,center,spread,power=8)=>Math.exp(-Math.pow(Math.abs((value-center)/spread),power));
 const gauss=(value,center,spread)=>Math.exp(-Math.pow((value-center)/spread,2));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=x/(width-1),v=y/(height-1);
  const left=soft(u,.17,.055,6)*soft(v,.48,.32,6)*5.1;
  const right=soft(u,.72,.027,6)*soft(v,.50,.34,6)*7.0;
  const fill=soft(u,.94,.095,5)*soft(v,.48,.24,5)*1.55;
  const overhead=gauss(v,.10,.13)*.78;
  const horizon=gauss(v,.63,.055)*.22;
  const darkFlagA=soft(u,.43,.055,5)*soft(v,.50,.38,5)*.20;
  const darkFlagB=soft(u,.84,.028,5)*soft(v,.52,.32,5)*.12;
  const base=.035+left+right+fill+overhead+horizon;
  const r=Math.max(.008,base-darkFlagA-darkFlagB);
  const warm=left*.018+overhead*.01;
  const cool=right*.026+fill*.015;
  const offset=(y*width+x)*4;
  data[offset]=r+warm;
  data[offset+1]=r*.995;
  data[offset+2]=r+cool;
  data[offset+3]=1;
 }
 const source=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);
 source.mapping=THREE.EquirectangularReflectionMapping;
 source.colorSpace=THREE.LinearSRGBColorSpace;
 source.needsUpdate=true;
 const pmrem=new THREE.PMREMGenerator(renderer);
 pmrem.compileEquirectangularShader();
 const environment=pmrem.fromEquirectangular(source);
 source.dispose();
 pmrem.dispose();
 return environment;
}
