"use client";
import { useLanguage } from "@/data/client";
import { translate } from "./index";

/** t("nav.jobs") in the reader's language, with English fallback. */
export function useT() {
  const [lang] = useLanguage();
  return (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars);
}
