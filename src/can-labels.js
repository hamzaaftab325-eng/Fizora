import {CAN_CIRCUMFERENCE,CAN_BODY_HEIGHT} from './can-geometry';
import {packaging,nutritionRows} from './packaging';

const TAU=Math.PI*2;
export function drawCanLabel(canvas,image,index,approvedLabel){
 const p=packaging[index],W=3072,H=Math.round(W*CAN_BODY_HEIGHT/CAN_CIRCUMFERENCE);
 canvas.width=W;canvas.height=H;
 const c=canvas.getContext('2d');
 c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
 c.fillStyle=p.base;c.fillRect(0,0,W,H);
 const text=(value,x,y,size=30,weight=600,color=p.ink,align='center',family='DM Sans',italic=false,maxWidth)=>{
  c.fillStyle=color;c.textAlign=align;c.font=`${italic?'italic ':''}${weight} ${size}px "${family}",sans-serif`;
  if(maxWidth)c.fillText(value,x,y,maxWidth);else c.fillText(value,x,y);
 };
 const line=(x,y,w,color=p.ink,thickness=2)=>{c.fillStyle=color;c.fillRect(x,y,w,thickness);};
 const rect=(x,y,w,h,color,r=0)=>{c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();};
 const wave=(base,amplitude,phase,color)=>{c.fillStyle=color;c.beginPath();c.moveTo(0,H);for(let x=0;x<=W;x+=6)c.lineTo(x,base+Math.sin(x/W*TAU+phase)*amplitude);c.lineTo(W,H);c.closePath();c.fill();};
 // Continuous sweeping ribbons, matched to the approved campaign can.
 const ground=c.createLinearGradient(0,0,W,H);ground.addColorStop(0,p.accent);ground.addColorStop(.42,p.base);ground.addColorStop(1,p.accent);c.fillStyle=ground;c.fillRect(0,0,W,H);
 const ribbon=(base,amp,width,phase,color)=>{c.beginPath();for(let x=0;x<=W;x+=4){const y=base+Math.sin(x/W*TAU+phase)*amp;if(!x)c.moveTo(x,y);else c.lineTo(x,y);}for(let x=W;x>=0;x-=4)c.lineTo(x,base+width+Math.sin(x/W*TAU+phase)*amp);c.closePath();c.fillStyle=color;c.fill();};
 ribbon(H*.08,H*.18,H*.065,.4,p.deep);
 ribbon(H*.76,H*.17,H*.19,2.4,p.deep);
 ribbon(H*.83,H*.16,H*.028,2.4,p.ink);
 wave(H*.97,H*.035,1.4,p.accent);
 // Clear front hierarchy leaves space for condensation and metallic shoulders.
 text('SPARKLING DRINK',W/2,H*.255,35,700);
 c.save();c.translate(W/2,H*.44);c.rotate(-.045);
 text('FIZORA',0,0,450,900,p.ink,'center','Barlow Condensed',true,1160);c.restore();
 text(p.flavor,W/2,H*.505,76,800,p.ink,'center','Barlow Condensed');
 text(p.fruit,W/2,H*.55,34,700);
 // Use the occupied alpha bounds so fruit does not shrink inside a padded PNG.
 const crop=document.createElement('canvas');crop.width=image.naturalWidth;crop.height=image.naturalHeight;
 const a=crop.getContext('2d',{willReadFrequently:true});a.drawImage(image,0,0);
 const rgba=a.getImageData(0,0,crop.width,crop.height).data;
 let x0=crop.width,y0=crop.height,x1=0,y1=0;
 for(let y=0;y<crop.height;y+=2)for(let x=0;x<crop.width;x+=2)if(rgba[(y*crop.width+x)*4+3]>24){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 const sw=Math.max(1,x1-x0+2),sh=Math.max(1,y1-y0+2),scale=Math.min(1000/sw,H*.30/sh),dw=sw*scale,dh=sh*scale;
 c.drawImage(image,x0,y0,sw,sh,W/2-dw/2,H*.575+(H*.30-dh)/2,dw,dh);
 text('FIND YOUR FIZZ.',W/2,H*.92,25,700,p.ink);
 text('330 mL',W/2,H*.977,34,700,p.ink);
 // Reverse: a retail-style information hierarchy, never invented nutrition data.
 for(const center of [0,W]){
  const x=center-390,y=H*.115,w=780;
  rect(x,y,w,H*.795,p.light,32);
  text('FIZORA',center,y+120,124,900,'#102b24','center','Barlow Condensed',true);
  text(p.flavor,center,y+177,36,800,'#102b24','center','Barlow Condensed');
  line(x+40,y+205,w-80,'#102b24',3);
  text('SPARKLING FRUIT DRINK',center,y+257,27,700,'#102b24');
  p.story.forEach((s,i)=>text(s,center,y+307+i*38,26,500,'#102b24'));
  const tx=x+44,tw=w-88,ty=y+397;
  text('NUTRITION INFORMATION',tx,ty,39,800,'#102b24','left','Barlow Condensed');
  line(tx,ty+20,tw,'#102b24',7);
  text('Typical values',tx,ty+65,24,700,'#102b24','left');
  text('100 mL',tx+tw-135,ty+65,24,700,'#102b24','right');
  text('330 mL',tx+tw,ty+65,24,700,'#102b24','right');
  line(tx,ty+83,tw,'#102b24',2);
  nutritionRows.forEach((row,i)=>{
   const ry=ty+126+i*49;
   text(row,tx+(row.startsWith('of which')?15:0),ry,25,row.startsWith('of which')?500:700,'#102b24','left');
   text('—',tx+tw-135,ry,26,500,'#102b24','right');text('—',tx+tw,ry,26,500,'#102b24','right');
   line(tx,ry+15,tw,'#102b2440',1);
  });
  line(tx,ty+447,tw,'#102b24',5);
  text('VALUES PENDING FORMULA APPROVAL',tx,ty+482,21,700,'#102b24','left');
  text('INGREDIENTS',tx,ty+555,30,800,'#102b24','left','Barlow Condensed');
  text('Final ingredient declaration pending.',tx,ty+596,24,500,'#102b24','left');
  text('SERVE CHILLED',tx,ty+675,30,800,'#102b24','left','Barlow Condensed');
  text('Store in a cool, dry place.',tx,ty+718,24,500,'#102b24','left');
  text('PRODUCTION DETAILS',tx,ty+794,30,800,'#102b24','left','Barlow Condensed');
  text('Batch / best before: pending production',tx,ty+836,23,500,'#102b24','left');
  text('Manufacturer details to be confirmed.',tx,ty+873,23,500,'#102b24','left');
  line(tx,ty+916,tw,'#102b24',2);
  // A marked barcode placeholder communicates the layout without a false GTIN.
  const by=ty+954,bw=300;
  rect(tx,by,bw,115,'#fffdf1',5);
  let bx=tx+18;
  for(let i=0;i<60;i++){const width=[2,3,2,5,2,4,3][i%7];if(i%2===0){c.fillStyle='#102b24';c.fillRect(bx,by+12,width,51);}bx+=width+1;}
  text('BARCODE / NOT ASSIGNED',tx+bw/2,by+91,17,700,'#102b24');
  text('ALU',tx+tw-90,by+36,34,800,'#102b24','center','Barlow Condensed');
  text('PLEASE RECYCLE',tx+tw-90,by+78,20,700,'#102b24');
  text('330 mL',center,ty+1131,35,700,'#102b24');
  text('CONCEPT PACK · PRODUCT DATA PENDING',center,ty+1180,21,700,'#102b24');
 }
 // Sides bridge the front and information panel without a sticker boundary.
 for(const x of [W*.25,W*.75]){
  c.save();c.translate(x,H*.48);c.rotate(x<W/2?-Math.PI/2:Math.PI/2);
  text('FIND YOUR FIZZ.',0,0,91,800,p.ink,'center','Barlow Condensed');
  text(p.notes,0,54,25,600);c.restore();
 }
 // Front fidelity pass: use the approved campaign artwork itself instead of recreating its
 // typography, fruit and color treatment. The feathered edges blend into the generated side/back wrap.
 if(approvedLabel){
  const front=document.createElement('canvas');front.width=W;front.height=H;
  const f=front.getContext('2d');f.imageSmoothingEnabled=true;f.imageSmoothingQuality='high';
  const fw=W*.52,fx=(W-fw)/2;
  f.drawImage(approvedLabel,fx,0,fw,H);
  f.globalCompositeOperation='destination-in';
  const mask=f.createLinearGradient(fx,0,fx+fw,0);
  mask.addColorStop(0,'rgba(255,255,255,0)');
  mask.addColorStop(.035,'rgba(255,255,255,1)');
  mask.addColorStop(.965,'rgba(255,255,255,1)');
  mask.addColorStop(1,'rgba(255,255,255,0)');
  f.fillStyle=mask;f.fillRect(fx,0,fw,H);
  f.globalCompositeOperation='source-over';
  c.drawImage(front,0,0);
 }
 return canvas;
}

function loadImage(src){return new Promise((resolve,reject)=>{
 const image=new Image(),timer=setTimeout(()=>reject(new Error('Packaging artwork timed out')),20000);
 image.onload=()=>{clearTimeout(timer);resolve(image);};image.onerror=()=>{clearTimeout(timer);reject(new Error('Packaging artwork unavailable'));};image.src=src;
});}
function cropLabel(label,back=false){
 const out=document.createElement('canvas');out.width=back?880:1300;out.height=label.height;
 const c=out.getContext('2d'),half=out.width/2;
 if(back){c.drawImage(label,label.width-half,0,half,label.height,0,0,half,label.height);c.drawImage(label,0,0,half,label.height,half,0,half,label.height);}
 else c.drawImage(label,label.width/2-half,0,out.width,label.height,0,0,out.width,label.height);
 return out.toDataURL('image/png');
}
// Graceful image fallback uses the exact same wrap, projected onto a cylinder.
// It is also used before WebGL finishes loading and in browsers without WebGL.
function packshot(label,back=false){
 const canvas=document.createElement('canvas');canvas.width=600;canvas.height=1300;
 const c=canvas.getContext('2d'),left=45,right=555,top=62,bottom=1236,r=(right-left)/2;
 c.save();c.beginPath();c.moveTo(91,top);c.bezierCurveTo(70,98,left,121,left,167);c.lineTo(left,1136);c.bezierCurveTo(left,1183,65,1213,89,bottom);c.lineTo(511,bottom);c.bezierCurveTo(535,1213,right,1183,right,1136);c.lineTo(right,167);c.bezierCurveTo(right,121,530,98,509,top);c.closePath();c.clip();
 for(let x=left;x<right;x++){
  const a=Math.asin(Math.max(-1,Math.min(1,(x-300)/r))),b=Math.asin(Math.max(-1,Math.min(1,(x+1-300)/r)));
  const u=((back?0:.5)+a/(Math.PI*2)+1)%1;
  c.drawImage(label,u*label.width,0,Math.max(.5,(b-a)/(Math.PI*2)*label.width),label.height,x,top,1.15,bottom-top);
 }
 const shade=c.createLinearGradient(left,0,right,0);
 shade.addColorStop(0,'#001c3259');shade.addColorStop(.13,'#001a3217');shade.addColorStop(.28,'#ffffff15');shade.addColorStop(.49,'#ffffff00');shade.addColorStop(.78,'#00152c0b');shade.addColorStop(1,'#00162e66');c.fillStyle=shade;c.fillRect(left,top,right-left,bottom-top);
 const shoulder=c.createLinearGradient(0,top,0,bottom);shoulder.addColorStop(0,'#ffffff2b');shoulder.addColorStop(.06,'#ffffff00');shoulder.addColorStop(.92,'#00000000');shoulder.addColorStop(1,'#00182f2f');c.fillStyle=shoulder;c.fillRect(left,top,right-left,bottom-top);
 let seed=137;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
 for(let i=0;i<420;i++){const x=left+random()*(right-left),y=125+random()*1030,rr=.6+Math.pow(random(),2)*5;c.beginPath();c.ellipse(x,y,rr,rr*1.3,0,0,Math.PI*2);c.strokeStyle='#002b3655';c.lineWidth=.8;c.stroke();const glint=c.createRadialGradient(x-rr*.3,y-rr*.4,0,x,y,rr*1.4);glint.addColorStop(0,'#ffffffb0');glint.addColorStop(.3,'#ffffff08');glint.addColorStop(.8,'#00272b18');glint.addColorStop(1,'#ffffff90');c.fillStyle=glint;c.fill();}
 c.restore();
 const metal=c.createLinearGradient(60,0,540,0);metal.addColorStop(0,'#60706d');metal.addColorStop(.12,'#eef2f1');metal.addColorStop(.23,'#9aa6a2');metal.addColorStop(.5,'#f7faf9');metal.addColorStop(.76,'#929d9c');metal.addColorStop(.9,'#e4ece8');metal.addColorStop(1,'#53645f');
 c.fillStyle=metal;c.beginPath();c.ellipse(300,bottom,213,18,0,0,Math.PI*2);c.fill();c.strokeStyle='#768782';c.lineWidth=3;c.stroke();
 c.beginPath();c.ellipse(300,top,214,29,0,0,Math.PI*2);c.fill();c.strokeStyle='#c7d0cc';c.lineWidth=5;c.stroke();
 c.beginPath();c.ellipse(300,top-3,198,21,0,0,Math.PI*2);c.fillStyle='#a9b5b1';c.fill();c.strokeStyle='#edf4f0';c.lineWidth=2;c.stroke();
 c.beginPath();c.ellipse(300,top-3,34,12,0,0,Math.PI*2);c.fillStyle=metal;c.fill();c.strokeStyle='#6b7c75';c.stroke();
 c.beginPath();c.ellipse(300,top-5,20,6,0,0,Math.PI*2);c.fillStyle='#7a8b84';c.fill();
 return canvas.toDataURL('image/png');
}
export async function preparePackaging(){
 const names=['citrus','berry','tropical'];
 const [images,approvedLabels]=await Promise.all([
  Promise.all(names.map(name=>loadImage(`/images/${name}-fruit.webp`))),
  Promise.all(names.map(name=>loadImage(`/images/${name}-label.webp`))),
  Promise.all([document.fonts.load('italic 900 100px "Barlow Condensed"'),document.fonts.load('800 50px "Barlow Condensed"'),document.fonts.load('700 30px "DM Sans"'),document.fonts.load('500 24px "DM Sans"')])
 ]);
 const canvases=images.map((image,index)=>drawCanLabel(document.createElement('canvas'),image,index,approvedLabels[index]));
 const previews=canvases.map(label=>({front:cropLabel(label),back:cropLabel(label,true),frontCan:packshot(label),backCan:packshot(label,true)}));
 return {canvases,previews};
}
