import assert from "node:assert/strict";
import { test } from "node:test";
import { beschaedigteSessionCookies } from "./session-cookie";
const url = "https://projekt.supabase.co";
const name = "sb-projekt-auth-token";
const wert = `base64-${Buffer.from(JSON.stringify({ access_token: "test", user: { name: "Jörg" } })).toString("base64url")}`;
test("Intakte Session einschließlich UTF-8 bleibt erhalten", () => {
  assert.deepEqual(beschaedigteSessionCookies([{ name, value: wert }], url), []);
  assert.deepEqual(beschaedigteSessionCookies([{ name: `${name}.0`, value: wert.slice(0, 15) }, { name: `${name}.1`, value: wert.slice(15) }], url), []);
});
test("Ungültiges UTF-8 und unvollständige Chunks werden entfernt", () => {
  assert.deepEqual(beschaedigteSessionCookies([{ name, value: "base64-_w" }], url), [name]);
  assert.deepEqual(beschaedigteSessionCookies([{ name: `${name}.1`, value: "rest" }], url), [`${name}.1`]);
});
test("Fremde Projekte und andere Cookies bleiben unangetastet", () => {
  assert.deepEqual(beschaedigteSessionCookies([{ name: "qt_position", value: "defekt" }, { name: "sb-fremd-auth-token", value: "base64-_w" }], url), []);
});
