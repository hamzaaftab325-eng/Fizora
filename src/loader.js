const loader=document.getElementById('fizora-loader');
const bar=document.getElementById('loader-bar');
const count=document.getElementById('loader-count');
const root=document.documentElement;

root.classList.add('page-reveal-ready');

if(loader){
 root.classList.add('is-loading');
 const started=performance.now();
 const minimum=800;
 let progress=0;
 let pageLoaded=document.readyState==='complete';
 let forceReveal=false;
 let raf=0;
 let finished=false;
 let revealed=false;

 const canPreviewReady=()=>{
  const image=document.querySelector('.can-fallback img');
  return Boolean(image?.complete&&image.naturalWidth>0);
 };
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
    },1450);
   }));
  },110);
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
   setTimeout(()=>loader.remove(),720);
  },wait);
 };

 const tick=()=>{
  if(!loader.isConnected)return;
  const visualReady=canPreviewReady()||canIsReady();
  const ready=(pageLoaded&&visualReady)||forceReveal;
  const ceiling=ready?100:92;
  const speed=progress<58?.9:progress<82?.38:.12;
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

 // Never hold the visitor on the loader if a GPU/asset path is unexpectedly slow.
 setTimeout(()=>{if(loader.isConnected&&!finished)forceReveal=true;},3200);
}else{
 root.classList.add('page-entered');
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  root.classList.remove('page-reveal-ready');
  root.classList.remove('page-entered');
 }));
}
