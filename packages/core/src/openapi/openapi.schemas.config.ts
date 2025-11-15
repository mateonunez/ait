export interface OpenApiSchemaConfig {
  url: string;
  outputPath: string;
  version: string;
}

export const openApiSchemas: Record<string, OpenApiSchemaConfig> = {
  spotify: {
    url: "https://developer.spotify.com/reference/web-api/open-api-schema.yaml",
    outputPath: "./src/types/openapi/openapi.spotify.types.ts",
    version: "1.0.0",
  },
  github: {
    url: "https://raw.githubusercontent.com/github/rest-api-description/refs/heads/main/descriptions/api.github.com/api.github.com.yaml",
    outputPath: "./src/types/openapi/openapi.github.types.ts",
    version: "2.1.0",
  },
  x: {
    url: "https://api.twitter.com/2/openapi.json", // Official Twitter API v2 OpenAPI spec
    outputPath: "./src/types/openapi/openapi.x.types.ts",
    version: "2.126",
  },
};
