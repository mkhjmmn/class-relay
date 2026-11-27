"use client";
import { StubPage } from "@/components/shell/StubPage";

export default function Page() {
  return <StubPage title="Earnings" purpose="Timesheets, approvals and pay." points={["Timesheet per completed day", "Approval status", "Pay-period totals"]} />;
}
