# PH-021: Backlog operativo MVP y decisiones de escalamiento

## Contexto

PartnerHub ya puede registrar empresarios, generar paginas de producto, publicar en Hostinger, subir heroes a R2 y verificar parcialmente la publicacion. Sin embargo, antes de escalar ventas, el MVP necesita cerrar brechas operativas que hoy obligan a intervencion manual, crean confusion en el dashboard o bloquean una instalacion 0 a 100.

La siguiente prueba prioritaria sera `jairopinto.pro` como usuario real de inicio a fin.

## Objetivo MVP inmediato

Tener un flujo funcional para:

1. Registrar un empresario.
2. Completar datos minimos.
3. Subir heroes desde el dashboard sin URLs manuales.
4. Generar pagina.
5. Publicar en dominio propio.
6. Verificar que produccion refleja los datos esperados.
7. Notificar entrega por correo o WhatsApp.

No se construye aun dashboard para empresarios finales.

## Categoria A - Bloqueadores de instalacion 0 a 100

### A1. Onboarding publico debe subir imagenes desde archivo local

Problema:

El onboarding solicita URL para Hero Desktop y Hero Mobile. Esto no sirve para empresarios no tecnicos ni para operacion diaria.

Decision MVP:

El onboarding debe permitir seleccionar archivos desde el computador, igual que el dashboard interno. El sistema sube automaticamente a Cloudflare R2 y guarda la URL resultante.

Prioridad:

Alta.

Impacto:

Reduce friccion operativa y evita pedir URLs manuales.

### A2. Terminos "Desktop" y "Mobile" deben cambiarse

Problema:

La terminologia tecnica no es clara para todo publico.

Decision MVP:

Usar lenguaje orientado al usuario:

- `Imagen horizontal para computador`
- `Imagen vertical para celular`

En el dashboard interno se puede conservar una nota tecnica secundaria: `hero-desktop` / `hero-mobile`.

Prioridad:

Alta.

### A3. Guardado final del onboarding debe ir a pagina de agradecimiento

Problema:

El guardado parcial deja al usuario en la misma pagina y no comunica claramente los siguientes pasos.

Decision MVP:

Separar:

- `Guardar avance`: permanece en la pagina y muestra confirmacion.
- `Enviar informacion`: redirige a una pagina de agradecimiento.

La pagina de agradecimiento debe comunicar:

- Plazo estimado de 24 a 48 horas despues del pago confirmado.
- Si pago por transferencia, debe enviar comprobante por WhatsApp.
- Debe preparar o enviar fotos de medio cuerpo para generar heroes.
- El equipo revisara la informacion y continuara la instalacion.
- El enlace de onboarding se puede retomar si falta informacion.

Prioridad:

Alta.

## Categoria B - Operacion administrativa

### B1. Boton "Landing Builder" desde el detalle del empresario

Problema:

El operador debe saltar manualmente desde `/partners` a `/landing-builder` y buscar el empresario otra vez.

Decision MVP:

En el detalle del empresario debe existir un boton:

`Generar / editar landing`

Debe abrir `/landing-builder` con el empresario preseleccionado, usando `leadId` o `siteId`.

Prioridad:

Alta.

### B2. Los datos del empresario deben ser editables

Problema:

Telefonos, correo, WhatsApp, URL de compra, logo, heroes, analytics y SEO pueden cambiar.

Decision MVP:

Todo dato operativo editable debe poder modificarse desde `/partners`, excepto identificadores bloqueados:

- `leadId`
- `siteId` despues de publicado, salvo accion administrativa especial.
- historial de pagos, salvo correccion manual registrada.

Prioridad:

Alta.

### B3. Significado de estado `CONVERTED`

Decision operativa:

`CONVERTED` no significa "cliente interesado". Significa:

El empresario ya paso de lead operativo a sitio entregado/activo dentro de PartnerHub.

Uso sugerido de estados:

- `NEW`: registro recibido, sin gestion.
- `CONTACTED`: ya fue contactado o esta en recopilacion de datos.
- `PAID`: pago confirmado, pendiente de construccion/publicacion.
- `CONVERTED`: pagina publicada, verificada y entregada.
- `CANCELLED`: proceso cancelado, prueba eliminable o no activo.

Si PH-020 verifica la publicacion correctamente, el paso natural es:

`PAID` -> `CONVERTED`

solo despues de `VERIFIED`.

Prioridad:

Alta para claridad operativa.

## Categoria C - Publicacion y verificacion

### C1. Fuente incorrecta de URL esperada

Problema detectado:

La verificacion esperaba:

`https://colombia.ganoexcel.com/DorianWellness`

pero la URL real configurada era:

`https://col.ganoexcel.com/dorianwellness`

Decision MVP:

La URL esperada nunca debe construirse ni inferirse. Debe leerse exclusivamente desde:

`distributor.purchaseUrl`

o desde el campo operativo:

`URL de Compra / Pasarela`

El verificador solo compara contra el valor guardado por el operador.

Prioridad:

Critica.

Relacion:

PH-020.
PH-024.

Avance 2026-07-30:

- Se elimino el fallback `https://colombia.ganoexcel.com/GanoMaster` de la plantilla base.
- La verificacion manual de PH-020 ahora sincroniza primero los datos actuales del empresario vinculado antes de calcular el valor esperado.
- La publicacion ya regenera el paquete antes de enviarlo por SFTP; el siguiente control operativo es probar nuevamente con `dorian-higuita` y luego con `jairopinto.pro` de 0 a 100.

### C2. Validacion despues de publicar

Decision MVP:

La pagina no se considera entregable si:

- `purchaseUrl` no coincide.
- `config.js` no coincide.
- aparece `href="#comprar"`.
- el dominio no responde.
- el sitio publicado conserva datos antiguos.

Prioridad:

Critica.

## Categoria D - Analytics y metricas

### D1. Checklist para crear GA4

Problema:

Por ahora las propiedades de Google Analytics las crea Jairo manualmente, pero el proceso debe ser uniforme.

Decision MVP:

Crear en dashboard una seccion `Analitica y metricas` con checklist operativo:

1. Crear propiedad GA4.
2. Configurar zona horaria.
3. Configurar moneda.
4. Crear flujo web.
5. Registrar dominio.
6. Copiar Measurement ID.
7. Guardar Measurement ID en el empresario.
8. Publicar pagina.
9. Verificar instalacion.

Si es posible automatizar via API mas adelante, se convierte en subticket futuro.

Prioridad:

Media-alta.

Avance 2026-07-30:

- Se documento PH-024 como menu administrativo separado.
- El contrato de generacion ya acepta `integrations.analytics.measurementId`.
- El contrato queda preparado para Meta Pixel y Google Ads, aunque el MVP solo usa GA4.

### D2. No calcular ROAS todavia

Decision MVP:

PartnerHub por ahora solo mostrara metricas basicas de visitas y procedencia cuando exista GA4 conectado.

ROI / ROAS quedan fuera hasta que exista modulo de campanas publicitarias o conexion a cuentas publicitarias.

Prioridad:

Media.

## Categoria G - Personalizacion visual controlada

### G1. Tres grados de personalizacion

Decision MVP:

La personalizacion de paginas se divide en tres niveles:

- Cambios master: contenido comun, estructura, productos, imagenes comunes y videos. Se gestionan desde `/master-site` y se revisan primero en `ganomaster.pro`.
- Datos personales y enlaces: nombre, WhatsApp, telefono, URL de compra, heroes, logo, SEO y Analytics. Se gestionan por empresario.
- Estilo propio: paleta y tipografia por empresario, sin cambiar estructura.

Relacion:

PH-025.

Prioridad:

Media-alta.

### G2. Presets visuales por empresario

Decision MVP:

El generador debe soportar 6 presets tipograficos y 10 paletas de color. La UI debe permitir seleccionarlos en `/landing-builder` y en el detalle del empresario.

Avance 2026-07-30:

- El contrato de generacion ya acepta `theme.fontPreset` y `theme.palettePreset`.
- La plantilla de producto ya aplica estos presets como variables CSS.

## Categoria E - Pagos e ingresos esperados

### E1. Ingresos reales vs ingresos esperados

Problema:

No existe pasarela conectada para todos los pagos. Muchos pagos seran transferencia, efectivo o confirmacion manual.

Decision MVP:

El dashboard no debe asumir ingresos reales desde automatizacion inexistente.

Debe separar:

- `Ingresos esperados`: calculados por planes activos y mensualidades.
- `Pagos confirmados`: registrados manualmente en `/partners` o modulo de pagos.
- `Diferencia pendiente`: esperado menos confirmado.

Los ingresos reales dependen de confirmacion manual hasta conectar Wompi/webhooks.

Prioridad:

Alta para control administrativo.

## Categoria F - Identidad visual PartnerHub

### F1. Favicon e identidad visual para app/oferta

Problema:

`app.partnerhub.club`, `oferta.partnerhub.club` y otras rutas publicas no tienen favicon ni una identidad visual consistente.

Decision MVP:

Crear identidad minima de PartnerHub:

- favicon SVG/PNG.
- icono para dashboard.
- favicon para oferta publica.
- metadata OG basica.
- nombre visible consistente.

Prioridad:

Media.

## Cola recomendada de trabajo

### Urgente antes de escalar ventas

1. Corregir verificador para que use `purchaseUrl` guardado, no URL inferida.
2. Implementar boton desde `/partners` hacia `/landing-builder` con empresario preseleccionado.
3. Permitir edicion completa de datos operativos del empresario.
4. Onboarding con subida de heroes desde archivo local.
5. Redireccion de onboarding final a agradecimiento y proximos pasos.
6. Probar `jairopinto.pro` de 0 a 100.

### Siguiente bloque operativo

7. Checklist GA4 en dashboard.
8. Separar ingresos esperados vs pagos confirmados.
9. Mejorar estados y lenguaje operativo (`CONVERTED` explicado o renombrado en UI).
10. Identidad visual/favicons de PartnerHub.
11. Menu `Analitica y metricas` con GA4 primero.
12. Selector de estilos por empresario con presets de color y tipografia.

### Escalabilidad

13. Verificacion automatica obligatoria despues de cada publicacion.
14. Logs de publicacion y verificacion por sitio.
15. Replicacion selectiva despues de aprobar `ganomaster.pro`.
16. Automatizacion futura de GA4 si Google APIs lo permiten de forma segura.

## Prueba 0 a 100: `jairopinto.pro`

La proxima prueba debe validar:

- Registro o carga administrativa del empresario.
- Dominio `jairopinto.pro`.
- Subida de heroes desde archivo.
- URL de compra real.
- WhatsApp real.
- Generacion.
- Publicacion.
- Verificacion PH-020.
- Correccion de datos y republicacion.
- Entrega final.

Esta prueba debe cerrar antes de cargar mas clientes vendidos.
