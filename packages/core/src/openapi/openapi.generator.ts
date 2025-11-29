import { exec } from "node:child_process";
import { AItError } from "../errors/ait-error";
import {
  openApiSchemas,
  type OpenApiSchemaConfig,
} from "./openapi.schemas.config";
import { getLogger } from "../logging/logger";

const logger = getLogger();

function generateTypesForSchema(
  schemaKey: string,
  config: OpenApiSchemaConfig
): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = `npx openapi-typescript ${config.url} --output ${config.outputPath} --redocly`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(`Error generating types for ${schemaKey}: ${stderr}`);
      }
      logger.info(`Successfully generated types for ${schemaKey}`);
      resolve();
    });
  });
}

async function generateAllTypes(): Promise<void> {
  const results: Array<{ key: string; success: boolean; error?: string }> = [];

  for (const schemaKey of Object.keys(openApiSchemas)) {
    const schema = openApiSchemas[schemaKey];
    if (!schema) {
      throw new AItError(
        "OPENAPI_CONFIG_MISSING",
        `Schema configuration not found for key: ${schemaKey}`
      );
    }

    try {
      await generateTypesForSchema(schemaKey, schema);
      results.push({ key: schemaKey, success: true });
    } catch (error) {
      logger.warn(`⚠️  Warning: Could not generate types for ${schemaKey}`);
      logger.warn(`   ${error}`);
      results.push({
        key: schemaKey,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  logger.info(
    `\n✓ Successfully generated ${successful.length}/${results.length} schemas`
  );
  if (failed.length > 0) {
    logger.warn(
      `⚠️  Failed to generate ${failed.length} schema(s): ${failed
        .map((f) => f.key)
        .join(", ")}`
    );
  }
}

generateAllTypes().catch((error) => {
  logger.error(error);
  process.exit(1);
});
