# PH-005A - Product Page Static Generator

## Status

Completed on 2026-07-27.

## Objective

Turn the validated product-page template into a repeatable static package for a single entrepreneur.

## Input

- Site identity and SEO text.
- Entrepreneur contact data.
- Public hero asset URLs stored in R2.
- Optional public logo URL.

## Output

A self-contained folder ready to upload to a hosting document root. It includes the template files plus a generated `config.js`.

## Explicit Scope Boundary

This ticket does not create database records, API endpoints, UI, authentication, Docker changes, automatic publishing, SFTP credentials, n8n workflows, or production bulk updates.

## First Acceptance Test

Generate a second local package from a JSON configuration, serve it locally, and verify that the generated configuration is applied without modifying the base template.

## Result

The generator produced `tmp/generated-sites/jairo-pinto-test` from `examples/product-page/jairo-pinto-test.json`. The generated package contains only the document-root files and validates its generated JavaScript before publication.
