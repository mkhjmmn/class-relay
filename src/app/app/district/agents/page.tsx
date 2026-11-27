"use client";
import { Hydrated, PageHeader } from "@/components/shell/Page";
import { AgentConsole } from "@/components/ai/AgentConsole";
import { useT } from "@/i18n/useT";

export default function Page() {
  const t = useT();
  return (
    <div>
      <PageHeader
        title={t("ai.console.title")}
        purpose={t("ai.console.purpose")}
        help={
          <>
            <p>Each row is one agent_run: input summary, tool calls, sources, output, confidence, latency, cost, model and mode.</p>
            <p>Open Trace for sources and Guardian notes. Replay re-runs the deterministic sample. The kill switch stops agents from acting.</p>
          </>
        }
      />
      <Hydrated>
        <AgentConsole />
      </Hydrated>
    </div>
  );
}
