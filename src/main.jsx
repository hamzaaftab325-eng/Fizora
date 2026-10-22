import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flavors} from './assets';
import {scrollState,lerp} from './motion';
import {createLiquidBackground} from './liquid-background';
import {createBuoyancy} from './liquid-field';
import './style.css';
import './atmosphere.css';
import './campaign.css';
const Arrow=({down=false})=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={down?'M12 4v16m-6-6 6 6 6-6':'M4 12h16m-6-6 6 6-6 6'}/></svg>;
const Spark=()=> <svg viewBox="0 0 40 40" fill="currentColor" aria-hidden="true"><path d="M20 0l4.4 13.8L37 7l-6.8 12.6L40 24l-14.3 1.7L24 40l-4.4-9.8L7 37l6.8-12.6L0 20l14.3-1.7z"/></svg>;
function App(){
 const root=useRef(),canvas=useRef(),stage=useRef(),backgrounds=useRef([]),sections=useRef([]),collection=useRef(),controller=useRef(null),fallback=useRef(),liquidHost=useRef(),liquidFx=useRef(),liquidShade=useRef([]),splashStage=useRef();
 const [active,setActive]=useState(0),[selected,setSelected]=useState(0),[ready,setReady]=useState(false),[sceneError,setSceneError]=useState(false),[paused,setPaused]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [view,setView]=useState('auto'),[shots,setShots]=useState([]),[labels,setLabels]=useState([]),[labelFlavor,setLabelFlavor]=useState(0);
 const labelDialog=useRef();
 const [liquidReady,setLiquidReady]=useState(false),[hasSplashed,setHasSplashed]=useState(false);
 const cardPointer=e=>{if(paused||e.pointerType==='touch')return;const card=e.currentTarget,b=card.getBoundingClientRect();card.style.setProperty('--card-rx',`${(1-(e.clientY-b.top)/b.height*2)*2}deg`);card.style.setProperty('--card-ry',`${((e.clientX-b.left)/b.width*2-1)*3}deg`);};
 const cardLeave=e=>{e.currentTarget.style.setProperty('--card-rx','0deg');e.currentTarget.style.setProperty('--card-ry','0deg');};
 const openLabel=i=>{setLabelFlavor(i);labelDialog.current.showModal();};
 const viewRef=useRef(view);useEffect(()=>{viewRef.current=view;controller.current?.setView(view);},[view]);
 const pausedRef=useRef(paused);useEffect(()=>{pausedRef.current=paused;},[paused]);
 useEffect(()=>{
  let dead=false,frame=0,offsets=[],height=innerHeight,scroll=window.scrollY,last=performance.now(),elapsed=0,lastActive=-1,liquid=null,visibility=1,press=null;
  const buoyancy=createBuoyancy();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const preference=()=>setPaused(reduced.matches);reduced.addEventListener('change',preference);
  const measure=()=>{height=innerHeight;offsets=[...sections.current,collection.current].map(s=>s.getBoundingClientRect().top+window.scrollY);controller.current?.resize();liquid?.resize();};measure();
  createLiquidBackground(liquidHost.current,liquidFx.current,flavors.map(f=>f.background)).then(effect=>{if(dead){effect.dispose();return;}liquid=effect;setLiquidReady(true);}).catch(()=>{});
  import('./can-scene.js').then(async({createCanScene,preparePackaging})=>{if(dead)return;const assets=await preparePackaging();if(dead)return;setLabels(assets.previews);setShots(assets.previews.map(p=>p.frontCan));const scene=await createCanScene(canvas.current,assets);if(dead){scene.dispose();return;}controller.current=scene;scene.setView(viewRef.current);if(scene.catalogShots.length===3)setShots(scene.catalogShots);setReady(true);}).catch(()=>{if(!dead){setSceneError(true);if(viewRef.current==='auto')setView('front');}});
  const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');observer.unobserve(e.target);}}),{threshold:.15});document.querySelectorAll('[data-reveal]').forEach(el=>observer.observe(el));
  const canInteract=e=>!pausedRef.current&&visibility>.8&&!labelDialog.current?.open&&!e.target.closest('a,button,input,select,textarea,dialog,#collection,.footer');
  const pointer=e=>{if(e.pointerType!=='touch'){
   controller.current?.pointer(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);
   if(canInteract(e))liquid?.pointer(e.clientX/innerWidth,e.clientY/innerHeight);
  }};
  const down=e=>{if(e.isPrimary&&e.button===0&&canInteract(e))press={x:e.clientX,y:e.clientY,at:performance.now(),scroll:window.scrollY,id:e.pointerId};};
  const up=e=>{if(press&&e.pointerId===press.id&&performance.now()-press.at<650&&Math.hypot(e.clientX-press.x,e.clientY-press.y)<12&&Math.abs(window.scrollY-press.scroll)<8&&canInteract(e)){
   const x=e.clientX/innerWidth,y=e.clientY/innerHeight;liquid?.splash(x,y);controller.current?.impulse(x*2-1,1-y*2);buoyancy.impulse(x*2-1,1-y*2);setHasSplashed(true);
  }press=null;};
  const cancel=()=>{press=null;};
  const animate=now=>{frame=requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;if(document.hidden)return;const motionPaused=pausedRef.current||!!labelDialog.current?.open;if(!motionPaused)elapsed+=dt;scroll=motionPaused?window.scrollY:lerp(scroll,window.scrollY,1-Math.exp(-dt*7));const state=scrollState(scroll,offsets,height,innerWidth<760);visibility=state.visibility;if(state.active!==lastActive){lastActive=state.active;setActive(state.active);}const opacities=[0,0,0];opacities[state.i]=1-state.t;opacities[state.i+1]=state.t;backgrounds.current.forEach((b,i)=>{b.style.opacity=opacities[i];b.style.transform=motionPaused?'none':`scale(${1.025+state.arc*.025}) translate3d(${state.x*-7}px,${state.y*-12}px,0)`;if(liquidShade.current[i])liquidShade.current[i].style.opacity=opacities[i];});stage.current.style.opacity=state.visibility;stage.current.style.visibility=state.visibility<.005?'hidden':'visible';
   splashStage.current.style.left=`${50+state.x*50}%`;splashStage.current.style.top=`${50-state.y*50}%`;splashStage.current.style.setProperty('--splash-roll',`${state.tilt*.35}rad`);splashStage.current.style.setProperty('--splash-push',1+state.arc*.08);
   root.current.style.setProperty('--story-progress',Math.min(1,scroll/Math.max(1,offsets[3])));
   const floating=motionPaused?(buoyancy.reset(),buoyancy.state):buoyancy.update(dt);
   if(fallback.current){fallback.current.style.left=`${50+state.x*50}%`;fallback.current.style.transform=`translate(calc(-50% + ${floating.x*65}px),calc(-50% + ${motionPaused?0:Math.sin(elapsed*1.1)*5-floating.y*65}px)) rotate(${(motionPaused||viewRef.current!=='auto'?0:state.tilt)+floating.roll}rad)`;}
   liquid?.render(state,dt,motionPaused);controller.current?.render(state,elapsed,dt,motionPaused);
  };frame=requestAnimationFrame(animate);addEventListener('resize',measure);addEventListener('pointermove',pointer,{passive:true});addEventListener('pointerdown',down,{passive:true});addEventListener('pointerup',up,{passive:true});addEventListener('pointercancel',cancel,{passive:true});
  document.fonts.ready.then(()=>{if(!dead)measure();});
  return()=>{dead=true;cancelAnimationFrame(frame);observer.disconnect();removeEventListener('resize',measure);removeEventListener('pointermove',pointer);removeEventListener('pointerdown',down);removeEventListener('pointerup',up);removeEventListener('pointercancel',cancel);reduced.removeEventListener('change',preference);controller.current?.dispose();liquid?.dispose();};
 },[]);
 const current=flavors[active],picked=flavors[selected];
 return <div ref={root} className={`site theme-${current.id} ${paused?'motion-paused':''} ${liquidReady?'liquid-ready':''} ${hasSplashed?'has-splashed':''}`} style={{'--story-ink':current.ink}}>
  <a className="skip" href="#collection">Skip to flavors</a>
  <div className="backdrops" aria-hidden="true">{flavors.map((f,i)=><div key={f.id} className={`backdrop backdrop-${f.id}`} ref={el=>backgrounds.current[i]=el} style={{backgroundImage:`url(${f.background})`,opacity:i===0?1:0}}/>)}<div className="liquid-layer" ref={liquidHost}/><div className="liquid-shades">{flavors.map((f,i)=><div key={f.id} ref={el=>liquidShade.current[i]=el} className={`liquid-shade liquid-shade-${f.id}`} style={{opacity:i===0?1:0}}/>)}</div></div>
  <canvas className="liquid-atmosphere" ref={liquidFx} aria-hidden="true"/>
  <header className="nav"><a className="wordmark" href="#citrus" aria-label="Fizora home">FIZORA</a><nav aria-label="Main navigation"><a className="nav-link" href="#collection">Meet the flavors</a><button className="motion-toggle" onClick={()=>setPaused(p=>!p)} aria-pressed={paused} aria-label={paused?'Resume motion':'Pause motion'} title={paused?'Resume motion':'Pause motion'}>{paused?<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="m6 3 11 7-11 7z"/></svg>:<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M5 3h3v14H5zm7 0h3v14h-3z"/></svg>}</button><a className="nav-cta" href="#collection">Find your fizz <Arrow/></a></nav></header>
  <div ref={stage} className={`can-stage ${ready?'is-ready':''}`} aria-hidden="true"><div className="splash-stage" ref={splashStage}><div className="fresh-fruit">{flavors.map((f,i)=><img key={f.id} src={`/images/${f.id}-fruit.webp`} alt="" style={{opacity:active===i?1:0}}/>)}</div></div><canvas ref={canvas}/><div ref={fallback} className="can-fallback"><img src={labels[active]?(view==='back'?labels[active].backCan:labels[active].frontCan):current.can} alt=""/></div></div>
  <main>
   <div className="story" id="flavors">
    {flavors.map((f,i)=><section key={f.id} id={f.id} ref={el=>sections.current[i]=el} className={`flavor-section flavor-${f.id}`} aria-labelledby={`${f.id}-heading`} style={{'--ink':f.ink,'--accent':f.accent}}>
      <div className="section-copy"><p className="eyebrow" data-reveal><span className="tiny-spark">✳</span> {f.eyebrow}</p>{React.createElement(i===0?'h1':'h2',{id:`${f.id}-heading`,className:'display','data-reveal':true},f.headline.map((line,index)=><span className="headline-line" key={line} style={{'--line':index}}><span className="headline-word">{line}</span></span>))}<div className="flavor-info" data-reveal><div className="flavor-title-row"><span className="flavor-number">{f.number} /</span><h2>{f.name}</h2></div><p>{f.description}</p><a className="text-link" href={i<2?`#${flavors[i+1].id}`:'#collection'}>{i<2?'Discover the next flavor':'Find your favorite'} <Arrow/></a></div></div>
      {i===0&&<span className="liquid-hint" aria-hidden="true"><i/>Tap anywhere. Make a splash.</span>}
      <div className="can-caption" aria-hidden="true"><span className="caption-line"/><span>{f.fruit}<small>SPARKLING DRINK · 330 mL</small></span></div>
      {labels.length>0&&<div className="can-inspector"><div className="can-controls" role="group" aria-label={`Inspect ${f.name} can`}>{(ready?['front','back','auto']:['front','back']).map(mode=><button key={mode} aria-pressed={view===mode} onClick={()=>setView(mode)}>{mode==='auto'?'Auto rotate':mode}</button>)}</div><button className="label-detail-button" onClick={()=>openLabel(i)}>View label details <span aria-hidden="true">↗</span></button></div>}
      <div className="section-bottom"><span className="scroll-cue"><Arrow down/> {i===0?'SCROLL FOR A FLAVOR TRIP':'THERE’S MORE TO THE FIZZ'}</span><span className="flavor-counter">{f.number}<span> / 03</span></span></div>
    </section>)}
   </div>
   <section ref={collection} className="collection" id="collection" aria-labelledby="collection-title">
    <div className="ticker" aria-hidden="true"><div>{Array.from({length:4},(_,i)=><span key={i}>BIG FLAVOR <Spark/> GOOD TIMES <Spark/> FIND YOUR FIZZ <Spark/></span>)}</div></div>
    <div className="collection-heading" data-reveal><p className="eyebrow">THE FIZORA LINEUP</p><h2 id="collection-title">THREE FLAVORS.<br/><em>ONE HAPPY PLACE.</em></h2><p>Ice cold. Full of character.<br/>Pick the flavor that feels like you.</p></div>
    <div className="flavor-cards" aria-label="Choose a flavor">{flavors.map((f,i)=><button key={f.id} className={`flavor-card card-${f.id} ${selected===i?'selected':''}`} aria-pressed={selected===i} onClick={()=>setSelected(i)} onPointerMove={cardPointer} onPointerLeave={cardLeave} style={{'--card-bg':f.color,'--card-ink':f.ink,'--card-accent':f.accent}}><div className="card-top"><span>0{i+1}</span><span className="select-circle" aria-hidden="true">{selected===i?'✓':'↗'}</span></div><div className="card-art"><div className="card-orbit"/><img src={shots[i]||f.can} alt={`FIZORA ${f.name} can`} loading="lazy" width="1024" height="1536"/></div><div className="card-copy"><p>{f.fruit}</p><h3>{f.name}</h3><div>{f.notes.map(n=><span key={n}>{n}</span>)}</div></div></button>)}</div>
    <div className={`flavor-detail detail-${picked.id}`} style={{'--detail-color':picked.color,'--detail-ink':picked.ink}} aria-live="polite"><span className="detail-spark"><Spark/></span><div><p className="eyebrow">YOUR FLAVOR, YOUR MOOD</p><h3>{picked.name}</h3><p>{picked.description}</p></div><a className="pill-button" href={`#${picked.id}`}>Explore this flavor <Arrow/></a></div>
   </section>
   <footer className="footer"><div className="footer-top"><p>Big flavor.<br/>A fresh perspective.</p><a className="text-link" href="#citrus">Back to the good stuff <Arrow/></a></div><div className="footer-brand" aria-label="Fizora">FIZORA<span>✳</span></div><div className="footer-bottom"><span>FIND YOUR FIZZ.</span><span>THREE FLAVORS. ENDLESS GOOD VIBES.</span><span>© {new Date().getFullYear()} FIZORA</span></div></footer>
  </main>
  <dialog ref={labelDialog} className="label-dialog" aria-labelledby="label-dialog-title" onClick={e=>{if(e.target===e.currentTarget)e.currentTarget.close();}}>
   <div className="label-dialog-header"><div><p className="eyebrow">THE FULL WRAP</p><h2 id="label-dialog-title">{flavors[labelFlavor].name}</h2></div><button aria-label="Close label details" onClick={()=>labelDialog.current.close()}>×</button></div>
   <div className="label-tabs" role="group" aria-label="Choose label flavor">{flavors.map((f,i)=><button key={f.id} aria-pressed={labelFlavor===i} onClick={()=>setLabelFlavor(i)}>{f.name}</button>)}</div>
   <div className="label-proof">{labels[labelFlavor]&&<><figure><figcaption>01 / FRONT</figcaption><img src={labels[labelFlavor].front} alt={`${flavors[labelFlavor].name} front label artwork`} /></figure><figure><figcaption>02 / BACK</figcaption><img src={labels[labelFlavor].back} alt={`${flavors[labelFlavor].name} back label with nutrition and ingredient placeholders`} /></figure></>}</div>
   <p className="label-note">Packaging concept. Nutrition, ingredients, production details, and barcode await the approved product specification.</p>
  </dialog>
  <nav className="flavor-rail" aria-label="Jump to flavor">{flavors.map((f,i)=><a key={f.id} href={`#${f.id}`} aria-label={f.name} aria-current={active===i?'location':undefined} className={active===i?'active':''}><span>{f.number}</span><i/></a>)}</nav>
  <div className="progress" aria-hidden="true"/>
  {sceneError&&<span className="sr-only" role="status">Product imagery is displayed in place of the 3D view.</span>}
 </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
