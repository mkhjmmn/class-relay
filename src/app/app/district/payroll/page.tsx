"use client";
import { StubPage } from "@/components/shell/StubPage";

export default function Page() {
  return <StubPage title="Payroll" purpose="Pay runs with anomaly flags; humans approve before export." points={["Draft pay run", "Anomalies", "CSV export"]} />;
}
