"use client";
import { Hydrated } from "@/components/shell/Page";
import { CoverageBoard } from "@/components/school/SchoolViews";

export default function Page() {
  return (
    <Hydrated>
      <CoverageBoard />
    </Hydrated>
  );
}
