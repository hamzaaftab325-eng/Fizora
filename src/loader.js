const loader=document.getElementById('fizora-loader');
const bar=document.getElementById('loader-bar');
const count=document.getElementById('loader-count');
const root=document.documentElement;

root.classList.add('page-reveal-ready');

if(loader){
 root.classList.add('is-loading');
 const started=performance.now();
 const minimum=950;
 let progress=0;
 let pageLoaded=document.readyState==='complete';
 let forceReveal=false;
 let raf=0;
 let finished=false;
 let revealed=false;

 const canIsReady=()=>Boolean(document.querySelector('.can-stage.is-ready canvas'));

 const revealPage=()=>{
  if(revealed)return;
  revealed=true;
  setTimeout(()=>{
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
    root.classList.add('page-entered');
    window.dispatchEvent(new CustomEvent('fizora:page-enter'));
    setTimeout(()=>{
     root.classList.remove('page-reveal-ready');
     root.classList.remove('page-entered');
    },1550);
   }));
  },150);
 };

 const finish=()=>{
  if(finished)return;
  finished=true;
  const elapsed=performance.now()-started;
  const wait=Math.max(0,minimum-elapsed);
  setTimeout(()=>{
   progress=100;
   if(bar)bar.style.width='100%';
   if(count)count.textContent='100';
   loader.classList.add('is-leaving');
   root.classList.remove('is-loading');
   revealPage();
   setTimeout(()=>loader.remove(),760);
  },wait);
 };

 const tick=()=>{
  if(!loader.isConnected)return;
  const sceneReady=canIsReady();
  const ready=(pageLoaded&&sceneReady)||forceReveal;
  const ceiling=ready?100:92;
  const speed=progress<58?.85:progress<82?.34:.10;
  progress=Math.min(ceiling,progress+speed);
  const shown=Math.floor(progress);
  if(bar)bar.style.width=`${shown}%`;
  if(count)count.textContent=String(shown).padStart(2,'0');
  if(ready&&progress>=99){finish();return;}
  raf=requestAnimationFrame(tick);
 };

 const onLoad=()=>{pageLoaded=true;};
 if(!pageLoaded)window.addEventListener('load',onLoad,{once:true});
 raf=requestAnimationFrame(tick);

 // Safety valve for unsupported WebGL or an unexpected asset failure.
 setTimeout(()=>{if(loader.isConnected&&!finished)forceReveal=true;},6500);
}else{
 root.classList.add('page-entered');
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  root.classList.remove('page-reveal-ready');
  root.classList.remove('page-entered');
 }));
}
