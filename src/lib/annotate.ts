// Shared prompt-building and parsing for the optional AI annotation agent.
// The agent only sees text from the public registry record and must answer
// "not reported" when information is absent. A clinician verifies every output.

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Annotation {
  nctId: string;
  target_population: string;
  intervention_type: string;
  dose: string;
  outcome_measure: string;
  primary_outcome_direction: string;
  evidence_quote: string;
  confidence: string;
  model: string;
  createdAt: string;
  verified: boolean;
  clinicianNote: string;
}

export const DIRECTION_VALUES = [
  "favours intervention",
  "no clear difference",
  "favours comparator",
  "mixed",
  "single-arm change only",
  "results posted but direction unclear",
  "no results posted",
];

function clip(s: unknown, n: number): string {
  const t = typeof s === "string" ? s : s == null ? "" : JSON.stringify(s);
  return t.length > n ? t.slice(0, n) + " [truncated]" : t;
}

// Build a compact, text-only context from a full API v2 study record.
export function buildTrialContext(study: any): string {
  const ps = study?.protocolSection ?? {};
  const rs = study?.resultsSection ?? {};
  const lines: string[] = [];
  lines.push(`NCT ID: ${ps.identificationModule?.nctId}`);
  lines.push(`Title: ${ps.identificationModule?.officialTitle ?? ps.identificationModule?.briefTitle}`);
  lines.push(`Status: ${ps.statusModule?.overallStatus}${ps.statusModule?.whyStopped ? ` (why stopped: ${ps.statusModule.whyStopped})` : ""}`);
  lines.push(`Conditions: ${(ps.conditionsModule?.conditions ?? []).join("; ")}`);
  lines.push(`Phase: ${(ps.designModule?.phases ?? []).join("/")}; Allocation: ${ps.designModule?.designInfo?.allocation ?? ""}; Enrollment: ${ps.designModule?.enrollmentInfo?.count ?? ""}`);
  lines.push(`Eligibility: ages ${ps.eligibilityModule?.minimumAge ?? "?"} to ${ps.eligibilityModule?.maximumAge ?? "?"}; ${clip(ps.eligibilityModule?.eligibilityCriteria, 1200)}`);
  lines.push(`Brief summary: ${clip(ps.descriptionModule?.briefSummary, 1500)}`);
  for (const a of ps.armsInterventionsModule?.armGroups ?? []) {
    lines.push(`Arm [${a.type ?? ""}] ${a.label}: ${clip(a.description, 600)}`);
  }
  for (const i of ps.armsInterventionsModule?.interventions ?? []) {
    lines.push(`Intervention [${i.type}] ${i.name}: ${clip(i.description, 600)}`);
  }
  for (const o of ps.outcomesModule?.primaryOutcomes ?? []) {
    lines.push(`Primary outcome: ${o.measure} (time frame: ${o.timeFrame ?? ""})`);
  }
  if (study?.hasResults && rs.outcomeMeasuresModule?.outcomeMeasures) {
    lines.push("POSTED RESULTS (primary outcome measures):");
    const prim = (rs.outcomeMeasuresModule.outcomeMeasures as any[]).filter((m) => m.type === "PRIMARY").slice(0, 3);
    for (const m of prim) {
      const groups = Object.fromEntries((m.groups ?? []).map((g: any) => [g.id, g.title]));
      lines.push(`- ${m.title} [${m.paramType ?? ""}, ${m.unitOfMeasure ?? ""}]`);
      for (const c of m.classes ?? []) {
        for (const cat of c.categories ?? []) {
          for (const me of cat.measurements ?? []) {
            lines.push(`  ${groups[me.groupId] ?? me.groupId}: ${me.value ?? ""}${me.spread ? ` (spread ${me.spread})` : ""}${me.lowerLimit ? ` [${me.lowerLimit}, ${me.upperLimit}]` : ""}`);
          }
        }
      }
      for (const an of (m.analyses ?? []).slice(0, 2)) {
        lines.push(`  Analysis: ${an.statisticalMethod ?? ""} p=${an.pValue ?? ""} ${an.paramType ?? ""} ${an.paramValue ?? ""}`);
      }
    }
  } else {
    lines.push("POSTED RESULTS: none on ClinicalTrials.gov");
  }
  return clip(lines.join("\n"), 9000);
}

export const SYSTEM_PROMPT = `You are an evidence annotation agent in a human-guided speech-language pathology research tool.
You receive the text of ONE public ClinicalTrials.gov registry record. Annotate it using ONLY that text.
If information is not present, write "not reported". Never invent numbers, outcomes or results.
Return a single JSON object with exactly these string keys:
"target_population" (diagnosis, age group, setting),
"intervention_type" (e.g. behavioural therapy name, device, telepractice, app),
"dose" (sessions, minutes, frequency, duration as reported),
"outcome_measure" (primary outcome measure names),
"primary_outcome_direction" (one of: ${DIRECTION_VALUES.map((v) => `"${v}"`).join(", ")}; use "no results posted" when the record has no posted results),
"evidence_quote" (short verbatim quote from the record supporting the dose or outcome),
"confidence" (one of "low", "medium", "high").`;

export function buildMessages(context: string) {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Registry record:\n\n${context}\n\nReturn only the JSON object.` },
  ];
}

export function parseAnnotation(raw: string, nctId: string, model: string): Annotation {
  let obj: any = {};
  const m = raw.match(/\{[\s\S]*\}/);
  try {
    obj = JSON.parse(m ? m[0] : raw);
  } catch {
    obj = { evidence_quote: raw.slice(0, 300), confidence: "low" };
  }
  const s = (k: string) => (typeof obj[k] === "string" ? obj[k] : obj[k] == null ? "not reported" : JSON.stringify(obj[k]));
  return {
    nctId,
    target_population: s("target_population"),
    intervention_type: s("intervention_type"),
    dose: s("dose"),
    outcome_measure: s("outcome_measure"),
    primary_outcome_direction: s("primary_outcome_direction"),
    evidence_quote: s("evidence_quote"),
    confidence: s("confidence"),
    model,
    createdAt: new Date().toISOString(),
    verified: false,
    clinicianNote: "",
  };
}
