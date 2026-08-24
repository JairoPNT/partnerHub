# CDX-20260824-001 — Partner WhatsApp read-only inventory — DONE

## Source verification

- `origin/main`: `3fb6d159b1990548ce5988c2ae4e09ad73ce4e35`
- Main head: merge PR #157, CDX-017 Jairo WhatsApp correction.
- Scope is documentation-only. No production inventory was executed by Codex.

## Classification contract

Normalization removes every non-digit character independently from
`lead.whatsapp` and `onboardingData.whatsapp`, matching the CDX-016 identity
contract. It does not infer, prepend or repair a country code.

- `COHERENT`: both authoritative WhatsApp fields are non-empty after
  normalization and their digit strings are identical.
- `CONFLICT`: both are non-empty after normalization and their digit strings
  differ, even when both lengths appear valid.
- `MISSING`: either authoritative WhatsApp field is absent or normalizes to an
  empty string.

`onboardingData.phone` is emitted because the request requires it, but remains
non-authoritative: it never changes the classification and cannot resolve a
conflict. Raw stored values are emitted so an auditor can see formatting and
country-code drift; the command does not expose any other personal data.

## Exact EasyPanel command — read-only/stdout only

Run from `/app`. The shell enables fail-fast behavior, verifies the source is a
regular readable file, prints its SHA-256 for audit correlation and runs a
single Node process. It has no redirection, `mkdir`, write API, network call or
mutation command.

```sh
set -eu
LEADS=/data/generated-sites/.activation/leads.json
test -f "$LEADS"
test -r "$LEADS"
sha256sum "$LEADS"
node -e '
const fs = require("fs");
const source = process.argv[1];
const leads = JSON.parse(fs.readFileSync(source, "utf8"));
if (!Array.isArray(leads)) throw new Error("LEADS_SHAPE_INVALID");
const digits = (value) => typeof value === "string" ? value.replace(/\D/g, "") : "";
const records = leads
  .filter((lead) => typeof lead?.siteId === "string" && lead.siteId.trim() !== "")
  .map((lead) => {
    const leadDigits = digits(lead.whatsapp);
    const onboardingDigits = digits(lead.onboardingData?.whatsapp);
    const classification = !leadDigits || !onboardingDigits
      ? "MISSING"
      : leadDigits === onboardingDigits ? "COHERENT" : "CONFLICT";
    return {
      activationLeadId: lead.id ?? null,
      siteId: lead.siteId,
      leadWhatsapp: lead.whatsapp ?? null,
      onboardingWhatsapp: lead.onboardingData?.whatsapp ?? null,
      onboardingPhone: lead.onboardingData?.phone ?? null,
      classification
    };
  })
  .sort((a, b) => a.siteId.localeCompare(b.siteId) || String(a.activationLeadId).localeCompare(String(b.activationLeadId)));
const counts = { COHERENT: 0, CONFLICT: 0, MISSING: 0 };
for (const record of records) counts[record.classification] += 1;
process.stdout.write(JSON.stringify({ mode: "READ_ONLY", changed: false, total: records.length, counts, records }, null, 2) + "\n");
' "$LEADS"
```

Expected top-level safety markers are `mode:"READ_ONLY"` and
`changed:false`. The operator must paste the complete stdout plus the preceding
`sha256sum` into the orchestrator; do not redirect it to a file.

## Review evidence

The classification expression was exercised locally with representative
records covering formatting-equivalent Colombia values, a valid-length country
code conflict, a missing onboarding WhatsApp and a differing phone. The review
confirmed:

- formatting-equivalent `+57 318 843 0283` / `573188430283` => `COHERENT`;
- `+573188430283` / `+5673188430283` => `CONFLICT`;
- absent/empty authoritative field => `MISSING`;
- a different `onboardingData.phone` does not change classification;
- only the six allowlisted row fields are serialized.

Documentation `git diff --check` is clean. Tests/build are not applicable
because this ticket changes no executable repository code.

## Correction priority if findings appear

1. `CONFLICT`: highest priority because CDX-016 fail-closed guards will block
   onboarding/operator updates and Business projections. Create one separate
   ticket per partner with CEO-validated E.164 authority, backup, hashes,
   DRY_RUN and explicit APPLY gate.
2. `MISSING`: triage second. Establish the authoritative partner value from
   validated onboarding/CEO evidence; never copy `phone`, infer a country code
   or auto-fill silently. Correction still requires a separate guarded ticket.
3. `COHERENT`: no correction. Preserve the row as inventory evidence only.

Within the same class, process one partner at a time in deterministic `siteId`
order. Re-run the full read-only inventory after each separately authorized
correction before proceeding.

## Risks and pending authorization

- The output contains the minimum requested phone identifiers and must remain in
  the restricted orchestrator audit channel; do not publish it broadly.
- Duplicate linked records will appear as separate rows and require diagnosis;
  this command intentionally does not collapse or repair them.
- Inventory accuracy is a point-in-time property of the printed source hash.
- EasyPanel execution is still pending operator authorization/action. No JWT,
  API permission, secret or network access is required.
