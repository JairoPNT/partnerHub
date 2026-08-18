# CDX-20260818-012 — Asignación de ecosistemas en pagos manuales

## Owner

Codex (Backend Lead).

## Objetivo único

Ampliar el contrato de registro manual de pagos para que un administrador pueda asignar explícitamente los ecosistemas que ese pago habilita, manteniendo la posibilidad de registrar un monto negociado independiente del catálogo.

## Comportamiento requerido

- Selección explícita no vacía y sin duplicados de `PRODUCT`, `BUSINESS` o `PERSONAL_BRAND`.
- `offerCode` opcional cuando aplique.
- Montos negociados preservados mediante `pricingMode: MANUAL_NEGOTIATED`.
- Snapshot comercial inmutable generado por el backend.
- La asignación alimenta el entitlement y marca regeneración pendiente, sin publicación automática.
- Los pagos históricos sin ecosistemas permanecen intactos y no reciben inferencias retroactivas.

## Invariantes

- Un pago confirmado no se edita destructivamente.
- El modo `CATALOG` debe coincidir con la oferta server-side.
- El modo negociado conserva el monto recibido y lo identifica explícitamente.
- No se activa, genera ni publica infraestructura o páginas.

## Fuera de alcance

- Frontend del formulario Payments.
- Wompi y checkout público.
- DNS, Hostinger, publicación o generación física.
- Modificación de pagos históricos.

## Dependencias

- CDX-20260818-008/009 para entitlement.
- CDX-20260818-010 para reglas comerciales.

## Aceptación

- Registro de uno o varios ecosistemas.
- Monto negociado distinto al catálogo.
- Rechazo de selección vacía o duplicada.
- Snapshot inmutable, no mutación histórica y regeneración pendiente.
- Pruebas, ESLint backend, build y `git diff --check` aprobados.
