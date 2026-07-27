# PH-003C - Ajuste de Mision

## Definicion Oficial

PartnerHub no es un CRM.

PartnerHub es una plataforma de activos web, mensajes validados y canales de captacion para empresarios en MLM, venta directa, afiliados, distribuidores y redes comerciales.

PartnerHub atrae, educa y direcciona leads hacia canales externos controlados por el empresario.

El flujo principal termina cuando el lead es enviado a un canal externo del empresario.

## Fuera Del MVP

El seguimiento comercial posterior queda fuera del MVP.

No pertenecen al core PH-003C:

- seguimiento comercial
- cierre comercial
- pipeline
- inbox
- gestion posterior de leads
- CRM interno del empresario

## Entidades Core

- Entrepreneur
- WebAssetPackage
- MasterAsset
- PersonalizedChannel
- LeadDestination
- ValidatedMessage
- TrafficCampaign
- BusinessEvent

## Entidades Fuera Del Core

- Prospect
- Opportunity
- Deal
- Pipeline
- FollowUp
- CRMActivity
- LeadManagement

## Responsabilidades De PartnerHub

- Crear y mantener paquetes de activos web.
- Mantener MasterAssets como conocimiento comercial validado.
- Mantener ValidatedMessages como mensajes aprobados y reutilizables.
- Crear PersonalizedChannels para cada empresario.
- Publicar paginas, VSLs o activos web personalizados.
- Crear y validar LeadDestinations externos.
- Direccionar interesados hacia canales externos controlados por el empresario.
- Registrar BusinessEvents para trazabilidad operativa.
- Activar TrafficCampaigns como generacion de trafico hacia activos o destinos externos.

## Responsabilidades Del Empresario

- Controlar su canal comercial externo.
- Atender conversaciones posteriores en WhatsApp, checkout, formulario externo, booking, social DM, telefono u otro destino aprobado.
- Gestionar seguimiento, cierre y relacion comercial posterior fuera de PartnerHub.
- Entregar datos requeridos para personalizar activos y destinos.
- Mantener vigentes sus enlaces, canales y disponibilidad comercial.

## Criterios De Aceptacion PH-003C

- PH-003C no presenta a PartnerHub como CRM.
- El flujo principal se centra en atraer, educar y direccionar leads.
- LeadDestination apunta a canales externos controlados por el empresario.
- TrafficCampaign se entiende como generacion de trafico, no como gestion de leads.
- MasterAsset y ValidatedMessage representan conocimiento comercial validado.
- PersonalizedChannel representa la pagina, VSL o activo publicado para cada empresario.
- BusinessEvent registra trazabilidad sin almacenar gestion comercial posterior.
- La arquitectura sigue siendo generica para MLM, venta directa, afiliados, distribuidores y redes comerciales.
- La implementacion no queda amarrada exclusivamente a Gano Excel.
- Prospect, Opportunity, Deal, Pipeline, FollowUp, CRMActivity y LeadManagement quedan fuera del core.
