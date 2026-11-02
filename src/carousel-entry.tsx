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
   transform:`translateX(-50%) scale(${isMobile?1.06:1.03})`,
   filter:'blur(0px)',opacity:1,zIndex:20,left:'50%',
   height:isMobile?'64%':'78%',bottom:isMobile?'16%':'2.5%'
  };
  return{
   transform:`translateX(-50%) scale(${isMobile?.96:1})`,
   filter:isMobile?'blur(1.5px)':'blur(1px)',opacity:isMobile?.8:.9,zIndex:10,
   left:role==='left'?(isMobile?'17%':'24%'):(isMobile?'83%':'76%'),
   height:isMobile?'22%':'38%',bottom:isMobile?'25%':'13%'
  };
 };

 return <section
  className="relative w-full overflow-hidden text-white"
  aria-label="Fizora flavor carousel"
  style={{backgroundColor:current.bg,transition:`background-color 650ms ${EASE}`,fontFamily:"'Inter', sans-serif"}}
 >
  <div className="relative w-full overflow-hidden" style={{height:'100vh',minHeight:'620px'}}>
   <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{zIndex:50,opacity:.28,backgroundImage:GRAIN,backgroundSize:'200px 200px',backgroundRepeat:'repeat'}}/>

   <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none select-none" aria-hidden="true" style={{zIndex:2,top:isMobile?'23%':'20%',fontFamily:"'Anton', sans-serif",fontSize:'clamp(88px, 18vw, 285px)',fontWeight:900,color:'#fff',opacity:.92,lineHeight:.9,textTransform:'uppercase',letterSpacing:'-.025em',whiteSpace:'nowrap'}}>
    FIZORA
   </div>

   <div className="absolute top-6 left-4 sm:left-8 text-xs font-semibold uppercase text-white" style={{zIndex:60,opacity:.92,letterSpacing:'.18em'}}>FIZORA</div>

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
      <img
       src={item.src}
       alt={role==='center'?`FIZORA ${item.name} can`:''}
       draggable={false}
       className="w-full h-full object-contain"
       style={{objectPosition:'bottom center',filter:role==='center'?'drop-shadow(0 30px 34px rgba(20,30,20,.20))':'drop-shadow(0 18px 20px rgba(20,30,20,.14))'}}
      />
     </div>;
    })}
   </div>

   <div className="absolute bottom-6 left-4 sm:bottom-14 sm:left-16 lg:left-20" style={{zIndex:60,maxWidth:isMobile?'250px':'310px'}}>
    <p className="mb-2 sm:mb-3 text-base sm:text-[20px] font-bold uppercase text-white" style={{opacity:.96,letterSpacing:'.02em'}}>FIZORA FLAVORS</p>
    <p className="hidden sm:block text-xs sm:text-sm text-white mb-4 sm:mb-5" style={{opacity:.88,lineHeight:1.55}}>Three bold sparkling flavors, one unmistakable attitude. {current.name} brings {current.fruit.toLowerCase()} into focus.</p>
    <div className="flex items-center gap-3 sm:gap-4">
     <button type="button" aria-label="Previous flavor" onClick={()=>navigate('prev')} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-transparent border-2 border-white text-white grid place-items-center transition-[transform,background-color] duration-150 hover:scale-[1.08] hover:bg-white/10 disabled:opacity-60" disabled={isAnimating}>
      <ArrowLeft size={24} strokeWidth={2.25}/>
     </button>
     <button type="button" aria-label="Next flavor" onClick={()=>navigate('next')} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-transparent border-2 border-white text-white grid place-items-center transition-[transform,background-color] duration-150 hover:scale-[1.08] hover:bg-white/10 disabled:opacity-60" disabled={isAnimating}>
      <ArrowRight size={24} strokeWidth={2.25}/>
     </button>
    </div>
   </div>

   <div className="absolute bottom-6 right-4 sm:bottom-14 sm:right-8 lg:right-12" style={{zIndex:60}}>
    <a href="#citrus" className="flex items-center gap-2 sm:gap-4 text-white uppercase no-underline transition-opacity duration-200 hover:opacity-100" style={{fontFamily:"'Anton', sans-serif",fontSize:'clamp(22px, 3.5vw, 50px)',fontWeight:400,opacity:.96,letterSpacing:'-.02em',lineHeight:1}}>DISCOVER IT <ArrowRight className="w-5 h-5 sm:w-7 sm:h-7" strokeWidth={2.25}/></a>
   </div>
  </div>
 </section>;
}

const mount=document.getElementById('carousel-root');
if(mount)createRoot(mount).render(<FizoraCarouselHero/>);
