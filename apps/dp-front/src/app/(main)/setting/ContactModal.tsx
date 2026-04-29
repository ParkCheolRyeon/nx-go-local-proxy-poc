'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';

import { cn } from '@/lib/utils';
import { type DialogRequestComponentProps } from '@/stores/dialogStore';

type ContactModalProps = DialogRequestComponentProps<void>;

export default function ContactModal({ resolve }: ContactModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const close = () => resolve();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    window.alert('문의가 접수되었어요. 빠른 시일 내에 답변 드릴게요.');
    setSubject('');
    setMessage('');
    close();
  };

  const canSubmit = subject.trim().length > 0 && message.trim().length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ animation: 'st-fade .2s ease-out both' }}
    >
      <div className="absolute inset-0 bg-[#0b2a63]/45 backdrop-blur-[2px]" onClick={close} aria-hidden />
      <div
        className="relative w-full max-w-[440px] overflow-hidden rounded-[22px] border border-[#1C7AE0]/[0.12] bg-white shadow-[0_24px_60px_rgba(11,42,99,0.28)]"
        style={{ animation: 'st-fade .25s cubic-bezier(.22,1,.36,1) both' }}
      >
        <div
          className="px-5 pb-4 pt-5"
          style={{
            background: 'linear-gradient(135deg,#EAF2FE 0%,#D6E8FF 100%)',
            borderBottom: '1px solid rgba(28,122,224,0.12)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-[#3196ff]/25 bg-white px-2.5 py-[3px] text-[10.5px] font-bold tracking-[0.6px] text-[#1C7AE0]">
                <span>💬</span>
                <span>SUPPORT</span>
              </div>
              <h2 id="contact-modal-title" className="text-[20px] font-extrabold tracking-[-0.3px] text-[#0b2a63]">
                1:1 문의하기
              </h2>
              <p className="mt-1 text-[11.5px] text-[#5C6F90]">평일 10:00 ~ 18:00 · 보통 1영업일 내 답변</p>
              <a
                href="mailto:help@artbonbon.com"
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-[3px] text-[11.5px] font-bold text-[#1C7AE0] underline-offset-2 hover:underline"
              >
                <span>📩</span>
                <span>help@artbonbon.com</span>
              </a>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="닫기"
              className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full bg-white text-[16px] font-light text-[#5C6F90] shadow-[0_2px_6px_rgba(28,122,224,0.18)]"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3 px-5 py-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] font-bold text-[#0b2a63]">제목</span>
            <input
              type="text"
              value={subject}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
              placeholder="문의 제목을 입력해 주세요"
              maxLength={60}
              className="rounded-[12px] border border-[#1C7AE0]/[0.18] bg-white px-3 py-2.5 text-[13px] text-[#0b2a63] outline-none placeholder:text-[#8AA0BD] focus:border-[#3196ff] focus:shadow-[0_0_0_4px_rgba(49,150,255,0.18)]"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] font-bold text-[#0b2a63]">내용</span>
            <textarea
              value={message}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
              placeholder="문의 내용을 자세히 적어 주세요"
              rows={6}
              maxLength={1000}
              className="resize-none rounded-[12px] border border-[#1C7AE0]/[0.18] bg-white px-3 py-2.5 text-[13px] leading-[1.55] text-[#0b2a63] outline-none placeholder:text-[#8AA0BD] focus:border-[#3196ff] focus:shadow-[0_0_0_4px_rgba(49,150,255,0.18)]"
            />
            <span className="self-end text-[10.5px] text-[#8AA0BD]">{message.length} / 1000</span>
          </label>

          <div className="mt-1 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="cursor-pointer rounded-full border border-[#1C7AE0]/[0.18] bg-white px-4 py-2 text-[12.5px] font-bold text-[#5C6F90]"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                'rounded-full px-4 py-2 text-[12.5px] font-bold text-white shadow-[0_4px_10px_rgba(28,122,224,0.28)] transition-opacity',
                canSubmit ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-50',
              )}
              style={{ background: 'linear-gradient(135deg,#3196ff,#1C7AE0)' }}
            >
              문의하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
