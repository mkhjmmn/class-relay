"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRepo } from "@/data/client";
import { ROLE_HOME } from "@/components/shell/routes";
import { RolePicker } from "@/components/shell/AppShell";

/** /app: role picker for anonymous visitors, then the role home. */
export default function AppIndex() {
  const { session } = useRepo();
  const router = useRouter();
  useEffect(() => {
    if (session.role) router.replace(ROLE_HOME[session.role]);
  }, [session.role, router]);
  return <RolePicker />;
}
