import * as THREE from 'three';

// A deliberately asymmetric product-photography tent. Broad white cards create long highlights;
// near-black flags carve contrast into the aluminum. Metallic products need both to read as real.
export function createStudioEnvironment(renderer){
 const width=1024,height=512,data=new Float32Array(width*height*4);
 const soft=(value,center,spread,power=8)=>Math.exp(-Math.pow(Math.abs((value-center)/spread),power));
 const gauss=(value,center,spread)=>Math.exp(-Math.pow((value-center)/spread,2));
 const rect=(u,v,cx,cy,sx,sy,p=7)=>soft(u,cx,sx,p)*soft(v,cy,sy,p);

 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=x/(width-1),v=y/(height-1);

  // Real studio cards: one broad soft key, a thin edge strip and a weaker fill card.
  const key=rect(u,v,.155,.48,.065,.315,7)*5.9;
  const edge=rect(u,v,.695,.49,.020,.355,8)*8.2;
  const fill=rect(u,v,.935,.50,.105,.245,6)*1.62;
  const frontCard=rect(u,v,.505,.59,.19,.055,5)*.34;
  const ceiling=gauss(v,.095,.125)*.83;
  const floorBounce=gauss(v,.865,.105)*.21;
  const horizon=gauss(v,.635,.045)*.16;

  // Dark cards are intentionally strong. Uniformly bright HDRIs make cylindrical metal look plastic.
  const flagA=rect(u,v,.405,.50,.045,.38,6)*.42;
  const flagB=rect(u,v,.805,.50,.026,.34,7)*.29;
  const flagC=rect(u,v,.995,.52,.020,.30,7)*.12;

  const ambient=.020;
  const base=ambient+key+edge+fill+frontCard+ceiling+floorBounce+horizon;
  const shaped=Math.max(.0035,base-flagA-flagB-flagC);

  // Slightly warm key / slightly cool rim gives photographed metal believable color separation.
  const warm=key*.024+ceiling*.012+floorBounce*.010;
  const cool=edge*.033+fill*.020;
  const offset=(y*width+x)*4;
  data[offset]=shaped+warm;
  data[offset+1]=shaped*.994+cool*.12;
  data[offset+2]=shaped+cool;
  data[offset+3]=1;
 }

 const source=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);
 source.mapping=THREE.EquirectangularReflectionMapping;
 source.colorSpace=THREE.LinearSRGBColorSpace;
 source.needsUpdate=true;
 const pmrem=new THREE.PMREMGenerator(renderer);
 pmrem.compileEquirectangularShader();
 const environment=pmrem.fromEquirectangular(source);
 source.dispose();pmrem.dispose();
 return environment;
}
