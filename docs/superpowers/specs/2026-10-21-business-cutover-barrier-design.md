# Cierre durable Business durante el corte de master y código

Ticket: CDX-20261021-010. Owner: Codex. Base: main/PR237 `0e652ec8e25e4bce09f472c87c59a60c6dad7c34`.
Estado: especificación y plan aprobados por Jairo el 2026-10-22; implementación revisada offline y gate Linux aislado PASS con revisión independiente22oct. Sin uso productivo. Plan técnico: `docs/superpowers/plans/2026-10-22-business-cutover-barrier.md`.

## Intención y límites

Entregar los ajustes ya aprobados a negocio.claudiacalero.pro sin permitir que la aplicación genere usando un par master/código incompatible. Conservar página actual mientras se prepara el corte. No tocar DNS, campañas, otros ecosistemas, credenciales ni plantilla. La autorización de ventana de mantenimiento ya existe.

Esto es un protocolo entre procesos y despliegues, no una bandera de interfaz. Un snapshot de jobs vacíos, un PID, una variable o un archivo con `ready:true` no prueban exclusión. El alcance garantizado son los escritores Business cooperantes del servidor y runtimes reconstruidos; no pagos, dominios ni cualquier proceso shell arbitrario.

## Alternativas y decisión propuesta

1. **Recomendada: barrera durable en el coordinador actual.** Cerrar nuevas operaciones, drenar claims activas y retener el cierre entre despliegues. Reutiliza generación/publicación y permite mantener la página pública atendiendo. Necesita desplegar primero el protocolo y confirmar retiro de procesos antiguos.
2. Parar todos los escritores y usar un runner administrativo aislado. También válido, pero hoy solo hay consola dentro del servicio, sin runner independiente demostrado; detenerla perdería el canal de operación.
3. Omitir el bloqueo o usar un flag de aprobación. Rechazada: no cierra carreras ni la ventana entre master y código.

## Estados y propiedad

Secuencia: ABIERTO → CERRANDO → DRENADO → VERIFICADO → ABIERTO. Cualquier estado ambiguo permanece cerrado. CERRANDO y DRENADO sobreviven al cierre de consola, reinicio y despliegue; no expiran por TTL. La página pública estática no se apaga.

La barrera ocupa el claim global existente `.master-package-claims/ganomaster-business` en el output canónico, mediante creación exclusiva; presencia, corrupción, tipo inesperado o symlink siempre bloquean escritores nuevos. No sustituir un claim ocupado. Mantener identidad física y contenido de directorio/owner/ancestros; no seguir enlaces ni borrar claims ajenos.

El controlador administrativo guarda un identificador de operación y una credencial de reanudación aleatoria en archivo privado dentro del volumen, nunca stdout/HTTP, repositorio ni reportes. El proceso que reanuda valida credencial y objetos reales; no acepta objetos JSON del caller como prueba. La credencial permite administrar el cierre, no generar, publicar ni declarar compatibilidad. Si se pierde o hay sustitución física, conservar evidencia y exigir recuperación separada; nunca robo por edad/PID.

Cada comando administrativo mutante adquiere además exclusión exclusiva del controlador de esa operación: compartir credencial no permite dos controladores activos. Sus transiciones durables, la validación final y la liberación ocurren bajo esa misma exclusión. Antes de la primera mutación de migración debe persistirse un marcador irreversible de migración iniciada, verificado por cancelación/reapertura; un estado VERIFICADO guardado nunca reemplaza revalidar hechos bajo exclusión. Una caída que deje esta exclusión administrativa huérfana no permite robo automático: STATUS explica bloqueo y la recuperación debe demostrar que el controlador anterior terminó antes de reanudar. La barrera global permanece cerrada mientras tanto.

## Handshake real

En `businessPublicationSiteCoordinator`, toda adquisición fresca comprueba ausencia segura del claim global ANTES y DESPUÉS de crear su claim de sitio. Solo entonces ejecuta la acción. Si aparece el cierre entre ambas comprobaciones, libera únicamente su claim demostrado y rechaza sin ejecutar. Los errores conservan el cierre global.

Las operaciones que ya ejecutaban mantienen su claim y referencias reentrantes hasta acabar; pueden drenar, sin conceder propiedad a trabajo nuevo iniciado desde un contexto expirado. La barrera crea primero su claim global, después inspecciona el namespace real `.business-publication-site-claims`; nunca deduce drenado desde la cola de jobs. Un namespace ausente solo es vacío si sus ancestros son seguros. Entradas desconocidas, corruptas o inseguras bloquean. Espera acotada: al vencer reporta bloqueado y retiene cierre, no elimina operaciones activas.

Cerrar además el bypass observado de `productPageVerificationService.verify` en el límite del servicio para Business, conservando reentrancia desde publish y comportamiento Product/Brand. No ampliar esta garantía a toda escritura de lead/pagos. No refactorizar replicación/hero/generador si ya delegan al mismo coordinador.

## Despliegue y continuidad

Primero desplegar únicamente el protocolo retrocompatible con el master actual. Antes de abrir una operación, verificar en EasyPanel número de réplicas/tareas y retirada de todas las tareas antiguas; un rolling deploy con una réplica configurada puede tener dos versiones vivas. Confirmar volumen/root común y reconstrucción de cada runtime cooperante. Excluir operadores y scripts de mantenimiento ajenos durante la ventana. Este inventario operativo no se reemplaza por autodeclaración de versión.

Antes de migrar, el artefacto sucesor debe estar integrado y revisado con el release235 MÁS CDX010; no desplegar la imagen histórica de235 sola. Debe conservar el handshake en todos sus runtimes cooperantes. Verificar esa composición de código/empaquetado y probar que el sucesor arrancado bajo un cierre ya existente rechaza escritores nuevos antes de cualquier mutación. Un verificador de fin no compensa un sucesor que haya ignorado el cierre al arrancar.

Después crear cierre y drenar. Mantenerlo durante la migración y despliegue del release235. La integración con CDX009 será dependiente: el migrador usará propiedad real de esta misma operación, no intentará adquirir un segundo claim ni recibirá un booleano para saltar la barrera. Solo el adaptador revisado podrá usar la capacidad interna de mantenimiento; HTTP/env no la pueden fabricar. CDX009 conserva su rechazo público hasta esa integración probada.

El verificador de reapertura importa un perfil de release fijo y revisado: no acepta hashes aprobatorios arbitrarios. Relee bytes y manifest del master, cadena/auditoría CDX009 y código/runtime instalado contra los pins revisados; comprueba namespace de sitios drenado y propiedad de operación. El operador debe además comprobar retiro de tareas antiguas antes de invocarlo. Si el verificador aún no existe, el cierre se puede probar, pero no se habilita un comando de reapertura productiva sin sus comprobaciones.

No permitir que un comando de fin libere automáticamente al salir del proceso o en `finally`. Una validación fallida conserva el cierre. La publicación posterior de Claudia utiliza el flujo existente y una vista previa fresca; no atribuir a la barrera la verificación pública de consentimiento o eventos.

## Errores y recuperación

API/UI existentes deben recibir un error Business de ocupado/mantenimiento compatible, sin nuevos permisos ni detalles de rutas/tokens. Trabajos que encuentren cierre antes de mutar no se marcan como publicados; conservar semántica existente y probar si requieren retry explícito. No cambiar silenciosamente políticas de reintento en este ticket.

Si cae el proceso, la aplicación sigue cerrada y STATUS es de solo lectura. Reanudar la misma operación bajo propiedad validada. Master ambiguo, auditoría parcial, cambio de inode/ancestro o tareas viejas impiden continuar y reabrir. Recuperación no elimina históricos ni downgrade público automático. Cancelar antes de migrar solo puede reabrir verificando el perfil anterior intacto, mismo cierre y drenado; tras comenzar migración, ya no se permite esa cancelación.

## Pruebas de aceptación antes de integrar

- TDD con barreras/eventos deterministas: escritor antes/durante/después de claim global, carrera de doble comprobación, dos procesos y dos sitios.
- Reentrancia, trabajo detached con referencia activa y contexto expirado; error de acción sin eliminación ajena.
- Verificación Business directa bloqueada; publish anidado drena; Product/Brand sin cambios.
- Reinicio entre cierre y despliegue conserva bloqueo; estado corrupto/symlink/hardlink/sustitución conserva evidencia; credencial inválida no administra operación.
- Dos controladores con credencial válida no pueden mutar simultáneamente; cancelación contra inicio de migración y validación contra liberación se serializan. Caída con exclusión administrativa huérfana bloquea sin robo automático.
- El sucesor integrado conserva el protocolo y sus bundles; arranca con cierre previo sin ejecutar escritores. La imagen histórica235 sin protocolo no puede ser seleccionada para el corte.
- Drenado observa claims reales aunque jobs estén vacíos; timeout no reabre.
- Reapertura rechaza perfil/master/código/auditoría incorrectos y operación ajena; ningún flag/hash arbitrario la habilita.
- Node20, build/runtime empaquetado y prueba Linux real del protocolo; revisión independiente de concurrencia/propiedad antes de uso.

Este documento no afirma que el protocolo esté implementado, PR235 desplegado, master migrado ni Claudia actualizada. La única entrega actual es el contrato propuesto. La integración ejecutable de migración y el corte productivo siguen tareas secuenciales, no trabajo oculto dentro de esta especificación.

## Revisión del diseño

Revisión independiente de concurrencia/seguridad completada el 2026-10-21 por subagente de revisión. Dos omisiones detectadas y corregidas en este documento: exclusión entre controladores administrativos, y obligación de que el sucesor conserve el protocolo. Revisión documental/focalizada; sin pruebas ejecutadas ni implementación autorizada por este dictamen.

Revisión de implementación2026-10-22: cuatro tareas y re-revisión final aprobadas offline tras82f960a. Precisión de límite de despliegue: persistir identidades del output/volumen y objetos propios; seguir inspeccionando toda la cadena de ancestros actuales y su estabilidad durante cada validación. No persistir la identidad del overlay raíz de un contenedor como requisito para reanudar en otro. Registro2 rechaza registros1 sin convertirlos; ninguna bandera permite saltar pruebas. La verificación HTTP devuelve409/BUSINESS_SITE_BUSY bajo cierre, sin cambios de auth. Gate Linux aislado aceptado22oct; release compuesto/integración/reapertura pendientes. Esta nota no certifica publicación. Ver informe LINUX_VALIDATION del ticket.
