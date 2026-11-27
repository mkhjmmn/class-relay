"use client";
import { Hydrated } from "@/components/shell/Page";
import { CommandCenter } from "@/components/district/DistrictViews";

export default function Page() {
  return (
    <Hydrated>
      <CommandCenter />
    </Hydrated>
  );
}
