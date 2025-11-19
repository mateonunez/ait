# Redis

## Overview

Redis provides job queue management for the AIt scheduler using BullMQ. It handles ETL job scheduling, prioritization, and retry logic.

## Quick Start

Redis is automatically started with other services:

```bash
pnpm start:services  # From root directory
```

The service runs on `localhost:6379` by default.

## Configuration

Set the following environment variable to customize the connection:

```bash
REDIS_URL=redis://:myredissecret@localhost:6379
```

## Usage

Redis is used by the [Scheduler](../scheduler/README.md) for:
- Job queue management
- Job prioritization
- Retry logic
- Job history tracking

See the [Scheduler documentation](../scheduler/README.md) for configuration and usage details.

## Development

Access Redis CLI:

```bash
docker exec -it ait_redis redis-cli
```

## License

[MIT](../../LICENSE)
