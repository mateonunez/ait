import { QdrantClient } from "@qdrant/js-client-rest";

(async () => {
  // 1) Connect to Qdrant (make sure QDRANT_URL is correct).
  const client = new QdrantClient({ url: "http://127.0.0.1:6333" });

  // 2) Create a collection with 2 dimensions (if it doesn’t exist).
  //    If you already have one, skip this or delete + recreate.
  await client.createCollection("example_collection", {
    vectors: {
      size: 2,
      distance: "Cosine",
    },
  });

  // 3) Upsert a single point with ID=1
  //    – vector is 2D: [0.1, 0.2]
  //    – payload has 'name' and 'artist'
  const response = await client.upsert("example_collection", {
    wait: true,
    points: [
      {
        id: 1, // numeric ID
        vector: [0.1, 0.2],
        payload: { name: "dummy", artist: "dummy" },
      },
    ],
  });

  console.log("Upsert response:", response);

  /*
   Typical success structure:
   {
     result: {
       operation_id: number,
       status: "completed"
     },
     status: "ok",
     time: 0.0123
   }
  */

   // 4) Search for the nearest point to [0.1, 0.2]
    const searchResponse = await client.search("example_collection", {
      vector: [0.1, 0.2],
    });

    console.log("Search response:", searchResponse);

    // 5) Delete the collection
    await client.deleteCollection("example_collection");
})();
