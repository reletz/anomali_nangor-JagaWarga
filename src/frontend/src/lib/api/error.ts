import { isAxiosError } from 'axios';

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<{ error?: string }>(error)) return error.response?.data?.error || fallback;
  return fallback;
}
