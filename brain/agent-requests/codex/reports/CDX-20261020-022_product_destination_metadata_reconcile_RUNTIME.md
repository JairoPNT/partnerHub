# CDX-20261020-022 — Cierre operativo de destinos Producto
Fecha: 2026-10-20, America/Bogota. Responsable: Codex backend. Alcance autorizado: conciliar metadatos de seis destinos Producto ya migrados, sin generación/publicación ni cambios comerciales.

## Resultado real
Se aplicaron seis planes individuales revisados, secuencialmente. Lectura posterior del contenedor Linux a las 2026-10-20T23:20:27.170Z confirmó para los seis: recibo COMPLETE, hashes de fuente/destino coincidentes con el plan, identidad preservada, únicamente site.domain cambiado semánticamente frente al respaldo y claim liberado. Nuevos targets PRODUCT v2 con publicación PENDING; no se fabricó verificación de publicación.

| Sitio | Host Producto | Root ecosystem | Plan aplicado |
|---|---|---|---|
| blanca-ruiz | producto.blancastella.pro | PRODUCT | 0d7c8aaf6e09c4c5fb69b367ddb5fdf49416aefa3a8c36eba8ab003302fe789d |
| claudia-calero | producto.claudiacalero.pro | BUSINESS | 454bed45b5f57a4a0d2560cb8a561fda6809f3d82aa86557947ac8ef3849698f |
| dorian-higuita | producto.dorianhiguita.pro | PRODUCT | db2bcbe0beeb8e0344d645ada8025aa2ea2eef02adbeae179d958ac713e18bbe |
| jairo-pinto-product | producto.jairopinto.pro | PRODUCT | 0347b68a47cce19e282036421cbeb8909a83a5cd6b51490fed46899814f99951 |
| lida-castaneda | producto.lidacastaneda.pro | PRODUCT | e68321690466018f19b6341e6452885278d4a3778c3b6fa4abd196469854ff04 |
| yenny-garcia | producto.yennygarcia.pro | PRODUCT | 822f66bbf0f306499afa4783a726b0a3887807b68eca35e595ba7e1bed3215de |

Los destinos corresponden a /home/u708491435/domains/<base>/public_html/producto, confirmados con lectura MCP de Hostinger. No se cambiaron IDs legacy, onboarding/base domain, contenido/contactos/tracking, pagos, cortesías, historial, jobs ni paquetes públicos. Cada APPLY verificó su fingerprint protegido antes/después bajo exclusión; no se hicieron llamadas de proveedor/SFTP ni publicaciones.

## Integración y verificación
- PR219: prevención de reversión a apex y aislamiento de destino. Merge a049da04680529a392a7fab836aea123237bec22.
- PR220: exclusión de escritores Producto, root binding y publisher completo. Merge21aba6e13e44bcfb66ed202d73272135454a57dd.
- PR221: CLI auditado/paquetizado de conciliación. Merge c9e8e416c661aa8a27198ffdf69d6dc6ae4da979.
- Los tres despliegues se observaron exitosos en EasyPanel Actions. El contenedor inspeccionado ejecuta Node v20.20.2/Linux, contiene CLI y asset product-mutation-v1.
- Prueba temporal propia en el volumen: fsync de archivo/directorios soportado, permisos privados, segundo proceso bloqueado por PRODUCT_MUTATION_BUSY, liberación y limpieza de la prueba. No se simuló corte eléctrico ni se afirma prueba física de recuperación ante pérdida de energía.
- Revisión independiente premium por ticket; se corrigieron todos sus hallazgos bloqueantes. Controlador:021 61/61,023 114/114;022 integrado77/77 y58/58 con Node20 real, lint/forced lint/build exitosos. No es suite global verde: permanecen nueve fallos Business históricos, reproducidos en baseline y enumerados en los DONE.
- Rebase022 sobre2616ac9: GitHub compare confirmó contenido idéntico al merge21aba6e (files[]); diff propio idéntico al source freeze aprobado62d42b0. El PR221 real tuvo solo los ocho archivos previstos.

## Evidencia y límites
Lectura pública posterior a las 2026-10-20T23:21:26.704Z: los seis hosts Producto HTTPS200; los seis apex HTTPS301 conservan la regla vigente. Claudia redirige a negocio.claudiacalero.pro, los otros cinco a Producto; Negocio de Claudia responde200. Estas redirecciones de proveedor siguen siendo estáticas, no un nuevo resolvedor automático de Marca. No se afirma migración de rutas profundas.

Respaldos/intent/checkpoints/recibos privados permanecen en /data/generated-sites/.product-destination-reconcile/<siteId>. Inputs privados de esta ejecución: /data/generated-sites/.product-reconcile-input-nDCJLd. No copiar fuentes crudas, datos de contacto, UUID de propietarios ni credenciales al repositorio. Evidencia pública/proveedor guardada localmente como archivo privado no versionado; SHA256 002dab206867538d156271a9ae830df209841e7547ba04e27b6e278d6e3c873d.

Se comprobó PREVIEW posterior de Yenny como ALREADY_APPLIED sin nuevas escrituras. Replay de un plan histórico exige sus pins y fingerprint protegido exactos: posteriores cambios legítimos de otros sitios pueden bloquearlo; no forzar re-ejecuciones ni borrar auditorías/claims. La exclusión presupone namespace de archivos confiable y escritores cooperantes; no garantiza protección ante sustitución hostil concurrente por un actor con el mismo UID/privilegios del host.

Dos comandos auxiliares de consola tuvieron errores de sintaxis antes de ejecutarse; se corrigieron sin mutar metadatos de partners. La primera consulta DNS UDP local falló; lookup del sistema, HTTPS y una comprobación DoH sí resolvieron. No se desactivó validación TLS.

## Pendiente separado
Publicación/validación del nuevo intent de Producto sigue PENDING; esta operación no la ejecutó. No se autorizó ni creó Marca nueva. La interfaz de Master Sites y los ajustes publicitarios/visuales de la plantilla corresponden a su propietario frontend (PH - Plantilla); este cierre no certifica VSL, tracking o cumplimiento de campañas.
