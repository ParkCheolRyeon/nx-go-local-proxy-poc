import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { EVENTS } from '@/app/(main)/event/events';

export const dynamic = 'force-dynamic';

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = EVENTS.find((e) => e.id === slug);
  if (!event) notFound();

  const t = await getTranslations('event');
  const title = t(`items.${event.id}.title` as 'items.rainy-day.title');

  return (
    <div className="mx-auto max-w-[800px] px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold text-[#0b2a63]">{title}</h1>
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl">
        <Image
          src={event.image}
          alt={title}
          fill
          sizes="(min-width: 800px) 800px, 100vw"
          className="object-cover"
        />
      </div>
    </div>
  );
}
