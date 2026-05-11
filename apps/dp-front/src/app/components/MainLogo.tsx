import IconPalette from '@/app/assets/icons/icon-palette.png';
import { motion, type Transition } from 'motion/react';

const FADE_OUT: Transition = { duration: 0.18, ease: 'easeOut' };
const FADE_IN: Transition = { duration: 0.26, ease: 'easeOut', delay: 0.08 };

type MainLogoProps = {
  onClick?: () => void;
  isExpanded: boolean;
};

export default function MainLogo({ isExpanded, onClick }: MainLogoProps) {
  return (
    <div
      className="relative flex min-h-10 cursor-pointer items-center gap-2.5"
      onClick={() => {
        if (onClick) onClick();
      }}
    >
      <div
        className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl"
        style={{
          background: '#fff',
          boxShadow: '0 1px 10px rgba(11,42,99,.5)',
          transform: 'rotate(-8deg)',
        }}
      >
        <img src={IconPalette.src} alt="palette" className="h-6 w-6" />
      </div>
      <motion.div
        initial={false}
        animate={{ opacity: isExpanded ? 1 : 0 }}
        transition={isExpanded ? FADE_IN : FADE_OUT}
        className="min-w-0 flex-1 overflow-hidden text-[22px] whitespace-nowrap"
        style={{ fontWeight: 800, letterSpacing: -0.3 }}
      >
        I Gallery V2
      </motion.div>
    </div>
  );
}
