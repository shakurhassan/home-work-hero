export const SESSION_COOKIE = 'hwh_sid';

export function readCookie(header: string | undefined, name: string): string | null {
  if (header === undefined) return null;

  for (const pair of header.split(';')) {
    const separator = pair.indexOf('=');
    if (separator === -1) continue;
    if (pair.slice(0, separator).trim() === name) {
      return pair.slice(separator + 1).trim();
    }
  }
  return null;
}
