/**
 * Test helpers — spawns the MCP server as a child process and connects
 * via the official MCP Client SDK, exactly like Claude Code does.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

const SERVER_PATH = path.resolve(import.meta.dirname, "../dist/mcp-server.js");

export interface ServerHandle {
  client: Client;
  transport: StdioClientTransport;
  callTool: (name: string, args?: Record<string, unknown>) => Promise<string>;
  close: () => Promise<void>;
}

/**
 * Spawn the MCP server with the given CLI args and optional env overrides.
 * Returns a connected client ready to call tools.
 */
export async function spawnServer(opts: {
  args?: string[];
  env?: Record<string, string>;
} = {}): Promise<ServerHandle> {
  const transport = new StdioClientTransport({
    command: "node",
    args: [SERVER_PATH, ...(opts.args ?? [])],
    env: { ...process.env, ...opts.env } as Record<string, string>,
  });

  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(transport);

  const callTool = async (name: string, args: Record<string, unknown> = {}): Promise<string> => {
    const result = await client.callTool({ name, arguments: args });
    const textContent = result.content as Array<{ type: string; text: string }>;
    return textContent.map((c) => c.text).join("\n");
  };

  const close = async () => {
    await client.close();
  };

  return { client, transport, callTool, close };
}
