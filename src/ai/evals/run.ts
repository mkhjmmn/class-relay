/** Eval runner: `npm run evals`. Prints per-agent pass rates, writes results.json, exits 1 below 90%. */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { CASES } from "./cases";

async function main() {
  const agents: Record<string, { passed: number; total: number; failures: string[] }> = {};
  for (const c of CASES) {
    const a = (agents[c.agent] ??= { passed: 0, total: 0, failures: [] });
    a.total++;
    let ok = false;
    try {
      ok = await c.run();
    } catch (e) {
      a.failures.push(`${c.name} (threw: ${e instanceof Error ? e.message : String(e)})`);
    }
    if (ok) a.passed++;
    else if (!a.failures.some((f) => f.startsWith(c.name))) a.failures.push(c.name);
  }
  const passed = Object.values(agents).reduce((s, a) => s + a.passed, 0);
  const total = CASES.length;
  const passRate = Math.round((passed / total) * 1000) / 1000;
  for (const [id, a] of Object.entries(agents)) {
    console.log(`${id.padEnd(22)} ${a.passed}/${a.total} ${Math.round((a.passed / a.total) * 100)}%`);
    for (const f of a.failures) console.log(`   FAIL ${f}`);
  }
  console.log(`TOTAL ${passed}/${total} (${Math.round(passRate * 100)}%)`);
  const out = { generatedBy: "npm run evals", mode: "sample", passRate, passed, total, agents: Object.fromEntries(Object.entries(agents).map(([k, v]) => [k, { passed: v.passed, total: v.total, failures: v.failures }])) };
  writeFileSync(join(process.cwd(), "src", "ai", "evals", "results.json"), JSON.stringify(out, null, 2) + "\n");
  if (passRate < 0.9) process.exit(1);
}

void main();
