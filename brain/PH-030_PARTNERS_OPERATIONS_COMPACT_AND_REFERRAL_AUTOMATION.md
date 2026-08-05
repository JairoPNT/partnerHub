# PH-030 - Operacion Compacta de Empresarios y Referidos Automaticos

## Estado

En progreso operativo.

## Objetivo

Pulir la vista administrativa de `/partners` para que funcione como centro operativo del MVP sin sobrecargar la lista principal, y dejar definida la evolucion del programa de referidos desde gestion manual hacia aplicacion automatica por codigo de empresario.

## Cambios Aplicados

- La lista de Operacion de Empresarios se condensa para evitar desplazamiento horizontal.
- El estado operativo en lista se representa como indicador visual compacto por color, dejando el texto completo para tooltips y detalle.
- Los datos de contacto, metodo de pago y referido dejan de mostrarse en la lista principal y quedan disponibles en el detalle del empresario.
- Las acciones de lista se reducen a iconos: verificar sitio y abrir detalle/gestion.
- La pestana de referidos pasa a llamarse `Programa de Referidos`.
- La replicacion de plantilla excluye `ganomaster` y `ganomaster.pro` como destinos. Ganomaster es solo fuente maestra.
- El backend califica automaticamente un referido cuando el empresario referido ya tiene `siteId`, `referrerCode` y estado comercial `PAID`.
- Si el sitio se vincula despues de registrar el pago, la calificacion automatica tambien se ejecuta al vincular el `siteId`.
- Si el pago se confirma despues de tener sitio vinculado, la calificacion automatica se ejecuta al cambiar el estado a `PAID`.

## Regla Operativa de Referidos

Cada empresario debe tener un codigo de empresario o invitacion. Ese codigo puede venir desde el onboarding o ser asignado por operacion interna.

Cuando un nuevo empresario escribe el codigo de quien lo invito:

- El sistema registra la relacion como pendiente.
- Si el codigo todavia no existe, el formulario publico permite capturar el nombre del empresario invitador.
- Con ese nombre y codigo, el sistema crea un invitador provisional en el catalogo de codigos para no bloquear el registro del nuevo empresario.
- El invitador provisional queda con un `siteId` tecnico temporal `ref-{codigo}` hasta que se vincule a un empresario real.
- Cuando el invitador inicia su propio proceso y se le asigna un `siteId` real, el codigo provisional puede reasignarse y sus referidos pendientes se migran al empresario real.
- La relacion puede completarse cuando el nuevo empresario termine onboarding.
- El referido solo se vuelve efectivo cuando el pago del nuevo empresario queda confirmado.
- Solo los referidos efectivos cuentan para beneficios.

La regla comercial vigente se mantiene: cada 2 referidos efectivos otorgan 1 mes de gestion.

## Pendientes

- Mover o duplicar la asignacion de codigo de empresario dentro del detalle de Operacion de Empresarios.
- Crear o normalizar el campo de codigo propio del empresario desde onboarding.
- Completar la UI administrativa para convertir un invitador provisional en empresario real desde Operacion de Empresarios.
- Mantener una vista de auditoria para revisar manualmente casos ambiguos.
- Probar el flujo completo desde UI: referido pendiente -> onboarding -> pago confirmado -> referido efectivo.
