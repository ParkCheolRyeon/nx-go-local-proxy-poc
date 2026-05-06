'use client';

import { useTranslations } from 'next-intl';

import ModalShell, { ModalBanner, ModalBody, type ModalPalette } from '@/components/dialog/ModalShell';
import { type DialogRequestComponentProps } from '@/stores/dialogStore';

export type ConfirmTone = 'info' | 'warning';

type ConfirmModalProps = DialogRequestComponentProps<boolean | undefined> & {
  message: string;
  title?: string;
  tone?: ConfirmTone;
  destructive?: boolean;
  yesButtonText?: string;
  noButtonText?: string;
  allowClose?: boolean;
};

const PALETTES: Record<ConfirmTone | 'danger', ModalPalette> = {
  info: {
    grad: 'linear-gradient(135deg,#EAF2FE 0%,#D6E8FF 100%)',
    icon: '❔',
    ring: 'rgba(49,150,255,0.5)',
  },
  warning: {
    grad: 'linear-gradient(135deg,#FEF3C7 0%,#FDE68A 100%)',
    icon: '⚠️',
    ring: 'rgba(245,158,11,0.5)',
  },
  danger: {
    grad: 'linear-gradient(135deg,#FEE2E2 0%,#FECACA 100%)',
    icon: '🗑',
    ring: 'rgba(239,68,68,0.5)',
  },
};

export default function ConfirmModal({
  resolve,
  message,
  title,
  tone = 'info',
  destructive = false,
  yesButtonText,
  noButtonText,
  allowClose = false,
}: ConfirmModalProps) {
  const tDialog = useTranslations('dialog');
  const tCommon = useTranslations('common');
  const resolvedTitle = title ?? tDialog('confirmTitle');
  const resolvedYes = yesButtonText ?? tCommon('confirm');
  const resolvedNo = noButtonText ?? tCommon('cancel');
  const palette = destructive ? PALETTES.danger : PALETTES[tone];
  const onConfirm = () => resolve(true);
  const onCancel = () => resolve(false);
  const onBackdrop = allowClose ? () => resolve(undefined) : onCancel;

  const confirmGrad = destructive
    ? 'linear-gradient(135deg,#EF4444 0%,#DC2626 100%)'
    : 'linear-gradient(135deg,#3196ff 0%,#1C7AE0 100%)';
  const confirmShadow = destructive
    ? '0 8px 18px rgba(239,68,68,0.32)'
    : '0 8px 18px rgba(28,122,224,0.32)';

  return (
    <ModalShell onBackdropClick={onBackdrop}>
      <ModalBanner palette={palette} />
      <ModalBody title={resolvedTitle} message={message} />
      <div className="flex gap-2.5 px-[22px] pb-[22px] pt-[18px]">
        <button
          type="button"
          onClick={onCancel}
          className="mdl-btn flex-1 rounded-[14px] bg-white px-4 py-3.5 text-[14px] font-bold text-[#5C6F90]"
          style={{ border: '1.5px solid rgba(28,122,224,0.18)' }}
        >
          {resolvedNo}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="mdl-btn flex-1 rounded-[14px] border-0 px-4 py-3.5 text-[14px] font-bold text-white"
          style={{ background: confirmGrad, boxShadow: confirmShadow }}
        >
          {resolvedYes}
        </button>
      </div>
    </ModalShell>
  );
}
