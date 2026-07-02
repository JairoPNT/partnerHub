# Primer incremento de construccion

## Objetivo

Construir la base minima que permita empezar a operar el proyecto con orden tecnico y documental.

## Alcance del primer incremento

1. Estructura del repositorio
2. Base documental
3. Definicion del modelo inicial
4. Base tecnica del primer modulo

## Estructura sugerida

- `docs/` para documentacion viva
- `apps/web/` para frontend
- `apps/api/` para backend
- `infra/` para despliegue
- `packages/` para codigo compartido

## Primer modulo a construir

### Modulo sugerido: Empresarios

Se recomienda iniciar por este modulo porque:

- Es la entrada del sistema
- Permite probar autenticacion y estructura de datos
- Sirve como base para el constructor y el Sitio Master

## Entidades iniciales

- Usuario
- Empresario
- Plan
- Sitio
- Dominio
- Pago
- Recurso creativo
- Checklist

## Flujo inicial

1. Crear empresario
2. Asignar plan
3. Crear sitio base
4. Asociar dominio
5. Cargar checklist
6. Publicar primera version

## Entregable tecnico minimo

- Proyecto base creado
- Estructura de carpetas lista
- Configuracion inicial de entorno
- Conexion base a base de datos
- Primer CRUD funcional

## Criterio para pasar al siguiente paso

Cuando el modulo de Empresarios exista y pueda registrar la informacion minima, entonces se puede avanzar al Constructor y al Sitio Master.

