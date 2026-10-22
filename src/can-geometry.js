import {LatheGeometry,Vector2} from 'three';
export const CAN_RADIUS=.655;
export const CAN_MIN_Y=-1.45;
export const CAN_MAX_Y=1.40;
export const CAN_BODY_HEIGHT=CAN_MAX_Y-CAN_MIN_Y;
export const CAN_CIRCUMFERENCE=2*Math.PI*CAN_RADIUS;
export const CAN_PROFILE=[[.51,-1.45],[.56,-1.43],[.585,-1.40],[.595,-1.34],[.613,-1.30],[.63,-1.27],[.643,-1.23],[.65,-1.18],[.654,-1.15],[.655,-1.12],[.655,1.12],[.654,1.16],[.65,1.2],[.641,1.235],[.63,1.27],[.613,1.31],[.59,1.36],[.579,1.385],[.575,1.40]];
export function createCanBodyGeometry(segments=128){
 const geometry=new LatheGeometry(CAN_PROFILE.map(p=>new Vector2(...p)),segments);
 const position=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
 // LatheGeometry uses profile index for V. The tall straight wall needs
 // physical-height V; otherwise one narrow image strip covers almost the whole can.
 for(let i=0;i<position.count;i++)uv.setY(i,Math.max(0,Math.min(1,(position.getY(i)-CAN_MIN_Y)/CAN_BODY_HEIGHT)));
 uv.needsUpdate=true;
 return geometry;
}
