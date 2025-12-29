# Gateway Refresh API Reference

The Gateway provides a **unified refresh API** for all vendors. Each endpoint supports selective entity refresh via the `?entities=` query parameter.

## Quick Reference

| Vendor | Base Endpoint | Available Entities |
|--------|---------------|-------------------|
| GitHub | `POST /api/github/refresh` | `repositories`, `pull-requests`, `commits`, `files` |
| Spotify | `POST /api/spotify/refresh` | `tracks`, `artists`, `playlists`, `albums`, `recently-played` |
| Google | `POST /api/google/refresh` | `events`, `calendars`, `subscriptions`, `contacts` |
| Linear | `POST /api/linear/refresh` | `issues` |
| Notion | `POST /api/notion/refresh` | `pages` |
| Slack | `POST /api/slack/refresh` | `messages` |
| X | `POST /api/x/refresh` | `tweets` |

## Usage

### Refresh All Entities (Default)

```bash
curl -X POST https://localhost:3000/api/github/refresh
```

### Refresh Specific Entities

```bash
# Single entity
curl -X POST "https://localhost:3000/api/github/refresh?entities=files"

# Multiple entities
curl -X POST "https://localhost:3000/api/spotify/refresh?entities=tracks,artists"
```

## Full Examples

### GitHub

```bash
# All entities
curl -X POST https://localhost:3000/api/github/refresh

# Only repositories
curl -X POST "https://localhost:3000/api/github/refresh?entities=repositories"

# Only code files (with specific repo)
curl -X POST "https://localhost:3000/api/github/refresh?entities=files&repo=mateonunez/ait&branch=main"

# Commits + Pull Requests
curl -X POST "https://localhost:3000/api/github/refresh?entities=commits,pull-requests"
```

### Spotify

```bash
# All entities
curl -X POST https://localhost:3000/api/spotify/refresh

# Only tracks
curl -X POST "https://localhost:3000/api/spotify/refresh?entities=tracks"

# Recently played + playlists
curl -X POST "https://localhost:3000/api/spotify/refresh?entities=recently-played,playlists"
```

### Google

```bash
# All entities
curl -X POST https://localhost:3000/api/google/refresh

# Only calendar events
curl -X POST "https://localhost:3000/api/google/refresh?entities=events"

# YouTube subscriptions
curl -X POST "https://localhost:3000/api/google/refresh?entities=subscriptions"

# Google Contacts
curl -X POST "https://localhost:3000/api/google/refresh?entities=contacts"
```

### Linear

```bash
curl -X POST https://localhost:3000/api/linear/refresh
curl -X POST "https://localhost:3000/api/linear/refresh?entities=issues"
```

### Notion

```bash
curl -X POST https://localhost:3000/api/notion/refresh
curl -X POST "https://localhost:3000/api/notion/refresh?entities=pages"
```

### Slack

```bash
curl -X POST https://localhost:3000/api/slack/refresh
curl -X POST "https://localhost:3000/api/slack/refresh?entities=messages"
```

### X (Twitter)

```bash
curl -X POST https://localhost:3000/api/x/refresh
curl -X POST "https://localhost:3000/api/x/refresh?entities=tweets"
```

## Response Format

All refresh endpoints return:

```json
{
  "success": true,
  "slack_message": "GitHub data refreshed successfully",
  "counts": {
    "repositories": 42,
    "pullRequests": 15,
    "commits": 100,
    "files": 250
  }
}
```

Only entities that were refreshed will appear in `counts`.
