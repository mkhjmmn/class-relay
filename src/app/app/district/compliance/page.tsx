"use client";
import { Hydrated } from "@/components/shell/Page";
import { Compliance } from "@/components/district/DistrictViews";

export default function Page() {
  return (
    <Hydrated>
      <Compliance />
    </Hydrated>
  );
}
