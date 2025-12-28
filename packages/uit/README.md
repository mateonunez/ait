# UIt - AIt Web Interface

UIt is the web interface for AIt, providing a modern UI to interact with your connected data sources and AI capabilities.

## Overview

Built with React 19 + Vite, UIt offers:

- **Integration Dashboard**: View and manage connected services (GitHub, Spotify, Linear, X, etc.)
- **AI Chat**: Conversational interface with RAG-powered responses
- **Analytics**: System stats, performance metrics, and usage insights
- **Responsive Design**: Works on desktop and mobile devices

## Quick Start

```bash
# From repository root
pnpm install

# Start the UI development server
cd packages/uit
pnpm dev
```

The UI will be available at `http://localhost:5173` (or the port shown in terminal).

**Prerequisites:**
- Gateway API running at `https://localhost:3000` (see [Gateway README](../gateway/README.md))
- At least one OAuth integration configured

## Architecture

```
src/
├── components/           # React components
│   ├── ai-elements/     # AI chat UI elements (messages, suggestions, etc.)
│   ├── connectors/      # Integration-specific cards (track, repo, issue, etc.)
│   ├── discovery/       # Insights and analytics widgets
│   ├── home/            # Homepage components
│   ├── stats/           # Statistics dashboard components
│   └── ui/              # Reusable UI primitives (button, card, etc.)
├── contexts/            # React Context providers
├── hooks/               # Custom React hooks
├── pages/               # Page components (routes)
├── services/            # API service clients
├── styles/              # Theme and style utilities
├── types/               # TypeScript type definitions
└── utils/               # Utility functions
```

## Component Architecture

### Context Providers

UIt uses React Context for global state management:

```tsx
// Main providers hierarchy (in main.tsx)
<ThemeProvider>
  <AItProvider>          {/* Dialog state */}
    <ChatProvider>       {/* Chat state, user/session tracking */}
      <InsightsProvider> {/* AI insights data */}
        <App />
      </InsightsProvider>
    </ChatProvider>
  </AItProvider>
</ThemeProvider>
```

| Context | Purpose | Hook |
|---------|---------|------|
| `ChatProvider` | Chat dialog state, user/session tracking | `useChatDialog()` |
| `IntegrationsProvider` | Integration data caching and fetching | `useIntegrationsContext()` |
| `AItProvider` | Global dialog and expansion state | `useUIt()` |
| `InsightsProvider` | AI-generated insights and analytics | `useInsights()` |
| `StatsProvider` | System statistics and metrics | `useStats()` |

### Using Contexts

```tsx
import { useChatDialog } from '@/contexts/chat.context';
import { useIntegrationsContext } from '@/contexts/integrations.context';

function MyComponent() {
  const { openChat, isOpen } = useChatDialog();
  const { fetchEntityData, isLoading } = useIntegrationsContext();
  
  // Fetch Spotify tracks
  const tracks = await fetchEntityData('spotify', 'track', { limit: 10 });
  
  return (
    <button onClick={openChat}>
      Open AI Chat
    </button>
  );
}
```

## Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `HomePage` | Dashboard with recent activity from all integrations |
| `/integrations/github` | `GitHubPage` | GitHub repositories, PRs, commits |
| `/integrations/spotify` | `SpotifyPage` | Tracks, artists, playlists, albums |
| `/integrations/linear` | `LinearPage` | Linear issues and projects |
| `/integrations/x` | `XPage` | X (Twitter) tweets |
| `/integrations/notion` | `NotionPage` | Notion pages |
| `/integrations/slack` | `SlackPage` | Slack messages |
| `/integrations/google` | `GooglePage` | Calendar events, YouTube subscriptions, Contacts |
| `/stats` | `StatsPage` | System analytics and performance metrics |

## UI Components

### Primitives (`components/ui/`)

Built on [Radix UI](https://www.radix-ui.com/) primitives with [Tailwind CSS](https://tailwindcss.com/):

- `Button`, `ButtonGroup` - Action buttons with variants
- `Card` - Content containers
- `Dialog` - Modal dialogs
- `Input`, `Textarea` - Form inputs
- `Select`, `DropdownMenu` - Selection components
- `Tooltip`, `HoverCard` - Contextual information
- `Badge` - Status indicators
- `Progress` - Loading indicators
- `ScrollArea` - Scrollable containers

### Integration Cards (`components/connectors/`)

Specialized cards for each entity type:

```tsx
import { TrackCard } from '@/components/connectors/track-card';
import { RepositoryCard } from '@/components/connectors/repository-card';
import { IssueCard } from '@/components/connectors/issue-card';

// Usage
<TrackCard track={spotifyTrack} />
<RepositoryCard repository={githubRepo} />
<IssueCard issue={linearIssue} />
```

Available cards:
- **Spotify**: `TrackCard`, `ArtistCard`, `PlaylistCard`, `AlbumCard`, `RecentlyPlayedCard`
- **GitHub**: `RepositoryCard`, `PullRequestCard`, `CommitCard`
- **Linear**: `IssueCard`
- **X**: `TweetCard`
- **Notion**: `PageCard`
- **Slack**: `MessageCard`
- **Google**: `CalendarCard`, `EventCard`, `GoogleYouTubeSubscriptionCard`, `ContactCard`

### AI Elements (`components/ai-elements/`)

Chat interface components:

- `Message` - Chat message bubbles
- `PromptInput` - User input field
- `Suggestion`, `Suggestions` - AI-suggested queries
- `Sources` - RAG source citations
- `ChainOfThought` - Reasoning display
- `Reasoning` - Model reasoning steps
- `TaskManager` - Background task status
- `ModelSelector` - LLM model picker

## Services

API clients for each integration (`services/`):

```typescript
import { spotifyService, githubService, linearService } from '@/services';

// Fetch with pagination
const tracks = await spotifyService.fetchTracks({ limit: 50, page: 1 });
const repos = await githubService.fetchRepositories({ limit: 20 });

// Trigger sync
await spotifyService.refresh();
```

## Custom Hooks

| Hook | Purpose |
|------|---------|
| `useAItChat()` | AI chat streaming and message management |
| `useAiSuggestions()` | Fetch contextual suggestions |
| `useHomepageData()` | Aggregate data for homepage feed |
| `useMediaQuery()` | Responsive breakpoint detection |

### useAItChat Example

```tsx
import { useAItChat } from '@/hooks/useAItChat';

function ChatComponent() {
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    clearMessages 
  } = useAItChat();
  
  const handleSend = async (text: string) => {
    await sendMessage(text);
  };
  
  return (
    <div>
      {messages.map(msg => (
        <Message key={msg.id} message={msg} />
      ))}
      <PromptInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
```

## Configuration

### Environment Variables

```bash
# Vite dev server port (default: 5173)
VITE_PORT=5173

# Enable HTTPS for dev server
USE_HTTPS=false
```

### API Configuration

The UI connects to the Gateway API. Configure the base URL in `utils/http-client.ts`:

```typescript
// Default: relative to current host, or https://localhost:3000
const API_BASE_URL = '/api';
```

## Styling

### Theme System

UIt uses CSS variables for theming with dark/light mode support:

```tsx
import { ThemeProvider, useTheme } from '@/components/theme-provider';

function App() {
  const { theme, setTheme } = useTheme();
  
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle Theme
    </button>
  );
}
```

### Tailwind CSS

Utility-first CSS with custom configuration. See `tailwind.config.js` for theme extensions.

```tsx
// Example component styling
<div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
  <Avatar src={user.avatar} />
  <span className="text-sm text-muted-foreground">{user.name}</span>
</div>
```

## Development

### Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix
```

### Adding a New Integration Page

1. Create page component in `pages/integrations/`:

```tsx
// pages/integrations/new-service-page.tsx
import { IntegrationLayout } from '@/components/integration-layout';
import { useIntegrationsContext } from '@/contexts/integrations.context';

export default function NewServicePage() {
  const { fetchEntityData } = useIntegrationsContext();
  
  // Fetch and display data...
  
  return (
    <IntegrationLayout 
      title="New Service" 
      icon={NewServiceIcon}
    >
      {/* Content */}
    </IntegrationLayout>
  );
}
```

2. Add route in `App.tsx`:

```tsx
<Route path="/integrations/new-service" component={NewServicePage} />
```

3. Create entity card in `components/connectors/`:

```tsx
// components/connectors/new-entity-card.tsx
import { ConnectorCardBase } from './connector-card-base';

export function NewEntityCard({ entity }) {
  return (
    <ConnectorCardBase>
      {/* Card content */}
    </ConnectorCardBase>
  );
}
```

## Dependencies

Key dependencies:

| Package | Purpose |
|---------|---------|
| `react` 19 | UI framework |
| `wouter` | Lightweight routing |
| `@radix-ui/*` | Accessible UI primitives |
| `framer-motion` | Animations |
| `recharts` | Charts and graphs |
| `lucide-react` | Icons |
| `tailwindcss` 4 | Utility CSS |
| `shiki` | Syntax highlighting |
| `streamdown` | Streaming markdown rendering |

## License

[MIT](../../LICENSE)
