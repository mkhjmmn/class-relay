/** Eval summary for /audit and the Agent Console (reads the committed results.json from `npm run evals`). */
import results from "./results.json";

export interface EvalSummary {
  passRate: number;
  passed: number;
  total: number;
  agents: Record<string, { passed: number; total: number; failures: string[] }>;
}

export function evalSummary(): EvalSummary {
  return results as EvalSummary;
}
