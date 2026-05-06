'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, type ChangeEvent } from 'react';

import BackButton from '@/app/components/BackButton';
import { alert } from '@/dialog';
import { ApiError } from '@/lib/api';
import { patchMe } from '@/lib/me-api';
import { cn } from '@/lib/utils';

type CountryId =
  | 'KR'
  | 'JP'
  | 'CN'
  | 'VN'
  | 'TH'
  | 'US'
  | 'CA'
  | 'GB'
  | 'FR'
  | 'DE'
  | 'AU';

type Country = {
  id: CountryId;
  name: string;
  sub: string;
  flag: string;
  region: '아시아' | '북미' | '유럽' | '오세아니아';
};

const COUNTRIES: Country[] = [
  { id: 'KR', name: '대한민국', sub: 'KRW · GMT+9', flag: '🇰🇷', region: '아시아' },
  { id: 'JP', name: '일본', sub: 'JPY · GMT+9', flag: '🇯🇵', region: '아시아' },
  { id: 'CN', name: '중국', sub: 'CNY · GMT+8', flag: '🇨🇳', region: '아시아' },
  { id: 'VN', name: '베트남', sub: 'VND · GMT+7', flag: '🇻🇳', region: '아시아' },
  { id: 'TH', name: '태국', sub: 'THB · GMT+7', flag: '🇹🇭', region: '아시아' },
  { id: 'US', name: '미국', sub: 'USD · GMT-5', flag: '🇺🇸', region: '북미' },
  { id: 'CA', name: '캐나다', sub: 'CAD · GMT-5', flag: '🇨🇦', region: '북미' },
  { id: 'GB', name: '영국', sub: 'GBP · GMT+0', flag: '🇬🇧', region: '유럽' },
  { id: 'FR', name: '프랑스', sub: 'EUR · GMT+1', flag: '🇫🇷', region: '유럽' },
  { id: 'DE', name: '독일', sub: 'EUR · GMT+1', flag: '🇩🇪', region: '유럽' },
  { id: 'AU', name: '호주', sub: 'AUD · GMT+10', flag: '🇦🇺', region: '오세아니아' },
];

const REGION_ORDER: Country['region'][] = ['아시아', '북미', '유럽', '오세아니아'];

export default function CountryPage() {
  const router = useRouter();
  const [countryId, setCountryId] = useState<CountryId>('KR');
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const current = COUNTRIES.find((c) => c.id === countryId) ?? COUNTRIES[0];

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = COUNTRIES.filter(
      (c) => !q || c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q),
    );
    const map = new Map<Country['region'], Country[]>();
    for (const c of filtered) {
      if (!map.has(c.region)) map.set(c.region, []);
      map.get(c.region)!.push(c);
    }
    return REGION_ORDER.flatMap((region) => {
      const items = map.get(region);
      return items && items.length > 0 ? [{ region, items }] : [];
    });
  }, [query]);

  const filteredCount = groups.reduce((sum, g) => sum + g.items.length, 0);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await patchMe({ country: current.id });
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 401) {
        setSubmitting(false);
        await alert('서버에 저장하지 못했어요. 잠시 후 다시 시도해 주세요.', { tone: 'warning' });
        return;
      }
    }
    setSubmitting(false);
    await alert(`국가가 ${current.name}(으)로 설정됐어요.`, { tone: 'success' });
    router.replace('/setting/account');
  };

  return (
    <section className="flex flex-col gap-[18px]">
      <div className="flex items-start justify-between gap-3">
        <header>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#3196ff]/25 bg-[#3196ff]/[0.12] px-3 py-[5px] text-[11px] font-bold tracking-[0.8px] text-[#1C7AE0]">
            <span>🗺️</span>
            <span>REGION</span>
          </div>
          <h2 className="text-[22px] font-extrabold leading-[1.15] tracking-[-0.3px] text-[#0b2a63]">
            국가 / 지역 설정
          </h2>
          <p className="mt-1 text-[12px] text-[#5C6F90]">결제 통화, 시간대, 콘텐츠 추천에 영향을 줍니다.</p>
        </header>
        <BackButton href="/setting/account" />
      </div>

      <div className="flex flex-col gap-3.5 rounded-[22px] border border-[#1C7AE0]/[0.14] bg-white/90 p-[22px] shadow-[0_14px_36px_rgba(28,122,224,0.12)] backdrop-blur-[14px]">
        <div
          className="flex items-center gap-3.5 rounded-[14px] border-[1.5px] border-[#3196ff]/[0.28] px-4 py-3.5"
          style={{
            background: 'linear-gradient(135deg, rgba(49,150,255,0.10), rgba(49,150,255,0.02))',
          }}
        >
          <span className="text-[32px]">{current.flag}</span>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold tracking-[0.6px] text-[#1C7AE0]">현재 설정</div>
            <div className="mt-0.5 text-[16px] font-bold text-[#0b2a63]">{current.name}</div>
            <div className="text-[11.5px] text-[#8AA0BD]">{current.sub}</div>
          </div>
          <span className="rounded-full bg-[#3196ff]/[0.16] px-2.5 py-1 text-[11px] font-bold text-[#1C7AE0]">
            적용 중
          </span>
        </div>

        <div className="relative">
          <input
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            placeholder="국가 또는 지역 검색"
            className="w-full rounded-[12px] border-[1.5px] border-[#1C7AE0]/[0.18] bg-white py-3 pl-10 pr-4 text-[13.5px] text-[#0b2a63] outline-none transition-[border-color,box-shadow] placeholder:text-[#8AA0BD] focus:border-[#3196ff] focus:shadow-[0_0_0_4px_rgba(49,150,255,0.14)]"
          />
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-[#8AA0BD]">
            🔍
          </span>
        </div>

        <div className="flex max-h-[320px] flex-col gap-3 overflow-auto pr-1">
          {groups.map(({ region, items }) => (
            <div key={region}>
              <div className="px-1 pb-1.5 pt-1 text-[11px] font-bold tracking-[0.6px] text-[#8AA0BD]">
                {region.toUpperCase()}
              </div>
              <div className="flex flex-col gap-1">
                {items.map((c) => {
                  const on = countryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCountryId(c.id)}
                      aria-pressed={on}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-[12px] border-[1.5px] px-3 py-2.5 text-left transition-[background,border-color]',
                        on
                          ? 'border-[#3196ff]/[0.32] bg-[#3196ff]/[0.08]'
                          : 'border-transparent bg-transparent hover:bg-[#3196ff]/[0.06]',
                      )}
                    >
                      <span className="text-[22px]">{c.flag}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-bold text-[#0b2a63]">{c.name}</div>
                        <div className="text-[11px] text-[#8AA0BD]">{c.sub}</div>
                      </div>
                      <div
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold text-white',
                          on ? 'border-0' : 'border-[1.5px] border-[#1C7AE0]/[0.25] bg-white',
                        )}
                        style={
                          on
                            ? { background: 'linear-gradient(135deg,#3196ff,#1C7AE0)' }
                            : undefined
                        }
                      >
                        {on ? '✓' : ''}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {filteredCount === 0 && (
            <div className="px-2 py-6 text-center text-[12px] text-[#8AA0BD]">검색 결과가 없어요.</div>
          )}
        </div>
      </div>

      <div className="mt-1 flex justify-end gap-2.5">
        <button
          type="button"
          onClick={() => router.replace('/setting/account')}
          className="cursor-pointer rounded-full border-[1.5px] border-[#1C7AE0]/[0.18] bg-white px-[22px] py-3 text-[13.5px] font-bold text-[#5C6F90] transition-colors hover:bg-[#3196ff]/[0.06]"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={submitting}
          className={cn(
            'rounded-full border-0 px-[26px] py-3 text-[13.5px] font-bold text-white transition-[transform,box-shadow]',
            submitting
              ? 'cursor-not-allowed bg-[rgba(148,163,184,0.5)]'
              : 'cursor-pointer bg-[linear-gradient(135deg,#3196ff,#1C7AE0)] shadow-[0_10px_22px_rgba(28,122,224,0.32)] hover:-translate-y-px hover:shadow-[0_12px_24px_rgba(28,122,224,0.34)]',
          )}
        >
          {submitting ? '저장 중…' : '저장'}
        </button>
      </div>
    </section>
  );
}
