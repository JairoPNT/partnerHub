# App-owned Business Preflight Inputs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an authorized operator run the Jairo Business publication preflight by site ID without providing internal manifest paths, while requiring a fresh entitlement on every invocation.

**Architecture:** A small shared reader owns the fixed entitlement endpoint, service-token authentication, canonicalization and identity validation. A new CLI accepts only the exact allowlisted site ID, creates a private temporary bundle, invokes the existing read-only preflight, removes the bundle in `finally`, and returns a redacted result. It neither invokes nor imports publication, SFTP, DNS, Hostinger, or Cloudflare provider code.

**Tech Stack:** Node.js 20 ESM, `node:test`, Node `fs/promises`, existing `jairo-business-publishing-preflight` and `prepare-jairo-business-entitlement-snapshot` contracts.

**Spec:** `docs/superpowers/specs/2026-09-22-app-owned-business-preflight-inputs-design.md`

## Global Constraints

- Initial allowlist is exactly `jairo-pinto-business`; unknown IDs fail closed.
- The reader uses the compiled entitlement endpoint and runtime `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` only; no CLI endpoint, URL, hash, path or entitlement override exists.
- Every invocation retrieves and validates a fresh entitlement; no stored-snapshot fallback is permitted.
- The command is `PREVIEW` only: it must not publish, enqueue, regenerate, connect to SFTP, change DNS, or call hosting/provider APIs.
- The only local mutation is an exclusive `0700` temporary bundle under a fixed app-owned scratch root. It is deleted on every completion path.
- Stdout, errors, tests, reports and request files must not contain secrets, internal paths, raw entitlement contents or source contents.
- The existing legacy preflight remains available unchanged for historical audit only; the new operator surface is the app-owned command.

## Review Focus

- A caller supplies `--site-id=another-site`: reject it before reading credentials or creating a directory (Task 2).
- The entitlement reader gets a `401`, redirect, non-JSON response, or malformed identity: return a stable redacted failure and never fall back (Task 1).
- The old preflight reports a block: remove the temporary manifest and entitlement snapshot before returning that block (Task 2).
- An exception occurs after bundle creation: cleanup failure masks any detailed underlying error and fails closed (Task 2).
- New code accidentally references a provider or publication runtime module: focused static contract test fails (Task 3).

---

## File structure

- `app/web/scripts/lib/jairo-business-fresh-entitlement.mjs` — fixed-endpoint reader, response validation and canonical entitlement bytes; no filesystem or provider access.
- `app/web/scripts/lib/jairo-business-fresh-entitlement.test.mjs` — reader failures and freshness unit tests with a fake fetch.
- `app/web/scripts/prepare-jairo-business-entitlement-snapshot.mjs` — consume the shared reader while preserving the existing snapshot CLI behavior.
- `app/web/scripts/jairo-business-app-owned-preflight.mjs` — allowlisted CLI orchestration, temporary bundle lifecycle and redacted result mapping.
- `app/web/scripts/jairo-business-app-owned-preflight.test.mjs` — orchestration/cleanup/non-disclosure tests with injected reader and legacy preflight doubles.
- `app/web/package.json` — focused test and maintenance script names only.
- `brain/agent-requests/codex/requests/CDX-20260922-002_app_owned_business_preflight_inputs.md` — backend ticket boundary and safety contract.
- `brain/agent-requests/codex/reports/CDX-20260922-002_app_owned_business_preflight_inputs_DONE.md` — verification, changed modules and known operational follow-up.

### Task 1: Extract the fixed fresh-entitlement reader

**Files:**
- Create: `app/web/scripts/lib/jairo-business-fresh-entitlement.mjs`
- Create: `app/web/scripts/lib/jairo-business-fresh-entitlement.test.mjs`
- Modify: `app/web/scripts/prepare-jairo-business-entitlement-snapshot.mjs`
- Modify: `app/web/scripts/prepare-jairo-business-entitlement-snapshot.test.mjs`

**Interfaces:**
- Consumes: runtime `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`, and a test-injected Fetch-compatible function.
- Produces: `readFreshJairoBusinessEntitlement({ environment, fetchImplementation }): Promise<{ canonicalBytes: Buffer; sha256: string; identity: { activationLeadId: string; businessPublicHost: string; businessEntitled: true } }>`.
- Produces: exported `JAIRO_BUSINESS_ENTITLEMENT_ENDPOINT` and `FreshEntitlementError` with a stable `code`; later tasks must handle only `error.code`.

- [ ] **Step 1: Write failing reader tests**

```js
test("reads the compiled endpoint with service-token headers and returns canonical bytes", async () => {
  const calls = [];
  const result = await readFreshJairoBusinessEntitlement({
    environment: { CF_ACCESS_CLIENT_ID: "id", CF_ACCESS_CLIENT_SECRET: "secret" },
    fetchImplementation: async (url, options) => {
      calls.push({ url: String(url), options });
      return response(validEntitlementJson);
    }
  });
  assert.equal(calls[0].url, JAIRO_BUSINESS_ENTITLEMENT_ENDPOINT);
  assert.equal(calls[0].options.redirect, "manual");
  assert.equal(result.identity.businessEntitled, true);
  assert.equal(result.canonicalBytes.includes(Buffer.from("secret")), false);
});

test("fails closed for missing credentials, redirect, non-json, and invalid entitlement", async () => {
  await assert.rejects(() => readFreshJairoBusinessEntitlement({ environment: {}, fetchImplementation }), /SERVICE_TOKEN_CONFIGURATION_MISSING/);
  await assert.rejects(() => readFreshJairoBusinessEntitlement({ environment: validEnvironment, fetchImplementation: async () => response("", 302, "text/html") }), /SERVICE_TOKEN_HTTP_302/);
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `node --test scripts/lib/jairo-business-fresh-entitlement.test.mjs`

Expected: FAIL because the reader module does not exist.

- [ ] **Step 3: Implement the minimal reader**

```js
export async function readFreshJairoBusinessEntitlement({ environment = process.env, fetchImplementation = globalThis.fetch }) {
  const clientId = environment.CF_ACCESS_CLIENT_ID?.trim();
  const clientSecret = environment.CF_ACCESS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new FreshEntitlementError("SERVICE_TOKEN_CONFIGURATION_MISSING");
  const response = await fetchImplementation(new URL(JAIRO_BUSINESS_ENTITLEMENT_ENDPOINT), {
    method: "GET", redirect: "manual",
    headers: { Accept: "application/json", "CF-Access-Client-Id": clientId, "CF-Access-Client-Secret": clientSecret }
  });
  // Accept only status 200 + JSON; validate the exact Jairo Business identity; return canonical bytes.
}
```

Move the fixed endpoint, canonicalization and identity validation from the snapshot script into the reader. Make the snapshot script call this reader, write only its returned canonical bytes, and preserve its public result fields and error codes.

- [ ] **Step 4: Run focused reader and snapshot regressions**

Run: `node --test scripts/lib/jairo-business-fresh-entitlement.test.mjs scripts/prepare-jairo-business-entitlement-snapshot.test.mjs`

Expected: PASS; all former snapshot assertions remain valid and the reader test confirms no caller-supplied endpoint exists.

- [ ] **Step 5: Commit Task 1**

```bash
git add app/web/scripts/lib/jairo-business-fresh-entitlement.mjs app/web/scripts/lib/jairo-business-fresh-entitlement.test.mjs app/web/scripts/prepare-jairo-business-entitlement-snapshot.mjs app/web/scripts/prepare-jairo-business-entitlement-snapshot.test.mjs
git commit -m "feat: extract fresh Jairo Business entitlement reader"
```

### Task 2: Add the app-owned preflight entrypoint

**Files:**
- Create: `app/web/scripts/jairo-business-app-owned-preflight.mjs`
- Create: `app/web/scripts/jairo-business-app-owned-preflight.test.mjs`
- Modify: `app/web/package.json`

**Interfaces:**
- Consumes: `readFreshJairoBusinessEntitlement`, `runJairoBusinessPublishingPreflight`, exactly `--site-id=jairo-pinto-business`, fixed environment roots, and test-injected `reader`, `preflight`, `scratchRoot` and `environment`.
- Produces: `runAppOwnedJairoBusinessPreflight(options): Promise<{ requestId: "CDX-20260922-002"; mode: "PREVIEW"; changed: false; status: "READY" | "BLOCKED" | "ENTITLEMENT_REFRESH_FAILED"; blockedReasons: string[]; providerCallsMade: false; secretsExposed: false }>`.

- [ ] **Step 1: Write failing orchestration tests**

```js
test("rejects an unallowlisted site before reader or preflight execution", async () => {
  let called = false;
  const result = await runAppOwnedJairoBusinessPreflight({
    siteId: "other-business", reader: async () => { called = true; }, preflight: async () => { called = true; }
  });
  assert.equal(result.status, "BLOCKED");
  assert.deepEqual(result.blockedReasons, ["SITE_NOT_ALLOWLISTED"]);
  assert.equal(called, false);
});

test("uses a fresh entitlement, passes only a private manifest to the legacy preflight, then removes the bundle", async () => {
  const scratchRoot = await mkdtemp(resolve(tmpdir(), "app-owned-preflight-"));
  const result = await runAppOwnedJairoBusinessPreflight({ siteId: "jairo-pinto-business", scratchRoot, reader: fakeReader, preflight: readyPreflight });
  assert.equal(result.status, "READY");
  assert.deepEqual(await readdir(scratchRoot), []);
  assert.equal(JSON.stringify(result).includes(scratchRoot), false);
});

test("never falls back after entitlement failure and cleans the bundle after a preflight block", async () => {
  const refreshFailure = await runAppOwnedJairoBusinessPreflight({ siteId: "jairo-pinto-business", reader: async () => { throw coded("SERVICE_TOKEN_HTTP_401"); } });
  assert.equal(refreshFailure.status, "ENTITLEMENT_REFRESH_FAILED");
  assert.equal(refreshFailure.blockedReasons.includes("SERVICE_TOKEN_HTTP_401"), true);
});
```

- [ ] **Step 2: Run the orchestration test to verify it fails**

Run: `node --test scripts/jairo-business-app-owned-preflight.test.mjs`

Expected: FAIL because the entrypoint module does not exist.

- [ ] **Step 3: Implement the allowlisted temporary-bundle flow**

```js
const ALLOWED_SITE_ID = "jairo-pinto-business";

export async function runAppOwnedJairoBusinessPreflight({ siteId, reader = readFreshJairoBusinessEntitlement, preflight = runJairoBusinessPublishingPreflight, scratchRoot = fixedScratchRoot, environment = process.env }) {
  if (siteId !== ALLOWED_SITE_ID) return blocked("SITE_NOT_ALLOWLISTED");
  let bundle;
  try {
    const entitlement = await reader({ environment });
    bundle = await createExclusivePrivateBundle({ scratchRoot, entitlement });
    const native = await preflight({ sourceDirectory: fixedSourceRoot, outputDirectory: fixedOutputRoot, manifestPath: bundle.manifestPath, environment });
    return redactNativeResult(native);
  } catch (error) {
    return redactFailure(error);
  } finally {
    if (bundle) await removeExclusiveBundle(bundle);
  }
}
```

`createExclusivePrivateBundle` must write `manifest.json` and `entitlement.json` with `0700` directory and `0600` files below the fixed scratch root; its manifest has the compiled confirmation, complete fixed identity, the legacy approved source hash and the fresh entitlement SHA-256. It must never receive a path from command-line arguments. The CLI accepts only `--site-id=...`; reject every `--manifest`, `--endpoint`, `--output-dir`, `--source-dir`, `--apply` and `--mode=APPLY*` argument with a stable non-sensitive error. Add `maintenance:jairo-business-app-owned-preflight` and `test:jairo-business-app-owned-preflight` npm scripts.

- [ ] **Step 4: Run focused tests and static safety checks**

Run: `npm run test:jairo-business-app-owned-preflight && npm run test:jairo-business-publishing-preflight && rg -n "ssh2|hostinger|cloudflareDns|guarded-ecosystem-publication|publicationJob" scripts/jairo-business-app-owned-preflight.mjs`

Expected: both test commands PASS; the `rg` command returns no matches.

- [ ] **Step 5: Commit Task 2**

```bash
git add app/web/scripts/jairo-business-app-owned-preflight.mjs app/web/scripts/jairo-business-app-owned-preflight.test.mjs app/web/package.json
git commit -m "feat: add app-owned business preflight inputs"
```

### Task 3: Record the backend contract and verify the branch

**Files:**
- Create: `brain/agent-requests/codex/requests/CDX-20260922-002_app_owned_business_preflight_inputs.md`
- Create: `brain/agent-requests/codex/reports/CDX-20260922-002_app_owned_business_preflight_inputs_DONE.md`
- Modify: `app/web/scripts/jairo-business-app-owned-preflight.test.mjs`

**Interfaces:**
- Consumes: the Task 2 result contract and its command name.
- Produces: a request/report pair that records only reason codes, changed module names, verification results and the explicitly excluded provider/publication operations.

- [ ] **Step 1: Add the failing non-disclosure/import-boundary assertions**

```js
test("the entrypoint source has no caller-controlled path parsing or provider/publication imports", async () => {
  const source = await readFile(new URL("./jairo-business-app-owned-preflight.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /argument\("(?:manifest|endpoint|output-dir|source-dir)"\)/);
  assert.doesNotMatch(source, /ssh2|hostingerDns|cloudflareDns|guarded-ecosystem-publication|publicationJob/);
  assert.match(source, /SITE_NOT_ALLOWLISTED/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails before the assertion is implemented**

Run: `npm run test:jairo-business-app-owned-preflight`

Expected: FAIL until the source-boundary assertion is added.

- [ ] **Step 3: Add the assertion and concise request/report documentation**

The request must declare Codex ownership, the exact allowed scripts, excluded provider/publication/DNS/SFTP modules, dependency on CDX-20260922-001, and no external runtime execution. The DONE report must state that runtime validation is CDX-20260922-002C and remains unexecuted without fresh explicit authorization.

- [ ] **Step 4: Run final verification**

Run: `npm run test:jairo-business-entitlement-snapshot && npm run test:jairo-business-publishing-preflight && npm run test:jairo-business-app-owned-preflight && npm run lint && npm run build && git diff --check`

Expected: all commands exit 0. The verification uses fake fetch/preflight adapters only; it does not make a live entitlement request, SFTP connection, DNS change, publication, or provider call.

- [ ] **Step 5: Commit Task 3**

```bash
git add brain/agent-requests/codex/requests/CDX-20260922-002_app_owned_business_preflight_inputs.md brain/agent-requests/codex/reports/CDX-20260922-002_app_owned_business_preflight_inputs_DONE.md app/web/scripts/jairo-business-app-owned-preflight.test.mjs
git commit -m "docs: record app-owned business preflight contract"
```

## Execution order

Tasks 1 and 2 are sequential because Task 2 consumes the reader contract from Task 1. Task 3 follows Task 2 because it tests the final command boundary. Each task requires an independent reviewer before the next begins. After the branch review and merge/deploy, CDX-20260922-002C may be proposed as a separate, explicitly authorized controlled runtime validation; it is not part of this plan.
