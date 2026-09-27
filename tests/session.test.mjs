import test from "node:test";
import assert from "node:assert/strict";
import { loadTypescript } from "./load-typescript.mjs";

const { api, ApiError } = loadTypescript("src/lib/api/client.ts");
const { watchSession, notifySessionExpired, isProtectedPath } = loadTypescript("src/lib/api/session.ts");

test("セッション切れを検知する画面は直下のパスだけを含む", () => {
  for (const path of ["/home", "/map", "/cards/123", "/events/123", "/onboarding/npc"]) {
    assert.equal(isProtectedPath(path), true);
  }
  for (const path of ["/", "/login", "/invite/ABC123", "/homely"]) {
    assert.equal(isProtectedPath(path), false);
  }
});

test("復帰時の認証とAPIエラーを統一して扱い、変更を再送しない", async (t) => {
  const windowTarget = new EventTarget();
  const documentTarget = new EventTarget();
  const redirects = [];
  windowTarget.location = { pathname: "/home", replace: (path) => redirects.push(path) };
  documentTarget.visibilityState = "visible";
  documentTarget.cookie = "XSRF-TOKEN=test-token";
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 403 }));
  const oldWindow = globalThis.window;
  const oldDocument = globalThis.document;
  globalThis.window = windowTarget;
  globalThis.document = documentTarget;
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  let stop;
  t.after(() => {
    stop?.();
    if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow;
    if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
  });

  stop = watchSession();
  await settle();
  assert.deepEqual(redirects, [], "本登録の403ではログアウトしない");

  for (const status of [200, 500]) {
    globalThis.fetch = async () => new Response(null, { status });
    windowTarget.dispatchEvent(new Event("focus"));
    await settle();
    assert.deepEqual(redirects, [], "仮登録やサーバー障害は期限切れではない");
  }
  globalThis.fetch = async () => { throw new TypeError("offline"); };
  windowTarget.dispatchEvent(new Event("pageshow"));
  await settle();
  assert.deepEqual(redirects, []);

  let resolveCheck;
  let checkCount = 0;
  globalThis.fetch = () => {
    checkCount++;
    return new Promise((resolve) => { resolveCheck = resolve; });
  };
  windowTarget.dispatchEvent(new Event("focus"));
  windowTarget.dispatchEvent(new Event("pageshow"));
  documentTarget.dispatchEvent(new Event("visibilitychange"));
  assert.equal(checkCount, 1, "同時に起きる復帰イベントは認証確認を共有する");
  resolveCheck(new Response(null, { status: 403 }));
  await settle();

  let calls = [];
  globalThis.fetch = async (path, options) => {
    calls.push([path, options.method]);
    return new Response(null, { status: path === "/api/auth/csrf" ? 204 : 403 });
  };
  await assert.rejects(api.post("/api/example", {}), (error) => error instanceof ApiError && error.status === 403);
  assert.deepEqual(redirects, [], "認証が有効な403は維持する");

  calls = [];
  globalThis.fetch = async (path, options) => {
    calls.push([path, options.method]);
    return new Response(null, { status: path === "/api/auth/csrf" ? 204 : path === "/api/registrations/me" ? 401 : 403 });
  };
  await assert.rejects(api.post("/api/example", {}), (error) => error.status === 401);
  assert.equal(calls.filter(([path]) => path === "/api/example").length, 1);
  assert.deepEqual(redirects, ["/login?reason=session-expired"]);
  notifySessionExpired();
  assert.equal(redirects.length, 1, "並行する401でも遷移は一度だけ");

  stop();
  redirects.length = 0;
  globalThis.fetch = async () => new Response(null, { status: 401 });
  documentTarget.visibilityState = "hidden";
  stop = watchSession();
  await settle();
  assert.deepEqual(redirects, []);
  documentTarget.visibilityState = "visible";
  documentTarget.dispatchEvent(new Event("visibilitychange"));
  await settle();
  assert.deepEqual(redirects, ["/login?reason=session-expired"]);

  stop();
  redirects.length = 0;
  globalThis.fetch = () => new Promise((resolve) => { resolveCheck = resolve; });
  stop = watchSession();
  stop();
  resolveCheck(new Response(null, { status: 401 }));
  await settle();
  notifySessionExpired();
  assert.deepEqual(redirects, [], "破棄後の応答や通知では画面遷移しない");

  redirects.length = 0;
  windowTarget.location.pathname = "/invite/ABC123";
  globalThis.fetch = async () => new Response(null, { status: 401 });
  stop = watchSession();
  await assert.rejects(api.get("/api/example"), (error) => error.status === 401);
  assert.deepEqual(redirects, [], "招待コードを保存する既存処理を妨げない");
});
