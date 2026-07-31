# PH-024 - Menu de Analitica y Metricas

## Estado

Definido para MVP. Pendiente implementacion visual por Antigravity.

## Objetivo

Crear un modulo administrativo separado para centralizar la configuracion de medicion de cada empresario. El modulo debe vivir en el dashboard interno de PartnerHub, no en la pagina publica ni en un dashboard de usuario final.

## Alcance MVP

Para la primera version solo se configura Google Analytics 4.

El sistema debe estar preparado para agregar mas adelante:

- Meta Pixel.
- Google Ads.
- Conversiones y eventos publicitarios.

No se calcula ROI ni ROAS en esta fase. Por ahora solo se busca registrar y visualizar datos de visitantes, procedencia y estado de medicion.

## Menu Propuesto

Nombre visible:

`Analitica y Metricas`

Ubicacion sugerida:

Dashboard administrativo, dentro del grupo Growth u Operations.

## Datos por Empresario

Cada empresario debe poder tener:

- `analyticsMeasurementId`: ID GA4, ejemplo `G-XXXXXXXXXX`.
- Estado operativo de Analytics:
  - `PENDING`: no configurado.
  - `CONFIGURED`: ID guardado.
  - `PUBLISHED`: ID incluido en sitio publicado.
  - `VERIFIED`: verificado manualmente en GA4.
- Notas internas del operador.
- Fecha de ultima verificacion.

## Checklist Operativo GA4

La interfaz debe mostrar un checklist simple:

1. Crear propiedad GA4.
2. Crear flujo web.
3. Copiar ID de medicion.
4. Guardar ID en PartnerHub.
5. Publicar pagina.
6. Verificar instalacion en GA4.

Cuando sea posible, cada paso debe incluir enlace directo a la pantalla correspondiente de Google Analytics.

## Contrato Tecnico

La configuracion de pagina debe soportar:

```js
integrations: {
  analytics: {
    provider: "GA4",
    measurementId: "G-XXXXXXXXXX"
  },
  meta: {
    pixelId: ""
  },
  googleAds: {
    conversionId: ""
  }
}
```

Por compatibilidad con lo ya construido, `analytics.measurementId` sigue siendo valido, pero el nuevo contrato recomendado es `integrations.analytics.measurementId`.

## Decision Operativa

El operador de PartnerHub crea y administra las propiedades GA4 durante el MVP.

Los empresarios no reciben acceso directo todavia. La visualizacion para empresarios queda para una fase posterior.
