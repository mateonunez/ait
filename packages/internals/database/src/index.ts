import { db, dbClose } from "./db.client";
import * as githubSchema from "./schemas/connector.github.schema";
import * as spotifySchema from "./schemas/connector.spotify.schema";

export { db, dbClose, githubSchema, spotifySchema };
