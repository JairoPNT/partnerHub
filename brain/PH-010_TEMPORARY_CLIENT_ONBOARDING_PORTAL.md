# PH-010: Onboarding temporal como entorno de entrega

## Decision

PartnerHub no entregara un dashboard permanente al empresario durante el MVP. El entregable sera el sitio web publicado y las notificaciones por correo.

Mientras se construye el futuro dashboard por usuario, el onboarding reanudable funcionara como un entorno temporal y limitado para cada afiliado/empresario.

## User-facing flow

1. El empresario completa el registro minimo en `oferta.partnerhub.club`.
2. El sistema crea el lead y genera un enlace privado de onboarding.
3. El empresario recibe el enlace por correo y puede continuar el formulario cuando quiera.
4. El onboarding muestra los datos basicos de su afiliacion/solicitud y el progreso de la informacion requerida.
5. El empresario puede guardar avances parciales sin completar todo el formulario.
6. PartnerHub completa o corrige datos desde el dashboard administrativo.
7. Al publicar la pagina, el empresario recibe un correo con el dominio y la confirmacion de entrega.

## Boundaries

- No crear cuentas de usuario, contrasenas ni roles para empresarios.
- No mostrar el dashboard administrativo, referidos internos, costos internos ni reglas operativas.
- El acceso temporal se concede unicamente mediante token no adivinable incluido en el enlace.
- El enlace debe permitir reanudar el onboarding, pero no debe convertirse en una sesion administrativa.
- El favicon seguira siendo automatico si el empresario no aporta uno.

## Required notifications

- Solicitud recibida: ID de solicitud y enlace de onboarding.
- Pago/transferencia pendiente de validacion: instrucciones de confirmacion.
- Pagina publicada: URL final y confirmacion de entrega.

## Next session priorities

1. Confirmar el contenido y los campos visibles del onboarding temporal.
2. Conectar el envio de correo usando una cuenta de `partnerhub.club` gestionada por variables de entorno.
3. Probar el recorrido registro -> correo -> onboarding -> guardado parcial -> publicacion -> correo de entrega.
4. Registrar clientes ya vendidos sin exponerles acceso administrativo.
5. Mantener el futuro dashboard por usuario fuera del alcance hasta estabilizar el MVP.

## Acceptance criteria

1. Un empresario puede recibir y usar el enlace sin crear una cuenta.
2. Puede consultar el avance de su afiliacion y guardar informacion parcial.
3. PartnerHub puede completar los datos y publicar el sitio internamente.
4. El empresario recibe confirmacion por correo de la solicitud y de la publicacion.
5. Ningun usuario final puede acceder a `/partners` ni a datos de otros empresarios.
