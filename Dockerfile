# The workspace owns apps/web and apps/api. The API depends on pg.
FROM docker.io/library/node:24-trixie-slim@sha256:54f84b4cf8432b21aaffd5d3ce8d41e12cea0d10d33c09d2f3c9879d49d6b446 AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@12.14.0 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter ./apps/web build && pnpm --filter ./apps/api build
RUN pnpm --filter ./apps/api deploy --legacy --prod /runtime

FROM docker.io/library/node:24-trixie-slim@sha256:54f84b4cf8432b21aaffd5d3ce8d41e12cea0d10d33c09d2f3c9879d49d6b446 AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8000
WORKDIR /app
COPY --from=build --chown=node:node /runtime/ ./
COPY --from=build --chown=node:node /app/apps/web/dist/ ./public/
COPY --chown=node:node deploy/start.cjs deploy/health.cjs ./
USER node
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=6 CMD node -e "fetch('http://127.0.0.1:8000/api/health').then(async r=>{const h=await r.json();if(!r.ok||h.status!=='ok'||h.revision!==(process.env.APP_REVISION||'unknown'))process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "start.cjs"]
