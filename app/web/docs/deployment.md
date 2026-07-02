# Deployment

## Current deployment target

- GitHub repository connected to Easypanel
- Dockerfile in the repository root

## App entrypoint

- Next.js app lives in `app/web`
- Root Dockerfile builds from that folder

## Build expectations

- `npm ci`
- `npm run build`
- `npm start`

