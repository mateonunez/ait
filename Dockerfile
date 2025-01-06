FROM node:22-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

FROM base AS build
COPY . /app/ait
WORKDIR /app/ait
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run -r build

# Deploy internally ETL, Qdrant, Postgres, Scheduler
RUN pnpm deploy --filter packages/infrastructure/transformers/etl --frozen-lockfile
RUN pnpm deploy --filter packages/infrastructure/qdrant --frozen-lockfile
RUN pnpm deploy --filter packages/infrastructure/postgres --frozen-lockfile
RUN pnpm deploy --filter packages/infrastructure/scheduler --frozen-lockfile

FROM base AS ait_scheduler
COPY --from=build /app/ait/packages/infrastructure/scheduler /app/ait/packages/infrastructure/scheduler
WORKDIR /app/ait/packages/infrastructure/scheduler
CMD ["pnpm", "start"]
