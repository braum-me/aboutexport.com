# syntax=docker/dockerfile:1

# ---- Build ----------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
# Optional: Umami (Build-Zeit, da statisch gerendert). Ohne Werte keine Reichweitenmessung.
ARG UMAMI_SCRIPT_URL=
ARG UMAMI_WEBSITE_ID=
ARG UMAMI_DOMAINS=
RUN npm run build

# ---- Runtime --------------------------------------------------------------
# Das Server-Bundle ist self-contained (vite ssr.noExternal) – keine node_modules nötig.
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321
WORKDIR /app
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server.mjs /app/server-utils.mjs ./
RUN echo '{"type":"module"}' > package.json
USER node
EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
