"use client";
import { Suspense } from "react";
import { LoadingState } from "@/components/shell/Page";
import { SubHome } from "@/components/substitute/SubHome";

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SubHome />
    </Suspense>
  );
}
