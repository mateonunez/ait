import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: {
      GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN || "",
    },
  });

  const client = new Client(
    {
      name: "test-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    },
  );

  await client.connect(transport);

  console.log("Connected to GitHub MCP");
  const tools = await client.listTools();

  console.log(
    "Tools found:",
    tools.tools.map((t) => t.name),
  );

  const issueTool = tools.tools.find((t) => t.name === "create_issue" || t.name === "issue_write");
  if (issueTool) {
    console.log("Tool Schema for:", issueTool.name);
    console.log(JSON.stringify(issueTool.inputSchema, null, 2));
  } else {
    console.log("Could not find create_issue or issue_write tool");
  }

  await client.close();
}

main().catch(console.error);
