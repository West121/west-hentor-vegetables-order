import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const productionConfig = await readFile(
  new URL("../deploy/nginx/hentor-vegetables-prod.conf", import.meta.url),
  "utf8",
);

test("production admin API is routed directly to the production backend", () => {
  assert.match(
    productionConfig,
    /location \/api\/admin\/ \{[\s\S]*?proxy_pass http:\/\/10\.0\.0\.10:8081\/api\/spring\/admin\/;/,
  );
});
