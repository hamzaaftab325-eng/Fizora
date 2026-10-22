export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const ease=t=>t*t*(3-2*t);
// Zero velocity and acceleration at the ends: the can settles instead of snapping.
export const cinematicEase=t=>clamp(t*t*t*(t*(t*6-15)+10));
export const damp=(value,target,rate,dt)=>lerp(value,target,1-Math.exp(-rate*Math.max(0,dt)));
export function scrollState(y,offsets,height,mobile=false){
 let p=0;
 if(y>=offsets[1])p=1+(y-offsets[1])/Math.max(1,offsets[2]-offsets[1]);
 else p=(y-offsets[0])/Math.max(1,offsets[1]-offsets[0]);
 p=clamp(p,0,2);const i=Math.min(1,Math.floor(p)),raw=p-i,t=cinematicEase(clamp((raw-.12)/.76));
 const arc=Math.sin(t*Math.PI),direction=i===0?-1:1,x=[.43,-.43,.43],tilts=[-.15,.17,-.12];
 return {i,t,p,active:Math.min(2,Math.round(p)),arc,
  x:mobile?Math.sin(t*Math.PI*2)*.045:lerp(x[i],x[i+1],t),
  y:(mobile?1-2*(Math.max(height*.33,290)+Math.min(height*.40,360)/2)/height:0)+arc*(mobile?.035:.1),
  rotation:(i+t)*Math.PI*2,
  tilt:lerp(tilts[i],tilts[i+1],t)+direction*Math.sin(t*Math.PI*2)*(mobile?.12:.26),
  pitch:.12+arc*(mobile?.13:.29),
  push:arc*(mobile?.06:.15),
  visibility:1-ease(clamp((y-(offsets[3]-height*.65))/(height*.65)))};
}
// Slow down near the front label and accelerate gently across the back.
// The integral stays continuous when scrolling starts, stops or reverses.
export function advanceShowcase(angle,dt,transition=0){
 const speed=.20+.40*(1-Math.cos(angle))*.5;
 return angle+Math.max(0,dt)*speed*(1-clamp(transition)*.78);
}
