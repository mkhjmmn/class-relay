"use client";
import { Hydrated } from "@/components/shell/Page";
import { Onboarding } from "@/components/district/Onboarding";

export default function Page() {
  return (
    <Hydrated>
      <Onboarding />
    </Hydrated>
  );
}
