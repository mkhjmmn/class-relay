"use client";
import { Hydrated } from "@/components/shell/Page";
import { SchoolReports } from "@/components/school/SchoolViews";

export default function Page() {
  return (
    <Hydrated>
      <SchoolReports />
    </Hydrated>
  );
}
