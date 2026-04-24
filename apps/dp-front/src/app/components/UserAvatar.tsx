import IconUserDefault from '@/app/assets/icons/icon-user-default.svg';
import { useUser } from '@/stores/userStore';
import type { CSSProperties } from 'react';

export const AVATAR_GRADIENT =
  'linear-gradient(135deg, #E0F0FF 0%, #60A5FA 100%)';

type UserAvatarProps = {
  size: number;
  radius: number;
  emojiClassName?: string;
  iconClassName?: string;
  style?: CSSProperties;
};

export default function UserAvatar({
  size,
  radius,
  emojiClassName = 'text-2xl',
  iconClassName = 'h-1/2 w-1/2',
  style,
}: UserAvatarProps) {
  const user = useUser();

  return (
    <div
      className="flex flex-none items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: AVATAR_GRADIENT,
        color: '#1C7AE0',
        ...style,
      }}
    >
      {user?.avatar ? (
        <span className={emojiClassName}>{user.avatar}</span>
      ) : (
        <IconUserDefault className={iconClassName} />
      )}
    </div>
  );
}
