import { useState, useEffect, useCallback } from "react";
import { IntegrationLayout } from "@/components/integration-layout";
import { IntegrationTabs } from "@/components/integration-tabs";
import { Pagination } from "@/components/pagination";
import { LoadingGrid } from "@/components/loading-grid";
import { TrackCard } from "@/components/connectors/track-card";
import { ArtistCard } from "@/components/connectors/artist-card";
import { PlaylistCard } from "@/components/connectors/playlist-card";
import { AlbumCard } from "@/components/connectors/album-card";
import { RecentlyPlayedCard } from "@/components/connectors/recently-played-card";
import { spotifyService } from "@/services";
import type {
  SpotifyTrack,
  SpotifyArtist,
  SpotifyPlaylist,
  SpotifyAlbum,
  SpotifyRecentlyPlayed,
} from "@/services/types";

type TabId = "tracks" | "artists" | "playlists" | "albums" | "recently-played";

export default function SpotifyPage() {
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
            const response = await spotifyService.getTracks({ page, limit: pageSize });
            setTracks(response.data);
            setTotalPages(response.pagination.totalPages);
            setTotalTracks(response.pagination.total);
            break;
          }
          case "artists": {
            const response = await spotifyService.getArtists({ page, limit: pageSize });
            setArtists(response.data);
            setTotalPages(response.pagination.totalPages);
            setTotalArtists(response.pagination.total);
            break;
          }
          case "playlists": {
            const response = await spotifyService.getPlaylists({ page, limit: pageSize });
            setPlaylists(response.data);
            setTotalPages(response.pagination.totalPages);
            setTotalPlaylists(response.pagination.total);
            break;
          }
          case "albums": {
            const response = await spotifyService.getAlbums({ page, limit: pageSize });
            setAlbums(response.data);
            setTotalPages(response.pagination.totalPages);
            setTotalAlbums(response.pagination.total);
            break;
          }
          case "recently-played": {
            const response = await spotifyService.getRecentlyPlayed({ page, limit: pageSize });
            setRecentlyPlayed(response.data);
            setTotalPages(response.pagination.totalPages);
            setTotalRecentlyPlayed(response.pagination.total);
            break;
          }
        }
      } catch (error) {
        console.error("Failed to fetch Spotify data:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab],
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await spotifyService.refresh();
      await fetchData(currentPage);
    } catch (error) {
      console.error("Failed to refresh Spotify data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

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
      title="Spotify"
      description="Now playing"
      color="#1DB954"
      onRefresh={handleRefresh}
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
