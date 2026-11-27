import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/shell/Providers";

export const metadata: Metadata = {
  title: { default: "ClassRelay - Every class covered. Every lesson continued.", template: "%s | ClassRelay" },
  description: "AI-native substitute teacher workforce and scheduling platform. Demo with synthetic data for the fictional Riverbend Unified School District.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1d39d0" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
