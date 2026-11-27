"use client";
import { StubPage } from "@/components/shell/StubPage";

export default function Page() {
  return <StubPage title="Compliance" purpose="Expiring and expired credentials, caps and review queue." points={["Credential review queue", "Rule-cited alerts", "Tasks"]} />;
}
