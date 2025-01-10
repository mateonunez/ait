FROM node:22-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

FROM base AS build
COPY . /app/ait
WORKDIR /app/ait
RUN pnpm install --frozen-lockfile
RUN pnpm build

# Deploy internally ETL, Qdrant, Postgres, Scheduler
RUN pnpm deploy --filter packages/transformers/etl --frozen-lockfile
RUN pnpm deploy --filter packages/infrastructure/qdrant --frozen-lockfile
RUN pnpm deploy --filter packages/infrastructure/postgres --frozen-lockfile
RUN pnpm deploy --filter packages/infrastructure/langchain --frozen-lockfile
RUN pnpm deploy --filter packages/infrastructure/scheduler --frozen-lockfile

FROM base AS ait_etl
COPY --from=build /app/ait/packages/transformers/etl /app/ait/packages/transformers/etl

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
