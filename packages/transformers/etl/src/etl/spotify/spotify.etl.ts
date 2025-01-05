import type { getPostgresClient, SpotifyTrackDataTarget } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import { spotifyTracks } from "@ait/postgres";
import { generateEmbeddings } from "../../infrastructure/embeddings/etl.embeddings.service";

interface VectorPoint {
  id: number;
  vector: number[];
  payload: {
    name: string;
    artist: string;
  };
}

interface IBasicETL {
  run(limit: number): Promise<void>;
}

interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
}

export class SpotifyTrackETL implements IBasicETL {
  private readonly _collectionName = "spotify_tracks_collection";
  private readonly _batchSize = 100;
  private readonly _vectorSize = 2048; // Size of embedding vectors

  constructor(
    private readonly _pgClient: ReturnType<typeof getPostgresClient>,
    private readonly _qdrantClient: qdrant.QdrantClient,
    private readonly _retryOptions: RetryOptions = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 5000,
    }
  ) {}

  public async run(limit: number): Promise<void> {
    try {
      console.log(`Starting ETL process with limit: ${limit}`);
      await this._ensureCollectionExists();

      const tracks = await this._extract(limit);
      console.log(`Extracted ${tracks.length} tracks`);

      const points = await this._transform(tracks);
      console.log(`Transformed tracks into ${points.length} vector points`);

      await this._load(points);
      console.log("ETL process completed successfully");
    } catch (error) {
      console.error("ETL process failed:", error);
      throw error;
    }
  }

  private async _ensureCollectionExists(): Promise<void> {
    try {
      const collections = await this.retry(() =>
        this._qdrantClient.getCollections()
      );

      const collectionExists = collections.collections.some(
        (collection) => collection.name === this._collectionName
      );

      if (collectionExists) {
        console.log(`Deleting existing collection: ${this._collectionName}`);
        await this.retry(() =>
          this._qdrantClient.deleteCollection(this._collectionName)
        );
      }

      console.log(`Creating collection: ${this._collectionName}`);
      await this.retry(() =>
        this._qdrantClient.createCollection(this._collectionName, {
          vectors: {
            size: this._vectorSize,
            distance: "Cosine",
          },
          optimizers_config: {
            default_segment_number: 2,
          },
          replication_factor: 1,
        })
      );

      console.log(`Collection created: ${this._collectionName}`);
    } catch (error: any) {
      console.error(`Failed to ensure collection exists: ${error.message}`);
      throw error;
    }
  }

  private async _extract(limit: number): Promise<SpotifyTrackDataTarget[]> {
    console.log(`Extracting up to ${limit} tracks from the database`);
    try {
      return await this._pgClient.db.transaction(async (tx) => {
        const result = await tx
          .select({
            id: spotifyTracks.id,
            name: spotifyTracks.name,
            artist: spotifyTracks.artist,
            album: spotifyTracks.album,
            durationMs: spotifyTracks.durationMs,
            popularity: spotifyTracks.popularity,
            createdAt: spotifyTracks.createdAt,
            updatedAt: spotifyTracks.updatedAt,
          })
          .from(spotifyTracks)
          .limit(limit)
          .execute();
        return result;
      });
    } catch (error: any) {
      console.error(`Database extraction failed: ${error.message}`);
      throw error;
    }
  }

  private async _transform(
    tracks: SpotifyTrackDataTarget[]
  ): Promise<VectorPoint[]> {
    console.log(`Transforming ${tracks.length} tracks`);
    try {
      const points: VectorPoint[] = [];

      for (const [index, track] of tracks.entries()) {
        const vector = await generateEmbeddings(
          `${track.name} ${track.artist}`
        );

        // Validate vector dimensions
        if (vector.length !== this._vectorSize) {
          throw new Error(
            `Invalid vector size: ${vector.length}. Expected: ${this._vectorSize}`
          );
        }

        points.push({
          id: index + 1,
          vector,
          payload: {
            name: track.name,
            artist: track.artist,
          },
        });
      }

      console.log(`Transformed ${points.length} tracks into vector points`);
      return points;
    } catch (error: any) {
      console.error(`Transform operation failed: ${error.message}`);
      throw error;
    }
  }

  private async _load(points: VectorPoint[]): Promise<void> {
    console.log(
      `Loading ${points.length} vector points into Qdrant in batches of ${this._batchSize}`
    );

    try {
      for (let i = 0; i < points.length; i += this._batchSize) {
        const batch = points.slice(i, i + this._batchSize);
        const batchNumber = Math.floor(i / this._batchSize) + 1;
        const totalBatches = Math.ceil(points.length / this._batchSize);

        console.log(`Processing batch ${batchNumber}/${totalBatches}`);
        await this._loadBatch(batch);
        console.log(`Completed batch ${batchNumber}/${totalBatches}`);
      }

      console.log(
        `Successfully loaded all ${points.length} vector points into Qdrant`
      );
    } catch (error: any) {
      console.error(`Load operation failed: ${error.message}`);
      throw error;
    }
  }

  private async _loadBatch(points: VectorPoint[]): Promise<void> {
    const upsertPoints = points.map((point) => ({
      id: point.id,
      vector: point.vector,
      payload: point.payload,
    }));

    await this.retry(async () => {
      try {
        const result = await this._qdrantClient.upsert(this._collectionName, {
          wait: true,
          points: upsertPoints,
        });
        console.debug(result);
      } catch (error: any) {
        console.error(`Batch upload failed: ${error.message}`);
        throw error;
      }
    });
  }

  private async retry<T>(
    operation: () => Promise<T>,
    retryCount = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retryCount >= this._retryOptions.maxRetries) {
        throw error;
      }

      const delay = Math.min(
        this._retryOptions.initialDelay * 2 ** retryCount,
        this._retryOptions.maxDelay
      );

      console.log(
        `Retry ${retryCount + 1}/${this._retryOptions.maxRetries} after ${delay}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));

      return this.retry(operation, retryCount + 1);
    }
  }
}
