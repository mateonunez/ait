import { AlbumCard } from "@/components/connectors/album-card";
import { ArtistCard } from "@/components/connectors/artist-card";
import { CalendarCard } from "@/components/connectors/calendar-card";
import { CommitCard } from "@/components/connectors/commit-card";
import { EventCard } from "@/components/connectors/event-card";
import { GitHubIssueCard } from "@/components/connectors/github-issue-card";
import { GmailMessageCard } from "@/components/connectors/gmail-message-card";
import { GoogleContactCard } from "@/components/connectors/google-contact-card";
import { GooglePhotoCard } from "@/components/connectors/google-photo-card";
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
  GitHubIssueEntity,
  GitHubPullRequestEntity,
  GitHubRepositoryEntity,
  GmailMessageEntity,
  GoogleCalendarCalendarEntity,
  GoogleCalendarEventEntity,
  GoogleContactEntity,
  GooglePhotoEntity,
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
    case "spotify_track":
      return <TrackCard track={item as SpotifyTrackEntity} onClick={onClick} />;
    case "spotify_artist":
      return <ArtistCard artist={item as SpotifyArtistEntity} onClick={onClick} />;
    case "spotify_playlist":
      return <PlaylistCard playlist={item as SpotifyPlaylistEntity} onClick={onClick} />;
    case "spotify_album":
      return <AlbumCard album={item as SpotifyAlbumEntity} onClick={onClick} />;
    case "spotify_recently_played":
      return <RecentlyPlayedCard recentlyPlayed={item as SpotifyRecentlyPlayedEntity} onClick={onClick} />;
    case "github_repository":
      return <RepositoryCard repository={item as GitHubRepositoryEntity} onClick={onClick} />;
    case "github_pull_request":
      return <PullRequestCard pullRequest={item as GitHubPullRequestEntity} onClick={onClick} />;
    case "github_commit":
      return <CommitCard commit={item as GitHubCommitEntity} onClick={onClick} />;
    case "github_issue":
      return <GitHubIssueCard issue={item as unknown as GitHubIssueEntity} onClick={onClick} />;
    case "linear_issue":
      return <IssueCard issue={item as LinearIssueEntity} onClick={onClick} />;
    case "x_tweet":
      return <TweetCard tweet={item as XTweetEntity} onClick={onClick} />;
    case "notion_page":
      return <PageCard page={item as NotionPageEntity} onClick={onClick} />;
    case "slack_message":
      return <MessageCard message={item as SlackMessageEntity} onClick={onClick} />;
    case "google_calendar_event":
      return <EventCard event={item as GoogleCalendarEventEntity} onClick={onClick} />;
    case "google_calendar_calendar":
      return <CalendarCard calendar={item as GoogleCalendarCalendarEntity} onClick={onClick} />;
    case "google_youtube_subscription":
      return <GoogleYouTubeSubscriptionCard subscription={item as GoogleYouTubeSubscriptionEntity} onClick={onClick} />;
    case "google_contact":
      return <GoogleContactCard contact={item as GoogleContactEntity} onClick={onClick} />;
    case "google_photo":
      return <GooglePhotoCard photo={item as GooglePhotoEntity} />;
    case "gmail_message":
      return <GmailMessageCard item={item as unknown as GmailMessageEntity} onClick={onClick} />;
    default:
      return null;
  }
}
