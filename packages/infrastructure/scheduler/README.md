# AIt Scheduler

## Overview

High-performance, priority-based job scheduler built on BullMQ and Redis. Manages ETL processes to synchronize data between PostgreSQL and Qdrant for optimal AI performance.

## Features

- **Concurrent Processing**: Configurable worker concurrency (default: 2)
- **Priority-Based Execution**: High-priority jobs run first (1 = highest, 3 = lowest)
- **Rate Limiting**: Prevents system overload (max 10 jobs per minute)
- **Smart Retries**: Exponential backoff for failed jobs (3 attempts)
- **Dynamic Scheduling**: Environment-based cron expressions (dev vs production)

### Scheduling Intervals

| Priority | Development | Production |
|----------|-------------|------------|
| High     | Every 15 min | Every 5 min |
| Medium   | Hourly      | Every 2 hours |
| Low      | Every 6 hours | Every 4 hours |

### Monitored Data Sources

- **Spotify**: Tracks, Artists, Playlists, Albums
- **GitHub**: Repositories
- **Linear**: Issues (coming soon)
- **X (Twitter)**: Tweets (coming soon)

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_URL=redis://:myredissecret@localhost:6379

# Performance Tuning
ETL_CONCURRENCY=2          # Concurrent workers (default: 2)
ETL_BATCH_SIZE=50          # Items per batch (default: 50)

# Environment
NODE_ENV=development       # development | production

# Services Configuration
# Check the `.env` of the gateway package for the OAuth credentials
```

### Job Configuration

Edit `src/scheduler.entrypoint.ts` to customize jobs:

```typescript
const SCHEDULED_JOBS: JobConfig[] = [
  {
    name: SpotifyETLs.track,
    options: { limit: scheduleConfig.batchSize },
    cronExpression: scheduleConfig.highPriorityCron,
    priority: 1,        // 1 = highest priority
    enabled: true,     // Set to false to disable
  },
  // ... more jobs
];
```

## Usage

### Development

```bash
# Run jobs manually (one-time execution)
pnpm dev

# Start scheduler with cron-based scheduling
pnpm start
```

### Production

```bash
# Build
pnpm build

# Run
NODE_ENV=production node dist/scheduler.entrypoint.js
```

### Docker

```bash
docker compose build ait_scheduler && docker compose up -d ait_scheduler
```

## Architecture

```
Schedule (Cron + Priority) → Queue (BullMQ + Redis) → Worker (Concurrent) → ETL Task → Complete
```

**Components:**
- **Scheduler Service**: Manages job queue and worker lifecycle
- **Task Registry**: Registers and retrieves ETL handlers
- **Task Manager**: Connects ETL tasks with database clients
- **Worker**: Executes jobs with concurrency control

## Performance Tuning

**Concurrency:**
- Low CPU: `ETL_CONCURRENCY=1`
- Medium CPU: `ETL_CONCURRENCY=2` (default)
- High CPU: `ETL_CONCURRENCY=4`

**Batch Size:**
- Small datasets: `ETL_BATCH_SIZE=25`
- Medium datasets: `ETL_BATCH_SIZE=50` (default)
- Large datasets: `ETL_BATCH_SIZE=100`

**Production Checklist:**
- Set `NODE_ENV=production`
- Increase `ETL_BATCH_SIZE` for throughput
- Configure Redis persistence (AOF + RDB)
- Monitor Redis memory usage
- Set up job failure alerts

## Monitoring

Check job status via Redis:

```bash
redis-cli
> KEYS bull:etl-scheduler:*
> HGETALL bull:etl-scheduler:job-id
```

## Troubleshooting

**Jobs Not Running:**
1. Verify Redis: `redis-cli ping`
2. Check environment variables
3. Ensure jobs are enabled in configuration
4. Review logs for errors

**Slow Performance:**
- Increase `ETL_CONCURRENCY` and `ETL_BATCH_SIZE`
- Optimize database queries
- Check network latency to Redis

**Memory Issues:**
- Reduce `ETL_BATCH_SIZE` and `ETL_CONCURRENCY`
- Enable Redis eviction policies
- Increase system memory

## License

[MIT](../../LICENSE)
