'use client';

import { type ChangeEvent } from 'react';

type TimeFieldProps = {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
};

export default function TimeField({ value, onChange, ariaLabel }: TimeFieldProps) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className="cursor-pointer rounded-full border border-[#1C7AE0]/[0.18] bg-white px-3 py-1.5 text-[12.5px] font-bold text-[#1C7AE0] outline-none focus:border-[#3196ff] focus:shadow-[0_0_0_4px_rgba(49,150,255,0.18)]"
    />
  );
}
