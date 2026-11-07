FROM node:22-bookworm AS builder
WORKDIR /app/web
ENV NEXT_TELEMETRY_DISABLED=1
ENV COREPACK_NPM_REGISTRY=https://registry.npmjs.org
ARG NEXT_PUBLIC_APP_VERSION=dev
ARG NEXT_PUBLIC_GITHUB_URL=https://github.com/MaM-SZ/AIGC-Studio
ENV NEXT_PUBLIC_GITHUB_URL=${NEXT_PUBLIC_GITHUB_URL}
# Keep browser API calls on the public gateway's origin.
ENV NEXT_PUBLIC_SERVER_URL=""
RUN corepack enable
COPY web/package.json web/pnpm-lock.yaml web/pnpm-workspace.yaml ./
RUN corepack install && pnpm install --frozen-lockfile --registry=https://registry.npmjs.org
COPY web/ ./
COPY docs/ /app/docs/
RUN printf '%s\n' "${NEXT_PUBLIC_APP_VERSION}" > /app/VERSION \
    && printf '# Changelog\n\n## Unreleased\n' > /app/CHANGELOG.md \
    && pnpm run build

FROM node:22-bookworm-slim
WORKDIR /app/web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=::
ENV PORT=5550
ENV NODE_OPTIONS=--max-old-space-size=192
COPY --from=builder /etc/ssl/certs /etc/ssl/certs
COPY --from=builder /app/VERSION /app/VERSION
COPY --from=builder /app/CHANGELOG.md /app/CHANGELOG.md
COPY --from=builder /app/web/public ./public
COPY --from=builder /app/web/.next/standalone ./
COPY --from=builder /app/web/.next/static ./.next/static
COPY --from=builder /app/docs /app/docs
ARG RAILWAY_GIT_COMMIT_SHA=unknown
LABEL org.opencontainers.image.source="https://github.com/MaM-SZ/AIGC-Studio" \
      org.opencontainers.image.revision=${RAILWAY_GIT_COMMIT_SHA}
EXPOSE 5550
CMD ["node", "server.js"]
