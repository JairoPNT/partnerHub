# Notas de Diseño No Vinculantes — Estado Post PH-006 & PH-011

Este documento recopila las observaciones de diseño, deuda UX, preguntas abiertas y oportunidades de simplificación identificadas por **Antigravity** tras la implementación del sistema de diseño base (PH-006) y la estructuración de los flujos de usuario (PH-011).

---

## 1. Inconsistencias Visuales Detectadas
- **Contraste de Bordes en Modo Claro**: Algunos bordes de tarjetas (`Card`) y inputs (`Input`) utilizan `border-stone-200/80` y `border-stone-250` de forma ad-hoc. Conviene unificar todas las fronteras débiles en una clase semántica o variable CSS dedicada (ej. `border-border` o `--border-color`) para evitar dispersión tonal.
- **Foco e Indicador de Selección**: El anillo de foco (`ring-sand-500/50` o `ring-sand-400/20`) varía en grosor y opacidad entre botones, inputs y el selector. Es necesario definir un token de foco consistente de `2px` con opacidad controlada.
- **Doble Lockfile en el Workspace**: Existe un `package-lock.json` en la raíz del proyecto y otro en `app/web/`. Esto genera advertencias en Turbopack/Next.js sobre la inferencia del directorio raíz de compilación.

---

## 2. Deuda UX (User Experience Debt)
- **Responsividad de Tablas en Móviles**: Aunque los componentes de `Table` están contenidos en contenedores con desbordamiento (`overflow-x-auto`), la experiencia de lectura de datos de socios en pantallas pequeñas (< 640px) requiere scroll horizontal. Se debería diseñar una vista de tarjetas colapsables alternativa para pantallas móviles.
- **Persistencia de Estado Local**: La simulación de adición de socios en el Dashboard se almacena en memoria volátil de React (`useState`). Una recarga de página limpia los datos. Se requerirá un middleware o persistencia básica en local storage en fases futuras si se quiere una demo más persistente antes de conectar la base de datos real.
- **Ausencia de Transiciones en Sidebar**: Los iconos del menú lateral responden de forma instantánea al cambio de ruta, pero el texto secundario podría beneficiarse de una micro-animación de desvanecimiento suave (`fade-in`) al cargarse.

---

## 3. Preguntas Abiertas (Diseño e Inquilinos)
- **Tokenización de Branding por Tenant**: ¿Cómo se gestionará la inyección dinámica de la paleta de colores del inquilino (ej. si una marca requiere azul/verde en vez de los tonos cálidos `sand`)? Debemos evaluar si convertimos las variables CSS de Tailwind en variables CSS puras inyectadas en el layout principal del HTML según el tenant actual.
- **Flujo DNS/CNAME**: ¿Qué nivel de feedback visual daremos al socio si la verificación del registro CNAME falla? (¿Sugerencias automáticas, asistente de depuración paso a paso o simplemente un banner de error genérico?).

---

## 4. Oportunidades de Simplificación
- **Consolidación de Layouts**: Actualmente `(app)/layout.tsx` carga de forma directa el `AppShell`. Podríamos simplificar aún más este wrapper abstrayendo los componentes comunes y controlando el estado del sidebar colapsable en una única capa de contexto global.
- **Unificación de Librería de Iconos**: Mantener un estricto escaneo en la importación de `lucide-react` para evitar importar toda la biblioteca en el bundle final de cliente, utilizando tree-shaking optimizado de Next.js.
