import Splash from '@/app/components/Splash';

export const revalidate = 60;

export default async function Home() {
  return (
    <main>
      <Splash />
    </main>
  );
}
