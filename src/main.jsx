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
 const root=useRef(),stage=useRef(),backgrounds=useRef([]),sections=useRef([]),collection=useRef(),fallback=useRef(),liquidHost=useRef(),liquidFx=useRef(),liquidShade=useRef([]),fruitImages=useRef([]),canPairs=useRef([]),turner=useRef(),spotlight=useRef(),mist=useRef();
 const [active,setActive]=useState(0),[selected,setSelected]=useState(0),[paused,setPaused]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [labels,setLabels]=useState([]),[backShots,setBackShots]=useState([]),[labelFlavor,setLabelFlavor]=useState(0);
 const labelDialog=useRef();
 const [liquidReady,setLiquidReady]=useState(false),[hasSplashed,setHasSplashed]=useState(false);
 const cardPointer=e=>{if(paused||e.pointerType==='touch')return;const card=e.currentTarget,b=card.getBoundingClientRect();card.style.setProperty('--card-rx',`${(1-(e.clientY-b.top)/b.height*2)*2}deg`);card.style.setProperty('--card-ry',`${((e.clientX-b.left)/b.width*2-1)*3}deg`);};
 const cardLeave=e=>{e.currentTarget.style.setProperty('--card-rx','0deg');e.currentTarget.style.setProperty('--card-ry','0deg');};
 const openLabel=async i=>{setLabelFlavor(i);labelDialog.current.showModal();if(labels.length)return;try{const {preparePackaging}=await import('./can-labels.js');const assets=await preparePackaging();setLabels(assets.previews);}catch{}};
 const pausedRef=useRef(paused);useEffect(()=>{pausedRef.current=paused;},[paused]);
 useEffect(()=>{
  let dead=false,frame=0,offsets=[],height=innerHeight,scroll=window.scrollY,last=performance.now(),elapsed=0,lastActive=-1,liquid=null,visibility=1,press=null;
  const buoyancy=createBuoyancy();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const preference=()=>setPaused(reduced.matches);reduced.addEventListener('change',preference);
  const measure=()=>{height=innerHeight;offsets=[...sections.current,collection.current].map(s=>s.getBoundingClientRect().top+window.scrollY);liquid?.resize();};measure();
  createLiquidBackground(liquidHost.current,liquidFx.current,flavors.map(f=>f.background)).then(effect=>{if(dead){effect.dispose();return;}liquid=effect;setLiquidReady(true);}).catch(()=>{});
  let packagingJob=null;const prepareBacks=async()=>{try{const {preparePackaging}=await import('./can-labels.js');const assets=await preparePackaging();if(dead)return;setLabels(assets.previews);setBackShots(assets.previews.map(p=>p.backCan));}catch{}};
  if('requestIdleCallback' in window)packagingJob=requestIdleCallback(prepareBacks,{timeout:1800});else packagingJob=setTimeout(prepareBacks,700);
  const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');observer.unobserve(e.target);}}),{threshold:.15});document.querySelectorAll('[data-reveal]').forEach(el=>observer.observe(el));
  const canInteract=e=>!pausedRef.current&&visibility>.8&&!labelDialog.current?.open&&!e.target.closest('a,button,input,select,textarea,dialog,#collection,.footer');
  const pointer=e=>{if(e.pointerType!=='touch'&&canInteract(e))liquid?.pointer(e.clientX/innerWidth,e.clientY/innerHeight);};
  const down=e=>{if(e.isPrimary&&e.button===0&&canInteract(e))press={x:e.clientX,y:e.clientY,at:performance.now(),scroll:window.scrollY,id:e.pointerId};};
  const up=e=>{if(press&&e.pointerId===press.id&&performance.now()-press.at<650&&Math.hypot(e.clientX-press.x,e.clientY-press.y)<12&&Math.abs(window.scrollY-press.scroll)<8&&canInteract(e)){
   const x=e.clientX/innerWidth,y=e.clientY/innerHeight;liquid?.splash(x,y);buoyancy.impulse(x*2-1,1-y*2);setHasSplashed(true);
  }press=null;};
  const cancel=()=>{press=null;};
  const animate=now=>{frame=requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;if(document.hidden)return;const motionPaused=pausedRef.current||!!labelDialog.current?.open;if(!motionPaused)elapsed+=dt;scroll=motionPaused?window.scrollY:lerp(scroll,window.scrollY,1-Math.exp(-dt*4.2));const state=scrollState(scroll,offsets,height,innerWidth<760);visibility=state.visibility;if(state.active!==lastActive){lastActive=state.active;setActive(state.active);}const opacities=[0,0,0];opacities[state.i]=1-state.t;opacities[state.i+1]=state.t;backgrounds.current.forEach((b,i)=>{b.style.opacity=opacities[i];b.style.transform=motionPaused?'none':`scale(${1.02+state.arc*.02}) translate3d(${state.x*-6}px,${state.y*-10}px,0)`;if(liquidShade.current[i])liquidShade.current[i].style.opacity=opacities[i];});stage.current.style.opacity=state.visibility;stage.current.style.visibility=state.visibility<.005?'hidden':'visible';
   root.current.style.setProperty('--story-progress',Math.min(1,scroll/Math.max(1,offsets[3])));
   root.current.style.setProperty('--flight-energy',state.arc.toFixed(3));
   const floating=motionPaused?(buoyancy.reset(),buoyancy.state):buoyancy.update(dt);
   const mobile=innerWidth<760,flightX=50+state.x*(mobile?24:50),dive=state.arc*(mobile?height*.055:height*.13),direction=state.i===0?-1:1,yaw=direction*state.arc*(mobile?3.5:7),scale=1+state.arc*(mobile?.035:.085),floatY=motionPaused?0:Math.sin(elapsed*1.05)*5-floating.y*(mobile?26:48),roll=-.13+(motionPaused?0:state.tilt*.72)+floating.roll*.45;
   if(fallback.current){fallback.current.style.left=`${flightX}%`;fallback.current.style.top=`calc(${mobile?40:49}% + ${dive}px)`;fallback.current.style.transform=`translate(calc(-50% + ${floating.x*(mobile?22:42)}px),calc(-50% + ${floatY}px)) rotateY(${yaw}deg) rotateZ(${roll}rad) scale(${scale})`;}
   const spin=motionPaused?0:state.t*360;if(turner.current)turner.current.style.transform=`rotateY(${spin}deg) rotateX(${state.arc*(mobile?1.5:3.2)}deg)`;
   const blend=Math.max(0,Math.min(1,(state.t-.42)/.16));const pairOps=[0,0,0];pairOps[state.i]=1-blend;pairOps[state.i+1]=blend;canPairs.current.forEach((pair,i)=>{if(!pair)return;pair.style.opacity=pairOps[i]??0;});
   if(spotlight.current){spotlight.current.style.left=`${flightX}%`;spotlight.current.style.top=`calc(${mobile?40:50}% + ${dive*.42}px)`;}
   if(mist.current){mist.current.style.left=`${flightX}%`;mist.current.style.top=`calc(${mobile?40:50}% + ${dive*.3}px)`;}
   fruitImages.current.forEach((img,i)=>{if(!img)return;const o=opacities[i]??0;img.style.opacity=o;img.style.transform=`translate3d(${state.x*(mobile?2:5)}px,${(1-o)*34+state.arc*8}px,0) scale(${.9+o*.1}) rotate(${(1-o)*(i===1?-3:3)}deg)`;});
   liquid?.render(state,dt,motionPaused);
  };frame=requestAnimationFrame(animate);addEventListener('resize',measure);addEventListener('pointermove',pointer,{passive:true});addEventListener('pointerdown',down,{passive:true});addEventListener('pointerup',up,{passive:true});addEventListener('pointercancel',cancel,{passive:true});
  document.fonts.ready.then(()=>{if(!dead)measure();});
  return()=>{dead=true;cancelAnimationFrame(frame);observer.disconnect();removeEventListener('resize',measure);removeEventListener('pointermove',pointer);removeEventListener('pointerdown',down);removeEventListener('pointerup',up);removeEventListener('pointercancel',cancel);reduced.removeEventListener('change',preference);if(packagingJob!==null){if('cancelIdleCallback' in window)cancelIdleCallback(packagingJob);else clearTimeout(packagingJob);}liquid?.dispose();};
 },[]);
 const current=flavors[active],picked=flavors[selected];
 return <div ref={root} className={`site theme-${current.id} ${paused?'motion-paused':''} ${liquidReady?'liquid-ready':''} ${hasSplashed?'has-splashed':''}`} style={{'--story-ink':current.ink}}>
  <a className="skip" href="#collection">Skip to flavors</a>
  <div className="backdrops" aria-hidden="true">{flavors.map((f,i)=><div key={f.id} className={`backdrop backdrop-${f.id}`} ref={el=>backgrounds.current[i]=el} style={{backgroundImage:`url(${f.background})`,opacity:i===0?1:0}}/>)}<div className="liquid-layer" ref={liquidHost}/><div className="liquid-shades">{flavors.map((f,i)=><div key={f.id} ref={el=>liquidShade.current[i]=el} className={`liquid-shade liquid-shade-${f.id}`} style={{opacity:i===0?1:0}}/>)}</div></div>
  <canvas className="liquid-atmosphere" ref={liquidFx} aria-hidden="true"/>
  <header className="nav"><a className="wordmark" href="#citrus" aria-label="Fizora home">FIZORA</a><nav aria-label="Main navigation"><a className="nav-link" href="#collection">Meet the flavors</a><button className="motion-toggle" onClick={()=>setPaused(p=>!p)} aria-pressed={paused} aria-label={paused?'Resume motion':'Pause motion'} title={paused?'Resume motion':'Pause motion'}>{paused?<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="m6 3 11 7-11 7z"/></svg>:<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M5 3h3v14H5zm7 0h3v14h-3z"/></svg>}</button><a className="nav-cta" href="#collection">Find your fizz <Arrow/></a></nav></header>
  <div ref={stage} className="can-stage is-ready is-photo-hero" aria-hidden="true"><div ref={spotlight} className="hero-spotlight"/><div ref={mist} className="hero-mist"/><div className="fresh-fruit">{flavors.map((f,i)=><img ref={el=>fruitImages.current[i]=el} key={f.id} src={`/images/${f.id}-fruit.webp`} alt="" style={{opacity:i===0?1:0}}/>)}</div><div ref={fallback} className="can-fallback photo-hero-can"><div ref={turner} className="hero-can-turner">{flavors.map((f,i)=><div ref={el=>canPairs.current[i]=el} className="hero-can-pair" key={f.id} style={{opacity:i===0?1:0}}><img className="can-face can-front" src={f.can} alt=""/><img className="can-face can-back" src={backShots[i]||f.can} alt=""/></div>)}</div></div></div>
  <main>
   <div className="story" id="flavors">
    {flavors.map((f,i)=><section key={f.id} id={f.id} ref={el=>sections.current[i]=el} className={`flavor-section flavor-${f.id}`} aria-labelledby={`${f.id}-heading`} style={{'--ink':f.ink,'--accent':f.accent}}>
      <div className="section-copy"><p className="eyebrow" data-reveal><span className="tiny-spark">✳</span> {f.eyebrow}</p>{React.createElement(i===0?'h1':'h2',{id:`${f.id}-heading`,className:'display','data-reveal':true},f.headline.map((line,index)=><span className="headline-line" key={line} style={{'--line':index}}><span className="headline-word">{line}</span></span>))}<div className="flavor-info" data-reveal><div className="flavor-title-row"><span className="flavor-number">{f.number} /</span><h2>{f.name}</h2></div><p>{f.description}</p><a className="text-link" href={i<2?`#${flavors[i+1].id}`:'#collection'}>{i<2?'Discover the next flavor':'Find your favorite'} <Arrow/></a></div></div>
      <div className="can-caption" aria-hidden="true"><span className="caption-line"/><span>{f.fruit}<small>SPARKLING DRINK · 330 mL</small></span></div>
      <div className="section-bottom"><span className="scroll-cue"><Arrow down/> {i===0?'SCROLL FOR A FLAVOR TRIP':'THERE’S MORE TO THE FIZZ'}</span><span className="flavor-counter">{f.number}<span> / 03</span></span></div>
    </section>)}
   </div>
   <section ref={collection} className="collection" id="collection" aria-labelledby="collection-title">
    <div className="ticker" aria-hidden="true"><div>{Array.from({length:4},(_,i)=><span key={i}>BIG FLAVOR <Spark/> GOOD TIMES <Spark/> FIND YOUR FIZZ <Spark/></span>)}</div></div>
    <div className="collection-heading" data-reveal><p className="eyebrow">THE FIZORA LINEUP</p><h2 id="collection-title">THREE FLAVORS.<br/><em>ONE HAPPY PLACE.</em></h2><p>Ice cold. Full of character.<br/>Pick the flavor that feels like you.</p></div>
    <div className="flavor-cards" aria-label="Choose a flavor">{flavors.map((f,i)=><button key={f.id} className={`flavor-card card-${f.id} ${selected===i?'selected':''}`} aria-pressed={selected===i} onClick={()=>setSelected(i)} onPointerMove={cardPointer} onPointerLeave={cardLeave} style={{'--card-bg':f.color,'--card-ink':f.ink,'--card-accent':f.accent}}><div className="card-top"><span>0{i+1}</span><span className="select-circle" aria-hidden="true">{selected===i?'✓':'↗'}</span></div><div className="card-art"><div className="card-orbit"/><img src={f.can} alt={`FIZORA ${f.name} can`} loading="lazy" width="1024" height="1536"/></div><div className="card-copy"><p>{f.fruit}</p><h3>{f.name}</h3><div>{f.notes.map(n=><span key={n}>{n}</span>)}</div></div></button>)}</div>
    <div className={`flavor-detail detail-${picked.id}`} style={{'--detail-color':picked.color,'--detail-ink':picked.ink}} aria-live="polite"><span className="detail-spark"><Spark/></span><div><p className="eyebrow">YOUR FLAVOR, YOUR MOOD</p><h3>{picked.name}</h3><p>{picked.description}</p></div><a className="pill-button" href={`#${picked.id}`}>Explore this flavor <Arrow/></a></div>
   </section>
   <footer className="footer"><div className="footer-top"><p>Big flavor.<br/>A fresh perspective.</p><a className="text-link" href="#citrus">Back to the good stuff <Arrow/></a></div><div className="footer-brand" aria-label="Fizora">FIZORA<span>✳</span></div><div className="footer-bottom"><span>FIND YOUR FIZZ.</span><span>THREE FLAVORS. ENDLESS GOOD VIBES.</span><span>© {new Date().getFullYear()} FIZORA</span></div></footer>
  </main>
  <dialog ref={labelDialog} className="label-dialog" aria-labelledby="label-dialog-title" onClick={e=>{if(e.target===e.currentTarget)e.currentTarget.close();}}>
   <div className="label-dialog-header"><div><p className="eyebrow">THE FULL WRAP</p><h2 id="label-dialog-title">{flavors[labelFlavor].name}</h2></div><button aria-label="Close label details" onClick={()=>labelDialog.current.close()}>×</button></div>
   <div className="label-tabs" role="group" aria-label="Choose label flavor">{flavors.map((f,i)=><button key={f.id} aria-pressed={labelFlavor===i} onClick={()=>setLabelFlavor(i)}>{f.name}</button>)}</div>
   <div className="label-proof">{labels[labelFlavor]?<><figure><figcaption>01 / FRONT</figcaption><img src={labels[labelFlavor].front} alt={`${flavors[labelFlavor].name} front label artwork`} /></figure><figure><figcaption>02 / BACK</figcaption><img src={labels[labelFlavor].back} alt={`${flavors[labelFlavor].name} back label with nutrition and ingredient placeholders`} /></figure></>:<p className="label-loading">Preparing label details…</p>}</div>
   <p className="label-note">Packaging concept. Nutrition, ingredients, production details, and barcode await the approved product specification.</p>
  </dialog>
  <nav className="flavor-rail" aria-label="Jump to flavor">{flavors.map((f,i)=><a key={f.id} href={`#${f.id}`} aria-label={f.name} aria-current={active===i?'location':undefined} className={active===i?'active':''}><span>{f.number}</span><i/></a>)}</nav>
  <div className="progress" aria-hidden="true"/>
 </div>;
}
createRoot(document.getElementById('root')).render(<App/>);