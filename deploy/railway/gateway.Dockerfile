FROM nginx:1.28-alpine
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
ENV NGINX_ENVSUBST_FILTER="^(API_UPSTREAM|WEB_UPSTREAM|NGINX_LOCAL_RESOLVERS)$"
RUN sed -i 's/worker_processes  auto;/worker_processes  1;/' /etc/nginx/nginx.conf
COPY deploy/railway/gateway.conf.template /etc/nginx/templates/default.conf.template
ARG RAILWAY_GIT_COMMIT_SHA=unknown
LABEL org.opencontainers.image.source="https://github.com/kent0113/AIGC-Studio" \
      org.opencontainers.image.revision=${RAILWAY_GIT_COMMIT_SHA}
EXPOSE 8080
