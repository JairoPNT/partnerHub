# Cross-Agent Request Protocol

Todas las tareas de frontend, UX, diseño visual, React, Tailwind, navegación e interacción deben gestionarse mediante archivos de request antes de ejecutarse.

### Lectura obligatoria

Antes de iniciar trabajo, lee:

- `AGENTS.md`
- `brain/agent-requests/README.md`
- `brain/agent-requests/antigravity/README.md`
- El request específico asignado en `brain/agent-requests/antigravity/requests/`

### Ubicación de Requests

Los requests para Antigravity viven en:

`brain/agent-requests/antigravity/requests/`

Cada request debe tener un ID único con formato:

`AGR-YYYYMMDD-###`

Ejemplo:

`AGR-20260805-001_partners_compact_ui.md`

### Ejecución

Solo debes ejecutar tareas documentadas en un request pendiente.

No repitas una tarea si ya existe un reporte completado con el mismo ID en:

`brain/agent-requests/antigravity/reports/`

Si el resultado requiere ajustes, espera o crea un nuevo request de seguimiento con un ID nuevo.

### Reporte obligatorio

Al terminar cada request, crea un reporte en:

`brain/agent-requests/antigravity/reports/`

El nombre debe usar el mismo ID del request:

`AGR-YYYYMMDD-###_nombre_tarea_DONE.md`

El reporte debe incluir:

- Request ID
- Resumen de cambios realizados
- Archivos o rutas modificadas
- Verificación realizada
- Resultado del build
- Rama, commit y PR si aplica
- Riesgos pendientes
- Si requiere follow-up o no

### Regla de chat

En el chat responde breve. No pegues reportes largos si ya quedaron documentados en `brain/agent-requests/antigravity/reports/`.

Cuando termines, indica solo:
- ID del request completado
- Ruta del reporte
- Estado de build
- Rama/commit si aplica
