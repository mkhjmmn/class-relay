/**
 * i18n: English complete; Bangla and Spanish for navigation, key screens and AI outputs.
 * Core dictionary lives in ./core.ts (owned by storyteller). Feature teams add their own
 * namespaced module in ./modules/<area>.ts exporting { en, bn, es } and register it in ./modules/index.ts.
 * Missing bn/es keys fall back to English.
 */
import type { Language } from "@/domain";
import { core } from "./core";
import { modules } from "./modules";

export type Dict = Record<string, string>;
export const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "bn", label: "Bangla", native: "বাংলা" },
  { code: "es", label: "Spanish", native: "Español" },
];

const merged: Record<Language, Dict> = { en: { ...core.en }, bn: { ...core.bn }, es: { ...core.es } };
for (const m of modules) {
  Object.assign(merged.en, m.en);
  Object.assign(merged.bn, m.bn);
  Object.assign(merged.es, m.es);
}

export function translate(lang: Language, key: string, vars?: Record<string, string | number>): string {
  let s = merged[lang][key] ?? merged.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function dictionary(lang: Language): Dict {
  return merged[lang];
}

export function coverageStats() {
  const en = Object.keys(merged.en);
  return {
    en: en.length,
    bn: en.filter((k) => merged.bn[k]).length,
    es: en.filter((k) => merged.es[k]).length,
  };
}
