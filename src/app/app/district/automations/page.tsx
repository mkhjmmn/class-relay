"use client";
import { Hydrated, PageHeader } from "@/components/shell/Page";
import { AutomationStudio } from "@/components/ai/AutomationStudio";
import { useT } from "@/i18n/useT";

export default function Page() {
  const t = useT();
  return (
    <div>
      <PageHeader
        title={t("ai.studio.title")}
        purpose={t("ai.studio.purpose")}
        help={
          <>
            <p>W1-W8 are event-driven rules: trigger, conditions, actions. Toggle a rule or edit its parameters; every change is audited.</p>
            <p>Dry run describes what would fire now without changing anything. Use the demo clock to advance time and watch W2, W4, W6 and W8 fire.</p>
          </>
        }
      />
      <Hydrated>
        <AutomationStudio />
      </Hydrated>
    </div>
  );
}
