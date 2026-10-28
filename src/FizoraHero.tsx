import React, { useEffect, useMemo, useState } from 'react';

type Direction = 'next' | 'prev';
type IconComponent = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

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
    bg: '#9CBF35',
    panel: '#C6E45C',
    title: 'CITRUS SPARK',
    fruit: 'LEMON + LIME',
    description: 'Zesty lemon meets lively lime in a sparkling sip with a sunny disposition.',
  },
  {
    id: 'berry',
    src: '/images/berry-can.webp',
    bg: '#C95891',
    panel: '#E77EB0',
    title: 'BERRY BURST',
    fruit: 'RASPBERRY + BLACKBERRY',
    description: 'Juicy berries, bright fizz and a playful finish built for colorful moments.',
  },
  {
    id: 'tropical',
    src: '/images/tropical-can.webp',
    bg: '#E68952',
    panel: '#F5AA72',
    title: 'TROPICAL RUSH',
    fruit: 'MANGO + PASSION FRUIT',
    description: 'A sunny sparkling escape with mango, passion fruit and a smooth tropical finish.',
  },
  {
    id: 'lineup',
    bg: '#2E5A42',
    panel: '#47785C',
    title: 'THE FIZORA LINEUP',
    fruit: 'THREE FLAVORS · ONE HAPPY PLACE',
    description: 'Three bright personalities. One unmistakable fizz. Pick the can that feels like you.',
    lineup: true,
  },
];

const CAN_SRCS = ['/images/citrus-can.webp', '/images/berry-can.webp', '/images/tropical-can.webp'];
const LUCIDE_URL = 'https://esm.sh/lucide-react@1.63.0?bundle&deps=react@19.1.1';
const EASE = '650ms cubic-bezier(0.4,0,0.2,1)';

const grainSvg = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/></filter>
  <rect width="100%" height="100%" filter="url(#n)" opacity="0.08"/>
</svg>`)}`;

function FallbackArrow({ direction }: { direction: 'left' | 'right' }) {
  return <span aria-hidden="true" className="text-[26px] leading-none">{direction === 'left' ? '←' : '→'}</span>;
}

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
  const [icons, setIcons] = useState<{ ArrowLeft?: IconComponent; ArrowRight?: IconComponent }>({});

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

  useEffect(() => {
    let mounted = true;
    import(/* @vite-ignore */ LUCIDE_URL)
      .then((module) => {
        if (!mounted) return;
        setIcons({ ArrowLeft: module.ArrowLeft as IconComponent, ArrowRight: module.ArrowRight as IconComponent });
      })
      .catch(() => {});
    return () => { mounted = false; };
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
  const ArrowLeftIcon = icons.ArrowLeft;
  const ArrowRightIcon = icons.ArrowRight;

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
          className="pointer-events-none absolute left-1/2 top-[51%] z-[1] h-[56vh] w-[56vh] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 sm:h-[72vh] sm:w-[72vh]"
          aria-hidden="true"
          style={{ backgroundColor: active.panel, transition: `background-color ${EASE}`, opacity: 0.58 }}
        />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.20),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.08))]" aria-hidden="true" />

        <div
          className="pointer-events-none absolute inset-x-0 top-[18%] z-[2] flex select-none items-center justify-center whitespace-nowrap uppercase text-white"
          aria-hidden="true"
          style={{
            fontFamily: 'Anton, sans-serif',
            fontSize: 'clamp(90px, 28vw, 380px)',
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            textShadow: '0 10px 35px rgba(0,0,0,.06)',
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
            const styles: React.CSSProperties = {
              position: 'absolute',
              aspectRatio: '0.6 / 1',
              transform:
                role === 'center'
                  ? `translateX(-50%) scale(${isMobile ? 1.25 : 1.68})`
                  : 'translateX(-50%) scale(1)',
              filter: role === 'center' ? 'none' : role === 'back' ? 'blur(4px)' : 'blur(2px)',
              opacity: role === 'center' ? 1 : role === 'back' ? 0.72 : 0.85,
              zIndex: role === 'center' ? 20 : role === 'back' ? 5 : 10,
              left:
                role === 'center' || role === 'back'
                  ? '50%'
                  : role === 'left'
                    ? (isMobile ? '20%' : '30%')
                    : (isMobile ? '80%' : '70%'),
              height:
                role === 'center'
                  ? (isMobile ? '60%' : '92%')
                  : role === 'back'
                    ? (isMobile ? '13%' : '22%')
                    : (isMobile ? '16%' : '28%'),
              bottom:
                role === 'center'
                  ? (isMobile ? '22%' : '0')
                  : (isMobile ? '32%' : '12%'),
              transition: `transform ${EASE}, filter ${EASE}, opacity ${EASE}, left ${EASE}, height ${EASE}, bottom ${EASE}`,
              willChange: 'transform, filter, opacity, left',
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
                    className="h-full w-full object-contain object-bottom drop-shadow-[0_30px_34px_rgba(0,0,0,0.20)]"
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-6 left-4 z-[60] max-w-[320px] sm:bottom-20 sm:left-24">
          <p className="mb-2 text-base font-bold uppercase text-white/95 sm:mb-3 sm:text-[22px]" style={{ letterSpacing: '0.02em' }}>
            {active.title}
          </p>
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/75 sm:text-[10px]">{active.fruit}</p>
          <p className="mb-4 hidden text-xs leading-[1.6] text-white/85 sm:mb-5 sm:block sm:text-sm">
            {active.description}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              aria-label="Previous flavor"
              onClick={() => navigate('prev')}
              className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-transparent text-white transition-[transform,background-color] duration-150 hover:scale-[1.08] hover:bg-white/10 disabled:cursor-wait sm:h-16 sm:w-16"
              disabled={isAnimating}
            >
              {ArrowLeftIcon ? <ArrowLeftIcon size={26} strokeWidth={2.25} /> : <FallbackArrow direction="left" />}
            </button>
            <button
              type="button"
              aria-label="Next flavor"
              onClick={() => navigate('next')}
              className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-transparent text-white transition-[transform,background-color] duration-150 hover:scale-[1.08] hover:bg-white/10 disabled:cursor-wait sm:h-16 sm:w-16"
              disabled={isAnimating}
            >
              {ArrowRightIcon ? <ArrowRightIcon size={26} strokeWidth={2.25} /> : <FallbackArrow direction="right" />}
            </button>
          </div>
        </div>

        <a
          href="#citrus"
          className="absolute bottom-6 right-4 z-[60] flex items-center gap-3 uppercase text-white/95 no-underline transition-opacity duration-200 hover:opacity-100 sm:bottom-20 sm:right-10"
          style={{
            fontFamily: 'Anton, sans-serif',
            fontSize: 'clamp(20px, 4vw, 56px)',
            fontWeight: 400,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          DISCOVER IT
          {ArrowRightIcon ? <ArrowRightIcon className="h-5 w-5 sm:h-8 sm:w-8" strokeWidth={2.25} /> : <FallbackArrow direction="right" />}
        </a>

        <div className="pointer-events-none absolute bottom-0 left-1/2 z-[4] h-24 w-[70%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.16),transparent_68%)] blur-xl" aria-hidden="true" />
      </div>
    </section>
  );
}
