# Production image: a real `next build` baked in at image-build time,
# served with `next start` -- not the dev server (see docker-compose.yml
# for why running `next dev` in production was causing stale-tab errors
# on every deploy). Multi-stage so the final image doesn't carry build
# tooling, and so `npm ci` (deps) is cached separately from source
# changes.

FROM node:26-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:26-alpine AS builder
WORKDIR /app
# NEXT_PUBLIC_* vars are inlined into the JS bundle at build time, not
# read at container start -- must be passed as a build arg (wired up in
# docker-compose.yml), not just left in the runtime .env.
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["npm", "run", "start"]
