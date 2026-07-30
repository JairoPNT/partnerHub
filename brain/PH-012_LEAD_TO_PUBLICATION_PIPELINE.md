# PH-012: Seguimiento de lead a publicacion

## Decision

El MVP usara el estado operativo existente como pipeline comercial y de entrega. No se agregara un CRM complejo ni un dashboard para usuarios finales.

## Pipeline

- `NEW`: interesado registrado; aun no se ha iniciado la gestion.
- `CONTACTED`: se inicio contacto y se esta recopilando o confirmando informacion.
- `PAID`: pago confirmado; el sitio debe pasar a generacion/publicacion.
- `CONVERTED`: sitio publicado y servicio activo.
- `CANCELLED`: proceso detenido o no continuado.

## Paid site intake

Los clientes ya pagados pueden ser registrados internamente sin repetir el formulario publico. El operador debe poder:

- crear o completar el registro del empresario;
- marcarlo como `PAID`;
- vincular su `siteId`;
- completar onboarding manualmente o usar el enlace temporal;
- generar y publicar la pagina;
- cambiar a `CONVERTED` solo despues de verificar la URL publicada.

## Minimum operational view

- contador por estado;
- fecha de registro y ultima actualizacion;
- metodo de pago;
- datos de contacto;
- progreso de onboarding;
- siteId y URL final cuando exista;
- accion clara para avanzar el estado.

No se calcula ROI, ROAS, mensualidades ni vencimientos automaticos en este bloque. Esas funciones quedan para fases posteriores.
