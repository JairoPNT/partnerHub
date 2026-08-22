# CDX-20260821-017 — Jairo WhatsApp guarded correction — DONE

## Result

`origin/main` at ticket start was
`b484f93708a533b7680d6432ccb8652475963d32`; CDX-016 commit
`88f9b8982950a72cc2fee36acfcdb70307ab28d9` is an ancestor.

The maintenance command corrects only Jairo's `onboardingData.whatsapp` from
`+5673188430283` to `+573188430283`. DRY_RUN is audit-only (`changed:false`),
pins the complete `leads.json` and canonical snapshot hashes, backs up the full
store and emits an exact one-field diff plus planHash. It never mutates the
activation store.

APPLY exists as a separate, explicitly confirmed mode but was not executed. It
requires the reviewed audit package, planHash, original/projected hashes and
exact allowlist. It acquires an atomic exclusive claim, repeats preflight under
the claim, atomically replaces `leads.json`, post-verifies, journals, and returns
`ALREADY_APPLIED/changed:false` on a valid rerun. Rollback checks claim ownership;
claim/journal/hash drift blocks fail-closed.

## Files

- `app/web/scripts/jairo-whatsapp-guarded-correction.mjs`
- `app/web/scripts/jairo-whatsapp-guarded-correction.test.mjs`
- `app/web/package.json`
- `Dockerfile` (copies only this maintenance script into runtime)
- request and this report

## Verification

- Focused correction tests: PASS 5/5.
- CDX-016 WhatsApp regression: PASS 5/5.
- ESLint focalized `--no-ignore --max-warnings=0`: PASS.
- Next.js build: PASS (existing workspace/NFT warnings only).
- `git diff --check`: PASS.

## Exact EasyPanel commands (pending; not executed)

Run from `/app` only after deploy and audit approval. The first block creates
the canonical snapshot and DRY_RUN manifest atomically, checks the CEO-provided
snapshot hash, then runs DRY_RUN. Its only writes are `.migration-inputs` and
the new `.migration-audits` backup/package; it does not change `leads.json`.

```sh
set -eu
INPUT_DIR=/data/generated-sites/.migration-inputs/CDX-20260821-017
AUDIT_PACKAGE=/data/generated-sites/.migration-audits/CDX-20260821-017-jairo-whatsapp-correction
LEADS=/data/generated-sites/.activation/leads.json
SNAPSHOT="$INPUT_DIR/activation-lead.json"
DRY_MANIFEST="$INPUT_DIR/dry-run-manifest.json"
mkdir -p "$INPUT_DIR"
test ! -e "$AUDIT_PACKAGE"
LEADS_HASH="$(sha256sum "$LEADS" | awk '{print $1}')"
node -e 'const fs=require("fs");const p=process.argv[1];const id="f403f29e-95c8-4825-9320-967376443020";const x=JSON.parse(fs.readFileSync(p,"utf8")).filter(v=>v.id===id);if(x.length!==1)throw new Error("JAIRO_CARDINALITY_INVALID");process.stdout.write(JSON.stringify(x[0],null,2)+"\n")' "$LEADS" > "$SNAPSHOT.tmp"
test "$(sha256sum "$SNAPSHOT.tmp" | awk '{print $1}')" = "21ac97693f7834fc411159713da353a12d28b56109f3b57d94ceb8b17824dfeb"
mv "$SNAPSHOT.tmp" "$SNAPSHOT"
node -e 'const fs=require("fs");const out=process.argv[1],h=process.argv[2],audit=process.argv[3];const m={confirmation:"DRY_RUN_JAIRO_WHATSAPP_CORRECTION",allowlist:[{activationLeadId:"f403f29e-95c8-4825-9320-967376443020",siteId:"jairo-pinto",expectedActivationLeadSnapshotHash:"21ac97693f7834fc411159713da353a12d28b56109f3b57d94ceb8b17824dfeb",expectedLeadsFileHash:h,expectedCurrentLeadWhatsapp:"+573188430283",expectedCurrentOnboardingWhatsapp:"+5673188430283",expectedCurrentOnboardingPhone:"+573188430283",targetOnboardingWhatsapp:"+573188430283",targetWaMeDigits:"573188430283",auditPackage:audit}]};fs.writeFileSync(out+".tmp",JSON.stringify(m,null,2)+"\n",{flag:"wx"});fs.renameSync(out+".tmp",out)' "$DRY_MANIFEST" "$LEADS_HASH" "$AUDIT_PACKAGE"
JAIRO_WHATSAPP_CORRECTION_MODE=DRY_RUN JAIRO_WHATSAPP_CORRECTION_MANIFEST="$DRY_MANIFEST" JAIRO_WHATSAPP_LEADS_PATH="$LEADS" JAIRO_WHATSAPP_SNAPSHOT_PATH="$SNAPSHOT" npm run maintenance:jairo-whatsapp-guarded-correction
sha256sum "$LEADS" "$SNAPSHOT" "$AUDIT_PACKAGE/backup/leads.json" "$AUDIT_PACKAGE/dry-run.json"
```

After the DRY_RUN output is reviewed and an explicit APPLY authorization is
issued, create the APPLY manifest from the reviewed audit values:

```sh
set -eu
INPUT_DIR=/data/generated-sites/.migration-inputs/CDX-20260821-017
AUDIT_PACKAGE=/data/generated-sites/.migration-audits/CDX-20260821-017-jairo-whatsapp-correction
LEADS=/data/generated-sites/.activation/leads.json
SNAPSHOT="$INPUT_DIR/activation-lead.json"
DRY_MANIFEST="$INPUT_DIR/dry-run-manifest.json"
APPLY_MANIFEST="$INPUT_DIR/apply-manifest.json"
PLAN_HASH="$(node -e 'const x=require(process.argv[1]);process.stdout.write(x.planHash)' "$AUDIT_PACKAGE/dry-run.json")"
PROJECTED_HASH="$(node -e 'const x=require(process.argv[1]);process.stdout.write(x.hashes.projected)' "$AUDIT_PACKAGE/dry-run.json")"
LEADS_HASH="$(node -e 'const x=require(process.argv[1]);process.stdout.write(x.hashes.leads)' "$AUDIT_PACKAGE/dry-run.json")"
node -e 'const fs=require("fs");const out=process.argv[1],plan=process.argv[2],oldHash=process.argv[3],newHash=process.argv[4],audit=process.argv[5];const m={confirmation:"APPLY_JAIRO_WHATSAPP_CORRECTION",expectedPlanHash:plan,allowlist:[{activationLeadId:"f403f29e-95c8-4825-9320-967376443020",siteId:"jairo-pinto",expectedActivationLeadSnapshotHash:"21ac97693f7834fc411159713da353a12d28b56109f3b57d94ceb8b17824dfeb",expectedLeadsFileHash:oldHash,expectedProjectedLeadsFileHash:newHash,expectedCurrentLeadWhatsapp:"+573188430283",expectedCurrentOnboardingWhatsapp:"+5673188430283",expectedCurrentOnboardingPhone:"+573188430283",targetOnboardingWhatsapp:"+573188430283",targetWaMeDigits:"573188430283",auditPackage:audit}]};fs.writeFileSync(out+".tmp",JSON.stringify(m,null,2)+"\n",{flag:"wx"});fs.renameSync(out+".tmp",out)' "$APPLY_MANIFEST" "$PLAN_HASH" "$LEADS_HASH" "$PROJECTED_HASH" "$AUDIT_PACKAGE"
sha256sum "$LEADS" "$SNAPSHOT" "$DRY_MANIFEST" "$APPLY_MANIFEST" "$AUDIT_PACKAGE/backup/leads.json" "$AUDIT_PACKAGE/dry-run.json"
```

APPLY command — **pending explicit orchestrator authorization; do not run now**:

```sh
JAIRO_WHATSAPP_CORRECTION_MODE=APPLY JAIRO_WHATSAPP_CORRECTION_MANIFEST=/data/generated-sites/.migration-inputs/CDX-20260821-017/apply-manifest.json JAIRO_WHATSAPP_LEADS_PATH=/data/generated-sites/.activation/leads.json JAIRO_WHATSAPP_SNAPSHOT_PATH=/data/generated-sites/.migration-inputs/CDX-20260821-017/activation-lead.json npm run maintenance:jairo-whatsapp-guarded-correction
```

## Risks and authorization

- The supplied snapshot hash must match the canonical extracted record exactly;
  otherwise DRY_RUN stops before creating its audit package.
- Any `leads.json`, record, phone, siteId, snapshot, plan, journal or claim drift
  blocks. Stale/incomplete claims require separate forensic review.
- APPLY is destructive production authorization and remains prohibited until the
  orchestrator reviews the DRY_RUN package and explicitly authorizes that exact
  planHash. PR/deploy are also pending audit.
- No EasyPanel command or production write was executed in this ticket.
