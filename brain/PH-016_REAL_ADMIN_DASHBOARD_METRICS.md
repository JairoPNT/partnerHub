# PH-016: Metricas reales del dashboard administrativo

## Problema

El prototipo del dashboard mostraba socios, planes, volumen, ingresos, conversion VSL y cobertura SSL escritos directamente en `dashboard-view.tsx`. Esos valores no representan datos reales y no deben mostrarse como si fueran operativos.

## Fuente MVP

`GET /api/internal/dashboard/metrics` devuelve conteos derivados de los activation leads activos:

- total de leads;
- leads nuevos, contactados, pagados, convertidos y cancelados;
- empresarios operativos (`PAID + CONVERTED`);
- sitios vinculados.

## Reglas de interfaz

- No mostrar nombres, correos, planes, volumen o dinero inventados.
- No mostrar revenue, conversion VSL ni SSL como métricas reales hasta que exista una fuente implementada.
- Sustituir métricas no disponibles por `No disponible` o retirarlas del resumen.
- Mantener los datos detallados en `/partners`, con búsqueda, estados, edición y acciones operativas.
- El dashboard principal debe ser numérico y resumido; `Partners` debe ser la vista de lista y detalle.
