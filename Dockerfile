FROM node:22-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

FROM base AS build

COPY --chown=node:node ./package.json /app/ait/package.json
COPY --chown=node:node ./pnpm-lock.yaml /app/ait/pnpm-lock.yaml
COPY --chown=node:node ./pnpm-workspace.yaml /app/ait/pnpm-workspace.yaml

COPY --chown=node:node ./packages/transformers/retove /app/ait/packages/transformers/retove
COPY --chown=node:node ./packages/infrastructure/qdrant /app/ait/packages/infrastructure/qdrant
COPY --chown=node:node ./packages/infrastructure/redis /app/ait/packages/infrastructure/redis
COPY --chown=node:node ./packages/infrastructure/postgres /app/ait/packages/infrastructure/postgres
COPY --chown=node:node ./packages/infrastructure/langchain /app/ait/packages/infrastructure/langchain
COPY --chown=node:node ./packages/infrastructure/scheduler /app/ait/packages/infrastructure/scheduler

WORKDIR /app/ait
RUN corepack enable
RUN corepack prepare --activate
RUN pnpm install --frozen-lockfile
RUN pnpm build

# Deploy internally Retove, Qdrant, Postgres, Scheduler
RUN pnpm deploy --filter packages/transformers/retove --frozen-lockfile
RUN pnpm deploy --filter packages/infrastructure/qdrant --frozen-lockfile
RUN pnpm deploy --filter packages/infrastructure/redis --frozen-lockfile
RUN pnpm deploy --filter packages/infrastructure/postgres --frozen-lockfile
RUN pnpm deploy --filter packages/infrastructure/langchain --frozen-lockfile
RUN pnpm deploy --filter packages/infrastructure/scheduler --frozen-lockfile

FROM base AS ait_etl
COPY --from=build /app/ait/packages/transformers/retove /app/ait/packages/transformers/retove

FROM base AS ait_langchain
COPY --from=build /app/ait/packages/infrastructure/langchain /app/ait/packages/infrastructure/langchain

FROM base AS ait_qdrant
COPY --from=build /app/ait/packages/infrastructure/qdrant /app/ait/packages/infrastructure/qdrant

FROM base AS ait_postgres
COPY --from=build /app/ait/packages/infrastructure/postgres /app/ait/packages/infrastructure/postgres

FROM base AS ait_scheduler
COPY --from=build /app/ait/packages/infrastructure/scheduler /app/ait/packages/infrastructure/scheduler
WORKDIR /app/ait/packages/infrastructure/scheduler

CMD ["pnpm", "start"]
