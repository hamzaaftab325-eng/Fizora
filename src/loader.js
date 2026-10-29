const loader=document.getElementById('fizora-loader');
const bar=document.getElementById('loader-bar');
const count=document.getElementById('loader-count');
const root=document.documentElement;

if(loader){
 root.classList.add('is-loading');
 const started=performance.now();
 const minimum=950;
 let progress=0;
 let loaded=document.readyState==='complete';
 let raf=0;

 const finish=()=>{
  const elapsed=performance.now()-started;
  const wait=Math.max(0,minimum-elapsed);
  setTimeout(()=>{
   progress=100;
   if(bar)bar.style.width='100%';
   if(count)count.textContent='100';
   loader.classList.add('is-leaving');
   root.classList.remove('is-loading');
   setTimeout(()=>loader.remove(),760);
  },wait);
 };

 const tick=()=>{
  if(!loader.isConnected)return;
  const ceiling=loaded?100:92;
  const speed=progress<58?.85:progress<82?.34:.10;
  progress=Math.min(ceiling,progress+speed);
  const shown=Math.floor(progress);
  if(bar)bar.style.width=`${shown}%`;
  if(count)count.textContent=String(shown).padStart(2,'0');
  if(loaded&&progress>=99){finish();return;}
  raf=requestAnimationFrame(tick);
 };

 const onLoad=()=>{loaded=true;cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);};
 if(loaded)onLoad();else window.addEventListener('load',onLoad,{once:true});
 raf=requestAnimationFrame(tick);

 setTimeout(()=>{
  if(loader.isConnected){loaded=true;cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);}
 },4500);
}
