import { AlbumCard } from "@/components/connectors/album-card";
import { ArtistCard } from "@/components/connectors/artist-card";
import { CalendarCard } from "@/components/connectors/calendar-card";
import { CommitCard } from "@/components/connectors/commit-card";
import { EventCard } from "@/components/connectors/event-card";
import { GoogleYouTubeSubscriptionCard } from "@/components/connectors/google-youtube-subscription-card";
import { IssueCard } from "@/components/connectors/issue-card";
import { MessageCard } from "@/components/connectors/message-card";
import { PageCard } from "@/components/connectors/page-card";
import { PlaylistCard } from "@/components/connectors/playlist-card";
import { PullRequestCard } from "@/components/connectors/pull-request-card";
import { RecentlyPlayedCard } from "@/components/connectors/recently-played-card";
import { RepositoryCard } from "@/components/connectors/repository-card";
import { TrackCard } from "@/components/connectors/track-card";
import { TweetCard } from "@/components/connectors/tweet-card";
import type { IntegrationEntity } from "@/types/integrations.types";
import type {
  GitHubCommitEntity,
  GitHubPullRequestEntity,
  GitHubRepositoryEntity,
  GoogleCalendarCalendarEntity,
  GoogleCalendarEventEntity,
  GoogleYouTubeSubscriptionEntity,
  LinearIssueEntity,
  NotionPageEntity,
  SlackMessageEntity,
  SpotifyAlbumEntity,
  SpotifyArtistEntity,
  SpotifyPlaylistEntity,
  SpotifyRecentlyPlayedEntity,
  SpotifyTrackEntity,
  XTweetEntity,
} from "@ait/core";

export function renderCard(item: IntegrationEntity, onClick?: () => void) {
  const type = (item as any).__type;

  switch (type) {
    case "track":
      return <TrackCard track={item as SpotifyTrackEntity} onClick={onClick} />;
    case "artist":
      return <ArtistCard artist={item as SpotifyArtistEntity} onClick={onClick} />;
    case "playlist":
      return <PlaylistCard playlist={item as SpotifyPlaylistEntity} onClick={onClick} />;
    case "album":
      return <AlbumCard album={item as SpotifyAlbumEntity} onClick={onClick} />;
    case "recently_played":
      return <RecentlyPlayedCard recentlyPlayed={item as SpotifyRecentlyPlayedEntity} onClick={onClick} />;
    case "repository":
      return <RepositoryCard repository={item as GitHubRepositoryEntity} onClick={onClick} />;
    case "pull_request":
      return <PullRequestCard pullRequest={item as GitHubPullRequestEntity} onClick={onClick} />;
    case "commit":
      return <CommitCard commit={item as GitHubCommitEntity} onClick={onClick} />;
    case "issue":
      return <IssueCard issue={item as LinearIssueEntity} onClick={onClick} />;
    case "tweet":
      return <TweetCard tweet={item as XTweetEntity} onClick={onClick} />;
    case "page":
      return <PageCard page={item as NotionPageEntity} onClick={onClick} />;
    case "message":
      return <MessageCard message={item as SlackMessageEntity} onClick={onClick} />;
    case "event":
      return <EventCard event={item as GoogleCalendarEventEntity} onClick={onClick} />;
    case "calendar":
      return <CalendarCard calendar={item as GoogleCalendarCalendarEntity} onClick={onClick} />;
    case "subscription":
      return <GoogleYouTubeSubscriptionCard subscription={item as GoogleYouTubeSubscriptionEntity} onClick={onClick} />;
    default:
      return null;
  }
}
