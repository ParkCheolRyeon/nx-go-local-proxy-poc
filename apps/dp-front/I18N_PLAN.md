# DP-Front i18n 도입 계획 (react-i18next · ko / en / ja)

> 대상: `apps/dp-front` (Next.js 16 App Router · React 19 · Tailwind 3.4 · zustand)
> 목표: 기본 한국어, 영어/일본어 추가. 설정에서 언어 변경 시 즉시 UI 전환 + 세션 간 유지.

---

## 1. 왜 react-i18next 인가

- 사용자 요청이 명시적으로 react-i18next.
- `apps/dp-front`의 페이지는 대부분 `'use client'`라 클라이언트 사이드 i18n 만으로 충분.
- 기존 인라인 한글 문자열이 많아 점진적 마이그레이션이 가능한 라이브러리(`useTranslation` + 키 누락 시 자동 폴백) 가 유리.
- 대안 (참고): `next-intl` 은 App Router 친화적이지만 react-i18next 생태계와 호환되지 않음. 본 계획은 사용자 지정대로 react-i18next 채택.

## 2. 패키지 설치

```bash
# 모노레포 루트에서
pnpm --filter @igallery/dp-front add i18next react-i18next \
  i18next-browser-languagedetector i18next-resources-to-backend
```

- `i18next` — 코어
- `react-i18next` — React 바인딩 (`useTranslation`, `<Trans>`)
- `i18next-browser-languagedetector` — query → localStorage → navigator 순 감지
- `i18next-resources-to-backend` — 네임스페이스별 JSON 을 dynamic `import()` 로 로드 (페이지에 필요한 ns 만 페치)

## 3. 디렉터리 구조

```
apps/dp-front/src/
├─ i18n/
│  ├─ config.ts            # i18next 인스턴스 생성/초기화
│  ├─ I18nProvider.tsx     # 'use client' Provider
│  ├─ types.ts             # Locale, Namespace 타입
│  └─ locales/
│     ├─ ko/
│     │  ├─ common.json    # 공통 (액션, 라벨)
│     │  ├─ menu.json      # 사이드바/네비
│     │  ├─ setting.json
│     │  ├─ event.json
│     │  ├─ notification.json
│     │  ├─ signin.json
│     │  └─ signup.json
│     ├─ en/  (동일 구조)
│     └─ ja/  (동일 구조)
```

- 네임스페이스 = 라우트/기능 단위 → 페이지 진입 시 해당 ns 만 로드.
- `common`은 모든 페이지에 기본 포함, 그 외 ns 는 페이지에서 명시적으로 사용.

## 4. 초기화

### 4-1. `src/i18n/config.ts`

```ts
'use client';

import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next';

export const SUPPORTED_LOCALES = ['ko', 'en', 'ja'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ko';

if (!i18next.isInitialized) {
  void i18next
    .use(LanguageDetector)
    .use(
      resourcesToBackend((lng: string, ns: string) =>
        import(`./locales/${lng}/${ns}.json`),
      ),
    )
    .use(initReactI18next)
    .init({
      fallbackLng: DEFAULT_LOCALE,
      supportedLngs: SUPPORTED_LOCALES,
      ns: ['common'],
      defaultNS: 'common',
      interpolation: { escapeValue: false }, // React 가 알아서 이스케이프
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: 'igallery:lang',
        caches: ['localStorage'],
      },
      react: { useSuspense: false }, // App Router 첫 페인트 깜빡임 방지
    });
}

export default i18next;
```

### 4-2. `src/i18n/I18nProvider.tsx`

```tsx
'use client';

import { type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import i18next from '@/i18n/config';

export default function I18nProvider({ children }: { children: ReactNode }) {
  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>;
}
```

### 4-3. `src/app/layout.tsx` 마운트

기존 `RootLayoutContainer` 안쪽 가장 바깥에서 감쌈:

```tsx
import I18nProvider from '@/i18n/I18nProvider';

// ...
<RootLayoutContainer>
  <I18nProvider>{children}</I18nProvider>
</RootLayoutContainer>
```

`<html lang="ko">` 는 초기값으로 두고, 클라이언트에서 언어 변경 시 `document.documentElement.lang` 갱신.

## 5. 사용 예시

### 5-1. 단순 키

```tsx
'use client';
import { useTranslation } from 'react-i18next';

export default function SettingHeader() {
  const { t } = useTranslation('setting');
  return <h1>{t('title')}</h1>;
}
```

```jsonc
// ko/setting.json
{ "title": "설정" }
// en/setting.json
{ "title": "Settings" }
// ja/setting.json
{ "title": "設定" }
```

### 5-2. 보간 / 복수형

```jsonc
// ko/setting.json
{ "childCount": "{{names}} ({{count}} / 5명)" }
// en
{ "childCount": "{{names}} ({{count}} / 5)" }
// ja
{ "childCount": "{{names}}（{{count}} / 5）" }
```

```tsx
t('childCount', { names: childNames, count: user.children.length })
```

### 5-3. 인라인 JSX — `<Trans>`

마크업이 섞이는 텍스트는 `<Trans>` 사용 (현 코드의 `<br/>`, `<strong>` 같은 태그 보존):

```tsx
<Trans i18nKey="setting:dangerNotice">
  탈퇴 시 작품·코인·구독이 정리됩니다.
  <br />
  GDPR · COPPA에 따라 ZIP 다운로드와 즉시 삭제 옵션을 제공해요.
</Trans>
```

### 5-4. 다중 네임스페이스

```ts
const { t } = useTranslation(['setting', 'common']);
t('setting:title');
t('common:cancel');
```

## 6. 언어 전환 UI

`AccountTab.tsx`의 "언어" Row 를 모달/바텀시트와 연결:

```tsx
'use client';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, type Locale } from '@/i18n/config';

const LABELS: Record<Locale, string> = { ko: '한국어', en: 'English', ja: '日本語' };

export function LanguagePicker() {
  const { i18n, t } = useTranslation('setting');
  const change = async (lng: Locale) => {
    await i18n.changeLanguage(lng);            // localStorage 자동 캐시
    document.documentElement.lang = lng;        // <html lang> 갱신
  };
  return (
    <ul>
      {SUPPORTED_LOCALES.map((lng) => (
        <li key={lng} onClick={() => change(lng)}>
          {LABELS[lng]} {i18n.language === lng && '✓'}
        </li>
      ))}
    </ul>
  );
}
```

- 사용자 store(`useUserStore`) 에 `locale` 필드 추가하면 로그인 직후 서버 값으로 강제 동기화 가능 (선택).

## 7. SSR / Hydration

- 모든 `useTranslation` 은 `'use client'` 트리에서만 호출.
- 서버 컴포넌트(현재 `app/layout.tsx`, metadata)는 정적 한국어를 두거나, `headers()` 로 `accept-language` 를 읽어 분기.
- 첫 페인트 깜빡임:
  - `react: { useSuspense: false }` 로 t() 가 키 그대로 폴백 (translation missing flicker 방지).
  - 또는 `next/script` 인라인 로 사전 detection 결과를 SSR HTML 에 주입 (advanced, 추후).
- `<html lang>` 은 클라이언트에서 i18n.on('languageChanged') 핸들러로 동기화하는 작은 effect 를 `I18nProvider` 안에 추가.

## 8. 키 네이밍 규칙

- 네임스페이스: 라우트/기능 (`setting`, `event`, `notification`, `signin`, `signup`, `menu`, `common`).
- 키: `camelCase`. 계층 구조는 nesting 사용 (`signin.cta.submit`).
- 같은 문구가 2개 이상 ns 에서 등장 → `common.*` 으로 승격.
- 절대 동적 문자열로 키 조립 금지 (`` t(`btn.${type}`) `` 는 i18next-parser 가 추출 못 함). 대신 매핑 객체 사용.

## 9. 마이그레이션 단계 (PR 단위)

1. **Phase 1 — 인프라 (PR1)**
   - 패키지 설치, `i18n/` 디렉터리, Provider 마운트, `ko/common.json` 시드.
   - 페이지 1곳 PoC (예: 설정 페이지 헤더의 "설정" 단어 하나만).
2. **Phase 2 — 공통 영역 (PR2)**
   - `config/menu.ts` 의 `label` 을 키로 치환 → 네비/사이드바/Header breadcrumb.
   - 토스트/Alert 메시지 (ContactModal 의 alert, 설정의 "준비 중인 기능이에요." 등).
3. **Phase 3 — 설정 페이지 (PR3)**
   - `GROUPS`, FAQ, ContactModal, Account/Billing/App/Kid/Support/Danger 모든 라벨.
4. **Phase 4 — 이벤트 / 알림 / 마이갤러리 (PR4)**
   - EVENTS 더미 데이터의 title/subtitle 은 ID 기반으로 ns 저장 (`event:items.rainy-day.title`).
5. **Phase 5 — 인증 (PR5)**
   - signin/signup 폼, 약관 동의 문구.
6. **Phase 6 — 가드 (PR6)**
   - `eslint-plugin-i18next/no-literal-string` 룰 추가, 한국어 인라인 추가 차단.
   - CI 스크립트: `i18next-parser` 로 키 추출 → `en/ja` 미번역 키 fail.

## 10. 한·영·일 특수 고려

- **줄바꿈**: 한·일 은 `word-break: keep-all` / `break-keep`, 영문은 `break-word`. CSS `:lang(ko), :lang(ja) { word-break: keep-all; }` 글로벌 룰 추가.
- **폰트**: 현재 `NanumSquareRound` 는 한글 위주. en/ja 폴백을 `font-family` 체인에 명시 (`'NanumSquareRound', 'Noto Sans JP', system-ui`). 일본어 글리프 누락 시 시스템 폰트로 자연 폴백.
- **숫자/날짜**: 기존 `Intl.NumberFormat('ko-KR')`, `Intl.DateTimeFormat` 호출을 `i18n.language` 기반으로 통일.
- **단수/복수**: 영어만 plural 룰이 다름. i18next 의 `_one` / `_other` 키 컨벤션 사용.
- **법적/정책 문구**: 14세 미만 본인확인, GDPR/COPPA 안내 등은 번역 텍스트만 교체. 비즈니스 로직(검증/리다이렉트)은 그대로.
- **타임존**: 표시 형식은 i18n 영역, 저장 값은 서버 ISO 그대로 유지.

## 11. zustand 스토어와의 통합 (선택)

```ts
// stores/userStore.ts (확장 예시)
type UserPreferences = { locale: Locale };

// 로그인 응답에 locale 이 포함되면:
i18n.changeLanguage(user.preferences.locale);
```

- 미로그인 사용자는 LanguageDetector 의 localStorage 우선.
- 로그아웃 시 캐시 유지(공용 단말 정책 별도 결정).

## 12. 체크리스트

- [ ] `pnpm add` 의존성 4종
- [ ] `src/i18n/config.ts`, `I18nProvider.tsx` 작성
- [ ] `app/layout.tsx` 에 Provider 삽입
- [ ] `ko/common.json` + 1개 페이지 PoC
- [ ] LanguageDetector localStorage 동작 확인
- [ ] `<html lang>` 동기화 effect
- [ ] `:lang(ko/ja)` `word-break` 글로벌 CSS
- [ ] 사이드바/Header 라벨 추출
- [ ] 설정 페이지 전체 추출
- [ ] 이벤트/알림 추출
- [ ] 인증 페이지 추출
- [ ] en/ja 번역 채우기
- [ ] `eslint-plugin-i18next` 룰 enable
- [ ] CI: `i18next-parser` 미번역 키 검증

## 13. 산출물 구조 예시 (Phase 1 끝났을 때)

```
src/
├─ app/
│  └─ layout.tsx              # I18nProvider 마운트
├─ i18n/
│  ├─ config.ts
│  ├─ I18nProvider.tsx
│  └─ locales/
│     └─ ko/
│        └─ common.json       # { "cancel": "취소", "save": "저장", ... }
└─ app/(main)/setting/
   └─ page.tsx                # const { t } = useTranslation('setting'); t('title')
```

## 14. 시간 견적 (러프)

| Phase | 범위 | 예상 |
|---|---|---|
| 1 | 인프라 + PoC | 0.5 d |
| 2 | 공통 (메뉴/Alert) | 0.5 d |
| 3 | 설정 | 1 d |
| 4 | 이벤트/알림/마이갤러리 | 1.5 d |
| 5 | 인증 | 0.5 d |
| 6 | Lint/CI | 0.5 d |
| 번역 | en/ja 본문 | 별도 (외부 번역가 또는 LLM 보조) |

## 15. 추후 옵션

- **서버 컴포넌트 i18n**: `i18next.cloneInstance()` + `headers()` 로 서버에서 `t()` 호출 (현재 페이지가 대부분 client 라 우선순위 낮음).
- **URL prefix 라우팅** (`/en/setting`, `/ja/setting`): 검색 노출/공유 링크 다국어가 중요해지면 도입. 현재는 설정 기반 토글로 충분.
- **번역 워크플로**: Locize / Crowdin / POEditor 연동 시 자동 동기화.
- **A11y**: `lang="…"` 부분 변경(섹션 단위 외국어 인용 등)이 필요한 경우 `dir`/`lang` 동적 분기.
