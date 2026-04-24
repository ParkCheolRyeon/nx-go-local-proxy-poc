import { motion } from 'motion/react';

import IconCoin from '@/app/assets/icons/icon-coin.png';
import {
  useHoldingCoins,
  useMonthlyCoinAllowance,
} from '@/stores/userStore';

export default function UserHoldingCoins() {
  const holdingCoins = useHoldingCoins();
  const allowance = useMonthlyCoinAllowance();
  const ratio = allowance > 0 ? Math.min(1, holdingCoins / allowance) : 0;

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,.18), rgba(255,255,255,.05))',
        border: '1px solid rgba(255,255,255,.22)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="p-3.5">
        <div className="flex items-center justify-between whitespace-nowrap">
          <span
            className="text-[11px]"
            style={{ color: 'rgba(255,255,255,.8)' }}
          >
            이번 달 코인
          </span>
          <img src={IconCoin.src} alt="coin" className="w-6 h-6" />
        </div>
        <div
          className="mt-0.5 text-[26px] whitespace-nowrap"
          style={{ fontWeight: 800 }}
        >
          {holdingCoins}{' '}
          <span
            className="text-[13px]"
            style={{ color: 'rgba(255,255,255,.6)' }}
          >
            / {allowance}
          </span>
        </div>
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-sm"
          style={{ background: 'rgba(255,255,255,.2)' }}
        >
          <motion.div
            className="h-full"
            initial={{ width: 0 }}
            animate={{ width: `${ratio * 100}%` }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            style={{
              background: 'linear-gradient(90deg,#FFF6A8,#FFFFFF)',
              boxShadow: '0 0 8px rgba(255,255,255,.7)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
