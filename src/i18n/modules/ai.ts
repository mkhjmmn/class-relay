/** i18n strings for the ai area: keys namespaced "ai.*". English required; bn/es for key screens. */
const en: Record<string, string> = {
  "ai.console.title": "AI agents",
  "ai.console.purpose": "Agent Console: every agent run with trace, autonomy, kill switch, spend and eval pass rates.",
  "ai.console.replay": "Replay",
  "ai.console.killSwitch": "Kill switch",
  "ai.console.spend": "Spend vs cap",
  "ai.console.evals": "Eval pass rate",
  "ai.console.empty": "No agent runs yet. Report an absence to start the Relay Loop.",
  "ai.studio.title": "Automations",
  "ai.studio.purpose": "Automation Studio: W1-W8 rules with toggles, dry run, run history, event timeline and the demo clock.",
  "ai.studio.dryRun": "Dry run",
  "ai.studio.clock": "Demo clock",
  "ai.studio.nightly": "Run nightly",
  "ai.memory.title": "Memory Center",
  "ai.memory.export": "Export JSON",
  "ai.kb.title": "Knowledge Explorer",
  "ai.kb.search": "Search the knowledge base",
  "ai.coach.title": "Prep Coach",
  "ai.coach.purpose": "Ask about your assignment; answers cite the handbook and your plan.",
  "ai.coach.ask": "Ask",
  "ai.coach.placeholder": "e.g. What do I do in a fire drill?",
};
const bn: Record<string, string> = {
  "ai.console.title": "এআই এজেন্ট",
  "ai.studio.title": "স্বয়ংক্রিয়তা",
  "ai.memory.title": "মেমরি সেন্টার",
  "ai.kb.title": "জ্ঞান অনুসন্ধান",
  "ai.coach.title": "প্রস্তুতি কোচ",
  "ai.coach.purpose": "আপনার দায়িত্ব সম্পর্কে জিজ্ঞাসা করুন; উত্তরে হ্যান্ডবুক ও পরিকল্পনার উৎস থাকে।",
  "ai.coach.ask": "জিজ্ঞাসা করুন",
  "ai.studio.dryRun": "পরীক্ষামূলক চালনা",
};
const es: Record<string, string> = {
  "ai.console.title": "Agentes de IA",
  "ai.studio.title": "Automatizaciones",
  "ai.memory.title": "Centro de memoria",
  "ai.kb.title": "Explorador de conocimiento",
  "ai.coach.title": "Entrenador de preparación",
  "ai.coach.purpose": "Pregunta sobre tu asignación; las respuestas citan el manual y tu plan.",
  "ai.coach.ask": "Preguntar",
  "ai.studio.dryRun": "Simulación",
};
export const ai = { en, bn, es };
