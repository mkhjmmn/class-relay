"use client";
import { StubPage } from "@/components/shell/StubPage";

export default function Page() {
  return <StubPage title="Absences" purpose="Your reported absences and who is covering." points={["Status per absence", "Cancel or extend", "Substitute details"]} />;
}
