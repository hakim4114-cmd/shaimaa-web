import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { assistantToolNames, assistantTools, cleanArgs } from "@/lib/assistant/tools";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";

// Remote MCP server (Streamable HTTP, JSON responses, stateless) for Claude.
// The secret token in the URL is the credential; the database checks its
// hash and the creator's current role on every call. Read-only.
export const dynamic = "force-dynamic";

const PROTOCOL = "2025-06-18";
type RpcRequest = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

function reply(id: RpcRequest["id"], result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}
function failure(id: RpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

async function handle(message: RpcRequest, tokenHash: string) {
  switch (message.method) {
    case "initialize":
      return reply(message.id, {
        protocolVersion: typeof message.params?.protocolVersion === "string" ? message.params.protocolVersion : PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "merchant-os", version: "1.1.0" },
        instructions:
          "Merchant OS data for a Moroccan cash-on-delivery business. Amounts are integers in cents of MAD: divide by 100. Revenue counts delivered orders only. Customer phone numbers and addresses are never returned. Read-only."
      });
    case "ping":
      return reply(message.id, {});
    case "tools/list":
      return reply(message.id, { tools: assistantTools });
    case "tools/call": {
      const name = String(message.params?.name ?? "");
      if (!assistantToolNames.has(name)) return failure(message.id, -32602, `Unknown tool: ${name}`);
      const config = getSupabasePublicConfig();
      if (!config) return failure(message.id, -32603, "Server not configured");
      const supabase = createClient<Database>(config.url, config.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await supabase.rpc("assistant_call", { p_token_hash: tokenHash, p_tool: name, p_args: cleanArgs(message.params?.arguments) as unknown as Json });
      if (error) {
        const denied = /INVALID_TOKEN|FORBIDDEN/.test(error.message);
        return reply(message.id, { isError: true, content: [{ type: "text", text: denied ? "Access refused: this connector link was revoked or its owner no longer has access." : "The data could not be read. Try again." }] });
      }
      return reply(message.id, { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data });
    }
    default:
      if (message.id === undefined || message.id === null) return null; // notification
      return failure(message.id, -32601, `Method not found: ${message.method}`);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const tokenHash = createHash("sha256").update(token).digest("hex");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(failure(null, -32700, "Parse error"), { status: 400 });
  }
  const messages = Array.isArray(body) ? (body as RpcRequest[]) : [body as RpcRequest];
  const responses = (await Promise.all(messages.slice(0, 20).map((m) => handle(m, tokenHash)))).filter(Boolean);
  if (responses.length === 0) return new NextResponse(null, { status: 202 });
  return NextResponse.json(Array.isArray(body) ? responses : responses[0], { headers: { "Cache-Control": "no-store" } });
}

export function GET() {
  // No server-initiated stream: this server only answers requests.
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}

export function DELETE() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
