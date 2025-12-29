# @ait/storage

S3-compatible object storage utilities for AIt (MinIO in local dev). Used for binary assets like Google Photos media bytes.

## Overview

This package wraps the AWS S3 client with MinIO-friendly defaults (`forcePathStyle: true`) and provides:
- `StorageService`: bucket management + upload/get
- `PhotoStorageService`: download Google Photos `baseUrl` bytes and persist them to object storage
- `STORAGE_BUCKETS`: shared bucket names (`photos`, `avatars`, `documents`)

## Environment Variables

```bash
MINIO_REGION=us-east-1
MINIO_ENDPOINT=http://localhost:9090
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=miniosecret
```

Notes:
- With the repo’s `docker-compose.yml`, MinIO is exposed on **`9090`** (S3 API) and **`9091`** (console).
- Buckets are created lazily on first upload.

## Usage

### Upload an object

```ts
import { storageService, STORAGE_BUCKETS } from "@ait/storage";

await storageService.upload(
  STORAGE_BUCKETS.DOCUMENTS,
  "notes/hello.txt",
  "hello world",
  "text/plain",
);
```

### Download & store Google Photos bytes

```ts
import { photoStorageService } from "@ait/storage";

const result = await photoStorageService.downloadAndStore({
  id: "photo-id",
  baseUrl: "https://lh3.googleusercontent.com/...",
  filename: "photo.jpg",
  mimeType: "image/jpeg",
  accessToken: process.env.GOOGLE_ACCESS_TOKEN,
});

if (!result.success) throw new Error(result.error);
console.log("Stored at:", result.localPath); // e.g. "photos/<id>/<filename>"
```

## License

[MIT](../../LICENSE)

