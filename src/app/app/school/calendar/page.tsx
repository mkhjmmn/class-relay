"use client";
import { Hydrated } from "@/components/shell/Page";
import { SchoolCalendar } from "@/components/school/SchoolViews";

export default function Page() {
  return (
    <Hydrated>
      <SchoolCalendar />
    </Hydrated>
  );
}
