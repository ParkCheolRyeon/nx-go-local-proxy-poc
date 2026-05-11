import AppTab from '@/app/(main)/setting/AppTab';

export const revalidate = 60;

export default function SettingAppPage() {
  return (
    <div className="flex flex-col gap-3.5">
      <AppTab />
    </div>
  );
}
