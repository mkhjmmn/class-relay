import type { Metadata } from "next";
import { DemoEntry } from "@/components/shell/DemoEntry";

export const metadata: Metadata = { title: "Demo: district admin Jordan Lee" };

export default function DemoAdmin() {
  return <DemoEntry role="district_admin" name="district admin Jordan Lee" heading="Demo: district admin" />;
}
