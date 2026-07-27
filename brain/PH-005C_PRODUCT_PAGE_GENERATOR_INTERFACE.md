# PH-005C - Product Page Generator Interface

## Status

In progress.

## Primary Owner

Antigravity owns the frontend implementation. Codex verifies its API contract and deployment integration.

## Route

`/landing-builder`

## Contract

The form sends the configuration contract accepted by `POST /api/internal/product-pages/generate`.

It collects site identity, entrepreneur contact data, SEO metadata, and the public R2 URLs for desktop and mobile heroes.

## Scope Boundary

The interface generates an internal persistent package only. It does not publish to Hostinger, request credentials, or represent a client-facing page.
