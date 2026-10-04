import { NextRequest } from "next/server";
import { DOMAIN_IDS, INTERVENTION_TYPES, type DomainId } from "@/lib/domains";
import { fetchDomain, type DomainResult } from "@/lib/ctgov";
import type { TrialRecord } from "@/lib/extract";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Payload {
  generatedAt: string;
  source: string;
  interventionTypes: string[];
  maxPerDomain: number;
  domains: DomainResult[];
  errors: { domain: string; message: string }[];
  records: TrialRecord[];
}

// Small in-memory cache (per server instance). Live data, refreshed hourly.
const CACHE = new Map<string, { at: number; payload: Payload }>();
const TTL_MS = 60 * 60 * 1000;

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const domains = (sp.get("domains") ?? DOMAIN_IDS.join(","))
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is DomainId => (DOMAIN_IDS as string[]).includes(s));
  const types = (sp.get("types") ?? "BEHAVIORAL,DEVICE")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => (INTERVENTION_TYPES as readonly string[]).includes(s));
  const max = Math.max(1, Math.min(2000, parseInt(sp.get("max") ?? "1000", 10) || 1000));
  if (domains.length === 0) {
    return Response.json({ error: "No valid domains requested" }, { status: 400 });
  }
  const key = `${[...domains].sort().join(",")}|${[...types].sort().join(",")}|${max}`;
  const hit = CACHE.get(key);
  const headers = {
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  };
  if (hit && Date.now() - hit.at < TTL_MS) {
    return Response.json(hit.payload, { headers });
  }

  const errors: Payload["errors"] = [];
  const results = await mapLimit(domains, 3, async (d) => {
    try {
      return await fetchDomain(d, types, max);
    } catch (e) {
      errors.push({ domain: d, message: e instanceof Error ? e.message : String(e) });
      return null;
    }
  });

  // Merge, de-duplicating trials that match more than one domain.
  const byId = new Map<string, TrialRecord>();
  const metas: DomainResult[] = [];
  for (const r of results) {
    if (!r) continue;
    metas.push(r.meta);
    for (const rec of r.records) {
      const existing = byId.get(rec.nctId);
      if (existing) {
        if (!existing.domains.includes(rec.domains[0])) existing.domains.push(rec.domains[0]);
      } else {
        byId.set(rec.nctId, rec);
      }
    }
  }
  const payload: Payload = {
    generatedAt: new Date().toISOString(),
    source: "ClinicalTrials.gov API v2 (https://clinicaltrials.gov/api/v2/studies)",
    interventionTypes: types.length ? types : ["BEHAVIORAL", "DEVICE"],
    maxPerDomain: max,
    domains: metas,
    errors,
    records: Array.from(byId.values()),
  };
  if (errors.length === 0) CACHE.set(key, { at: Date.now(), payload });
  return Response.json(payload, { headers: errors.length ? {} : headers, status: metas.length ? 200 : 502 });
}
