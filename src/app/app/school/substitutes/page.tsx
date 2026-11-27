"use client";
import { Hydrated } from "@/components/shell/Page";
import { SchoolSubstitutes } from "@/components/school/SchoolViews";

export default function Page() {
  return (
    <Hydrated>
      <SchoolSubstitutes />
    </Hydrated>
  );
}
