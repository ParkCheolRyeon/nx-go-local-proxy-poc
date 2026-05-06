import type { ChildProfileEmoji } from '@/stores/userStore';

// 'default' 는 부모/유저 표시용. 자녀 프로필 키는 ChildProfileEmoji 와 동일.
export type AvatarKey = 'default' | ChildProfileEmoji;

export const AVATAR_EMOJI: Record<AvatarKey, string> = {
  default: '🙀',
  lion: '🦁',
  bear: '🐻',
  rabbit: '🐰',
  panda: '🐼',
  fox: '🦊',
  dog: '🐶',
  cat: '🐱',
  unikorn: '🦄',
};

export const DEFAULT_AVATAR_KEY: AvatarKey = 'default';

// 자녀 프로필 픽커 카드 배경. 키 순서가 픽커 표시 순서를 결정.
export const CHILD_AVATAR_GRADIENTS: Record<ChildProfileEmoji, string> = {
  lion: 'linear-gradient(135deg,#FDE68A,#FBBF24)',
  bear: 'linear-gradient(135deg,#FDBA74,#F97316)',
  rabbit: 'linear-gradient(135deg,#FBCFE8,#F472B6)',
  panda: 'linear-gradient(135deg,#E5E7EB,#9CA3AF)',
  fox: 'linear-gradient(135deg,#FCA5A5,#F87171)',
  dog: 'linear-gradient(135deg,#FEF08A,#FACC15)',
  cat: 'linear-gradient(135deg,#C7D2FE,#818CF8)',
  unikorn: 'linear-gradient(135deg,#DDD6FE,#A78BFA)',
};

export type ChildAvatarOption = {
  key: ChildProfileEmoji;
  emoji: string;
  gradient: string;
};

// 자녀 프로필 픽커용 정렬된 옵션 목록. CHILD_AVATAR_GRADIENTS 의 키 순서를 그대로 따름.
export const CHILD_AVATARS: ReadonlyArray<ChildAvatarOption> = (
  Object.keys(CHILD_AVATAR_GRADIENTS) as ChildProfileEmoji[]
).map((key) => ({
  key,
  emoji: AVATAR_EMOJI[key],
  gradient: CHILD_AVATAR_GRADIENTS[key],
}));

// 키 → 이모지. 키가 비어있으면 default, 키가 이미 이모지면 그대로 통과
export function resolveAvatar(value: string | null | undefined): string {
  if (!value) return AVATAR_EMOJI[DEFAULT_AVATAR_KEY];
  if (value in AVATAR_EMOJI) return AVATAR_EMOJI[value as AvatarKey];
  return value; // legacy: 이미 이모지가 들어온 경우
}
