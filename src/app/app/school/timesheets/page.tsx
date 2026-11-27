"use client";
import { StubPage } from "@/components/shell/StubPage";

export default function Page() {
  return <StubPage title="Timesheets" purpose="Approve substitute timesheets within 2 working days." points={["Pending timesheets", "Anomaly flags", "Approve or return"]} />;
}
