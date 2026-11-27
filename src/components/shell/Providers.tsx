"use client";
import { Toaster } from "sonner";
import { RepoProvider } from "@/data/client";
import { SiteFooter, SiteHeader } from "./SiteChrome";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RepoProvider>
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
      <Toaster richColors position="top-center" closeButton />
    </RepoProvider>
  );
}
