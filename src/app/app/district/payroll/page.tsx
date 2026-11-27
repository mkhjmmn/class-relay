"use client";
import { Hydrated } from "@/components/shell/Page";
import { Payroll } from "@/components/district/DistrictViews";

export default function Page() {
  return (
    <Hydrated>
      <Payroll />
    </Hydrated>
  );
}
