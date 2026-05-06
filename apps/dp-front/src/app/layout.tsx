import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import localFont from 'next/font/local';

import RootLayoutContainer from '@/components/RootLayout';

import './global.css';

const nanumRound = localFont({
  src: [
    {
      path: '../fonts/NanumSquareRound/NanumSquareRoundL.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../fonts/NanumSquareRound/NanumSquareRoundR.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/NanumSquareRound/NanumSquareRoundB.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../fonts/NanumSquareRound/NanumSquareRoundEB.woff2',
      weight: '800',
      style: 'normal',
    },
  ],
  variable: '--font-nanum-round',
  display: 'swap',
});

export const metadata = {
  title: 'iGallery DP',
  description: '어린이 아트봉봉 갤러리',
  manifest: '/favicon/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon/favicon.ico', sizes: 'any' },
      {
        url: '/favicon/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
      {
        url: '/favicon/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/favicon/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className={nanumRound.variable}>
      <body className="min-h-screen bg-white font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <RootLayoutContainer>{children}</RootLayoutContainer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
