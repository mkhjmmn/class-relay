"use client";
import { StubPage } from "@/components/shell/StubPage";

export default function Page() {
  return <StubPage title="Coverage board" purpose="Today's and upcoming absences: filled, unfilled and at risk." points={["Filled / offered / at-risk", "No-show re-dispatch", "Internal coverage plan"]} />;
}
