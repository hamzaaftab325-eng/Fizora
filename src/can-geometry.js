import {LatheGeometry,Vector2} from 'three';
import {smoothSurfaceNormals} from './surface-geometry.js';

export const CAN_RADIUS=.655;
export const CAN_MIN_Y=-1.45;
export const CAN_MAX_Y=1.40;
export const CAN_BODY_HEIGHT=CAN_MAX_Y-CAN_MIN_Y;
export const CAN_CIRCUMFERENCE=2*Math.PI*CAN_RADIUS;
export const CAN_PROFILE=[
 [.51,-1.45],[.56,-1.43],[.585,-1.40],[.595,-1.34],[.613,-1.30],[.63,-1.27],
 [.643,-1.23],[.65,-1.18],[.654,-1.15],[.655,-1.12],[.655,1.12],[.654,1.16],
 [.65,1.2],[.641,1.235],[.63,1.27],[.613,1.31],[.59,1.36],[.579,1.385],[.575,1.40]
];

export function createCanBodyGeometry(segments=160){
 const geometry=new LatheGeometry(CAN_PROFILE.map(p=>new Vector2(...p)),segments);
 const position=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');

 // A real beverage can is extremely regular, but not mathematically perfect. These tiny radial
 // deviations break laser-clean CG reflections without visibly changing the silhouette.
 for(let i=0;i<position.count;i++){
  let x=position.getX(i),y=position.getY(i),z=position.getZ(i);
  const radius=Math.hypot(x,z);
  if(radius>.25){
   const angle=Math.atan2(z,x);
   const wall=Math.max(0,1-Math.min(1,Math.abs(y)/1.28));
   const broad=Math.sin(angle*5.0+y*2.7)*.00048;
   const fine=Math.sin(angle*17.0-y*10.8)*.00019;
   const drawWave=Math.sin(y*41.0+angle*2.0)*.00011*wall;
   const scale=1+broad+fine+drawWave;
   x*=scale;z*=scale;
   position.setXYZ(i,x,y,z);
  }
  // LatheGeometry uses profile index for V. Physical-height V keeps artwork undistorted.
  uv.setY(i,Math.max(0,Math.min(1,(y-CAN_MIN_Y)/CAN_BODY_HEIGHT)));
 }
 position.needsUpdate=true;uv.needsUpdate=true;
 smoothSurfaceNormals(geometry);
 geometry.computeBoundingSphere();
 return geometry;
}

export function createLidGeometry(segments=160){
 // A single shallow stamped profile is more realistic than stacked flat cylinders.
 const profile=[
  [0,1.438],[.20,1.438],[.30,1.439],[.37,1.442],[.44,1.448],
  [.49,1.451],[.525,1.449],[.548,1.455],[.575,1.446]
 ];
 const geometry=new LatheGeometry(profile.map(p=>new Vector2(...p)),segments);
 smoothSurfaceNormals(geometry);
 return geometry;
}
