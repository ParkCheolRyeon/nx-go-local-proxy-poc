'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import IconArrowRight from '@/app/assets/icons/icon-arrow-right.svg';
import { cn } from '@/lib/utils';

type BackButtonProps = {
  label?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
};

export default function BackButton({ label, href, onClick, className }: BackButtonProps) {
  const router = useRouter();
  const t = useTranslations('common');
  const resolvedLabel = label ?? t('back');

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (href) {
      router.push(href);
      return;
    }
    router.back();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#1C7AE0]/20 bg-white/75 px-3.5 py-2 text-[13px] font-semibold text-[#1C7AE0] shadow-[0_4px_12px_rgba(28,122,224,0.08)] backdrop-blur-[6px] transition-[background,border-color,transform] duration-150 hover:border-[#1C7AE0]/35 hover:bg-white active:scale-[0.97]',
        className,
      )}
    >
      <IconArrowRight width={12} height={12} aria-hidden className="-scale-x-100" />
      <span>{resolvedLabel}</span>
    </button>
  );
}
