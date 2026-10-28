import React, { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

type Direction = 'next' | 'prev';

type Slide = {
  id: string;
  src?: string;
  bg: string;
  panel: string;
  title: string;
  fruit: string;
  description: string;
  lineup?: boolean;
};

const SLIDES: Slide[] = [
  {
    id: 'citrus',
    src: '/images/citrus-can.webp',
    bg: '#79B400',
    panel: '#A8D830',
    title: 'CITRUS SPARK',
    fruit: 'LEMON + LIME',
    description: 'Zesty lemon meets lively lime in a sparkling sip with a sunny disposition.',
  },
  {
    id: 'berry',
    src: '/images/berry-can.webp',
    bg: '#BD3F7E',
    panel: '#E074A8',
    title: 'BERRY BURST',
    fruit: 'RASPBERRY + BLACKBERRY',
    description: 'Juicy berries, bright fizz and a playful finish built for colorful moments.',
  },
  {
    id: 'tropical',
    src: '/images/tropical-can.webp',
    bg: '#E47C3D',
    panel: '#F6A76E',
    title: 'TROPICAL RUSH',
    fruit: 'MANGO + PASSION FRUIT',
    description: 'A sunny sparkling escape with mango, passion fruit and a smooth tropical finish.',
  },
  {
    id: 'lineup',
    bg: '#184831',
    panel: '#347257',
    title: 'THE FIZORA LINEUP',
    fruit: 'THREE FLAVORS · ONE HAPPY PLACE',
    description: 'Three bright personalities. One unmistakable fizz. Pick the can that feels like you.',
    lineup: true,
  },
];

const CAN_SRCS = ['/images/citrus-can.webp', '/images/berry-can.webp', '/images/tropical-can.webp'];
const EASE = '650ms cubic-bezier(0.4,0,0.2,1)';

const grainSvg = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/></filter>
  <rect width="100%" height="100%" filter="url(#noise)" opacity="0.08"/>
</svg>`)}`;

function LineupArt() {
  return (
    <div className="relative h-full w-full">
      {CAN_SRCS.map((src, index) => (
        <img
          key={src}
          src={src}
          alt=""
          draggable={false}
          className="absolute bottom-0 h-[88%] w-full object-contain object-bottom drop-shadow-[0_28px_28px_rgba(0,0,0,0.18)]"
          style={{
            transform: `translateX(${(index - 1) * 21}%) rotate(${(index - 1) * 7}deg) scale(${index === 1 ? 1.04 : 0.92})`,
            zIndex: index === 1 ? 3 : 2,
          }}
        />
      ))}
    </div>
  );
}

export default function FizoraHero() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);

  useEffect(() => {
    CAN_SRCS.forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const roles = useMemo(() => ({
    center: activeIndex,
    left: (activeIndex + 3) % 4,
    right: (activeIndex + 1) % 4,
    back: (activeIndex + 2) % 4,
  }), [activeIndex]);

  const navigate = (direction: Direction) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setActiveIndex((previous) => direction === 'next' ? (previous + 1) % 4 : (previous + 3) % 4);
    window.setTimeout(() => setIsAnimating(false), 650);
  };

  const active = SLIDES[activeIndex];

  return (
    <section
      className="relative z-[80] w-full overflow-hidden text-white"
      aria-label="Fizora flavor carousel"
      style={{
        backgroundColor: active.bg,
        transition: `background-color ${EASE}`,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div className="relative h-[100svh] min-h-[620px] w-full overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 z-50 opacity-40"
          aria-hidden="true"
          style={{ backgroundImage: `url("${grainSvg}")`, backgroundSize: '200px 200px', backgroundRepeat: 'repeat' }}
        />

        <div
          className="pointer-events-none absolute left-1/2 top-[49%] z-[1] h-[50vh] w-[50vh] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 sm:h-[64vh] sm:w-[64vh]"
          aria-hidden="true"
          style={{ backgroundColor: active.panel, transition: `background-color ${EASE}`, opacity: 0.48 }}
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_50%_32%,rgba(255,255,255,0.20),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.10))]"
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute inset-x-0 top-[19%] z-[2] flex select-none items-center justify-center whitespace-nowrap uppercase text-white"
          aria-hidden="true"
          style={{
            fontFamily: 'Anton, sans-serif',
            fontSize: 'clamp(88px, 24vw, 330px)',
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            textShadow: '0 10px 35px rgba(0,0,0,.05)',
          }}
        >
          FIZORA
        </div>

        <a href="#citrus" className="absolute left-4 top-6 z-[60] text-xs font-semibold uppercase text-white/90 sm:left-8" style={{ letterSpacing: '0.18em' }}>
          FIZORA
        </a>
        <div className="absolute right-4 top-6 z-[60] hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 sm:flex">
          <span className="h-2 w-2 rounded-full bg-white" /> FIND YOUR FIZZ
        </div>

        <div className="absolute inset-0 z-[3]" aria-live="polite">
          {SLIDES.map((slide, index) => {
            const role = index === roles.center ? 'center' : index === roles.left ? 'left' : index === roles.right ? 'right' : 'back';
            const styles: CSSProperties = {
              position: 'absolute',
              aspectRatio: '0.6 / 1',
              transform: role === 'center' ? `translateX(-50%) scale(${isMobile ? 1.06 : 1.08})` : 'translateX(-50%) scale(1)',
              filter: role === 'center' ? 'none' : role === 'back' ? 'blur(2.5px)' : 'blur(1px)',
              opacity: role === 'center' ? 1 : role === 'back' ? 0.58 : 0.88,
              zIndex: role === 'center' ? 20 : role === 'back' ? 5 : 10,
              left: role === 'center' || role === 'back' ? '50%' : role === 'left' ? (isMobile ? '19%' : '27%') : (isMobile ? '81%' : '73%'),
              height: role === 'center' ? (isMobile ? '55%' : '76%') : role === 'back' ? (isMobile ? '15%' : '23%') : (isMobile ? '20%' : '32%'),
              bottom: role === 'center' ? (isMobile ? '19%' : '5%') : (isMobile ? '30%' : '12%'),
              transition: `transform ${EASE}, filter ${EASE}, opacity ${EASE}, left ${EASE}, height ${EASE}, bottom ${EASE}`,
              willChange: 'transform, filter, opacity, left, height, bottom',
            };

            return (
              <div key={slide.id} style={styles} aria-hidden={role !== 'center'}>
                {slide.lineup ? (
                  <LineupArt />
                ) : (
                  <img
                    src={slide.src}
                    alt={role === 'center' ? `Fizora ${slide.title} can` : ''}
                    draggable={false}
                    className="h-full w-full object-contain object-bottom drop-shadow-[0_24px_28px_rgba(0,0,0,0.20)]"
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-6 left-4 z-[60] max-w-[300px] sm:bottom-[11%] sm:left-[6%]">
          <p className="mb-2 text-base font-bold uppercase text-white/95 sm:mb-3 sm:text-[22px]" style={{ letterSpacing: '0.02em' }}>
            {active.title}
          </p>
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/75 sm:text-[10px]">{active.fruit}</p>
          <p className="mb-4 hidden text-xs leading-[1.6] text-white/85 sm:mb-5 sm:block sm:text-sm">{active.description}</p>
          <div className="flex gap-3">
            <button
              type="button"
              aria-label="Previous flavor"
              onClick={() => navigate('prev')}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/90 bg-white/[0.02] text-white backdrop-blur-sm transition-[transform,background-color] duration-150 hover:scale-[1.06] hover:bg-white/10 disabled:cursor-wait sm:h-14 sm:w-14"
              disabled={isAnimating}
            >
              <ArrowLeft size={24} strokeWidth={2.15} />
            </button>
            <button
              type="button"
              aria-label="Next flavor"
              onClick={() => navigate('next')}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/90 bg-white/[0.02] text-white backdrop-blur-sm transition-[transform,background-color] duration-150 hover:scale-[1.06] hover:bg-white/10 disabled:cursor-wait sm:h-14 sm:w-14"
              disabled={isAnimating}
            >
              <ArrowRight size={24} strokeWidth={2.15} />
            </button>
          </div>
        </div>

        <a
          href="#citrus"
          className="absolute bottom-6 right-4 z-[60] flex items-center gap-3 uppercase text-white/95 no-underline transition-opacity duration-200 hover:opacity-100 sm:bottom-[10%] sm:right-[5%]"
          style={{
            fontFamily: 'Anton, sans-serif',
            fontSize: 'clamp(20px, 3.2vw, 46px)',
            fontWeight: 400,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          DISCOVER IT
          <ArrowRight className="h-5 w-5 sm:h-7 sm:w-7" strokeWidth={2.15} />
        </a>

        <div className="pointer-events-none absolute bottom-[2%] left-1/2 z-[4] h-16 w-[38%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.20),transparent_68%)] blur-xl" aria-hidden="true" />
      </div>
    </section>
  );
}
