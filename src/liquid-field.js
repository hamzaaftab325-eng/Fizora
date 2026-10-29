const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// A damped shallow-water height field. Fixed steps make waves independent of FPS.
// The absorbing border prevents distracting reflections at the viewport edges.
export function createLiquidField(width,height){
 let current=new Float32Array(width*height),previous=new Float32Array(width*height);
 const damping=new Float32Array(width*height),normals=new Float32Array(width*height*2);
 let accumulator=0,bounds=null;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const edge=Math.min(x,y,width-1-x,height-1-y);
  damping[y*width+x]=.987-Math.max(0,1-edge/9)*.12;
 }
 function impulse(u,v,strength=.6,radius=3){
  if(!Number.isFinite(u+v+strength+radius))return;
  const cx=clamp(u,0,1)*(width-1),cy=clamp(v,0,1)*(height-1),r=clamp(radius,1,12),r2=r*r;
  for(let y=Math.max(1,Math.floor(cy-r*2));y<Math.min(height-1,cy+r*2);y++){
   for(let x=Math.max(1,Math.floor(cx-r*2));x<Math.min(width-1,cx+r*2);x++){
    const d=((x-cx)**2+(y-cy)**2)/r2;
    if(d<4){const k=y*width+x,amount=Math.exp(-d*1.8)*clamp(strength,-2,2);
     // Displacement, not a perpetual source of velocity: isolated taps stay bounded.
     current[k]=clamp(current[k]+amount,-4,4);previous[k]=clamp(previous[k]+amount,-4,4);
    }
   }
  }
 }
 function step(){
  for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
   const k=y*width+x,h=current[k];
   previous[k]=(2*h-previous[k]+.46*(current[k-1]+current[k+1]+current[k-width]+current[k+width]-4*h))*damping[k];
  }
  [current,previous]=[previous,current];
 }
 return {width,height,normals,impulse,get values(){return current;},get bounds(){return bounds;},
  update(dt){accumulator+=clamp(dt,0,.05);while(accumulator>=1/60){step();accumulator-=1/60;}
   let minX=width,minY=height,maxX=0,maxY=0;
   for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
    const k=y*width+x;normals[k*2]=(current[k+1]-current[k-1])*.5;normals[k*2+1]=(current[k+width]-current[k-width])*.5;
    if(Math.abs(normals[k*2])+Math.abs(normals[k*2+1])>.0015){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
   }
   bounds=maxX>=minX?{minX:Math.max(0,minX-2),minY:Math.max(0,minY-2),maxX:Math.min(width-1,maxX+2),maxY:Math.min(height-1,maxY+2)}:null;
  },
  clear(){current.fill(0);previous.fill(0);normals.fill(0);accumulator=0;bounds=null;}
 };
}

// Stable, slightly underdamped buoyancy, shared by the 3D and image fallback views.
export function createBuoyancy(){
 const state={x:0,y:0,roll:0},velocity={x:0,y:0,roll:0};
 return {state,
  impulse(x,y){velocity.x+=clamp(x,-1,1)*.6;velocity.y+=.48;velocity.roll+=clamp(x-y*.2,-1,1)*.55;
   for(const key of Object.keys(velocity))velocity[key]=clamp(velocity[key],-1.2,1.2);
  },
  update(dt){let remaining=clamp(dt,0,.05);while(remaining>0){const h=Math.min(remaining,1/120);remaining-=h;
   for(const key of Object.keys(state)){velocity[key]+=(-32*state[key]-6.8*velocity[key])*h;state[key]+=velocity[key]*h;}
  }return state;},
  reset(){for(const key of Object.keys(state)){state[key]=0;velocity[key]=0;}}
 };
}
