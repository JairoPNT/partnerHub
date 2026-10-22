# CDX-20261022-004 — runtime image dependency security

Estado: IMPLEMENTACIÓN/VERIFICACIÓN EN CURSO, no autorización de despliegue ni publicación. Jairo aprobó el alcance004 explícitamente el22oct, manteniendo DNS y campañas excluidos.

Rama `codex/CDX-20261022-004-runtime-image-security`; freshmain7159948 con dependencia0027eb2cae incorporada localmente. Fuente candidata `0c68db315d90a088a743033ea508b1e278f10dd7`, cinco archivos: package.json/lock, next.config, next-env generado y prueba de resolución/native. PR242 no se desplegará antes de la corrección; la revisión combinada004 debe sustituir su preparación sin promoción intermedia vulnerable.235 sigue separado para composiciónSUCCESSOR y ensayo pareado.

## Corrección y límites

Registro oficial confirmó Next16.4.1 y Sharp0.35.5/Node>=20.9.0, next-auth4.24.15 compatible. Lock elimina Sharpanidado0.34.5 y ambas fronteras resuelven0.35.5. Dependencias vinculadas Next/SWC/Sharp/native/PostCSS/nanoid cambian por sus requisitos; no upgrade masivo, Nodemailer7.0.13 permanece. Comparación Git del controlador contraBASE deja canonical/staging/server sin cambios; seis bytes/pins235 intactos. Ningún nuevo publicador/guard/autoridad, UI/auth/Prisma/pagos o credenciales.

Compatibilidad medida: Next16.4 cambió el default del comprobador CLI, que diagnosticó tests existentes durante el primerbuild. Se conserva explícitamente el comprobador API soportado de producción (`useTypeScriptCli:false`), no `ignoreBuildErrors`; una prueba temporal confirmó que sigue rechazando errores de producción. Next generó solo una importación requerida de tipos en next-env. No se barrieron tests/tsconfig ni se afirma typecheck global limpio.

## Evidencia disponible y pendiente

- RED realNode20: dos resoluciones antiguas fallaron el floor corregido; conversión benigna separada no es explotación. GREEN4/4 usa librerías reales/PNG→WebP, ambas resoluciones0.35.5; Windowsvips8.18.7/heif1.23.5/rsvg2.63.2. Los binariosLinux se comprobarán en su imagen, no se infieren de Windows.
- Node20.20.2 buildNext16.4.1 exit0/39rutas/tiposproducción, lint0. Packaging+CLI59PASS/2WindowsPOSIXskip. Grupo adicional de servicios/migración todavía ejecutándose al escribir este checkpoint: no sumarlo como aprobado.
- Fallos iniciales preservados: pruebaspackaging concurrentes con rebuild.next, timeout bajo carga y stagingCRLF rematerializado por autocrlf. Se serializó, se restauraron únicamente seis workingfiles limpios desde blobsrawGit exactos y no se rebajó ningúnassert/timeout/pin. Warnings deworkspace/tracing yloaders documentados, no eliminados artificialmente.
- Auditoría oficialnpm de nombres/versiones del nuevo lock no devuelve registrosNext/Sharp; los demás matches no se equiparan a vulnerabilidades explotables de runtime. AnálisisRO separado de correo delimita las condiciones de dos avisos de parser para entradas actuales y snapshot almacenado, sin actualización mayor ni waiver general.
- Revisión independiente de Task1 y construcción real desde archiveoficial/Node20/Linux/inventarioestricto/CLI sobre fixturegenuino están en curso. No imagen/digest004 o tarea remota corregida acreditados todavía.

El VPS sigue en241 y STATUSOPEN/migrationStartedfalse/changedfalse/sinwrites comprobado. NingúnBEGIN/APPLY/migraciónmaster/publicación de ajustesClaudia niDNS/campañas fue ejecutado por004. Después de cierre004: integración235, ambosartefactos/ensayo y gatesoperacionales, corte existente y publicación existente con comprobación pública.

Scratch/evidencia local se conserva en `.superpowers/sdd/2026-10-22-runtime-image-dependency-security/`; anterior002/011 también permanece. No se limpia el checkout raíz ni recursos ajenos.
