# Scripts

This folder will host maintenance tasks such as seed data, sync jobs and release helpers.

Initial placeholder scripts are intentionally lightweight so the scaffold stays stable.

## Wompi Sandbox reconciliation

The controlled command defaults to `DRY_RUN` and requires one authorized reference:

```powershell
npm.cmd run maintenance:wompi-reconcile -- --reference PH-640eb48c-a676-48ca-baec-455b2170397e
```

or:

```powershell
npm.cmd run maintenance:wompi-reconcile -- --reference PH-881d27b5-c757-491d-b46e-fa4ff7c80b4f
```

Run it only on the server with the Wompi Sandbox environment and server-only credentials configured. The output is sanitized JSON and does not include credentials, signatures, or full provider payloads. Without `--apply`, the command does not write intents, leads, payments, or ledger records.

`--apply` is intentionally undocumented as an operational command here. It must not be used until the branch has been audited and an authorized reconciliation window has been approved.

