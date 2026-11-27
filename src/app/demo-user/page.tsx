import type { Metadata } from "next";
import { DemoEntry } from "@/components/shell/DemoEntry";

export const metadata: Metadata = { title: "Demo: substitute Maya Rahman" };

export default function DemoUser() {
  return <DemoEntry role="substitute" name="substitute Maya Rahman" heading="Demo: substitute teacher" />;
}
