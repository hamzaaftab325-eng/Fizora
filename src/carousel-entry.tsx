import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowLeft,ArrowRight} from 'lucide-react';
import {flavors} from './assets';
import './carousel-tailwind.css';

type Direction='next'|'prev';
type Role='center'|'left'|'right';

const ITEMS=flavors.map(flavor=>({
 src:flavor.can,
 bg:flavor.color,
 panel:flavor.accent,
 name:flavor.name,
 fruit:flavor.fruit
}));

const EASE='cubic-bezier(0.4,0,0.2,1)';
const GRAIN="url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.08'/%3E%3C/svg%3E\")";

function FizoraCarouselHero(){
 const [activeIndex,setActiveIndex]=useState(0);
 const [isAnimating,setIsAnimating]=useState(false);
 const [isMobile,setIsMobile]=useState(()=>window.innerWidth<640);
 const unlockTimer=useRef<number|undefined>(undefined);

 useEffect(()=>{
  ITEMS.forEach(({src})=>{const image=new Image();image.src=src;});
  const onResize=()=>setIsMobile(window.innerWidth<640);
  window.addEventListener('resize',onResize,{passive:true});
  return()=>{window.removeEventListener('resize',onResize);if(unlockTimer.current)window.clearTimeout(unlockTimer.current);};
 },[]);

 const navigate=(direction:Direction)=>{
  if(isAnimating)return;
  setIsAnimating(true);
  setActiveIndex(prev=>direction==='next'?(prev+1)%ITEMS.length:(prev+ITEMS.length-1)%ITEMS.length);
  unlockTimer.current=window.setTimeout(()=>setIsAnimating(false),650);
 };

 const left=(activeIndex+ITEMS.length-1)%ITEMS.length;
 const right=(activeIndex+1)%ITEMS.length;
 const current=ITEMS[activeIndex];

 const roleFor=(index:number):Role=>index===activeIndex?'center':index===left?'left':'right';
 const roleStyle=(role:Role):React.CSSProperties=>{
  if(role==='center')return{
   transform:`translateX(-50%) scale(${isMobile?1.25:1.68})`,
   filter:'blur(0px)',opacity:1,zIndex:20,left:'50%',
   height:isMobile?'60%':'92%',bottom:isMobile?'22%':'0%'
  };
  return{
   transform:'translateX(-50%) scale(1)',filter:'blur(2px)',opacity:.85,zIndex:10,
   left:role==='left'?(isMobile?'20%':'30%'):(isMobile?'80%':'70%'),
   height:isMobile?'16%':'28%',bottom:isMobile?'32%':'12%'
  };
 };

 return <section
  className="relative w-full overflow-hidden text-white"
  aria-label="Fizora flavor carousel"
  style={{backgroundColor:current.bg,transition:`background-color 650ms ${EASE}`,fontFamily:"'Inter', sans-serif"}}
 >
  <div className="relative w-full overflow-hidden" style={{height:'100vh'}}>
   <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{zIndex:50,opacity:.4,backgroundImage:GRAIN,backgroundSize:'200px 200px',backgroundRepeat:'repeat'}}/>

   <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none select-none" aria-hidden="true" style={{zIndex:2,top:'18%',fontFamily:"'Anton', sans-serif",fontSize:'clamp(90px, 28vw, 380px)',fontWeight:900,color:'#fff',opacity:1,lineHeight:1,textTransform:'uppercase',letterSpacing:'-.02em',whiteSpace:'nowrap'}}>
    FIZORA
   </div>

   <div className="absolute top-6 left-4 sm:left-8 text-xs font-semibold uppercase text-white" style={{zIndex:60,opacity:.9,letterSpacing:'.18em'}}>FIZORA</div>

   <div className="absolute inset-0" style={{zIndex:3}} aria-live="polite">
    {ITEMS.map((item,index)=>{
     const role=roleFor(index);
     return <div
      key={item.src}
      className="absolute"
      aria-hidden={role!=='center'}
      style={{
       aspectRatio:'.6 / 1',
       ...roleStyle(role),
       transition:`transform 650ms ${EASE}, filter 650ms ${EASE}, opacity 650ms ${EASE}, left 650ms ${EASE}, height 650ms ${EASE}, bottom 650ms ${EASE}`,
       willChange:'transform, filter, opacity, left, height, bottom'
      }}
     >
      <img src={item.src} alt={role==='center'?`FIZORA ${item.name} can`:''} draggable={false} className="w-full h-full object-contain" style={{objectPosition:'bottom center',filter:'drop-shadow(0 28px 34px rgba(20,30,20,.20))'}}/>
     </div>;
    })}
   </div>

   <div className="absolute bottom-6 left-4 sm:bottom-20 sm:left-24" style={{zIndex:60,maxWidth:'320px'}}>
    <p className="mb-2 sm:mb-3 text-base sm:text-[22px] font-bold uppercase text-white" style={{opacity:.95,letterSpacing:'.02em'}}>FIZORA FLAVORS</p>
    <p className="hidden sm:block text-xs sm:text-sm text-white mb-4 sm:mb-5" style={{opacity:.85,lineHeight:1.6}}>Three bold sparkling flavors, one unmistakable attitude. {current.name} brings {current.fruit.toLowerCase()} into focus. Use the arrows to explore the lineup.</p>
    <div className="flex items-center gap-3 sm:gap-4">
     <button type="button" aria-label="Previous flavor" onClick={()=>navigate('prev')} className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-transparent border-2 border-white text-white grid place-items-center transition-[transform,background-color] duration-150 hover:scale-[1.08] hover:bg-white/10 disabled:opacity-60" disabled={isAnimating}>
      <ArrowLeft size={26} strokeWidth={2.25}/>
     </button>
     <button type="button" aria-label="Next flavor" onClick={()=>navigate('next')} className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-transparent border-2 border-white text-white grid place-items-center transition-[transform,background-color] duration-150 hover:scale-[1.08] hover:bg-white/10 disabled:opacity-60" disabled={isAnimating}>
      <ArrowRight size={26} strokeWidth={2.25}/>
     </button>
    </div>
   </div>

   <div className="absolute bottom-6 right-4 sm:bottom-20 sm:right-10" style={{zIndex:60}}>
    <a href="#citrus" className="flex items-center gap-2 sm:gap-4 text-white uppercase no-underline transition-opacity duration-200 hover:opacity-100" style={{fontFamily:"'Anton', sans-serif",fontSize:'clamp(20px, 4vw, 56px)',fontWeight:400,opacity:.95,letterSpacing:'-.02em',lineHeight:1}}>DISCOVER IT <ArrowRight className="w-5 h-5 sm:w-8 sm:h-8" strokeWidth={2.25}/></a>
   </div>
  </div>
 </section>;
}

const mount=document.getElementById('carousel-root');
if(mount)createRoot(mount).render(<FizoraCarouselHero/>);
