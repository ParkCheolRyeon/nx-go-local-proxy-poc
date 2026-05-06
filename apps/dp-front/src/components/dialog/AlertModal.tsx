'use client';

import { useTranslations } from 'next-intl';

import ModalShell, { ModalBanner, ModalBody, type ModalPalette } from '@/components/dialog/ModalShell';
import { type DialogRequestComponentProps } from '@/stores/dialogStore';

export type AlertTone = 'info' | 'success' | 'warning';

type AlertModalProps = DialogRequestComponentProps<void> & {
  message: string;
  title?: string;
  tone?: AlertTone;
  okButtonText?: string;
};

const PALETTES: Record<AlertTone, ModalPalette> = {
  info: {
    grad: 'linear-gradient(135deg,#EAF2FE 0%,#D6E8FF 100%)',
    icon: 'ℹ️',
    ring: 'rgba(49,150,255,0.5)',
  },
  success: {
    grad: 'linear-gradient(135deg,#DCFCE7 0%,#A7F3D0 100%)',
    icon: '✅',
    ring: 'rgba(34,197,94,0.5)',
  },
  warning: {
    grad: 'linear-gradient(135deg,#FEF3C7 0%,#FDE68A 100%)',
    icon: '⚠️',
    ring: 'rgba(245,158,11,0.5)',
  },
};

export default function AlertModal({
  resolve,
  message,
  title,
  tone = 'info',
  okButtonText,
}: AlertModalProps) {
  const tDialog = useTranslations('dialog');
  const tCommon = useTranslations('common');
  const resolvedTitle = title ?? tDialog('alertTitle');
  const resolvedOk = okButtonText ?? tCommon('confirm');
  const close = () => resolve();
  return (
    <ModalShell onBackdropClick={close}>
      <ModalBanner palette={PALETTES[tone]} />
      <ModalBody title={resolvedTitle} message={message} />
      <div className="px-[22px] pb-[22px] pt-[18px]">
        <button
          type="button"
          onClick={close}
          className="mdl-btn w-full rounded-[14px] border-0 px-5 py-3.5 text-[14px] font-bold text-white"
          style={{
            background: 'linear-gradient(135deg,#3196ff 0%,#1C7AE0 100%)',
            boxShadow: '0 8px 18px rgba(28,122,224,0.32)',
          }}
        >
          {resolvedOk}
        </button>
      </div>
    </ModalShell>
  );
}
