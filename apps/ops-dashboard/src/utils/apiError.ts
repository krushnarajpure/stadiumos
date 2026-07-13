export function parseApiError(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!data) return fallback;

  if (typeof data.message === 'string') return data.message;

  const detail = data.detail;
  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => (typeof item === 'object' && item && 'msg' in item ? String(item.msg) : String(item)))
      .join('. ');
  }

  return fallback;
}
