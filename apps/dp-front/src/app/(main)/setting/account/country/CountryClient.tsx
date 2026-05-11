'use client';

import { useTranslations } from 'next-intl';
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

type Region = 'asia' | 'na' | 'europe' | 'oceania';

type Country = {
  id: CountryId;
  sub: string;
  flag: string;
  region: Region;
};

const COUNTRIES: Country[] = [
  { id: 'KR', sub: 'KRW · GMT+9', flag: '🇰🇷', region: 'asia' },
  { id: 'JP', sub: 'JPY · GMT+9', flag: '🇯🇵', region: 'asia' },
  { id: 'CN', sub: 'CNY · GMT+8', flag: '🇨🇳', region: 'asia' },
  { id: 'VN', sub: 'VND · GMT+7', flag: '🇻🇳', region: 'asia' },
  { id: 'TH', sub: 'THB · GMT+7', flag: '🇹🇭', region: 'asia' },
  { id: 'US', sub: 'USD · GMT-5', flag: '🇺🇸', region: 'na' },
  { id: 'CA', sub: 'CAD · GMT-5', flag: '🇨🇦', region: 'na' },
  { id: 'GB', sub: 'GBP · GMT+0', flag: '🇬🇧', region: 'europe' },
  { id: 'FR', sub: 'EUR · GMT+1', flag: '🇫🇷', region: 'europe' },
  { id: 'DE', sub: 'EUR · GMT+1', flag: '🇩🇪', region: 'europe' },
  { id: 'AU', sub: 'AUD · GMT+10', flag: '🇦🇺', region: 'oceania' },
];

const REGION_ORDER: Region[] = ['asia', 'na', 'europe', 'oceania'];

const REGION_KEY: Record<Region, 'regionAsia' | 'regionNa' | 'regionEurope' | 'regionOceania'> = {
  asia: 'regionAsia',
  na: 'regionNa',
  europe: 'regionEurope',
  oceania: 'regionOceania',
};

export default function CountryClient() {
  const router = useRouter();
  const [countryId, setCountryId] = useState<CountryId>('KR');
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const t = useTranslations('setting.countryPage');
  const tAccount = useTranslations('setting.account');
  const tCommon = useTranslations('common');

  const current = COUNTRIES.find((c) => c.id === countryId) ?? COUNTRIES[0];
  const currentName = t(`country.${current.id}`);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = COUNTRIES.filter((c) => {
      if (!q) return true;
      const name = t(`country.${c.id}`).toLowerCase();
      return name.includes(q) || c.id.toLowerCase().includes(q);
    });
    const map = new Map<Region, Country[]>();
    for (const c of filtered) {
      if (!map.has(c.region)) map.set(c.region, []);
      map.get(c.region)!.push(c);
    }
    return REGION_ORDER.flatMap((region) => {
      const items = map.get(region);
      return items && items.length > 0 ? [{ region, items }] : [];
    });
  }, [query, t]);

  const filteredCount = groups.reduce((sum, g) => sum + g.items.length, 0);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await patchMe({ country: current.id });
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 401) {
        setSubmitting(false);
        await alert(tAccount('saveFailedToast'), { tone: 'warning' });
        return;
      }
    }
    setSubmitting(false);
    await alert(tAccount('countrySavedToast', { name: currentName }), { tone: 'success' });
    router.replace('/setting/account');
  };

  return (
    <section className="flex flex-col gap-[18px]">
      <div className="flex items-start justify-between gap-3">
        <header>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#3196ff]/25 bg-[#3196ff]/[0.12] px-3 py-[5px] text-[11px] font-bold tracking-[0.8px] text-[#1C7AE0]">
            <span>🗺️</span>
            <span>{t('tag')}</span>
          </div>
          <h2 className="text-[22px] font-extrabold leading-[1.15] tracking-[-0.3px] text-[#0b2a63]">
            {t('title')}
          </h2>
          <p className="mt-1 text-[12px] text-[#5C6F90]">{t('subtitle')}</p>
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
            <div className="text-[11px] font-bold tracking-[0.6px] text-[#1C7AE0]">{t('currentLabel')}</div>
            <div className="mt-0.5 text-[16px] font-bold text-[#0b2a63]">{currentName}</div>
            <div className="text-[11.5px] text-[#8AA0BD]">{current.sub}</div>
          </div>
          <span className="rounded-full bg-[#3196ff]/[0.16] px-2.5 py-1 text-[11px] font-bold text-[#1C7AE0]">
            {t('appliedBadge')}
          </span>
        </div>

        <div className="relative">
          <input
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
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
                {t(REGION_KEY[region]).toUpperCase()}
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
                        <div className="text-[13.5px] font-bold text-[#0b2a63]">{t(`country.${c.id}`)}</div>
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
            <div className="px-2 py-6 text-center text-[12px] text-[#8AA0BD]">{tCommon('noResult')}</div>
          )}
        </div>
      </div>

      <div className="mt-1 flex justify-end gap-2.5">
        <button
          type="button"
          onClick={() => router.replace('/setting/account')}
          className="cursor-pointer rounded-full border-[1.5px] border-[#1C7AE0]/[0.18] bg-white px-[22px] py-3 text-[13.5px] font-bold text-[#5C6F90] transition-colors hover:bg-[#3196ff]/[0.06]"
        >
          {tCommon('cancel')}
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
          {submitting ? tCommon('saving') : tCommon('save')}
        </button>
      </div>
    </section>
  );
}
