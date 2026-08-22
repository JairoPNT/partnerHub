# CDX-20260821-016 — Partner WhatsApp conflict guard — DONE

## Result

The Jairo Business preview now normalizes both WhatsApp fields independently and
fails closed with `PARTNER_WHATSAPP_CONFLICT` when both are present but differ.
It does not emit a projected Business source in that state. `phone` remains a
separate display/call field and cannot resolve the conflict implicitly.

The same shared guard now rejects incoherent internal creation, public
onboarding updates and operator activation updates before persistence.
Focused tests use an actual temporary `leads.json` and prove byte-for-byte
non-mutation for all three rejected operations. Equivalent normalized values
are persisted successfully, and a different display phone remains allowed.

The public onboarding route now returns HTTP 409 with
`{"error":"PARTNER_WHATSAPP_CONFLICT"}`. It no longer misreports the conflict as
an expired link. The internal activation update route already returns 409 with
the service error code and required no semantic change.

## Diagnosis

The onboarding form preloads `onboardingData.whatsapp || lead.whatsapp` and
submits the trimmed field. The previous schema only trimmed and bounded length;
the service merged it literally. No code was found that adds `+56`, inserts a
digit, or transforms Colombia `+57` into `+567`. With the recorded
`onboardingUpdatedAt=2026-08-20T19:17:02.933Z`, the evidence is consistent with
manual capture/edit/paste accepted by weak validation. There is no evidence of
automatic or malicious injection.

CEO-authorized correction target: national `3188430283`, E.164
`+573188430283`, wa.me `573188430283`. The value `+5673188430283` is rejected.

## Guarded correction plan

A separate data-correction ticket must require an exact one-entry manifest,
pin the canonical `leads.json` hash and activation-lead snapshot hash, back up
the full file before mutation, preview the single field change, write
atomically only after explicit APPLY authorization, and post-verify the full
file plus the corrected record. No correction is implemented or executed here.

Proposed manifest contract for that separate ticket:

```json
{
  "confirmation": "DRY_RUN_JAIRO_WHATSAPP_CORRECTION",
  "allowlist": [{
    "activationLeadId": "f403f29e-95c8-4825-9320-967376443020",
    "siteId": "jairo-pinto",
    "expectedActivationLeadSnapshotHash": "21ac97693f7834fc411159713da353a12d28b56109f3b57d94ceb8b17824dfeb",
    "expectedLeadsFileHash": "<SHA256_CURRENT_LEADS_JSON>",
    "expectedCurrentLeadWhatsapp": "+573188430283",
    "expectedCurrentOnboardingWhatsapp": "+5673188430283",
    "expectedCurrentOnboardingPhone": "+573188430283",
    "targetOnboardingWhatsapp": "+573188430283",
    "targetWaMeDigits": "573188430283"
  }]
}
```

The production Jairo record was not read or changed by this ticket. Its supplied
canonical snapshot hash remains external evidence only.

## Verification

- Focused identity/persistence/API command: PASS 5/5.
- Focused Jairo Business: PASS 14/14.
- Business correlation: PASS 9/9.
- Ecosystem generation: PASS 14/14.
- ESLint `--no-ignore --max-warnings=0`: PASS.
- Next.js build: PASS, 36 routes (pre-existing workspace/NFT warning).
