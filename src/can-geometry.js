import {LatheGeometry,Vector2} from 'three';

// Modeled after a real 330 mL sleek can: tall body, necked shoulder, rolled top region,
// and a domed base support profile. Units are scene units, scaled for the existing camera.
export const CAN_RADIUS=.58;
export const CAN_MIN_Y=-1.50;
export const CAN_MAX_Y=1.38;
export const CAN_BODY_HEIGHT=CAN_MAX_Y-CAN_MIN_Y;
export const CAN_CIRCUMFERENCE=2*Math.PI*CAN_RADIUS;

// Radius, Y pairs for the outside wall profile.
export const CAN_PROFILE=[
 [.46,-1.50],[.515,-1.475],[.54,-1.445],[.552,-1.40],[.565,-1.34],[.575,-1.28],
 [.579,-1.22],[.58,-1.15],[.58,1.03],[.579,1.08],[.576,1.14],[.568,1.21],
 [.555,1.27],[.537,1.32],[.505,1.355],[.485,1.372],[.472,1.38]
];

export function createCanBodyGeometry(segments=192){
 const geometry=new LatheGeometry(CAN_PROFILE.map(p=>new Vector2(...p)),segments);
 const position=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
 for(let i=0;i<position.count;i++){
  let x=position.getX(i),y=position.getY(i),z=position.getZ(i);
  const radius=Math.hypot(x,z);
  if(radius>.2){
   const angle=Math.atan2(z,x);
   const bodyWeight=Math.max(0,1-Math.min(1,Math.abs((y-.02))/1.18));
   const drawWave=Math.sin(y*35+angle*1.8)*.00016*bodyWeight;
   const broad=Math.sin(angle*4.0+y*2.3)*.00034;
   const micro=Math.sin(angle*18.0-y*9.5)*.00009;
   const scale=1+drawWave+broad+micro;
   x*=scale;z*=scale;
   position.setXYZ(i,x,y,z);
  }
  uv.setY(i,Math.max(0,Math.min(1,(y-CAN_MIN_Y)/CAN_BODY_HEIGHT)));
 }
 position.needsUpdate=true;uv.needsUpdate=true;
 geometry.computeVertexNormals();
 geometry.computeBoundingSphere();
 return geometry;
}

export function createLidGeometry(segments=160){
 const profile=[
  [0,1.442],[.12,1.442],[.22,1.441],[.31,1.438],[.39,1.433],
  [.455,1.427],[.49,1.422],[.52,1.425],[.548,1.434],[.57,1.446]
 ];
 const geometry=new LatheGeometry(profile.map(p=>new Vector2(...p)),segments);
 geometry.computeVertexNormals();
 return geometry;
}

export function createBottomGeometry(segments=160){
 const profile=[
  [0,-1.455],[.16,-1.47],[.32,-1.488],[.42,-1.505],[.50,-1.492],[.56,-1.462],[.58,-1.438]
 ];
 const geometry=new LatheGeometry(profile.map(p=>new Vector2(...p)),segments);
 geometry.computeVertexNormals();
 return geometry;
}
