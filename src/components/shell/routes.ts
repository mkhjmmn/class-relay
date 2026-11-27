import type { Role } from "@/domain";

/** Public judge routes (CLAUDE.md section 3). Every page links to all of them. */
export const PUBLIC_ROUTES: { href: string; key: string; desc: string }[] = [
  { href: "/", key: "route.home", desc: "Landing page and Judge Hub" },
  { href: "/app", key: "route.app", desc: "Main application with role picker" },
  { href: "/demo-user", key: "route.demoUser", desc: "Enter as substitute Maya Rahman" },
  { href: "/demo-admin", key: "route.demoAdmin", desc: "Enter as district admin Jordan Lee" },
  { href: "/admin", key: "route.admin", desc: "RBAC, rule packs, automations, agents, memory" },
  { href: "/data", key: "route.data", desc: "Data sources, ER diagram, dictionary, lineage" },
  { href: "/security", key: "route.security", desc: "Security, privacy, responsible AI" },
  { href: "/architecture", key: "route.architecture", desc: "System, agent and data-flow diagrams" },
  { href: "/presentation", key: "route.presentation", desc: "Problem, solution, impact, ROI" },
  { href: "/pitchdeck", key: "route.pitchdeck", desc: "Investor deck (estimates labelled)" },
  { href: "/audit", key: "route.audit", desc: "One-click global audit" },
  { href: "/docs", key: "route.docs", desc: "Guides, API, agent cards, runbook" },
  { href: "/prompt", key: "route.prompt", desc: "Master Prompt verbatim with SHA-256" },
];

export interface NavItem {
  href: string;
  key: string;
  icon: string; // lucide icon name, resolved in AppShell
}

export const ROLE_NAV: Record<Role, NavItem[]> = {
  substitute: [
    { href: "/app/sub", key: "nav.home", icon: "Home" },
    { href: "/app/sub/jobs", key: "nav.jobs", icon: "Briefcase" },
    { href: "/app/sub/schedule", key: "nav.schedule", icon: "CalendarDays" },
    { href: "/app/sub/briefs", key: "nav.briefs", icon: "BookOpen" },
    { href: "/app/sub/credentials", key: "nav.credentials", icon: "BadgeCheck" },
    { href: "/app/sub/earnings", key: "nav.earnings", icon: "Wallet" },
    { href: "/app/sub/preferences", key: "nav.preferences", icon: "SlidersHorizontal" },
    { href: "/app/sub/coach", key: "nav.coach", icon: "MessageCircle" },
  ],
  teacher: [
    { href: "/app/teacher", key: "nav.home", icon: "Home" },
    { href: "/app/teacher/report", key: "nav.report", icon: "Mic" },
    { href: "/app/teacher/absences", key: "nav.absences", icon: "CalendarDays" },
    { href: "/app/teacher/plans", key: "nav.plans", icon: "BookOpen" },
    { href: "/app/teacher/preferences", key: "nav.preferences", icon: "SlidersHorizontal" },
    { href: "/app/teacher/handoffs", key: "nav.handoffs", icon: "ArrowLeftRight" },
  ],
  school_admin: [
    { href: "/app/school", key: "nav.coverage", icon: "LayoutGrid" },
    { href: "/app/school/calendar", key: "nav.calendar", icon: "CalendarDays" },
    { href: "/app/school/timesheets", key: "nav.timesheets", icon: "ClipboardCheck" },
    { href: "/app/school/substitutes", key: "nav.substitutes", icon: "Users" },
    { href: "/app/school/reports", key: "nav.reports", icon: "BarChart3" },
  ],
  district_admin: [
    { href: "/app/district", key: "nav.command", icon: "Gauge" },
    { href: "/app/district/onboarding", key: "nav.onboarding", icon: "Rocket" },
    { href: "/app/district/substitutes", key: "nav.substitutes", icon: "Users" },
    { href: "/app/district/compliance", key: "nav.compliance", icon: "ShieldCheck" },
    { href: "/app/district/payroll", key: "nav.payroll", icon: "Wallet" },
    { href: "/app/district/analytics", key: "nav.analytics", icon: "BarChart3" },
    { href: "/app/district/automations", key: "nav.automations", icon: "Workflow" },
    { href: "/app/district/agents", key: "nav.agents", icon: "Bot" },
    { href: "/app/district/settings", key: "nav.settings", icon: "Settings" },
  ],
};

export const ROLE_HOME: Record<Role, string> = {
  substitute: "/app/sub",
  teacher: "/app/teacher",
  school_admin: "/app/school",
  district_admin: "/app/district",
};
