"use client";
import { Suspense } from "react";
import { LoadingState } from "@/components/shell/Page";
import { Briefs } from "@/components/substitute/Briefs";

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Briefs />
    </Suspense>
  );
}
