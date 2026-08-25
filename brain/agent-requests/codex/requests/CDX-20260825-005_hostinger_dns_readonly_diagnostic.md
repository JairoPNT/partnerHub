# CDX-20260825-005 — Hostinger DNS read-only diagnostic

- Owner: Codex.
- Scope: identify the provider-side failure category after the retained Jairo Business provisioning resume failed at Hostinger DNS.
- Allowed files/modules: one GET-only maintenance script and test, package/Docker transport, request/report.
- Excluded: DNS writes, provisioning resume, target/claim/journal mutation, cleanup, publication, SFTP, UI and other partners.
- Dependencies: CDX-20260825-004 retained recovery state and the post-failure target hash `62ccc385...d7cc15`.
- Parallel-safe with: frontend tickets that do not edit Docker or `app/web/package.json`.
- Integration: deploy, execute the single diagnostic command, then choose a separate recovery ticket from the redacted category.

The command must call only `GET /api/dns/v1/zones/jairopinto.pro`, never print the provider response body or token, and emit only HTTP/category and the minimum expected A-record summary on a valid 200 response.
