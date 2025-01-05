import { SpotifyTrackETL } from './etl/spotify/spotify.etl';
import { getQdrantClient } from '@ait/qdrant';
import { getPostgresClient, closePostgresConnection } from '@ait/postgres';

async function main() {
  try {
    const qdrantClient = getQdrantClient();
    const pgClient = getPostgresClient();
    const etl = new SpotifyTrackETL(pgClient, qdrantClient);
    await etl.run(100);
  } catch (error) {
    console.error('ETL error:', error);
  } finally {
    await closePostgresConnection();
  }
}

main();
