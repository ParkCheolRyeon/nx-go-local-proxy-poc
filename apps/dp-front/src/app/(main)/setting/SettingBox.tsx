'use client';

import { type ReactNode } from 'react';

type SettingBoxProps = {
  title: string;
  icon: string;
  children: ReactNode;
};

export default function SettingBox({ title, icon, children }: SettingBoxProps) {
  return (
    <section className="rounded-[22px] border border-[#1C7AE0]/[0.12] bg-white/85 px-5 pb-[18px] pt-4 shadow-[0_18px_44px_rgba(28,122,224,0.12)] backdrop-blur-[14px]">
      <div className="mb-1 flex items-center gap-2 px-1 pb-2">
        <span className="text-[14px]" aria-hidden>
          {icon}
        </span>
        <h2 className="text-[12px] font-bold tracking-[0.5px] text-[#1C7AE0]">{title}</h2>
      </div>
      {children}
    </section>
  );
}
