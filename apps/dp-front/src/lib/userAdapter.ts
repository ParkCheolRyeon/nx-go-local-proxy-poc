import { DEFAULT_AVATAR_KEY } from '@/config/avatars';
import { ApiUser } from '@/lib/auth-api';
import { User } from '@/stores/userStore';

export function apiUserToStoreUser(api: ApiUser): User {
  return {
    id: api.id,
    name: api.name,
    description: '',
    avatar: DEFAULT_AVATAR_KEY,
    plan: 'monthlySubscribe',
    subscribeStartAt: '',
    subscribeEndAt: '',
    holdingCoins: 0,
    monthlyCoinAllowance: 0,
    notifications: [],
    children: [],
  };
}
