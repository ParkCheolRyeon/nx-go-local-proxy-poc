'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import Logo from '@/app/assets/logo/logo.svg';

const dummyImages: string[] = [
  '/dummy/gallery1.jpg',
  '/dummy/gallery2.jpg',
  '/dummy/gallery3.jpg',
  '/dummy/gallery4.jpg',
  '/dummy/gallery5.png',
  '/dummy/gallery6.png',
  '/dummy/gallery7.jpg',
  '/dummy/gallery8.jpg',
  '/dummy/gallery9.jpg',
  '/dummy/gallery10.jpg',
  '/dummy/gallery11.jpg',
  '/dummy/gallery12.png',
  '/dummy/gallery13.png',
  '/dummy/gallery14.jpg',
  '/dummy/gallery15.png',
  '/dummy/gallery16.jpg',
  '/dummy/gallery17.jpg',
  '/dummy/gallery18.png',
  '/dummy/gallery19.jpg',
  '/dummy/gallery20.png',
];

const FALLBACK_STAGE_WIDTH = 390;
const FALLBACK_STAGE_HEIGHT = 780;
const MORPH_SCATTER_IMAGE_COUNT = 20;
const MORPH_ACTIVE_IMAGE_COUNT = 10;
const MORPH_IMAGE_WIDTH = 44;
const MORPH_IMAGE_HEIGHT = 62;
const MORPH_LINE_SPACING = 36;
const MORPH_LOGO_FRAME_SIZE = 120;
const MORPH_LOGO_CARD_SIZE = 80;
const MORPH_LINE_DELAY_MS = 1200;
const MORPH_CIRCLE_DELAY_MS = 3200;
const MORPH_COMPLETE_DELAY_MS = 4700;

type MorphPhase = 'scatter' | 'line' | 'circle';

type MorphMetrics = {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

type ScatterPoint = {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  opacity: number;
};

type IntroMorphProps = {
  images: string[];
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  circleRadius: number;
  onComplete?: (isComplete: boolean) => void;
};

function shuffleImages(images: string[]) {
  const nextImages = [...images];

  for (let index = nextImages.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextImages[index], nextImages[swapIndex]] = [
      nextImages[swapIndex],
      nextImages[index],
    ];
  }

  return nextImages;
}

function createScatterPoints(
  total: number,
  width: number,
  height: number,
): ScatterPoint[] {
  return Array.from({ length: total }, () => ({
    x: 24 + Math.random() * Math.max(width - 48, 1),
    y: 32 + Math.random() * Math.max(height - 64, 1),
    rotate: (Math.random() - 0.5) * 180,
    scale: 0.54 + Math.random() * 0.26,
    opacity: 0.5 + Math.random() * 0.2,
  }));
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function IntroMorph({
  images,
  width,
  height,
  centerX,
  centerY,
  circleRadius,
  onComplete,
}: IntroMorphProps) {
  const [phase, setPhase] = useState<MorphPhase>('scatter');
  const [scatterPoints, setScatterPoints] = useState(() =>
    createScatterPoints(images.length, width, height),
  );

  useEffect(() => {
    setScatterPoints(createScatterPoints(images.length, width, height));
    setPhase('scatter');
    onComplete?.(false);

    const lineTimeout = window.setTimeout(
      () => setPhase('line'),
      MORPH_LINE_DELAY_MS,
    );
    const circleTimeout = window.setTimeout(
      () => setPhase('circle'),
      MORPH_CIRCLE_DELAY_MS,
    );
    const completeTimeout = window.setTimeout(
      () => onComplete?.(true),
      MORPH_COMPLETE_DELAY_MS,
    );

    return () => {
      window.clearTimeout(lineTimeout);
      window.clearTimeout(circleTimeout);
      window.clearTimeout(completeTimeout);
    };
  }, [images.length, onComplete, width, height]);

  const activeImageCount = Math.min(MORPH_ACTIVE_IMAGE_COUNT, images.length);
  const lineTotalWidth = (activeImageCount - 1) * MORPH_LINE_SPACING;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: centerX - MORPH_LOGO_FRAME_SIZE / 2,
          top: centerY - MORPH_LOGO_FRAME_SIZE / 2,
          zIndex: 2,
          display: 'flex',
          height: MORPH_LOGO_FRAME_SIZE,
          width: MORPH_LOGO_FRAME_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            height: MORPH_LOGO_CARD_SIZE,
            width: MORPH_LOGO_CARD_SIZE,
            transform: 'rotate(-8deg)',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 32,
            background: '#fff',
            animation: 'bb-logo 2.4s ease-in-out infinite',
          }}
        >
          <Logo />
        </div>
      </div>

      {images.map((image, index) => {
        const isActiveImage = index < activeImageCount;
        let targetX = scatterPoints[index]?.x ?? width / 2;
        let targetY = scatterPoints[index]?.y ?? height / 2;
        let targetRotate = scatterPoints[index]?.rotate ?? 0;
        let targetScale = scatterPoints[index]?.scale ?? 1;
        let targetOpacity = scatterPoints[index]?.opacity ?? 0;
        let targetFilter = phase === 'scatter' ? 'blur(2px)' : 'blur(0px)';
        let targetBoxShadow =
          '0 8px 20px rgba(28,122,224,.24), 0 0 0 2px rgba(255,255,255,.82)';

        if (phase === 'line' && isActiveImage) {
          targetX = centerX + (index * MORPH_LINE_SPACING - lineTotalWidth / 2);
          targetY = centerY;
          targetRotate = 0;
          targetScale = 0.88;
          targetOpacity = 1;
        }

        if (phase === 'circle' && isActiveImage) {
          const angle = (index / activeImageCount) * Math.PI * 2 - Math.PI / 2;

          targetX = centerX + Math.cos(angle) * circleRadius;
          targetY = centerY + Math.sin(angle) * circleRadius;
          targetRotate = (angle * 180) / Math.PI + 90;
          targetScale = 1;
          targetOpacity = 1;
        }

        if (phase !== 'scatter' && !isActiveImage) {
          targetY += 18;
          targetRotate *= 0.45;
          targetScale *= 0.86;
          targetOpacity = 0;
          targetFilter = 'blur(5px)';
        }

        if (phase === 'circle' && isActiveImage) {
          targetBoxShadow =
            '0 10px 26px rgba(28,122,224,.28), 0 0 0 2px rgba(255,255,255,.9)';
        }

        const phaseDelay =
          phase === 'scatter'
            ? 0
            : phase === 'line'
              ? index * 0.03
              : index * 0.045;

        return (
          <motion.div
            key={`${image}-${index}`}
            initial={false}
            animate={{
              x: targetX - MORPH_IMAGE_WIDTH / 2,
              y: targetY - MORPH_IMAGE_HEIGHT / 2,
              rotate: targetRotate,
              scale: targetScale,
              opacity: targetOpacity,
              filter: targetFilter,
              boxShadow: targetBoxShadow,
            }}
            transition={{
              type: 'spring',
              stiffness: phase === 'line' ? 52 : 40,
              damping: phase === 'line' ? 18 : 16,
              mass: 1.08,
              delay: phaseDelay,
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: MORPH_IMAGE_HEIGHT,
              width: MORPH_IMAGE_WIDTH,
              overflow: 'hidden',
              borderRadius: 10,
              background: '#e8effa',
              willChange: 'transform, opacity, filter',
            }}
          >
            <motion.div
              animate={
                phase === 'circle' && isActiveImage
                  ? {
                      y: [0, -5 - (index % 3), 0],
                      rotate: [0, index % 2 === 0 ? 1.6 : -1.6, 0],
                    }
                  : {
                      y: 0,
                      rotate: 0,
                    }
              }
              transition={{
                duration: 3.8 + (index % 4) * 0.35,
                repeat: phase === 'circle' ? Infinity : 0,
                ease: 'easeInOut',
                delay: index * 0.08,
              }}
              style={{
                position: 'relative',
                height: '100%',
                width: '100%',
              }}
            >
              <Image
                src={image}
                alt=""
                fill
                sizes={`${MORPH_IMAGE_WIDTH}px`}
                style={{ objectFit: 'cover' }}
              />
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function Splash() {
  const router = useRouter();
  const t = useTranslations('splash');
  const stageRef = useRef<HTMLDivElement>(null);
  const logoAnchorRef = useRef<HTMLDivElement>(null);
  const loadingFrameRef = useRef<number | null>(null);
  const loadingStartedRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [isIntroMorphComplete, setIsIntroMorphComplete] = useState(false);
  const [isMorphReady, setIsMorphReady] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>(
    dummyImages.slice(0, MORPH_SCATTER_IMAGE_COUNT),
  );
  const [morphMetrics, setMorphMetrics] = useState<MorphMetrics>({
    width: FALLBACK_STAGE_WIDTH,
    height: FALLBACK_STAGE_HEIGHT,
    centerX: FALLBACK_STAGE_WIDTH / 2,
    centerY: 285,
  });

  useEffect(() => {
    setSelectedImages(
      shuffleImages(dummyImages).slice(0, MORPH_SCATTER_IMAGE_COUNT),
    );
    setIsMorphReady(true);
  }, []);

  useEffect(() => {
    if (!isMorphReady || loadingStartedRef.current) {
      return;
    }

    loadingStartedRef.current = true;
    let startTime = 0;

    const animateProgress = (timestamp: number) => {
      if (startTime === 0) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const ratio = Math.min(elapsed / MORPH_COMPLETE_DELAY_MS, 1);
      const nextProgress = Math.min(99, Math.round(easeOutCubic(ratio) * 100));

      setProgress(nextProgress);

      if (ratio < 1) {
        loadingFrameRef.current = window.requestAnimationFrame(animateProgress);
      }
    };

    loadingFrameRef.current = window.requestAnimationFrame(animateProgress);

    return () => {
      if (loadingFrameRef.current !== null) {
        window.cancelAnimationFrame(loadingFrameRef.current);
      }
    };
  }, [isMorphReady]);

  useEffect(() => {
    if (!isIntroMorphComplete) {
      return;
    }

    if (loadingFrameRef.current !== null) {
      window.cancelAnimationFrame(loadingFrameRef.current);
    }

    setProgress(100);
    setDone(true);
  }, [isIntroMorphComplete]);

  useEffect(() => {
    if (!done) {
      return;
    }

    const redirectTimeout = window.setTimeout(() => {
      router.push('/my-gallery');
    }, 3000);

    return () => {
      window.clearTimeout(redirectTimeout);
    };
  }, [done, router]);

  useEffect(() => {
    const updateMorphMetrics = () => {
      if (!stageRef.current || !logoAnchorRef.current) {
        return;
      }

      const stageRect = stageRef.current.getBoundingClientRect();
      const logoRect = logoAnchorRef.current.getBoundingClientRect();

      setMorphMetrics({
        width: stageRect.width || FALLBACK_STAGE_WIDTH,
        height: stageRect.height || FALLBACK_STAGE_HEIGHT,
        centerX: logoRect.left - stageRect.left + logoRect.width / 2,
        centerY: logoRect.top - stageRect.top + logoRect.height / 2,
      });
    };

    updateMorphMetrics();

    const frameId = window.requestAnimationFrame(updateMorphMetrics);
    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(updateMorphMetrics);
    });

    if (stageRef.current) {
      resizeObserver.observe(stageRef.current);
    }

    if (logoAnchorRef.current) {
      resizeObserver.observe(logoAnchorRef.current);
    }

    window.addEventListener('resize', updateMorphMetrics);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateMorphMetrics);
    };
  }, []);

  const circleRadius = Math.min(
    Math.max(Math.min(morphMetrics.width, morphMetrics.height) * 0.14, 103),
    103,
  );

  return (
    <div
      ref={stageRef}
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        overflow: 'hidden',
        background:
          'linear-gradient(180deg, #ffffff 0%, #BCDEFF 55%, #3196ff 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -40,
          left: -40,
          height: 180,
          width: 180,
          borderRadius: '50%',
          background: 'rgba(255,255,255,.5)',
          filter: 'blur(4px)',
          animation: 'bb-float 6s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 160,
          right: -30,
          height: 120,
          width: 120,
          borderRadius: '50%',
          background: 'rgba(255,255,255,.3)',
          animation: 'bb-float 7s ease-in-out infinite .6s',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          left: 20,
          height: 70,
          width: 70,
          borderRadius: '50%',
          background: 'rgba(255,255,255,.45)',
          animation: 'bb-float 5s ease-in-out infinite 1.2s',
        }}
      />

      {isMorphReady && (
        <IntroMorph
          images={selectedImages}
          width={morphMetrics.width}
          height={morphMetrics.height}
          centerX={morphMetrics.centerX}
          centerY={morphMetrics.centerY}
          circleRadius={circleRadius}
          onComplete={setIsIntroMorphComplete}
        />
      )}

      <div
        data-intro-morph-complete={isIntroMorphComplete ? 'true' : 'false'}
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
        }}
      >
        <div
          ref={logoAnchorRef}
          style={{
            position: 'relative',
            display: 'flex',
            height: MORPH_LOGO_FRAME_SIZE,
            width: MORPH_LOGO_FRAME_SIZE,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            pointerEvents: 'none',
          }}
        />

        <div style={{ marginTop: 80, textAlign: 'center' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              color: '#fff',
              textShadow: '2px 2px 2px rgba(8, 112, 223, 0.9)',
              fontSize: 'clamp(38px, 8vw, 46px)',
              fontWeight: 800,
              letterSpacing: -0.5,
              lineHeight: 1,
            }}
          >
            {[t('char1'), t('char2'), t('char3'), t('char4')].map((character, index) => (
              <span
                key={`${character}-${index}`}
                style={{
                  display: 'inline-block',
                  animation: 'bb-pop .5s cubic-bezier(.34,1.56,.64,1) both',
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                {character}
              </span>
            ))}
          </div>
          <div
            style={{
              marginTop: 8,
              color: '#fff',
              fontSize: 22,
              fontWeight: 700,
              textShadow: '2px 2px 2px rgba(8, 112, 223, 0.9)',
              animation: 'bb-fade .6s ease-out .5s both',
            }}
          >
            {t('tagline')}
          </div>
        </div>

        <div
          style={{
            border: '1px solid rgba(255,255,255,.35)',
            borderRadius: 14,
            background: 'rgba(255,255,255,.2)',
            padding: '4px 12px',
            color: '#3196ff',
            fontSize: 12,
            fontWeight: 600,
            backdropFilter: 'blur(6px)',
            animation: 'bb-fade .6s ease-out .9s both',
          }}
        >
          {t('description')}
        </div>

        <div
          style={{
            marginTop: 22,
            width: 'min(240px, 74vw)',
            minHeight: 52,
            flexShrink: 0,
            animation: 'bb-fade .6s ease-out 1.1s both',
          }}
        >
          <div
            style={{
              position: 'relative',
              height: 12,
              overflow: 'hidden',
              border: '1.5px solid rgba(255,255,255,.65)',
              borderRadius: 8,
              background: 'rgba(255,255,255,.3)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: `${progress}%`,
                borderRadius: 7,
                background: '#3196ff',
                boxShadow: '0 0 12px rgba(49,150,255,.45)',
                transition: 'width .18s ease-out',
              }}
            />
          </div>
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>
              {done ? t('loadingDone') : t('loading')}
            </div>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>
              {progress}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
