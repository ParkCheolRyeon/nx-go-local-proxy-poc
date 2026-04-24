import IconApple from '@/app/assets/icons/sns/logo-apple.svg';
import IconGoogle from '@/app/assets/icons/sns/logo-google.svg';
import IconKakao from '@/app/assets/icons/sns/logo-kakao.svg';
import IconNaver from '@/app/assets/icons/sns/logo-naver.svg';
import { FC, SVGProps } from 'react';
import IconEmail from '@/app/assets/icons/sns/icon-email.svg';

type SocialModeProps = {
  onClickEmail: () => void;
};

type Social = {
  id: string;
  label: string;
  bg: string;
  fg: string;
  Icon: FC<SVGProps<SVGSVGElement>>;
  border?: string;
};

const SOCIALS: Social[] = [
  {
    id: 'kakao',
    label: '카카오로 시작하기',
    bg: '#FEE500',
    fg: '#191600',
    Icon: IconKakao,
  },
  {
    id: 'naver',
    label: '네이버로 시작하기',
    bg: '#03C75A',
    fg: '#ffffff',
    Icon: IconNaver,
  },
  {
    id: 'google',
    label: 'Google로 시작하기',
    bg: '#ffffff',
    fg: '#1f1f1f',
    Icon: IconGoogle,
    border: '1px solid #E4E7EC',
  },
  {
    id: 'apple',
    label: 'Apple로 시작하기',
    bg: '#000000',
    fg: '#ffffff',
    Icon: IconApple,
  },
];

export default function SocialMode({ onClickEmail }: SocialModeProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {SOCIALS.map((s, i) => (
        <button
          key={s.id}
          type="button"
          className="ac02-btn flex h-[52px] cursor-pointer items-center justify-center gap-2.5 rounded-[14px] text-[15px] font-semibold"
          style={{
            border: s.border ?? 'none',
            background: s.bg,
            color: s.fg,
            boxShadow: '0 4px 14px rgba(0,0,0,.06)',
            animation: `ac02-slide .45s cubic-bezier(.22,1,.36,1) ${
              i * 0.06 + 0.15
            }s both`,
          }}
        >
          <s.Icon width={24} height={24} aria-hidden />
          <span>{s.label}</span>
        </button>
      ))}

      <div
        className="mt-2.5 mb-1 flex items-center gap-2.5"
        style={{ animation: 'ac02-fade .4s ease-out .45s both' }}
      >
        <div
          className="h-px flex-1"
          style={{
            background:
              'linear-gradient(90deg, transparent, #CFDFF4, transparent)',
          }}
        />
        <span className="text-[11px] tracking-[0.5px] text-[#8AA0BD]">
          또는
        </span>
        <div
          className="h-px flex-1"
          style={{
            background:
              'linear-gradient(90deg, transparent, #CFDFF4, transparent)',
          }}
        />
      </div>

      <button
        type="button"
        onClick={onClickEmail}
        className="ac02-btn flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-[14px] border-0 text-[15px] font-bold text-white"
        style={{
          background: 'linear-gradient(135deg,#3196ff,#1C7AE0)',
          boxShadow: '0 8px 20px rgba(28,122,224,.35)',
          animation: 'ac02-slide .45s cubic-bezier(.22,1,.36,1) .5s both',
        }}
      >
        <IconEmail width={22} height={22} aria-hidden />
        <span>이메일로 시작하기</span>
      </button>
    </div>
  );
}
