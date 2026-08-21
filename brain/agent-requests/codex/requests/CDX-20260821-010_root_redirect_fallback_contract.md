# CDX-20260821-010 — Root redirect fallback contract

## Objetivo

Resolver el redirect del apex solo hacia targets publicados: un ecosistema usa su target; múltiples prefieren Brand y hacen fallback Product, luego Business. Sin target publicado, bloquear explícitamente.

## Alcance

Contrato backend de entitlement/redirect y pruebas. Exponer estado, razón de fallback y preservación del apex.

## Límites

Sin UI, DNS, Hostinger, publicación, datos productivos, provisioning ni migraciones.
