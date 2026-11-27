import { expect, test } from "@playwright/test";

/** Public route contract (CLAUDE.md section 3): anonymous 200 + a key heading. */
const ROUTES: { path: string; heading: RegExp }[] = [
  { path: "/", heading: /Every class covered/i },
  { path: "/app", heading: /Choose a demo role/i },
  { path: "/demo-user", heading: /substitute|Home|Your day/i },
  { path: "/demo-admin", heading: /district admin|Command center/i },
  { path: "/admin", heading: /Admin/i },
  { path: "/data", heading: /Data/i },
  { path: "/security", heading: /Security/i },
  { path: "/architecture", heading: /Architecture/i },
  { path: "/presentation", heading: /ClassRelay|Presentation/i },
  { path: "/pitchdeck", heading: /Pitch|ClassRelay/i },
  { path: "/audit", heading: /Audit/i },
  { path: "/docs", heading: /Documentation|Docs/i },
  { path: "/prompt", heading: /Master Prompt/i },
];

for (const r of ROUTES) {
  test(`route ${r.path} returns 200 with heading`, async ({ page, context }) => {
    await context.clearCookies();
    const res = await page.goto(r.path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText(r.heading, { timeout: 15_000 });
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.getByRole("button", { name: /Explore/i })).toBeVisible();
  });
}
