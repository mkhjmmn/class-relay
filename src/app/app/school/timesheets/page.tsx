"use client";
import { Hydrated } from "@/components/shell/Page";
import { SchoolTimesheets } from "@/components/school/SchoolViews";

export default function Page() {
  return (
    <Hydrated>
      <SchoolTimesheets />
    </Hydrated>
  );
}
