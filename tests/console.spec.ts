import { expect, test } from "@playwright/test";

/** Visits every role page with the demo session set and fails on console errors or uncaught exceptions. */
const ROLES = {
  substitute: { userId: "usr-maya", pages: ["/app/sub", "/app/sub/jobs", "/app/sub/schedule", "/app/sub/briefs", "/app/sub/credentials", "/app/sub/earnings", "/app/sub/preferences", "/app/sub/coach", "/app/notifications"] },
  teacher: { userId: "usr-daniel", pages: ["/app/teacher", "/app/teacher/report", "/app/teacher/absences", "/app/teacher/plans", "/app/teacher/preferences", "/app/teacher/handoffs"] },
  school_admin: { userId: "usr-grace", pages: ["/app/school", "/app/school/calendar", "/app/school/timesheets", "/app/school/substitutes", "/app/school/reports"] },
  district_admin: { userId: "usr-jordan", pages: ["/app/district", "/app/district/onboarding", "/app/district/substitutes", "/app/district/compliance", "/app/district/payroll", "/app/district/analytics", "/app/district/automations", "/app/district/agents", "/app/district/settings", "/admin", "/data", "/security", "/audit", "/architecture", "/presentation", "/pitchdeck", "/docs", "/prompt", "/app/apply"] },
} as const;

for (const [role, cfg] of Object.entries(ROLES)) {
  test(`no console errors as ${role}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`${page.url()} :: ${m.text()}`);
    });
    page.on("pageerror", (e) => errors.push(`${page.url()} :: ${e.message}`));
    await page.goto("/");
    await page.evaluate(
      ([r, u]) => localStorage.setItem("classrelay.session.v1", JSON.stringify({ role: r, userId: u, language: "en", lowBandwidth: false, tourDone: {}, checklist: {} })),
      [role, cfg.userId],
    );
    for (const p of cfg.pages) {
      await page.goto(p);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(400);
    }
    expect(errors, errors.join("\n")).toEqual([]);
  });
}
