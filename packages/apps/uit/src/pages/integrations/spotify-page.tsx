import { AlbumCard } from "@/components/connectors/album-card";
import { ArtistCard } from "@/components/connectors/artist-card";
import { PlaylistCard } from "@/components/connectors/playlist-card";
import { RecentlyPlayedCard } from "@/components/connectors/recently-played-card";
import { TrackCard } from "@/components/connectors/track-card";
import { IntegrationLayout } from "@/components/integration-layout";
import { IntegrationTabs } from "@/components/integration-tabs";
import { LoadingGrid } from "@/components/loading-grid";
import { Pagination } from "@/components/pagination";
import { useIntegrationsContext } from "@/contexts/integrations.context";
import { getLogger } from "@ait/core";
import type {
  SpotifyAlbumEntity as SpotifyAlbum,
  SpotifyArtistEntity as SpotifyArtist,
  SpotifyPlaylistEntity as SpotifyPlaylist,
  SpotifyRecentlyPlayedEntity as SpotifyRecentlyPlayed,
  SpotifyTrackEntity as SpotifyTrack,
} from "@ait/core";
import { useCallback, useEffect, useState } from "react";

const logger = getLogger();

type TabId = "tracks" | "artists" | "playlists" | "albums" | "recently-played";

export default function SpotifyPage() {
  const { fetchEntityData, refreshVendor, clearCache } = useIntegrationsContext();
  const [activeTab, setActiveTab] = useState<TabId>("tracks");
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [artists, setArtists] = useState<SpotifyArtist[]>([]);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [albums, setAlbums] = useState<SpotifyAlbum[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<SpotifyRecentlyPlayed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTracks, setTotalTracks] = useState(0);
  const [totalArtists, setTotalArtists] = useState(0);
  const [totalPlaylists, setTotalPlaylists] = useState(0);
  const [totalAlbums, setTotalAlbums] = useState(0);
  const [totalRecentlyPlayed, setTotalRecentlyPlayed] = useState(0);
  const pageSize = 50;

  const fetchData = useCallback(
    async (page: number) => {
      setIsLoading(true);
      try {
        switch (activeTab) {
          case "tracks": {
            const response = await fetchEntityData("spotify", "spotify_track", { page, limit: pageSize });
            setTracks(response.data as SpotifyTrack[]);
            setTotalPages(response.pagination.totalPages);
            setTotalTracks(response.pagination.total);
            break;
          }
          case "artists": {
            const response = await fetchEntityData("spotify", "spotify_artist", { page, limit: pageSize });
            setArtists(response.data as SpotifyArtist[]);
            setTotalPages(response.pagination.totalPages);
            setTotalArtists(response.pagination.total);
            break;
          }
          case "playlists": {
            const response = await fetchEntityData("spotify", "spotify_playlist", { page, limit: pageSize });
            setPlaylists(response.data as SpotifyPlaylist[]);
            setTotalPages(response.pagination.totalPages);
            setTotalPlaylists(response.pagination.total);
            break;
          }
          case "albums": {
            const response = await fetchEntityData("spotify", "spotify_album", { page, limit: pageSize });
            setAlbums(response.data as SpotifyAlbum[]);
            setTotalPages(response.pagination.totalPages);
            setTotalAlbums(response.pagination.total);
            break;
          }
          case "recently-played": {
            const response = await fetchEntityData("spotify", "spotify_recently_played", { page, limit: pageSize });
            setRecentlyPlayed(response.data as SpotifyRecentlyPlayed[]);
            setTotalPages(response.pagination.totalPages);
            setTotalRecentlyPlayed(response.pagination.total);
            break;
          }
        }
      } catch (error) {
        logger.error("Failed to fetch Spotify data:", { error });
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab, fetchEntityData],
  );

  const handleRefresh = async (selectedIds?: string[]) => {
    setIsRefreshing(true);
    try {
      const entitiesToRefresh = selectedIds && selectedIds.length > 0 ? selectedIds : undefined;

      if (entitiesToRefresh) {
        const { spotifyService } = await import("@/services/spotify.service");
        await spotifyService.refresh(entitiesToRefresh);
        clearCache("spotify");
      } else {
        await refreshVendor("spotify");
      }

      await fetchData(currentPage);
    } catch (error) {
      logger.error("Failed to refresh Spotify data:", { error });
    } finally {
      setIsRefreshing(false);
    }
  };

  const availableEntities = [
    { id: "tracks", label: "Tracks" },
    { id: "artists", label: "Artists" },
    { id: "playlists", label: "Playlists" },
    { id: "albums", label: "Albums" },
    { id: "recently-played", label: "Recently Played" },
  ];

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as TabId);
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchData(currentPage);
  }, [fetchData, currentPage]);

  const tabs = [
    { id: "tracks", label: "Tracks", count: totalTracks },
    { id: "artists", label: "Artists", count: totalArtists },
    { id: "playlists", label: "Playlists", count: totalPlaylists },
    { id: "albums", label: "Albums", count: totalAlbums },
    { id: "recently-played", label: "Recently Played", count: totalRecentlyPlayed },
  ];

  const getCurrentData = () => {
    switch (activeTab) {
      case "tracks":
        return tracks;
      case "artists":
        return artists;
      case "playlists":
        return playlists;
      case "albums":
        return albums;
      case "recently-played":
        return recentlyPlayed;
      default:
        return [];
    }
  };

  return (
    <IntegrationLayout
      vendor="spotify"
      title="Spotify"
      description="Now playing"
      color="#1DB954"
      onRefresh={handleRefresh}
      availableEntities={availableEntities}
      activeEntityId={activeTab}
      isRefreshing={isRefreshing}
    >
      <div className="space-y-6">
        <IntegrationTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

        {isLoading ? (
          <LoadingGrid count={12} />
        ) : (
          <>
            {activeTab === "tracks" && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {tracks.map((track) => (
                  <TrackCard key={track.id} track={track} />
                ))}
              </div>
            )}

            {activeTab === "artists" && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {artists.map((artist) => (
                  <ArtistCard key={artist.id} artist={artist} />
                ))}
              </div>
            )}

            {activeTab === "playlists" && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {playlists.map((playlist) => (
                  <PlaylistCard key={playlist.id} playlist={playlist} />
                ))}
              </div>
            )}

            {activeTab === "albums" && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {albums.map((album) => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            )}

            {activeTab === "recently-played" && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {recentlyPlayed.map((item) => (
                  <RecentlyPlayedCard key={item.id} recentlyPlayed={item} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center py-8">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            )}

            {getCurrentData().length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-lg text-muted-foreground">No data found</p>
                <p className="text-sm text-muted-foreground mt-2">Try refreshing or connecting your Spotify account</p>
              </div>
            )}
          </>
        )}
      </div>
    </IntegrationLayout>
  );
}
