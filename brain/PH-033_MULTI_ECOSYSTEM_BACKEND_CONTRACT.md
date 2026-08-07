# PH-033 - Contrato Backend para Tres Ecosistemas

## Objetivo

Preparar el backend file-backed actual para operar tres ecosistemas sin romper las páginas de Producto ya publicadas:

- `PRODUCT`: página comercial de producto.
- `BUSINESS`: página de negocio con VSL.
- `PERSONAL_BRAND`: página de marca personal.

Este ticket es el contrato previo a la implementación. No autoriza todavía cambios de UI ni migraciones Prisma.

## Decisiones

### Identificador de ecosistema

El valor canónico será `ecosystemType` con uno de estos valores:

```ts
type EcosystemType = "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";
```

Compatibilidad: si una fuente JSON existente no tiene `ecosystemType`, se interpreta como `PRODUCT`. Las respuestas nuevas deben incluir siempre el valor normalizado.

### Fuente de configuración

Cada fuente guardada debe incluir:

```json
{
  "ecosystemType": "PRODUCT",
  "site": { "id": "dorian-higuita", "domain": "dorianhiguita.pro" }
}
```

Los datos personales, enlaces, integraciones y tema continúan perteneciendo al sitio cliente. La replicación solo reemplaza la estructura y contenido común del ecosistema seleccionado; no debe sobrescribir `site`, `distributor`, `hero`, `purchaseUrl`, `analytics` ni `theme` del cliente salvo que una regla futura lo autorice expresamente.

### Sitios maestros

Se reserva un registro maestro por ecosistema. No se deben inventar dominios de producción para los dos maestros todavía no publicados:

```ts
const MASTER_SITE_IDS = {
  PRODUCT: "ganomaster",
  BUSINESS: "ganomaster-business",
  PERSONAL_BRAND: "ganomaster-personal-brand"
} as const;
```

`ganomaster.pro` es exclusivamente el maestro `PRODUCT`. Los otros dos registros pueden existir como fuentes/previews internas hasta que Jairo asigne dominio y destino de publicación.

La lista de clientes para replicación debe excluir todos los `MASTER_SITE_IDS`, no solo `ganomaster`.

## Contrato de endpoints

### Generación

`POST /api/internal/product-pages/generate`

- Acepta `ecosystemType` opcional por compatibilidad.
- Si falta, usa `PRODUCT`.
- Guarda el valor normalizado en la fuente JSON.
- Valida que el payload sea compatible con el ecosistema seleccionado.

### Consulta de fuente

`GET /api/internal/product-pages/:siteId`

- Devuelve `ecosystemType` siempre.
- Para fuentes antiguas devuelve `PRODUCT` aunque el JSON no lo tenga.

### Replicación

`POST /api/internal/product-pages/replicate`

Contrato objetivo:

```json
{
  "ecosystemType": "PRODUCT",
  "siteIds": ["dorian-higuita", "jairo-pinto"],
  "confirmation": "REPLICATE_TEMPLATE"
}
```

Reglas:

1. `ecosystemType` es obligatorio en el contrato nuevo, pero si se omite por un cliente antiguo se usa `PRODUCT`.
2. La fuente maestra se selecciona por `ecosystemType`.
3. Solo se consideran receptores del mismo ecosistema.
4. Ningún ID maestro puede ser receptor.
5. Un receptor sin fuente compatible se reporta como fallo individual, sin detener los demás.
6. La respuesta incluye `ecosystemType`, maestro utilizado y resultados por sitio.
7. La operación debe ser auditable e idempotente por sitio: repetirla no crea registros duplicados ni cambia el `siteId`.

### Vista previa maestra

El servicio de publicación de maestro debe aceptar `ecosystemType` y resolver el maestro correspondiente. `ganomaster.pro` sigue siendo el único destino público activo en el MVP.

## Referidos y códigos

### Inmutabilidad

Después de la asignación inicial, `referrerCode` y `referrerName` no pueden modificarse mediante PATCH administrativo ni onboarding. La modificación futura requiere un flujo explícito de corrección auditada, fuera de este MVP.

El código propio del empresario debe ser un campo persistido y estable, separado del código del referente:

```json
{
  "referralCode": "7417984",
  "referrerCode": "123456",
  "referrerName": "Nombre del referente",
  "referralLocked": true
}
```

### Referente desconocido

Si el código recibido no existe:

- se conserva el código reportado;
- se conserva el nombre suministrado por el nuevo empresario;
- se crea una relación provisional o se marca como `PENDING_REFERRER`;
- el nuevo empresario puede continuar el onboarding;
- no se calcula beneficio hasta que exista un empresario referente válido y el referido cumpla las condiciones comerciales.

### Referido efectivo

Un referido cuenta para el beneficio únicamente cuando:

1. el referente está identificado por código;
2. el referido tiene `siteId` vinculado;
3. el estado comercial del referido es `PAID`;
4. la relación no está cancelada ni archivada.

La regla sigue siendo un mes de gestión por cada dos referidos efectivos. El contador es acumulado y no tiene tope técnico de 12 meses.

## Compatibilidad y migración de datos

- No se borran fuentes existentes.
- Los JSON antiguos se leen como `PRODUCT`.
- No se modifica `ganomaster.pro` ni se replica hasta que el maestro del ecosistema seleccionado tenga una fuente válida.
- Los datos de prueba de referidos deben eliminarse o archivarse mediante la operación administrativa existente, no con una limpieza silenciosa al leer.
- No se cambia Prisma en este ticket.

## Criterios de aceptación backend

- [ ] Existe un parser único para `EcosystemType`.
- [ ] Generación, consulta y replicación normalizan ecosistema.
- [ ] La replicación excluye los tres maestros.
- [ ] Producto antiguo sigue funcionando sin editar sus JSON.
- [ ] `referrerCode`/`referrerName` quedan bloqueados después de asignarse.
- [ ] Cada empresario puede tener un `referralCode` estable.
- [ ] Un referente desconocido queda pendiente sin bloquear el onboarding.
- [ ] Solo un referido efectivo incrementa el cálculo de beneficios.
- [ ] Hay pruebas unitarias de compatibilidad, filtrado de maestros, inmutabilidad y calificación.

## Orden de implementación

1. Backend Lead: contrato, normalización y tests.
2. Antigravity: master-site con tres pestañas y partners con ecosistema/replicación.
3. Antigravity: plantillas Business y Personal Brand con bloques controlados.
4. QA: prueba 0-to-100 para Producto y pruebas aisladas para VSL/Marca personal.

## Riesgos abiertos

- Aún no existen destinos públicos Hostinger para Business y Personal Brand.
- La plantilla VSL y la plantilla de Marca personal deben entregar contratos de campos antes de publicar.
- No se debe activar la replicación masiva de un ecosistema sin una verificación pública exitosa de su maestro.

## Estado de implementacion

Backend implementado y compilado en la rama de trabajo actual. El contrato acepta `ecosystemType` en generacion, preview master y replicacion; la replicacion preserva configuracion personal del cliente y reemplaza la estructura desde el master del mismo ecosistema.

La UI queda a cargo de los requests paralelos `AGR-20260806-001`, `AGR-20260806-002` y `AGR-20260806-003`. No se deben abrir solicitudes duplicadas para esos alcances.