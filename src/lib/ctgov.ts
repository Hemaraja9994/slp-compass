// Server-side helpers for the public ClinicalTrials.gov API v2.
// Docs: https://clinicaltrials.gov/data-api/api

import { DOMAINS, type DomainId } from "./domains";
import { studyToRecord, type TrialRecord } from "./extract";

export const CTGOV_BASE = "https://clinicaltrials.gov/api/v2/studies";

const LIST_FIELDS = [
  "protocolSection.identificationModule",
  "protocolSection.statusModule",
  "protocolSection.conditionsModule",
  "protocolSection.designModule",
  "protocolSection.armsInterventionsModule",
  "protocolSection.outcomesModule.primaryOutcomes",
  "protocolSection.eligibilityModule",
  "protocolSection.contactsLocationsModule.locations.country",
  "protocolSection.sponsorCollaboratorsModule.leadSponsor",
  "protocolSection.descriptionModule.briefSummary",
  "hasResults",
].join(",");

export interface DomainResult {
  domain: DomainId;
  totalCount: number;
  fetched: number;
  query: string;
}

function buildParams(domain: DomainId, types: string[]): URLSearchParams {
  const def = DOMAINS.find((d) => d.id === domain);
  if (!def) throw new Error(`Unknown domain ${domain}`);
  const p = new URLSearchParams();
  p.set("query.cond", def.cond);
  if (def.term) p.set("query.term", def.term);
  const t = types.length ? types : ["BEHAVIORAL", "DEVICE"];
  p.set(
    "filter.advanced",
    `AREA[StudyType]INTERVENTIONAL AND AREA[InterventionType](${t.join(" OR ")})`,
  );
  return p;
}

async function getJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "SLPCompass/1.0 (educational research tool)" },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ClinicalTrials.gov API returned ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

export async function fetchDomain(
  domain: DomainId,
  types: string[],
  max: number,
): Promise<{ records: TrialRecord[]; meta: DomainResult }> {
  const base = buildParams(domain, types);
  base.set("fields", LIST_FIELDS);
  base.set("countTotal", "true");
  const records: TrialRecord[] = [];
  let pageToken: string | undefined;
  let totalCount = 0;
  let first = true;
  while (records.length < max) {
    const p = new URLSearchParams(base);
    p.set("pageSize", String(Math.min(1000, max - records.length)));
    if (pageToken) p.set("pageToken", pageToken);
    if (!first) p.delete("countTotal");
    const data = await getJson(`${CTGOV_BASE}?${p.toString()}`);
    if (first && typeof data.totalCount === "number") totalCount = data.totalCount;
    first = false;
    const studies = (data.studies as unknown[]) ?? [];
    for (const s of studies) records.push(studyToRecord(s, domain));
    pageToken = data.nextPageToken as string | undefined;
    if (!pageToken || studies.length === 0) break;
  }
  return {
    records,
    meta: { domain, totalCount, fetched: records.length, query: `${CTGOV_BASE}?${buildParams(domain, types).toString()}` },
  };
}

// Detailed fetch for one study, used by the AI annotation agent.
export async function fetchStudyDetail(nctId: string): Promise<Record<string, unknown>> {
  if (!/^NCT\d{8}$/.test(nctId)) throw new Error("Invalid NCT ID");
  return getJson(`${CTGOV_BASE}/${nctId}?format=json`);
}
