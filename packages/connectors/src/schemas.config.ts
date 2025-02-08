export interface SchemaConfig {
  url: string;
  outputPath: string;
}

export const schemas: Record<string, SchemaConfig> = {
  spotify: {
    url: "https://developer.spotify.com/reference/web-api/open-api-schema.yaml",
    outputPath: "./src/types/openapi/spotify.types.ts",
  },
  // Future schemas can be added here:
  // github: {
  //   url: "https://api.github.com/openapi.yaml",
  //   outputPath: "./packages/connectors/src/types/github-openapi-types.ts",
  // },
};
