# AGR-20260806-001 - Shell administrativo multi-ecosistema

## Owner

Antigravity. Frontend, UX y React exclusivamente.

## Contexto

Implementar la primera capa visual para PRODUCT, BUSINESS y PERSONAL_BRAND sin inventar endpoints ni modificar backend, Prisma, auth, Docker o migraciones.
Consultar `brain/PH-032_MULTI_ECOSYSTEM_MVP.md`.

## Alcance

### `/master-site`

- Crear tres pestañas internas: `Producto`, `Negocio (VSL)` y `Marca personal`.
- Mostrar estado, dominio/master activo, ultima generacion/publicacion e historial por ecosistema.
- Mantener `ganomaster.pro` exclusivamente dentro de Producto.
- Para masters aun no disponibles, mostrar estado "En preparacion" y no simular datos reales.

### `/partners`

- Mostrar el tipo de ecosistema activo de cada empresario con badge claro.
- En `Plantilla Maestra y Replicacion`, crear subpestanas por ecosistema y una opcion `Todos`.
- Excluir siempre el master correspondiente de sus propios destinos.
- Mantener el Programa de Referidos fuera de la tabla de operacion; quitar los formularios principales de asignacion/registro de la vista visible y reemplazarlos por una accion compacta que abra modal desde el detalle del empresario.
- Quitar del historial los registros de prueba solo si el backend ya los devuelve como archivados/eliminados; no crear datos falsos en frontend.
- Mantener la regla visible: 1 mes por cada 2 referidos efectivos.
- Los campos de codigo propio y codigo del invitador deben mostrarse como bloqueados cuando ya esten asignados. La UI no debe ofrecer edicion silenciosa.

## Contratos esperados

Usar nombres tolerantes y estados vacios mientras backend no entregue los campos:

- `ecosystemType`: `PRODUCT | BUSINESS | PERSONAL_BRAND`.
- `availableEcosystems` o equivalente para destinos.
- `referralCode`, `referrerCode`, `referralLocked`.

Si un contrato no existe, dejar un adaptador visual claramente marcado y documentar el bloqueo en el reporte. No hardcodear empresarios ni dominios de prueba.

## UX

- Layout claro y consistente con la interfaz aceptada recientemente.
- Sin barras horizontales en desktop ni mobile.
- Estados vacios, loading, error y "en preparacion".
- Tooltips para iconos y accesibilidad de tabs.

## Verificacion obligatoria

- `npm run build` en `app/web`.
- Verificar `/master-site` y `/partners` en desktop y mobile.
- Crear reporte en `brain/agent-requests/antigravity/reports/AGR-20260806-001_ecosystem_admin_shell_DONE.md`.
- Usar rama `antigravity/AGR-20260806-001-ecosystem-admin-shell` y abrir PR hacia `main`.
