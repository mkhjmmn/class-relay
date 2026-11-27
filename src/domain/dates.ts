/** Date helpers that are deterministic (UTC, string based) so server and client render identically. */

/** Fixed anchor for the seeded demo world. The demo clock starts here. */
export const DEMO_TODAY = "2026-12-01"; // a Tuesday
export const DEMO_START_TIME = `${DEMO_TODAY}T05:40:00.000Z`;

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  const ms = new Date(`${b}T00:00:00.000Z`).getTime() - new Date(`${a}T00:00:00.000Z`).getTime();
  return Math.round(ms / 86_400_000);
}

export function weekday(date: string): number {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

export function isWeekend(date: string): boolean {
  const w = weekday(date);
  return w === 0 || w === 6;
}

/** School days between start and end inclusive. */
export function schoolDays(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) if (!isWeekend(d)) out.push(d);
  return out;
}

export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export function minutesBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60_000);
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function formatDate(date: string, locale = "en-US"): string {
  return new Date(`${date}T12:00:00.000Z`).toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatTime(iso: string, locale = "en-US"): string {
  return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

export function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}
