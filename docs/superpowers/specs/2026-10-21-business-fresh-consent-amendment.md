# Business piloto — consentimiento por carga

Ticket coordinador CDX-20261021-004; follow-up runtime AGR-20261021-007.
Jairo aprobó explícitamente el 2026-10-21: «Sí, consentimiento por carga para el piloto (recomendado)».

Esta enmienda sustituye exclusivamente el recuerdo de aceptación de 180 días del contrato PR228/plan PR229. Las demás restricciones de origen, identidad, proveedores, payload, contacto y publicación siguen vigentes. No acredita cumplimiento jurídico ni recepción externa.

## Contrato vinculante

- Cada documento nuevo comienza con Analítica y Publicidad denegadas. Nunca restaurar aceptaciones de localStorage, sessionStorage, cookies u otra memoria persistente. La elección solo vive en memoria del documento actual; no leer ni escribir preferencias persistentes. No introducir identificadores, cookies, backend o CMP.
- API y evento conservados: `PartnerHubBusinessConsent.getState/setConsent/withdraw`; elección estricta de dos booleanos propios, copias inmutables y evento `partnerhub:business-consent-change`. `policyVersion:'2026-10-21'`, `expiresAt:null`; `persistence:'none'` al inicio/deshabilitado y `'session'` tras elección explícita significa únicamente memoria del documento, NO sessionStorage. Nunca devolver `'local'`. La forma pública se conserva por compatibilidad; desaparecen TTL y timers de expiración.
- Recargar, navegar a un documento nuevo o recuperar el documento desde BFCache exige una elección nueva. `pageshow.persisted` invalida la elección; un pageshow inicial normal no la borra.
- Retirar/reducir categorías invalida callbacks/colas/emisores propios antes de revocar SDKs. Si algún SDK comenzó a cargar, solicitar una sola recarga limpia automática; antes de recargar, estado denegado y notificación. `reloadRequired` sigue reflejando esta condición. Sin SDK iniciado no recargar. Callbacks tardíos no pueden emitir. No borrar cookies ajenas ni prometer cancelar solicitudes ya enviadas.
- Conservar una señal negativa entre pestañas mediante BroadcastChannel del mismo origen, nombre `ph:business-consent:v1:<siteId>`, mensaje estricto `{version:1,action:'withdraw'}`. No transportar permisos positivos, IDs personales ni preferencias; no rebotar mensajes recibidos. Retirada/reducción local explícita transmite denegación; otra pestaña receptora deniega ambas categorías y revoca/recarga si procede. Es aviso best-effort, no persistencia ni garantía sobre pestañas suspendidas/inaccesibles. Canal ausente/fallido no habilita medición ni impide retirar localmente.
- Las comprobaciones existentes de configuración/origen, readiness, contexto sensible, singleton, clic confiable, destino WhatsApp, deduplicación y payload mínimo permanecen. Ninguna elección habilita un proveedor sin gate técnico aprobado. Flags del futuro release permanecen false; no se afirma estado de tags públicos heredados.
- UI debe informar que la elección dura esta carga y se pide de nuevo al recargar; nunca prometer recuerdo por 180 días. El hold por decisión humana queda resuelto, pero la UI espera revisión del runtime corregido y de las dependencias de contenido.

## Verificación y límites

Pruebas sobre el runtime real con fronteras de navegador/red falsas: aceptaciones viejas legibles con set/remove fallidos, todos los stores fallidos y recuperados, nuevo documento, retirada durante carga, BFCache, canal entre pestañas y fallo/ausencia/mensajes inválidos, no regrant, categorías y eventos existentes. Sin conexiones a SDK reales, cuentas, fuentes, master, DNS/SFTP ni publicación. Revisión independiente por tarea y seguridad final; integración y publicación conservan sus gates separados.
