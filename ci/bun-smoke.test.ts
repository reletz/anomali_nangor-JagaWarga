import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("identity process provides liveness and rejects incomplete credentials", async () => {
  const service = resolve(import.meta.dir, "../src/services/identity");
  const build = Bun.spawn([process.execPath, "build", "index.ts", "--target=bun", "--packages=external", "--outfile=dist/index.js"], { cwd: service, stdout: "inherit", stderr: "inherit" });
  expect(await build.exited).toBe(0);
  const child = Bun.spawn([process.execPath, "dist/index.js"], {
    cwd: service,
    env: { ...process.env, NODE_ENV: "production", JWT_SECRET: "local-test-only-".repeat(4), DEMO_LOGIN_PASSWORD: "local-test-only", PORT: "3101" },
    stdout: "ignore", stderr: "inherit",
  });
  try {
    let live: Response | undefined;
    for (let attempt = 0; attempt < 50; attempt++) {
      try { live = await fetch("http://127.0.0.1:3101/live"); if (live.ok) break; } catch {}
      await Bun.sleep(100);
    }
    expect(live?.status).toBe(200);
    const login = await fetch("http://127.0.0.1:3101/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    expect(login.status).toBe(400);
    const invalid = await fetch("http://127.0.0.1:3101/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: "invalid" }) });
    expect(invalid.status).toBe(401);
  } finally {
    child.kill("SIGTERM");
    await child.exited;
  }
}, 15000);
