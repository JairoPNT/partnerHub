# Claude Review — PH-006 & PH-011

> **Reviewer:** Claude Code (Principal Reviewer / QA Engineer)
> **Fecha:** 2026-07-05
> **Tickets revisados:** PH-006 (Design System Foundation), PH-011 (UX User Flows)
> **Autor del trabajo revisado:** Antigravity (Lead Product Designer / Frontend Engineer)

---

## 1. Executive Summary

**Status: APPROVED WITH WARNINGS**

El trabajo de Antigravity en PH-006 (Design System Foundation) y PH-011 (UX User Flows) está **bien estructurado técnicamente**, pero contiene **dos hallazgos críticos** que violan la decisión arquitectónica ADR-0002 (Generic Multi-Tenant Platform) y **uno alto** sobre escalabilidad.

**Recomendación:** Continuar con PH-006, pero **congelar la implementación de dashboard-view.tsx** hasta validar si el contenido es prototipo de UI o arquitectura de producto. Validar PH-011 contra PH-003B/PH-003C antes de comenzar desarrollo.

---

## 2. PH-006 Design System Review

### Fortalezas

#### tailwind.config.ts
- Fuentes Inter (body) y Outfit (heading) bien configuradas.
- Paleta "sand" (colores tierra/dorado) coherente y expresiva.
- Sombras premium y extended border-radius (4xl, 5xl) agregan refinamiento.
- Estructura mantenible con `extend` en lugar de override.

#### globals.css
- Importación Google Fonts correcta y sintaxis de `display=swap` optimizada.
- Gradiente radial + lineal multicolor aporta identidad visual profesional.
- Utility class `.glass-panel` reutilizable y bien encapsulada.
- Font smoothing para legibilidad en sistema operativo.

#### Componentes UI (@/components/ui/)
Todos bien estructurados, reutilizables y accesibles:
- **Button**: 5 variantes (primary, secondary, outline, ghost, danger), 3 tamaños, states (loading, disabled, active).
- **Card**: `interactive` prop inteligente, sub-componentes organizados (Header, Title, Description, Content, Footer).
- **Badge**: 6 variantes con estado semantic (primary, secondary, success, warning, error, neutral).
- **Table**: responsive con `overflow-x-auto`, estilos hover para accesibilidad.
- **Form**: Label, Input, Select, Textarea, Checkbox, Switch con focus rings y disabled states.
- **Alert**: 4 variantes, icon support, title opcional, `role="alert"` para a11y.

**Nota:** Componentes siguen patrón headless (no asumen estructura de página), lo que es ideal para reutilización.

#### Sidebar & Topbar
- Responsive design considerado (hidden mobile, visible xl).
- Iconos dinámicos de Lucide vía iconMap.
- Indicadores visuales claros (active states, notifications, tenant indicator).
- Búsqueda y notificaciones integradas.

### Hallazgos

#### [CRITICAL] dashboard-view.tsx hardcodea planes de Gano Excel
**Ubicación:** `app/web/components/dashboard-view.tsx:43-73`

Los planes `"Kit Inicial"`, `"Empresario Pro"`, `"Socio Fundador"` son específicos de Gano Excel, no genéricos.
- Viola ADR-0002 (Generic Multi-Tenant Platform).
- Define el Domain Model antes de que PH-003B esté cerrado.
- Crea acoplamiento con una estructura de negocio que debe ser configurable.

**Riesgo:** Future tenants (Herbalife, Omnilife, etc.) tendrán planes distintos. Hardcodear esto ahora obliga a refactor futuro.

#### [HIGH] sidebar.tsx iconMap no escala
**Ubicación:** `app/web/components/sidebar.tsx:24-37`

`iconMap` está hardcodeado y mezcla dos sources of truth (iconMap vs moduleNavigation). Cada nueva ruta requiere actualización manual en dos lugares = deuda técnica.

**Mejor patrón:** agregar `icon` field a `moduleNavigation` y mapear dinámicamente, una sola source of truth.

#### [HIGH] dashboard-view.tsx mezcla concepto de admin dashboard con partner dashboard
**Ubicación:** `app/web/components/dashboard-view.tsx` (especialmente lines 29-74, 109-176)

El componente se llama "DashboardView" pero contiene KPIs administrativos ("Socios Activos", "Sitios Duplicados", "Dominios Conectados"), tabla de partners y formulario de registro.

El contexto dice: **"El empresario no tendrá dashboard en MVP"**. No está claro si dashboard-view.tsx es para empresario (prohibido en MVP) o partner (probablemente MVP Allowed). Parece un admin-internal-tool adelantado a PH-003B/PH-003C porque no están definidos roles ni permisos.

#### [MEDIUM] Datos hardcodeados y persistencia simulada en dashboard-view.tsx
**Ubicación:** `app/web/components/dashboard-view.tsx:37-74, 84`

El flujo "Registrar Socio" modifica estado local, creando ilusión de persistencia sin backend. El feedback (line 126) es honesto, pero establece riesgo de "prototype literacy": el trabajo parece 80% listo cuando es ~20%.

### No Encontré
- Sin dependencias innecesarias (Lucide, React, Tailwind core).
- Sin lógica de negocio prematura (excepto planes hardcodeados).
- Sin responsive issues (breakpoints coherentes).
- Sin accesibilidad básica rota (ARIA roles, focus rings, semantic HTML).
- Sin color contrast issues (stone/sand/emerald/amber/rose pasan WCAG AA).

---

## 3. PH-011 UX User Flows Review

| Flujo | Clasificación | Justificación |
|-------|---------------|---------------|
| **Partner Purchase** | MVP ALLOWED | Flujo de adquisición crítico. Bien definido. |
| **Partner Dashboard** | MVP ALLOWED (with validation) | Válido para partners. Confusión: ¿empresario no tendrá dashboard? Esto parece ser para partners, no empresario. |
| **Landing Management** | NEEDS BUSINESS VALIDATION | Flujo válido. Requiere PH-003B para definir qué campos son editables por partners. |
| **VSL Builder** | MVP ALLOWED (without AI) | HeyGen/ElevenLabs diferidos a EPIC-800. Flujo sin IA (vincular videos externos) podría ser MVP. |
| **Campaign Manager** | NOT ALLOWED YET | "Campañas publicitarias serán servicio adicional". Diferir a future epic. |
| **Asset Library** | FUTURE EPIC | "Puede conectarse a Social Launch Engine futuro". No MVP. |
| **Master Site** | ADMIN ONLY | MVP Allowed para admin/tenant. Crítico para propagación. |
| **Settings** | MVP ALLOWED (with constraints) | Perfil: MVP. Dominio personalizado: depende PH-003C. Integraciones: Future. |

### Detalle por Hallazgo

#### [MEDIUM] Partner Dashboard vs. Empresario Dashboard: ambigüedad
USER_FLOWS.md no diferencia dashboard de **Partner** (distribuidor) vs dashboard de **Empresario** (dueño de marca). El contexto dice que el empresario no tendrá dashboard en MVP. Definir en PH-003B qué roles existen y qué ve cada uno.

#### [MEDIUM] Landing Management: campos editables no definidos
**Ubicación:** `docs/design/USER_FLOWS.md:74-75`

Menciona "variables permitidas (WhatsApp, Pixel ID, Título del Hero)" pero no da lista exhaustiva. Sin definición clara, el implementador puede ser demasiado restrictivo o demasiado permisivo. Aguardar PH-003B.

#### [LOW] VSL Builder: integraciones AI diferidas, flujo base válido
**Ubicación:** `docs/design/USER_FLOWS.md:88-96`

El flujo (vincular video externo, retardo de CTA, formulario de leads) es MVP Allowed sin IA. HeyGen/ElevenLabs son EPIC-800. Recomendar nota explícita en el doc.

#### [MEDIUM] Campaign Manager documentado pero es future service
**Ubicación:** `docs/design/USER_FLOWS.md:104-119`

Documentado como flujo actual, pero el contexto dice que es servicio adicional. Riesgo de confusión de scope. Marcar como FUTURE EPIC en el doc.

#### [LOW] Asset Library: sin claridad de scope temporal
**Ubicación:** `docs/design/USER_FLOWS.md:126-141`

Claramente diferido (Social Launch Engine futuro), pero no marcado explícitamente como FUTURE EPIC. Agregar nota.

---

## 4. Architecture Alignment

### Respeta
- **ADR-0005 (brain/ como fuente operativa):** No contradice.
- **VPS como Control Plane:** Flujos asumen backend sin especificar infraestructura. Correcto.
- **Hosting externo como Publishing Layer:** "Desplegar Landings y VSL por Defecto" implica split VPS/hosting. Correcto.

### Incertidumbre
- **ADR-0002 (Generic Multi-Tenant):** USER_FLOWS.md es genérico (bien), pero dashboard-view.tsx hardcodea planes de Gano Excel (mal).
- **brain/ / Domain Model:** No está claro el modelo que define "Partner", "Empresario", "Admin". USER_FLOWS.md y dashboard-view.tsx asumen estructuras diferentes. Aguardar PH-003B.
- **n8n como orquestador:** Flujos mencionan "Webhook de Pago" sin aclarar si orquesta n8n o webhook directo. No es responsabilidad de PH-006/PH-011.

---

## 5. MVP Scope Risks

### [CRITICAL] Hardcoding de planes específicos de Gano Excel
Cuando se implemente una segunda marca, habrá que refactorizar código, migrar BD y replicar templates. Deuda técnica desde el día 1.

**Recomendación:** Congelar dashboard-view.tsx hasta que PH-003B defina el Domain Model de Plan (genérico, configurable por tenant, cargado vía API). Mientras tanto usar mock genérico ("Plan A", "Plan B") o JSON configurable.

### [HIGH] Ambigüedad sobre Empresario Dashboard
¿dashboard-view.tsx es para Jairo/CEO (stats globales), para empresario de Gano Excel, o para partner? Son roles con permisos diferentes.

**Recomendación:** En PH-003B definir roles Admin/CEO, Empresario (Tenant Owner) y Partner con sus permisos y dashboards. Si es Admin/CEO, MVP OK. Si es Empresario, congelar.

### [MEDIUM] VSL Builder vs EPIC-800
Flujo MVP sin IA es válido; integraciones AI son EPIC-800. Aclarar en USER_FLOWS.md.

### [MEDIUM] Campaign Manager y Asset Library son future pero documentados como presentes
Riesgo de que un stakeholder los lea como listos para implementar. Agregar sección "Scope Classification" al inicio de USER_FLOWS.md.

---

## 6. Recommended Corrections

> No implementar todavía — solo recomendaciones.

### Qué ajustar
1. **[CRITICAL]** Replanear dashboard-view.tsx: no tocar el prototipo hasta PH-003B; luego cargar plans desde API/config y convertir mock data en generic examples.
2. **[HIGH]** Refactor sidebar.tsx iconMap: agregar `icon` field a moduleNavigation, mapear dinámicamente, una sola source of truth.
3. **[MEDIUM]** Clarificar qué tipo de dashboard es dashboard-view.tsx (Admin/CEO vs Empresario vs Partner). Decisión de Jairo/ChatGPT.

### Qué congelar
1. dashboard-view.tsx hardcoded data — aguardar PH-003B.
2. Campaign Manager en USER_FLOWS.md — marcar "Future Epic".
3. Asset Library en USER_FLOWS.md — marcar "EPIC-800 related / Future Epic".

### Qué debe esperar PH-003A / PH-003B / PH-003C
- **PH-003B (Domain Model):** roles y permisos; entidad Plan genérica; campos editables de Landing Management; clarificar tipos de dashboard.
- **PH-003C (Database Planning):** configuración de dominios personalizados (Settings → CNAME/DNS).

### Qué dejar (aprobado tal cual)
- Todo el Design System de tokens y componentes UI (button, card, badge, table, form, alert).
- tailwind.config.ts, globals.css, topbar.tsx.
- Estructura de flujos MVP-appropriate en USER_FLOWS.md (Partner Purchase, Master Site).

---

## 7. Files Reviewed

| Archivo | Líneas | Hallazgo |
|---------|--------|----------|
| `app/web/tailwind.config.ts` | 1-44 | OK |
| `app/web/app/globals.css` | 1-34 | OK |
| `app/web/components/ui/button.tsx` | 1-74 | OK |
| `app/web/components/ui/card.tsx` | 1-86 | OK |
| `app/web/components/ui/badge.tsx` | 1-29 | OK |
| `app/web/components/ui/table.tsx` | 1-38 | OK |
| `app/web/components/ui/form.tsx` | 1-123 | OK |
| `app/web/components/ui/alert.tsx` | 1-43 | OK |
| `app/web/components/sidebar.tsx` | 1-108 | HIGH (iconMap) |
| `app/web/components/topbar.tsx` | 1-46 | OK |
| `app/web/components/dashboard-view.tsx` | 1-348 | CRITICAL + HIGH |
| `app/web/app/(app)/[module]/page.tsx` | 1-32 | OK |
| `docs/design/USER_FLOWS.md` | 1-189 | MEDIUM issues |

---

## 8. Final Verdict

### CONTINUE WITH CONSTRAINTS

**PH-006 Design System → Continue**
- Design system foundation sólido, componentes production-ready, sin deuda técnica introducida.
- Congelar dashboard-view.tsx hardcoded data hasta PH-003B.
- Refactor sidebar.tsx iconMap antes de expandir navegación.

**PH-011 User Flows → Continue with validation**
- Flujos bien definidos y mayormente MVP-appropriate.
- Requieren validación PH-003B/PH-003C para claridad de scope.
- Clarificar roles Empresario vs Partner vs Admin.
- Marcar Campaign Manager y Asset Library como FUTURE EPIC.

---

## 9. Next Step Recommendation

### Inmediato (este sprint)
1. **Jairo + ChatGPT:** clarificar si dashboard-view.tsx es Admin dashboard (mantener MVP) o Empresario dashboard (congelar hasta PH-003B).
2. **Claude** (si se decide Admin Dashboard): refactor dashboard-view.tsx con mock genérico + sidebar.tsx iconMap dinámico.

### Siguiente (antes de implementar)
3. **Crear PH-003B-Subtask: Domain Model Clarification** — roles, entidad Plan genérica, matriz de permisos, dashboards por rol, campos editables de Landing Management.
4. **Actualizar USER_FLOWS.md** (post PH-003B) — sección "Scope Classification", marcar Campaign Manager y Asset Library como FUTURE EPIC, agregar flujo de Onboarding de Partner.
5. **Actualizar CONTRIBUTING.md** — regla: "All hardcoded data must be tenant-agnostic or configurable" (referencia ADR-0002).

**Ticket recomendado como siguiente:** cerrar **PH-003B (Domain Model)** antes de cualquier refactor o expansión de UI, ya que desbloquea las decisiones críticas de este review.
