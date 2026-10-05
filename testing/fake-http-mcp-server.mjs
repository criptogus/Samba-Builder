import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "node:http";
import { z } from "zod/v3";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;

// Stateless Streamable HTTP cannot reuse one transport. The SDK throws
// "Stateless transport cannot be reused across requests" on the second call,
// which this server was turning into HTTP 500 and breaking tool discovery.
function createStatelessServer() {
  const mcp = new McpServer({
    name: "fake-http-mcp",
    version: "0.1.0",
  });

  mcp.registerTool(
    "calculator_add",
    {
      title: "Calculator Add",
      description: "Add two numbers and return the sum",
      inputSchema: { a: z.number(), b: z.number() },
    },
    async ({ a, b }) => {
      const sum = a + b;
      return {
        content: [{ type: "text", text: String(sum) }],
      };
    },
  );

  mcp.registerTool(
    "print_envs",
    {
      title: "Print Envs",
      description: "Print the environment variables received by the server",
      inputSchema: {},
    },
    async () => {
      const envObject = Object.fromEntries(
        Object.entries(process.env).map(([key, value]) => [key, value ?? ""]),
      );
      const pretty = JSON.stringify(envObject, null, 2);
      return {
        content: [{ type: "text", text: pretty }],
      };
    },
  );

  return mcp;
}

async function handleStatelessMcp(req, res) {
  const mcp = createStatelessServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("close", () => {
    void transport.close();
    void mcp.close();
  });
  await mcp.connect(transport);
  await transport.handleRequest(req, res);
}

// Create HTTP server
const httpServer = createServer(async (req, res) => {
  // Only handle requests to /mcp endpoint
  if (req.url !== "/mcp") {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
    return;
  }

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }

  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  try {
    // Let the transport handle body parsing (it uses raw-body internally)
    await handleStatelessMcp(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
    }
  }
});

httpServer.listen(PORT, "0.0.0.0", () => {
  // Log the bound port, not the requested one: callers may pass PORT=0 and
  // parse the actual port from this line (see hybrid_chat_harness.tsx).
  const actualPort = httpServer.address().port;
  console.log(`HTTP MCP server running on http://localhost:${actualPort}/mcp`);
  console.log(`Environment variables:`, Object.keys(process.env).length);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down server...");
  httpServer.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("\nShutting down server...");
  httpServer.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
