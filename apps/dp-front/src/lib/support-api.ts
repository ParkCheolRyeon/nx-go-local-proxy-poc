import { apiFetch } from '@/lib/api';

export type SupportInquiry = {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'answered' | 'closed';
  createdAt: string;
};

export type CreateSupportInquiryInput = {
  subject: string;
  message: string;
};

export function createSupportInquiry(input: CreateSupportInquiryInput): Promise<SupportInquiry> {
  return apiFetch<SupportInquiry>('/support-inquiries', { method: 'POST', json: input });
}
