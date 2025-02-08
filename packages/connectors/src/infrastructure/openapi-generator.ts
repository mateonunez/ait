import { schemas, type SchemaConfig } from "@/schemas.config";
import { exec } from "node:child_process";

function generateTypesForSchema(schemaKey: string, config: SchemaConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = `npx openapi-typescript ${config.url} --output ${config.outputPath}`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(`Error generating types for ${schemaKey}: ${stderr}`);
      }
      console.info(`Successfully generated types for ${schemaKey}`);
      resolve();
    });
  });
}

async function generateAllTypes(): Promise<void> {
  for (const schemaKey of Object.keys(schemas)) {
    const schema = schemas[schemaKey];
    if (!schema) {
      throw new Error(`Schema configuration not found for key: ${schemaKey}`);
    }
    await generateTypesForSchema(schemaKey, schema);
  }
}

generateAllTypes().catch((error) => {
  console.error(error);
  process.exit(1);
});
