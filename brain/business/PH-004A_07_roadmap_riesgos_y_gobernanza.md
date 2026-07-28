# PH-004A — Roadmap, riesgos y gobernanza comercial

## 1. Roadmap de validación

### Fase 0 — Fundación

- Aprobar categoría y límites legales.
- Aprobar ICP y oferta piloto.
- Costear producción y operación.
- Definir contratos, dominio y cancelación.
- Preparar demo honesta.

### Fase 1 — Piloto fundador

- Vender 2–5 pilotos pagados.
- Medir tiempo, revisiones y soporte.
- Observar activación y uso.
- Capturar objeciones y lenguaje real.
- Construir un caso autorizado.

### Fase 2 — Repetibilidad

- Estandarizar checklist y plantillas.
- Ajustar precios con margen real.
- Formalizar playbook de ventas.
- Definir SLA y cuota de cambios.
- Crear reporte mensual de valor.

### Fase 3 — Canal por líderes

- Probar cohortes de 5–20 empresarios.
- Definir descuentos y responsabilidades.
- Capacitar vendedores y auditar promesas.
- Medir soporte por cohorte.

### Fase 4 — Expansión

- Validar paquete combinado.
- Probar Motor de Prospectos a escala limitada.
- Diseñar oferta B2B separada.
- Evaluar otros países y monedas.
- Considerar autoservicio solo para pasos estables.

## 2. Experimentos prioritarios

| Experimento | Hipótesis | Evidencia de éxito | Decisión |
| --- | --- | --- | --- |
| Nombre de categoría | “Franquicia Digital” se entiende y eleva valor | 4/5 explican correctamente | conservar o renombrar |
| Dos niveles de precio | precio mayor mantiene conversión y mejora margen | pagos reales | fijar rango |
| Onboarding móvil | checklist reduce espera | insumos en ≤5 días | automatizar |
| Demo por objetivo | demo específica mejora propuesta | mayor conversión | estandarizar |
| Mensualidad | cliente entiende operación recurrente | baja objeción y pago mes 2 | ajustar alcance |
| Referidos | cliente activado refiere mejor | reuniones calificadas | formalizar canal |

## 3. Riesgos estratégicos

### Confusión jurídica de “franquicia”

Mitigación: revisión legal, explicación visible y alternativa de marca preparada. No sugerir licencias territoriales, regalías o derechos propios de franquicia si no existen.

### Sobrepromesa de resultados

Mitigación: claims aprobados, capacitación de ventas, auditoría y descargos claros.

### Margen negativo

Mitigación: alcance cerrado, medición de horas, proveedores costados, revisiones limitadas y subida de precio.

### Personalización no escalable

Mitigación: campos configurables, activos maestros, catálogo de opciones y trabajo especial cotizado.

### Dependencia de plataformas

Mitigación: separar proveedores, documentar degradación y no prometer funciones de Meta/IA fuera de control.

### Incumplimiento de claims

Mitigación: biblioteca validada, revisión manual de salud/ingresos y rechazo de contenido no autorizado.

### Churn por “ya me entregaron”

Mitigación: valor mensual tangible, reportes, actualizaciones y política de salida clara.

### Clientes sin capacidad de seguimiento

Mitigación: calificar antes de tráfico y enseñar responsabilidad externa.

## 4. Gobernanza de promesas

Toda afirmación comercial debe clasificarse:

- **Disponible:** demostrable hoy.
- **Limitada:** disponible solo en plan o configuración específica.
- **Piloto:** experimental y con condiciones.
- **Roadmap:** no vendible todavía.
- **Prohibida:** garantía, claim no autorizado o función inexistente.

Ventas, marketing y onboarding usan la misma matriz. Una demo no convierte una función experimental en compromiso contractual.

## 5. Gobernanza documental

- Este directorio es la fuente comercial operativa.
- GitHub conserva historial técnico y documental.
- Notion puede reflejar resúmenes ejecutivos, pero no reemplaza esta fuente.
- Todo cambio significativo se relaciona con un ticket.
- El CEO aprueba categoría, pricing público y dirección de producto.
- ChatGPT/CTO aprueba implicaciones arquitectónicas.
- Codex no implementa frontend y solo modifica backend con ticket autorizado.
- Antigravity diseña piezas e interfaces.
- Claude revisa calidad, riesgos y consistencia.

## 6. Registro de decisiones comerciales

Cada decisión nueva debe incluir:

```text
ID / fecha
Decisión
Contexto y evidencia
Alternativas consideradas
Impacto en oferta, operación y tecnología
Propietario
Fecha de revisión
```

Las hipótesis no se reescriben retroactivamente como decisiones. Se conserva el aprendizaje.

## 7. Handoff a otras disciplinas

### Producto/arquitectura

- Confirmar capacidades existentes versus promesas.
- Traducir paquetes a configuración genérica.
- Mantener separación no-CRM.
- Modelar eventos agregados sin invadir datos del prospecto.

### Diseño/frontend

- Diseñar landing, brochure, PDF y demos desde el kit de contenido.
- Validar accesibilidad y experiencia móvil.
- No exponer PartnerHub como marca al cliente sin aprobación.

### Backend

- No implementar pricing, billing, auth o tenant isolation desde este documento.
- Esperar tickets técnicos explícitos y decisiones arquitectónicas.

### Legal/finanzas

- Revisar categoría “franquicia”, contratos, impuestos, propiedad, tratamiento de datos, claims y publicidad.
- Validar margen y política de reconocimiento de ingresos.

## 8. Criterios para pasar de piloto a escala

- Al menos 10 implementaciones pagadas.
- Tiempo de entrega estable por plan.
- Margen bruto medido y positivo.
- Retención a 90 días suficiente para sostener recurrencia.
- Menos de 20% de ventas con expectativa incorrecta.
- Proceso de claims y consentimiento operativo.
- Soporte documentado.
- Caso de estudio autorizado.
- Capacidad técnica demostrada, no solo planeada.

## 9. Preguntas abiertas

- ¿“Franquicia Digital” es marca registrable y comercialmente segura?
- ¿Qué mensualidad maximiza continuidad sin destruir margen?
- ¿Qué cambios espera realmente el cliente cada mes?
- ¿Cuál ecosistema produce menor tiempo a valor?
- ¿Qué porcentaje está listo para pauta?
- ¿Quién posee dominio y materiales al cancelar?
- ¿Qué tareas pueden automatizarse sin degradar confianza?
- ¿Cuándo una cuenta individual se convierte en acuerdo B2B?

Estas preguntas deben resolverse con evidencia de piloto y decisiones registradas, no con intuición aislada.
