"use client";
import { Hydrated } from "@/components/shell/Page";
import { Notifications } from "@/components/district/MoreViews";

export default function Page() {
  return (
    <Hydrated>
      <Notifications />
    </Hydrated>
  );
}
