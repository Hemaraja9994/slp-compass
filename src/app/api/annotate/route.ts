import { NextRequest } from "next/server";
import { fetchStudyDetail } from "@/lib/ctgov";
import { buildMessages, buildTrialContext, parseAnnotation } from "@/lib/annotate";

export const runtime = "nodejs";
export const maxDuration = 60;

// Relay for the optional AI annotation agent.
// The user's API key arrives in the x-llm-api-key header for this single request,
// is forwarded to the LLM endpoint the user configured, and is never logged or stored.

function isAllowedBaseUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const h = u.hostname.toLowerCase();
  if (
    h === "localhost" ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(h) ||
    h.includes(":")
  ) {
    return null;
  }
  return u;
}

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-llm-api-key") ?? "";
  let body: { nctId?: string; baseUrl?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const nctId = (body.nctId ?? "").toUpperCase();
  const model = (body.model ?? "").trim();
  if (!key) return Response.json({ error: "Missing API key" }, { status: 400 });
  if (!/^NCT\d{8}$/.test(nctId)) return Response.json({ error: "Invalid NCT ID" }, { status: 400 });
  if (!model) return Response.json({ error: "Missing model name" }, { status: 400 });
  const base = isAllowedBaseUrl(body.baseUrl ?? "");
  if (!base) {
    return Response.json(
      { error: "Base URL must be a public https URL (for example https://api.openai.com/v1)" },
      { status: 400 },
    );
  }

  let context: string;
  try {
    context = buildTrialContext(await fetchStudyDetail(nctId));
  } catch (e) {
    return Response.json({ error: `Registry fetch failed: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }

  const endpoint = base.toString().replace(/\/+$/, "") + "/chat/completions";
  const call = async (jsonMode: boolean) =>
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: buildMessages(context),
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(55000),
      cache: "no-store",
    });

  try {
    let res = await call(true);
    if (res.status === 400) res = await call(false); // some endpoints reject response_format
    const text = await res.text();
    if (!res.ok) {
      return Response.json({ error: `LLM endpoint returned ${res.status}: ${text.slice(0, 300)}` }, { status: 502 });
    }
    const data = JSON.parse(text);
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    return Response.json({ annotation: parseAnnotation(content, nctId, model) });
  } catch (e) {
    return Response.json({ error: `LLM call failed: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }
}
