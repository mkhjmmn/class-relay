"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Clock, LogOut, Home, Briefcase, CalendarDays, BookOpen, BadgeCheck, Wallet, SlidersHorizontal, MessageCircle, Mic, ArrowLeftRight, LayoutGrid, ClipboardCheck, Users, BarChart3, Gauge, Rocket, ShieldCheck, Workflow, Bot, Settings, Circle } from "lucide-react";
import { useRepo } from "@/data/client";
import { advanceClock, SYSTEM } from "@/data/commands";
import { formatDate, formatTime, type Role } from "@/domain";
import { useT } from "@/i18n/useT";
import { Badge, Button, Card, Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ROLE_HOME, ROLE_NAV } from "./routes";
import { LoadingState } from "./Page";
import { toast } from "sonner";

const ROLE_PREFIX: Record<Role, string> = { substitute: "/app/sub", teacher: "/app/teacher", school_admin: "/app/school", district_admin: "/app/district" };

const ICONS: Record<string, React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = { Home, Briefcase, CalendarDays, BookOpen, BadgeCheck, Wallet, SlidersHorizontal, MessageCircle, Mic, ArrowLeftRight, LayoutGrid, ClipboardCheck, Users, BarChart3, Gauge, Rocket, ShieldCheck, Workflow, Bot, Settings, Circle };

function Icon({ name, className }: { name: string; className?: string }) {
  const C = ICONS[name] ?? Circle;
  return <C className={className} aria-hidden />;
}

export function RolePicker() {
  const t = useT();
  const { setSession, state } = useRepo();
  const router = useRouter();
  const people: { role: Role; name: string; desc: string }[] = [
    { role: "substitute", name: "Maya Rahman", desc: "Find work, accept offers, read the Sub Brief, check in, get paid." },
    { role: "teacher", name: "Daniel Ortiz", desc: "Report an absence by voice or text, share plans, read the Return Handoff." },
    { role: "school_admin", name: "Grace Kim", desc: "Coverage board, no-show re-dispatch, timesheet approvals, ratings." },
    { role: "district_admin", name: "Jordan Lee", desc: "Onboarding, compliance, payroll, analytics, automations, AI governance." },
  ];
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">{t("picker.title")}</h1>
      <p className="mt-1 text-slate-700">{t("picker.purpose")} {state.district.name} (fictional).</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {people.map((p) => (
          <Card key={p.role} className="flex flex-col p-5">
            <Badge tone="brand" className="self-start">{t(`role.${p.role}`)}</Badge>
            <p className="mt-2 text-lg font-semibold text-slate-950">{p.name}</p>
            <p className="flex-1 text-sm text-slate-700">{p.desc}</p>
            <Button
              className="mt-4 self-start"
              onClick={() => {
                setSession({ role: p.role });
                router.push(ROLE_HOME[p.role]);
              }}
            >
              Enter as {p.name.split(" ")[0]}
            </Button>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-sm text-slate-600">
        New substitute? <Link className="font-semibold text-brand-800 underline" href="/app/apply">Apply to Riverbend</Link> (journey J5).
      </p>
    </div>
  );
}

function DemoClock() {
  const t = useT();
  const { state, repo, session } = useRepo();
  const lang = session.language === "bn" ? "bn-BD" : session.language === "es" ? "es-US" : "en-US";
  const tick = (min: number) => {
    const fired = repo.run((d) => advanceClock(d, SYSTEM, min));
    toast.message(`Demo clock +${min >= 1440 ? "1 day" : `${min} min`}`, { description: fired.length ? fired.slice(0, 4).join(" · ") : "No time-based rules fired." });
  };
  return (
    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1" role="group" aria-label={t("shell.demoClock")}>
      <Clock aria-hidden className="size-4 text-slate-600" />
      <span className="text-xs font-semibold text-slate-800" aria-live="polite">
        {formatDate(state.now.slice(0, 10), lang)} {formatTime(state.now, lang)}
      </span>
      <Tooltip content="Advance the demo clock 10 minutes (fires W2 offer waves, W4 no-show checks)">
        <Button variant="ghost" size="sm" onClick={() => tick(10)}>+10m</Button>
      </Tooltip>
      <Tooltip content="Advance 1 hour">
        <Button variant="ghost" size="sm" onClick={() => tick(60)}>+1h</Button>
      </Tooltip>
      <Tooltip content="Advance 1 day (runs the W6 expiry sweep and W8 nightly sweep)">
        <Button variant="ghost" size="sm" onClick={() => tick(1440)}>+1d</Button>
      </Tooltip>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const { hydrated, session, setSession, user, state } = useRepo();

  if (!hydrated) return <div className="mx-auto max-w-7xl px-4 py-8"><LoadingState /></div>;

  const isOpenPage = pathname === "/app" || pathname.startsWith("/app/apply") || pathname.startsWith("/app/notifications");
  if (!session.role || !user) {
    return <main id="main" className="mx-auto max-w-7xl px-4 py-8">{pathname.startsWith("/app/apply") ? children : <RolePicker />}</main>;
  }
  const role = session.role;
  const nav = ROLE_NAV[role];
  const wrongArea = !isOpenPage && !pathname.startsWith(ROLE_PREFIX[role]);
  const unread = state.notifications.filter((n) => n.toUserId === user.id && !n.read).length;

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
      <nav aria-label="Role navigation" className="sticky top-20 hidden h-fit w-56 shrink-0 md:block">
        <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-600">{t(`role.${role}`)}</p>
        <p className="px-3 pb-2 text-sm font-semibold text-slate-900">{user.name}</p>
        <ul className="space-y-0.5">
          {nav.map((n) => {
            const active = pathname === n.href || (n.href !== ROLE_HOME[role] && pathname.startsWith(n.href));
            return (
              <li key={n.href}>
                <Link href={n.href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium", active ? "bg-brand-700 text-white" : "text-slate-800 hover:bg-slate-100")}>
                  <Icon name={n.icon} className="size-4" /> {t(n.key)}
                </Link>
              </li>
            );
          })}
          <li>
            <Link href="/app/notifications" className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium", pathname === "/app/notifications" ? "bg-brand-700 text-white" : "text-slate-800 hover:bg-slate-100")}>
              <Bell aria-hidden className="size-4" /> {t("nav.notifications")} {unread > 0 && <Badge tone="amber">{unread}</Badge>}
            </Link>
          </li>
        </ul>
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setSession({ role: null }); router.push("/app"); }}>
          <LogOut aria-hidden /> {t("shell.switchRole")}
        </Button>
      </nav>

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <DemoClock />
          <div className="flex items-center gap-2 md:hidden">
            <Link href="/app/notifications" className="relative rounded-lg p-2" aria-label={`${t("nav.notifications")} (${unread})`}>
              <Bell aria-hidden className="size-5" />
              {unread > 0 && <span className="absolute right-0 top-0 rounded-full bg-amber-500 px-1 text-[10px] font-bold text-slate-950">{unread}</span>}
            </Link>
            <Button variant="ghost" size="sm" onClick={() => { setSession({ role: null }); router.push("/app"); }}>
              {t("shell.switchRole")}
            </Button>
          </div>
        </div>
        <main id="main">
          {wrongArea ? (
            <Card className="p-6">
              <h1 className="text-xl font-bold">This area belongs to another role</h1>
              <p className="mt-1 text-slate-700">You are signed in as {user.name} ({t(`role.${role}`)}). Role separation gates every page and action.</p>
              <div className="mt-4 flex gap-2">
                <Button asChild><Link href={ROLE_HOME[role]}>Go to my home</Link></Button>
                <Button variant="outline" onClick={() => { setSession({ role: null }); router.push("/app"); }}>{t("shell.switchRole")}</Button>
              </div>
            </Card>
          ) : (
            children
          )}
        </main>
      </div>

      <nav aria-label="Role navigation (mobile)" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white md:hidden">
        <ul className="flex overflow-x-auto">
          {nav.map((n) => {
            const active = pathname === n.href || (n.href !== ROLE_HOME[role] && pathname.startsWith(n.href));
            return (
              <li key={n.href} className="min-w-[4.5rem] flex-1">
                <Link href={n.href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium", active ? "text-brand-800" : "text-slate-700")}>
                  <Icon name={n.icon} className="size-5" />
                  <span className="truncate">{t(n.key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
