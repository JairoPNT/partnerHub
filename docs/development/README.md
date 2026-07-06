# Development

## Coding Standards

- Write code that is readable first and clever second.
- Favor small, testable modules.
- Keep domain rules explicit.
- Use consistent naming across backend, API, and data layers.

## Folder Structure

The repository should separate concerns by domain and by platform layer.

Recommended future grouping:

- application code
- domain models
- infrastructure adapters
- API contracts
- tests
- documentation

## Git Flow

- Work from a ticket.
- Keep commits focused.
- Avoid mixing unrelated changes.
- Document architectural consequences when a change affects multiple modules.

## Development Habits

- Prefer deterministic behavior over hidden magic.
- Add tests around business-critical rules.
- Review the impact on multi-tenant behavior before merging.

