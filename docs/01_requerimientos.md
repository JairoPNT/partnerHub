# Requerimientos

## Requerimientos funcionales

### RF-01 Autenticacion

El sistema debe permitir acceso autenticado para administradores internos y futuros empresarios.

### RF-02 Gestion de empresarios

El sistema debe permitir registrar, editar, suspender y consultar empresarios.

### RF-03 Planes

El sistema debe permitir asignar un plan comercial a cada empresario.

### RF-04 Constructor de sitios

El sistema debe permitir crear una landing, una VSL o un ecosistema completo.

### RF-05 Sitio Master

El sistema debe permitir administrar contenido centralizado y replicarlo de forma global, por grupo o por empresario.

### RF-06 Banco creativo

El sistema debe permitir almacenar y organizar recursos como imagenes, videos, copys y piezas de marketing.

### RF-07 Campanas

El sistema debe permitir registrar campanas, brief, copy, creativos, presupuesto y estado.

### RF-08 Checklist

El sistema debe permitir validar el estado de implementacion antes de la entrega.

### RF-09 Reportes

El sistema debe mostrar visitas, leads, clics, conversion y pagos.

### RF-10 Pagos

El sistema debe registrar pagos de implementacion y mensualidad.

### RF-11 Dominios

El sistema debe permitir administrar dominios asociados a cada proyecto o empresario.

### RF-12 Automatizaciones

El sistema debe disparar automatizaciones para alta de empresarios, generacion de sitios, notificaciones y actualizaciones.

## Requerimientos no funcionales

### RNF-01 Escalabilidad

La plataforma debe soportar crecimiento sin duplicar logicamente el trabajo operativo.

### RNF-02 Seguridad

El sistema debe proteger acceso, datos sensibles y recursos de administracion.

### RNF-03 Disponibilidad

El sistema debe estar preparado para operar en hosting administrado con monitoreo y recuperacion basica.

### RNF-04 Mantenibilidad

La arquitectura debe permitir cambios rapidos en contenido, templates y reglas sin rehacer todo el sistema.

### RNF-05 Rendimiento

Las paginas publicas deben cargar rapido y el panel administrativo debe responder de forma fluida.

### RNF-06 Trazabilidad

Los cambios importantes deben poder ser auditados.

### RNF-07 Portabilidad

La solucion debe poder instalarse y desplegarse en infraestructura propia basada en VPS, Docker y Nginx.

### RNF-08 Integracion

La plataforma debe poder integrarse con n8n, WhatsApp Business y Meta Ads en fases posteriores.

## Suposiciones iniciales

- El primer cliente sera Gano Excel
- El backend preferido sera NestJS
- El frontend sera Next.js
- La base de datos sera PostgreSQL
- La automatizacion se apoyara en n8n

## Criterios de exito iniciales

- Un empresario puede ser dado de alta
- Un sitio puede generarse desde una plantilla
- El Sitio Master puede actualizar contenido
- El checklist puede marcar una entrega como lista

