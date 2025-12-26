# Store

## Overview

The Store package (`@ait/store`) provides internal application data persistence through repositories and services. It handles storage and retrieval of user-generated application data such as conversations, messages, feedback, and goals.

## Features

- **Conversation Management**: Store and retrieve chat conversations with full message history
- **Feedback Collection**: Track user feedback on AI responses
- **Goal Tracking**: Manage user-defined goals and objectives

## Usage

```typescript
import { ConversationService, FeedbackService, GoalService } from '@ait/store';

// Manage conversations
const conversationService = new ConversationService();
const conversation = await conversationService.create({ userId: 'user-123' });

// Store feedback
const feedbackService = new FeedbackService();
await feedbackService.create({
  conversationId: conversation.id,
  rating: 5,
  comment: 'Great response!'
});

// Track goals
const goalService = new GoalService();
await goalService.create({
  userId: 'user-123',
  title: 'Learn TypeScript',
  description: 'Complete TypeScript fundamentals course'
});
```

## Architecture

The package follows a repository pattern:

- **Repositories**: Direct database access using Drizzle ORM
- **Services**: Business logic and higher-level operations

## Dependencies

- `@ait/core` - Shared utilities and types
- `@ait/postgres` - Database client and schema definitions
- `drizzle-orm` - Type-safe ORM for PostgreSQL

## License

[MIT](../../LICENSE)
