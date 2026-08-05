# PH-031 - Formulario Directo de Activacion

## Estado

Implementado.

## Objetivo

Permitir que un empresario inicie el proceso sin pasar por la pagina completa de oferta, especialmente cuando llega por WhatsApp, referido directo o pago por transferencia.

## Ruta Publica

- `https://oferta.partnerhub.club/activar`

## Alcance MVP

- Reutiliza el formulario publico de activacion existente.
- Registra el lead desde cero.
- Redirige automaticamente al onboarding reanudable.
- Presenta una explicacion corta de la oferta actual.
- Muestra condiciones basicas del bono de referidos.

## Oferta Mostrada

- Activacion inicial: `$180.000 COP`.
- Gestion mensual: `$40.000 COP / mes`.
- Entrega estimada: `24 a 48 horas` despues de pago y datos minimos.

## Bono de Referidos

- Por cada 2 referidos efectivos, el empresario obtiene 1 mes de gestion.
- Un referido efectivo debe estar pagado, validado y activo en PartnerHub.
- El beneficio se aplica como credito manual sobre gestion mensual futura.
- No representa pago en efectivo ni descuento automatico.

## Decision Operativa

Cuando un cliente llega por conversacion directa y no necesita ver la pagina de venta, Jairo puede enviar directamente el enlace `/activar`.
