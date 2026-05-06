import { apiFetch } from '@/lib/api';

export type ApiWallet = {
  holdingCoins: number;
  monthlyCoinAllowance: number;
  dailyTopupRemainingDays: number;
  updatedAt: string;
};

export function getMyWallet(): Promise<ApiWallet> {
  return apiFetch<ApiWallet>('/coins/wallet');
}
