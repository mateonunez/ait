# AIt Scheduler

## Overview

The AIt Scheduler is a high-performance, priority-based job scheduler built on **BullMQ** and **Redis**. It manages ETL (Extract, Transform, Load) processes to keep your data synchronized between relational databases and vector databases for optimal AI performance.

## Features

### 🚀 Performance Optimizations

- **Concurrent Processing**: Configurable worker concurrency (default: 2 concurrent jobs)
- **Priority-Based Execution**: High-priority jobs run first (1 = highest, 3 = lowest)
- **Rate Limiting**: Prevents system overload (max 10 jobs per minute)
- **Exponential Backoff**: Smart retry strategy for failed jobs (3 attempts with 2s initial delay)
- **Job History**: Keeps last 100 completed jobs (1 hour) and failed jobs (24 hours)

### 🔄 Dynamic Scheduling

Environment-based scheduling adapts to your deployment:

| Priority | Development | Production |
|----------|-------------|------------|
| High     | Every 15 min | Every 5 min |
| Medium   | Hourly      | Every 2 hours |
| Low      | Every 6 hours | Every 4 hours |

### 📊 Monitored Data Sources

- **Spotify**: Tracks, Artists, Playlists, Albums
- **GitHub**: Repositories
- **Linear**: Issues (coming soon)
- **X (Twitter)**: Tweets (coming soon)

## Configuration

### Environment Variables

Create a `.env` file in the scheduler package:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379

# Scheduler Performance
ETL_CONCURRENCY=2          # Number of concurrent workers (default: 2)
ETL_BATCH_SIZE=50          # Items per ETL batch (default: 50)

# Environment
NODE_ENV=development       # development | production
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
    enabled: true,      // Set to false to disable
  },
  // ... more jobs
];
```

## Usage

### Development Mode

```bash
# Run jobs manually (one-time execution)
pnpm dev

# Start scheduler with cron-based scheduling
pnpm start
```

### Production Mode

```bash
# Build the scheduler
pnpm build

# Run in production
NODE_ENV=production node dist/scheduler.entrypoint.js
```

### Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN pnpm install --prod
COPY dist ./dist
CMD ["node", "dist/scheduler.entrypoint.js"]
```

## Architecture

### Components

1. **Scheduler Service**: Manages job queue and worker lifecycle
2. **Task Registry**: Registers and retrieves ETL handlers
3. **Task Manager**: Connects ETL tasks with database clients
4. **Worker**: Executes jobs with concurrency control

### Job Lifecycle

```
┌─────────────┐
│  Schedule   │ (Cron Expression + Priority)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Queue    │ (BullMQ + Redis)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Worker    │ (Concurrent Execution)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  ETL Task   │ (Database Sync)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Complete   │ (Success/Retry/Fail)
└─────────────┘
```

## Performance Tips

### Optimal Concurrency

- **Low CPU**: Set `ETL_CONCURRENCY=1`
- **Medium CPU**: Set `ETL_CONCURRENCY=2` (default)
- **High CPU**: Set `ETL_CONCURRENCY=4`

### Batch Size Tuning

- **Small datasets**: `ETL_BATCH_SIZE=25`
- **Medium datasets**: `ETL_BATCH_SIZE=50` (default)
- **Large datasets**: `ETL_BATCH_SIZE=100`

### Production Checklist

- ✅ Set `NODE_ENV=production`
- ✅ Increase `ETL_BATCH_SIZE` for better throughput
- ✅ Configure Redis persistence (AOF + RDB)
- ✅ Monitor Redis memory usage
- ✅ Set up job failure alerts
- ✅ Enable Redis cluster for high availability

## Monitoring

### Job Status

Check Redis for job status:

```bash
redis-cli
> KEYS bull:etl-scheduler:*
> HGETALL bull:etl-scheduler:job-id
```

### Logs

The scheduler provides detailed logging:

```
[Scheduler] Job "RetoveSpotifyTrackETL" scheduled with cron: */5 * * * * (priority: 1)
[Worker] Running job: RetoveSpotifyTrackETL (priority: 1)
[Worker] Job completed: RetoveSpotifyTrackETL (1234ms)
```

## Troubleshooting

### Jobs Not Running

1. Verify Redis is running: `redis-cli ping`
2. Check environment variables are set
3. Ensure jobs are enabled in configuration
4. Review logs for error messages

### Slow Performance

1. Increase `ETL_CONCURRENCY`
2. Increase `ETL_BATCH_SIZE`
3. Optimize database queries
4. Check network latency to Redis

### Memory Issues

1. Reduce `ETL_BATCH_SIZE`
2. Decrease `ETL_CONCURRENCY`
3. Enable Redis eviction policies
4. Increase system memory

## API Reference

### Scheduler Methods

```typescript
// Schedule a recurring job
await scheduler.scheduleJob(jobName, data, cronExpression, priority);

// Add a one-time job
await scheduler.addJob(jobName, data, { priority: 1 });

// Start the scheduler
await scheduler.start();

// Stop the scheduler gracefully
await scheduler.stop();
```

### Task Registry Methods

```typescript
// Register a task handler
schedulerRegistry.register(taskName, async (data) => {
  // Your task logic
});

// Check if task exists
const exists = schedulerRegistry.has(taskName);

// List all registered tasks
const tasks = schedulerRegistry.list();
```

## License

[MIT](../../LICENSE)
