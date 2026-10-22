import {createLiquidField} from './liquid-field';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const loadImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;});

// GPU refraction uses the same height field as the software renderer. The text and
// can stay in their own crisp layers; only the photographic liquid is displaced.
function gpuSurface(canvas,images){
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,powerPreference:'low-power'});
 if(!gl)return null;
 const vertex=`attribute vec2 position;varying vec2 uv;void main(){uv=vec2(position.x*.5+.5,.5-position.y*.5);gl_Position=vec4(position,0.,1.);}`;
 const fragment=`precision highp float;varying vec2 uv;
 uniform sampler2D imageA,imageB,water;uniform vec2 resolution,aspect;uniform float blend,time,energy;
 vec2 cover(vec2 p,float ratio){float screen=resolution.x/resolution.y;return (p-.5)*vec2(min(1.,screen/ratio),min(1.,ratio/screen))+.5;}
 void main(){
  vec2 normal=(texture2D(water,uv).rg-vec2(128./255.))/.18;
  float shortSide=min(resolution.x,resolution.y);
  vec2 flow=vec2(sin(uv.y*11.+time*.28)+sin(uv.x*7.+uv.y*6.-time*.19)*.5,cos(uv.x*9.-time*.24)+sin(uv.y*8.+time*.17)*.5);
  vec2 p=uv+(normal*.066+flow*(.0052+energy*.002))*shortSide/resolution;
  vec3 color=mix(texture2D(imageA,cover(p,aspect.x)).rgb,texture2D(imageB,cover(p,aspect.y)).rgb,blend);
  float light=clamp((normal.x*-0.7+normal.y*0.5)*.7,-.16,.20);
  float caustic=pow(.5+.5*sin(uv.x*8.+uv.y*9.+flow.x*1.6-time*.22),14.);
  color*=1.+light; color+=caustic*.016;
  gl_FragColor=vec4(color,1.);
 }`;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw new Error('Liquid shader unavailable');}return s;}
 const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram();
 gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Liquid renderer unavailable');
 gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
 const uniforms=Object.fromEntries(['imageA','imageB','water','resolution','aspect','blend','time','energy'].map(k=>[k,gl.getUniformLocation(program,k)]));
 function texture(image){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);if(image)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);return t;}
 const textures=images.map(texture),water=texture();let encoded;
 gl.uniform1i(uniforms.imageA,0);gl.uniform1i(uniforms.imageB,1);gl.uniform1i(uniforms.water,2);
 const lost=()=>{canvas.style.opacity='0';canvas.dataset.engine='unavailable';};canvas.addEventListener('webglcontextlost',lost);
 return {name:'webgl',resize(w,h){const ratio=Math.min(devicePixelRatio,1.5);canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(uniforms.resolution,w,h);},
  render(field,s,time){if(gl.isContextLost())return;
   if(!encoded||encoded.length!==field.width*field.height*4)encoded=new Uint8Array(field.width*field.height*4);
   for(let i=0,k=0;i<field.normals.length;i+=2,k+=4){encoded[k]=clamp(Math.round(128+field.normals[i]*45.9),0,255);encoded[k+1]=clamp(Math.round(128+field.normals[i+1]*45.9),0,255);encoded[k+2]=128;encoded[k+3]=255;}
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,textures[s.i]);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,textures[s.i+1]);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,water);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,field.width,field.height,0,gl.RGBA,gl.UNSIGNED_BYTE,encoded);
   gl.uniform2f(uniforms.aspect,images[s.i].width/images[s.i].height,images[s.i+1].width/images[s.i+1].height);gl.uniform1f(uniforms.blend,s.t);gl.uniform1f(uniforms.time,time);gl.uniform1f(uniforms.energy,s.arc);gl.drawArrays(gl.TRIANGLES,0,6);
  },dispose(){canvas.removeEventListener('webglcontextlost',lost);textures.forEach(t=>gl.deleteTexture(t));gl.deleteTexture(water);gl.deleteBuffer(buffer);gl.deleteProgram(program);}
 };
}

// The software path keeps the original artwork at viewport resolution and only
// processes pixels inside an active wave. Calm areas never become a blurry bitmap.
function softwareSurface(canvas,images){
 const ctx=canvas.getContext('2d',{alpha:false});
 const patch=document.createElement('canvas'),patchCtx=patch.getContext('2d');
 const cover=document.createElement('canvas'),coverCtx=cover.getContext('2d',{willReadFrequently:true});
 let width,height,screenW,screenH,pixels,output,sources,base,coverSizes,mapX,mapY,mapTX,mapTY,lastBlend=-1,lastI=-1,quality=1;
 function resize(w,h){screenW=w;screenH=h;canvas.width=w;canvas.height=h;
  const scale=Math.min(1,(w<760?620:900)*quality/Math.max(w,h));width=Math.max(1,Math.round(w*scale));height=Math.max(1,Math.round(h*scale));cover.width=width;cover.height=height;patch.width=width;patch.height=height;
  coverSizes=images.map(image=>{const scale=Math.max(w/image.width,h/image.height)*1.025;return {w:image.width*scale,h:image.height*scale};});
  sources=images.map(image=>{const scale=Math.max(width/image.width,height/image.height)*1.025;coverCtx.drawImage(image,(width-image.width*scale)/2,(height-image.height*scale)/2,image.width*scale,image.height*scale);return coverCtx.getImageData(0,0,width,height).data;});
  output=patchCtx.createImageData(width,height);pixels=output.data;base=new Uint8ClampedArray(pixels.length);mapX=null;lastBlend=-1;lastI=-1;
 }
 return {name:'canvas2d',resize,
  render(field,s,time){
   const driftX=Math.sin(time*.31)*Math.min(screenW,screenH)*.0035,driftY=Math.cos(time*.23)*Math.min(screenW,screenH)*.0025;
   const draw=(index,alpha)=>{const size=coverSizes[index];ctx.globalAlpha=alpha;ctx.drawImage(images[index],(screenW-size.w)/2+driftX,(screenH-size.h)/2+driftY,size.w,size.h);};
   draw(s.i,1);if(s.t>0)draw(s.i+1,s.t);ctx.globalAlpha=1;
   if(!field.bounds)return;
   if(!mapX){mapX=new Uint16Array(width);mapTX=new Float32Array(width);mapY=new Uint16Array(height);mapTY=new Float32Array(height);
    for(let x=0;x<width;x++){const gx=x/Math.max(1,width-1)*(field.width-2);mapX[x]=Math.floor(gx);mapTX[x]=gx-mapX[x];}
    for(let y=0;y<height;y++){const gy=y/Math.max(1,height-1)*(field.height-2);mapY[y]=Math.floor(gy);mapTY[y]=gy-mapY[y];}
   }
   const mix=Math.round(s.t*120)/120;
   if(mix!==lastBlend||s.i!==lastI){const a=sources[s.i],b=sources[s.i+1];for(let k=0;k<base.length;k+=4){base[k]=a[k]+(b[k]-a[k])*mix;base[k+1]=a[k+1]+(b[k+1]-a[k+1])*mix;base[k+2]=a[k+2]+(b[k+2]-a[k+2])*mix;base[k+3]=255;}lastBlend=mix;lastI=s.i;}
   const strength=Math.min(width,height)*.066,n=field.normals,fw=field.width*2,bounds=field.bounds;
   const left=Math.max(0,Math.floor(bounds.minX/(field.width-2)*width)),top=Math.max(0,Math.floor(bounds.minY/(field.height-2)*height)),right=Math.min(width,Math.ceil(bounds.maxX/(field.width-2)*width)),bottom=Math.min(height,Math.ceil(bounds.maxY/(field.height-2)*height));
   const driftU=driftX*width/screenW,driftV=driftY*height/screenH;
   for(let y=top;y<bottom;y++){const gy=mapY[y]*fw,ty=mapTY[y];
    for(let x=left,k=(y*width+left)*4;x<right;x++,k+=4){const g=gy+mapX[x]*2,tx=mapTX[x],a=n[g]+(n[g+2]-n[g])*tx,b=n[g+fw]+(n[g+fw+2]-n[g+fw])*tx,c=n[g+1]+(n[g+3]-n[g+1])*tx,d=n[g+fw+1]+(n[g+fw+3]-n[g+fw+1])*tx,gx=a+(b-a)*ty,gn=c+(d-c)*ty;
     const opacity=Math.min(1,(Math.abs(gx)+Math.abs(gn))*160);if(opacity<.03){pixels[k+3]=0;continue;}
     const sx=clamp(Math.round(x+gx*strength-driftU),0,width-1),sy=clamp(Math.round(y+gn*strength-driftV),0,height-1),source=(sy*width+sx)*4,light=1+clamp((gx*-.7+gn*.5)*.7,-.16,.2);
     pixels[k]=base[source]*light;pixels[k+1]=base[source+1]*light;pixels[k+2]=base[source+2]*light;pixels[k+3]=opacity*255;
    }
   }
   patchCtx.clearRect(0,0,width,height);patchCtx.putImageData(output,0,0,left,top,right-left,bottom-top);ctx.drawImage(patch,0,0,screenW,screenH);
  },reduceQuality(w,h){if(quality>.68){quality-=.16;resize(w,h);}},dispose(){sources=[];}
 };
}

export async function createLiquidBackground(host,fxCanvas,urls){
 const images=await Promise.all(urls.map(loadImage));let canvas=document.createElement('canvas'),surface;
 try{surface=gpuSurface(canvas,images);}catch{surface=null;}
 if(!surface){canvas=document.createElement('canvas');surface=softwareSurface(canvas,images);}
 canvas.className='liquid-surface';canvas.dataset.engine=surface.name;host.appendChild(canvas);
 const ctx=fxCanvas.getContext('2d');let width=0,height=0,field,time=0,accumulator=0,lastState='',dead=false,draws=0,slowFrames=0,wasPaused=false,lastPointer=null,lastWake=0,splashCount=0;
 const splashes=[],bubbles=Array.from({length:26},(_,i)=>({x:((i*.6180339)%1),phase:(i*.381966)%1,size:2+((i*13)%19),speed:.015+(i%5)*.003,depth:.45+(i%3)*.2}));
 const resize=()=>{width=innerWidth;height=innerHeight;const scale=184/Math.max(width,height);field=createLiquidField(Math.max(48,Math.round(width*scale)),Math.max(48,Math.round(height*scale)));surface.resize(width,height);const ratio=Math.min(devicePixelRatio,1.5);fxCanvas.width=Math.round(width*ratio);fxCanvas.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);lastState='';};resize();
 function drop(x,y,r,alpha,stretch=1){
  ctx.save();ctx.translate(x,y);ctx.scale(1,stretch);
  const gradient=ctx.createRadialGradient(-r*.3,-r*.35,r*.05,0,0,r);gradient.addColorStop(0,`rgba(255,255,247,${alpha*.6})`);gradient.addColorStop(.25,'rgba(255,255,255,0)');gradient.addColorStop(.78,`rgba(255,255,240,${alpha*.04})`);gradient.addColorStop(1,`rgba(255,255,245,${alpha*.4})`);
  ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.lineWidth=Math.max(.5,r*.035);
  ctx.strokeStyle=`rgba(25,45,36,${alpha*.24})`;ctx.beginPath();ctx.arc(.2,.4,r,0,Math.PI*.9);ctx.stroke();
  ctx.strokeStyle=`rgba(255,255,250,${alpha*.85})`;ctx.lineWidth=Math.max(.7,r*.07);ctx.beginPath();ctx.arc(0,0,r*.77,3.5,4.7);ctx.stroke();ctx.restore();
 }
 function atmosphere(s){
  ctx.clearRect(0,0,width,height);ctx.globalAlpha=s.visibility;
  const mobile=width<760;
  bubbles.slice(0,mobile?16:26).forEach((b,i)=>{const cycle=(b.phase+time*b.speed)%1,fade=Math.min(1,cycle*8,(1-cycle)*8),x=b.x*width+Math.sin(time*.48+i)*15,y=(1-cycle)*height;
   // More air around the focal can, softer bubbles in the distance.
   const r=b.size*(mobile?.65:1);drop(x,y,r,fade*b.depth*.56,1+Math.sin(time*.7+i)*.025);
  });
  for(let i=splashes.length-1;i>=0;i--){const p=splashes[i],age=time-p.born;if(age>2.3){splashes.splice(i,1);continue;}
   const x=p.x*width,y=p.y*height,fade=(1-age/2.3)**2,r=12+age*115;
   for(let ring=0;ring<2;ring++){const radius=r-ring*14;if(radius<=0)continue;ctx.lineWidth=1.2-ring*.35;ctx.strokeStyle=`rgba(255,255,245,${fade*(.32-ring*.08)})`;ctx.beginPath();ctx.ellipse(x,y,radius,radius*.84,-.16,0,Math.PI*2);ctx.stroke();ctx.lineWidth=.8;ctx.strokeStyle=`rgba(24,52,42,${fade*.12})`;ctx.beginPath();ctx.ellipse(x,y+1.5,radius+2,radius*.84+2,-.16,0,Math.PI*2);ctx.stroke();}
   if(age<1.15)for(let j=0;j<10;j++){const angle=j*2.39996,velocity=46+(j%4)*22,dx=Math.cos(angle)*velocity*age,dy=Math.sin(angle)*velocity*age+105*age*age;drop(x+dx,y+dy,1.5+(j%3)*.7,(1-age/1.15)*.8,1+age*.3);}
  }
  ctx.globalAlpha=1;
 }
 return {resize,
  pointer(x,y){const now=performance.now();if(now-lastWake<38)return;if(lastPointer&&Math.hypot(x-lastPointer.x,y-lastPointer.y)<.006)return;lastWake=now;lastPointer={x,y};field.impulse(x,y,.20,2.1);},
  splash(x,y){field.impulse(x,y,1.8,4.4);splashes.push({x,y,born:time});if(splashes.length>6)splashes.shift();canvas.dataset.splashes=String(++splashCount);},
  render(s,dt,paused){if(dead||s.visibility<.005)return;const signature=`${s.i}:${s.t.toFixed(3)}:${s.visibility.toFixed(2)}`;
   if(paused&&wasPaused&&signature===lastState)return;
   if(!paused){time+=dt;field.update(dt);}else if(!wasPaused){field.clear();splashes.length=0;}
   atmosphere(s);accumulator+=dt;
   if(surface.name==='webgl'||accumulator>=1/30||lastState===''||(paused&&signature!==lastState)||paused!==wasPaused){const start=performance.now();surface.render(field,s,time);const cost=performance.now()-start;accumulator=0;if(++draws%30===0){canvas.dataset.renderMs=cost.toFixed(1);canvas.dataset.frames=String(draws);}
    if(cost>23)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);if(slowFrames>12&&surface.reduceQuality){surface.reduceQuality(width,height);slowFrames=0;}
   }
   wasPaused=paused;lastState=signature;canvas.dataset.paused=String(paused);
  },
  dispose(){dead=true;surface.dispose();canvas.remove();ctx.clearRect(0,0,width,height);}
 };
}
