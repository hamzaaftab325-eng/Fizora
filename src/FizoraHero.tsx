import React,{useEffect,useMemo,useState,type CSSProperties}from'react';
import{ArrowLeft,ArrowRight}from'lucide-react';

type Direction='next'|'prev';
type Slide={id:string;src?:string;background:string;bg:string;title:string;fruit:string;description:string;lineup?:boolean};

const SLIDES:Slide[]=[
 {id:'citrus',src:'/images/citrus-can.webp',background:'/images/hero-citrus-bg.webp',bg:'#79B400',title:'CITRUS SPARK',fruit:'LEMON + LIME',description:'Zesty lemon meets lively lime in a sparkling sip with a sunny disposition.'},
 {id:'berry',src:'/images/berry-can.webp',background:'/images/hero-berry-bg.webp',bg:'#BD3F7E',title:'BERRY BURST',fruit:'RASPBERRY + BLACKBERRY',description:'Juicy berries, bright fizz and a playful finish built for colorful moments.'},
 {id:'tropical',src:'/images/tropical-can.webp',background:'/images/hero-tropical-bg.webp',bg:'#E47C3D',title:'TROPICAL RUSH',fruit:'MANGO + PASSION FRUIT',description:'A sunny sparkling escape with mango, passion fruit and a smooth tropical finish.'},
 {id:'lineup',background:'/images/hero-lineup-bg.webp',bg:'#184831',title:'THE FIZORA LINEUP',fruit:'THREE FLAVORS · ONE HAPPY PLACE',description:'Three bright personalities. One unmistakable fizz. Pick the can that feels like you.',lineup:true},
];
const CAN_SRCS=['/images/citrus-can.webp','/images/berry-can.webp','/images/tropical-can.webp'];
const BACKGROUND_SRCS=SLIDES.map(slide=>slide.background);
const EASE='520ms cubic-bezier(.4,0,.2,1)';

function LineupArt(){return <div className="relative h-full w-full">{CAN_SRCS.map((src,index)=><img key={src} src={src} alt="" draggable={false} decoding="async" className="absolute bottom-0 h-[86%] w-full object-contain object-bottom drop-shadow-[0_18px_20px_rgba(0,0,0,.18)]" style={{transform:`translateX(${(index-1)*20}%) rotate(${(index-1)*6}deg) scale(${index===1?1.02:.92})`,zIndex:index===1?3:2}}/>)}</div>}

export default function FizoraHero(){
 const[activeIndex,setActiveIndex]=useState(0),[isAnimating,setIsAnimating]=useState(false),[isMobile,setIsMobile]=useState(()=>window.innerWidth<640);
 useEffect(()=>{[...CAN_SRCS,...BACKGROUND_SRCS].forEach(src=>{const image=new Image();image.decoding='async';image.src=src;});},[]);
 useEffect(()=>{let raf=0;const onResize=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>setIsMobile(window.innerWidth<640));};window.addEventListener('resize',onResize,{passive:true});return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',onResize);};},[]);
 const roles=useMemo(()=>({center:activeIndex,left:(activeIndex+3)%4,right:(activeIndex+1)%4,back:(activeIndex+2)%4}),[activeIndex]);
 const navigate=(direction:Direction)=>{if(isAnimating)return;setIsAnimating(true);setActiveIndex(previous=>direction==='next'?(previous+1)%4:(previous+3)%4);window.setTimeout(()=>setIsAnimating(false),520);};
 const active=SLIDES[activeIndex];

 return <section className="relative z-[80] w-full overflow-hidden text-white" aria-label="Fizora flavor carousel" style={{backgroundColor:active.bg,transition:`background-color ${EASE}`,fontFamily:'Inter,sans-serif'}}>
  <div className="relative h-[100svh] min-h-[620px] w-full overflow-hidden">
   <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
    {SLIDES.map((slide,index)=><img key={slide.background} src={slide.background} alt="" decoding="async" fetchPriority={index===0?'high':'auto'} className="absolute inset-0 h-full w-full object-cover" style={{opacity:index===activeIndex?1:0,transform:index===activeIndex?'scale(1.015)':'scale(1.04)',transition:`opacity ${EASE}, transform 1400ms cubic-bezier(.2,.8,.2,1)`,willChange:isAnimating?'opacity, transform':'auto'}}/>)}
    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.28)_0%,rgba(0,0,0,.05)_36%,rgba(0,0,0,.04)_66%,rgba(0,0,0,.22)_100%),linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.16))]"/>
    <div className="absolute inset-x-0 bottom-0 h-[42%] bg-[linear-gradient(180deg,transparent,rgba(0,0,0,.20))]"/>
   </div>

   <a href="#citrus" className="absolute left-4 top-6 z-[60] text-xs font-semibold uppercase text-white/95 sm:left-8" style={{letterSpacing:'.18em'}}>FIZORA</a>
   <div className="absolute right-4 top-6 z-[60] hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[.18em] text-white/85 sm:flex"><span className="h-2 w-2 rounded-full bg-white"/> FIND YOUR FIZZ</div>

   <div className="absolute inset-0 z-[3]" aria-live="polite">{SLIDES.map((slide,index)=>{
    const role=index===roles.center?'center':index===roles.left?'left':index===roles.right?'right':'back';
    const styles:CSSProperties={position:'absolute',aspectRatio:'.6 / 1',transform:role==='center'?`translateX(-50%) scale(${isMobile?1.04:1.06})`:'translateX(-50%) scale(1)',opacity:role==='center'?1:role==='back'?.28:.74,zIndex:role==='center'?20:role==='back'?5:10,left:role==='center'||role==='back'?'50%':role==='left'?(isMobile?'18%':'27%'):(isMobile?'82%':'73%'),height:role==='center'?(isMobile?'54%':'75%'):role==='back'?(isMobile?'14%':'21%'):(isMobile?'20%':'31%'),bottom:role==='center'?(isMobile?'19%':'6%'):(isMobile?'30%':'13%'),transition:`transform ${EASE}, opacity ${EASE}, left ${EASE}, height ${EASE}, bottom ${EASE}`,willChange:isAnimating?'transform, opacity, left':'auto'};
    return <div key={slide.id} style={styles} aria-hidden={role!=='center'}>{slide.lineup?<LineupArt/>:<img src={slide.src} alt={role==='center'?`Fizora ${slide.title} can`:''} draggable={false} decoding="async" className="h-full w-full object-contain object-bottom drop-shadow-[0_20px_24px_rgba(0,0,0,.20)]"/>}</div>;
   })}</div>

   <div className="absolute bottom-6 left-4 z-[60] max-w-[320px] sm:bottom-[10%] sm:left-[6%]">
    <p className="mb-2 text-base font-bold uppercase text-white sm:mb-3 sm:text-[22px]" style={{letterSpacing:'.02em',textShadow:'0 2px 18px rgba(0,0,0,.28)'}}>{active.title}</p>
    <p className="mb-1 text-[9px] font-semibold uppercase tracking-[.18em] text-white/80 sm:text-[10px]">{active.fruit}</p>
    <p className="mb-4 hidden text-xs leading-[1.6] text-white/90 sm:mb-5 sm:block sm:text-sm">{active.description}</p>
    <div className="flex gap-3">
     <button type="button" aria-label="Previous flavor" onClick={()=>navigate('prev')} className="flex h-12 w-12 items-center justify-center rounded-full border border-white/85 bg-black/10 text-white transition-[transform,background-color] duration-150 hover:scale-[1.04] hover:bg-black/20 disabled:cursor-wait sm:h-14 sm:w-14" disabled={isAnimating}><ArrowLeft size={24} strokeWidth={2.15}/></button>
     <button type="button" aria-label="Next flavor" onClick={()=>navigate('next')} className="flex h-12 w-12 items-center justify-center rounded-full border border-white/85 bg-black/10 text-white transition-[transform,background-color] duration-150 hover:scale-[1.04] hover:bg-black/20 disabled:cursor-wait sm:h-14 sm:w-14" disabled={isAnimating}><ArrowRight size={24} strokeWidth={2.15}/></button>
    </div>
   </div>

   <a href="#citrus" className="absolute bottom-6 right-4 z-[60] flex items-center gap-3 uppercase text-white no-underline transition-opacity duration-150 hover:opacity-80 sm:bottom-[10%] sm:right-[5%]" style={{fontFamily:'Anton,sans-serif',fontSize:'clamp(20px,3.2vw,46px)',fontWeight:400,letterSpacing:'-.02em',lineHeight:1,textShadow:'0 2px 18px rgba(0,0,0,.25)'}}>DISCOVER IT <ArrowRight className="h-5 w-5 sm:h-7 sm:w-7" strokeWidth={2.15}/></a>
  </div>
 </section>;
}
