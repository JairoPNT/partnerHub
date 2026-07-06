# PH-003A - Meta Business Rules

## Account creation and restrictions

- PartnerHub must not create Facebook personal profiles.
- PartnerHub must not create personal Instagram accounts automatically.
- PartnerHub must not automate mass account creation.
- PartnerHub must not simulate human activity.
- PartnerHub must not evade Meta verifications, restrictions, reviews, limits, or policy checks.

## Permissions

- Automatic publishing requires valid permissions.
- If permissions are missing, expired, rejected, or unclear, automatic publishing must be blocked.
- Publishing without current authorization is not allowed.

## Instagram

- Instagram must be Business or Creator for advanced integrations.
- If Instagram is personal, PartnerHub must generate manual instructions to convert it.
- If Instagram needs to be connected to a Facebook Page, automatic publishing remains blocked until connection is validated.

## Ads and restrictions

- If there are Meta restrictions, ad actions must be blocked.
- If ad account is missing, restricted, or incomplete, paid campaign launch must be blocked.
- If payment method is missing, paid campaign launch must be blocked.
- New accounts may require waiting or review before advertising.
- New account risk must generate a `WAIT` alert.

## Alerts

- Missing setup that does not block landing may generate `INFO`.
- Setup issues that may affect social launch may generate `WARNING`.
- Missing permissions, restrictions, missing ad account, or missing payment method may generate `BLOCKER`.
- New account friction may generate `WAIT`.
- Sensitive claims may generate `COMPLIANCE`.

## Claims and compliance

- Medical claims must not be published without validation.
- Guaranteed income claims must not be published without validation.
- Guaranteed results claims must not be published without validation.
- Sensitive claims require manual review and `COMPLIANCE` alert.

## Relationship to landing

- Meta Setup does not block initial landing publication unless social launch or ads are contracted.
- Campaigns are an additional service.
- Social launch and ads readiness must be tracked separately from landing readiness.
