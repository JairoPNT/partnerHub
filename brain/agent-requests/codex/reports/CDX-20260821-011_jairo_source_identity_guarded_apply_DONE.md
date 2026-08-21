# CDX-20260821-011 — Reporte DONE

## Resultado

Se preparó, sin ejecutarlo en producción, un comando con preview por defecto y APPLY de identidad de fuentes estrictamente protegido para Jairo.

## Gates obligatorios

- Allowlist exacta `jairo-pinto` → Product `jairo-pinto-product` y Brand `jairo-pinto`.
- Audit package exacto: `/data/generated-sites/.migration-audits/2026-08-21T13-25-47.086Z-jairo-source-identity-dry-run`.
- Hashes exactos:
  - fuente: `4ab1cd4d076b2fee860dae2f35566fdc89d4d95a8eb6ae7ed256758e0054e53e`
  - Product proyectado: `9e69a03c9a794b96222cacf8d0bfb5327564f21f0d3bb4d8ab656180e92d7d3c`
  - Brand proyectado: `bafe5f704f8c515b9f6ea20c5379b5c9780c7dbe0da7c0e3734c746d4de1c71c`
  - verificación: `6e694d66f58c20053eaf2bcdc121db41b7e9e3e0980206d7af0cbe2cf5f12e82`
  - historial: `77b1fdbca68992731f8d9b9e2e2b03027fb7da37782c7730967ac9201bdefbc0`
- `dry-run.json` del paquete debe declarar `DRY_RUN`, `changed:false`, `blocked:false`.
- Backup del paquete debe coincidir con el hash de la fuente.
- Destinos Product de fuente/verificación/historial deben estar ausentes.
- Identidades JSON de fuente y proyecciones deben coincidir.
- APPLY requiere el `planHash` exacto emitido por un preview inmediatamente anterior.
- Un `apply.json` existente bloquea repetición.

## Manifest exacto

```json
{
  "confirmation": "GUARDED_APPLY_JAIRO_SOURCE_IDENTITY",
  "allowlist": [{
    "sourceSiteId": "jairo-pinto",
    "productSiteId": "jairo-pinto-product",
    "brandSiteId": "jairo-pinto",
    "baseDomain": "jairopinto.pro",
    "auditPackage": "/data/generated-sites/.migration-audits/2026-08-21T13-25-47.086Z-jairo-source-identity-dry-run",
    "expectedSourceHash": "4ab1cd4d076b2fee860dae2f35566fdc89d4d95a8eb6ae7ed256758e0054e53e",
    "expectedProjectedProductHash": "9e69a03c9a794b96222cacf8d0bfb5327564f21f0d3bb4d8ab656180e92d7d3c",
    "expectedProjectedBrandHash": "bafe5f704f8c515b9f6ea20c5379b5c9780c7dbe0da7c0e3734c746d4de1c71c",
    "expectedVerificationHash": "6e694d66f58c20053eaf2bcdc121db41b7e9e3e0980206d7af0cbe2cf5f12e82",
    "expectedHistoryHash": "77b1fdbca68992731f8d9b9e2e2b03027fb7da37782c7730967ac9201bdefbc0"
  }]
}
```

## Comandos pendientes

Preview obligatorio desde `/app`:

```sh
npm run maintenance:jairo-source-identity-guarded-apply -- --manifest=/data/generated-sites/.migration-inputs/CDX-20260821-011/manifest.json
```

Debe devolver `mode:DRY_RUN`, `changed:false`, `blocked:false` y `planHash`. Revisar y copiar ese hash completo.

APPLY preparado, pero prohibido hasta autorización explícita posterior:

```sh
npm run maintenance:jairo-source-identity-guarded-apply -- --manifest=/data/generated-sites/.migration-inputs/CDX-20260821-011/manifest.json --mode=APPLY_JAIRO_SOURCE_IDENTITY --confirm=MIGRATE_JAIRO_SOURCE_IDENTITY --expected-plan-hash=<PLAN_HASH_REVISADO>
```

No usar `--apply`; está rechazado.

## Atomicidad, dependencias y rollback

La transacción prepara temporales y luego:

1. crea atómicamente `jairo-pinto-product.json` desde la proyección aprobada;
2. mueve verificación de `jairo-pinto` a `jairo-pinto-product`;
3. mueve historial de `jairo-pinto` a `jairo-pinto-product`;
4. mueve la fuente Product original a un rollback temporal;
5. instala Brand en `jairo-pinto.json`;
6. verifica hashes, identidades, dependientes y ausencia de los dependientes antiguos;
7. escribe `apply.json` en el paquete auditado y elimina el rollback temporal.

Ante cualquier error antes de concluir, revierte en orden inverso: retira journal/Brand/Product nuevos, restaura fuente original y devuelve verificación/historial a `jairo-pinto`. Las pruebas inyectan un fallo después de instalar Brand y comprueban restauración byte a byte.

Después de un APPLY exitoso, cualquier rollback operativo requiere un ticket separado y autorización: usaría el backup auditado, retiraría Brand/Product nuevos y devolvería verificación/historial a la identidad original. No se incluye un comando genérico destructivo.

## Post-verificación

- Product source coincide con hash proyectado y declara PRODUCT / `jairo-pinto-product`.
- Brand source coincide con hash proyectado y declara PERSONAL_BRAND / `jairo-pinto`.
- Verificación e historial Product conservan exactamente sus hashes.
- No quedan verificación/historial Product bajo `jairo-pinto`.
- Se registra `apply.json` con planHash, fecha y hashes.
- Apex, PublishingTargets y Business permanecen intactos.

## Verificación de código

- Tests: PASS 5/5 (preview, drift/colisión, gates, APPLY atómico, rollback).
- ESLint focalizado: PASS.
- Build: PASS.
- `git diff --check`: PASS.
- Warning NFT/Turbopack preexistente.

## Límites

No se ejecutó APPLY. No crea Business, PublishingTargets, DNS, Hostinger, publicación ni regeneración. No toca UI, pagos o ledger.

## Git

- Rama: `codex/CDX-20260821-011-jairo-source-identity-guarded-apply`.
- PR/deploy: no ejecutados.
