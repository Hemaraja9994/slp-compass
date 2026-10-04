"use client";

import { useState } from "react";
import type { TrialRecord } from "@/lib/extract";
import { buildMessages, parseAnnotation, type Annotation } from "@/lib/annotate";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { downloadText, toCsv } from "@/lib/csv";

interface LlmSettings {
  baseUrl: string;
  model: string;
  apiKey: string;
  mode: "relay" | "direct";
}

const DEFAULT_SETTINGS: LlmSettings = {
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  apiKey: "",
  mode: "relay",
};
const MAX_BATCH = 10;

async function annotateOne(nctId: string, s: LlmSettings): Promise<Annotation> {
  if (s.mode === "relay") {
    const res = await fetch("/api/annotate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-llm-api-key": s.apiKey },
      body: JSON.stringify({ nctId, baseUrl: s.baseUrl, model: s.model }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
    return json.annotation as Annotation;
  }
  // Direct mode: the key goes from this browser straight to the LLM provider.
  const ctxRes = await fetch(`/api/trial-context?nct=${encodeURIComponent(nctId)}`);
  const ctx = await ctxRes.json();
  if (!ctxRes.ok) throw new Error(ctx.error ?? `HTTP ${ctxRes.status}`);
  const endpoint = s.baseUrl.replace(/\/+$/, "") + "/chat/completions";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.apiKey}` },
    body: JSON.stringify({ model: s.model, temperature: 0, messages: buildMessages(ctx.context) }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`LLM endpoint returned ${res.status}: ${text.slice(0, 200)}`);
  const data = JSON.parse(text);
  return parseAnnotation(data?.choices?.[0]?.message?.content ?? "", nctId, s.model);
}

export default function AnnotationPanel({ selected }: { selected: TrialRecord[] }) {
  const [settings, setSettings] = useLocalStorage<LlmSettings>("vslp.llmSettings", DEFAULT_SETTINGS);
  const [annotations, setAnnotations] = useLocalStorage<Record<string, Annotation>>("vslp.annotations", {});
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [showKey, setShowKey] = useState(false);

  const update = (patch: Partial<LlmSettings>) => setSettings((s) => ({ ...DEFAULT_SETTINGS, ...s, ...patch }));
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const list = Object.values(annotations).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  async function run() {
    const batch = selected.slice(0, MAX_BATCH);
    setBusy(true);
    setLog([]);
    for (const r of batch) {
      setLog((l) => [...l, `Annotating ${r.nctId}...`]);
      try {
        const a = await annotateOne(r.nctId, s);
        setAnnotations((prev) => ({ ...prev, [r.nctId]: { ...a, title: r.title } as Annotation }));
        setLog((l) => [...l, `${r.nctId}: done (awaiting clinician verification)`]);
      } catch (e) {
        setLog((l) => [...l, `${r.nctId}: failed. ${e instanceof Error ? e.message : String(e)}`]);
      }
    }
    setBusy(false);
  }

  function setField(nct: string, patch: Partial<Annotation>) {
    setAnnotations((prev) => ({ ...prev, [nct]: { ...prev[nct], ...patch } }));
  }

  function exportCsv() {
    const rows = list.map((a) => ({
      nct_id: a.nctId,
      url: `https://clinicaltrials.gov/study/${a.nctId}`,
      target_population: a.target_population,
      intervention_type: a.intervention_type,
      dose: a.dose,
      outcome_measure: a.outcome_measure,
      primary_outcome_direction: a.primary_outcome_direction,
      evidence_quote: a.evidence_quote,
      model_confidence: a.confidence,
      model: a.model,
      annotated_at: a.createdAt,
      clinician_verified: a.verified,
      clinician_note: a.clinicianNote,
    }));
    downloadText(`slp-compass_ai_annotations_${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  }

  return (
    <section className="card space-y-3">
      <div>
        <h2 className="h2">AI annotation agent (optional)</h2>
        <p className="muted mt-1">
          Bring your own key for any OpenAI-compatible chat completions endpoint. The key is kept only in this
          browser&apos;s local storage and is sent only with each annotation request. In relay mode it passes through
          this app&apos;s server route for that request and is never logged or stored; in direct mode the browser calls
          the provider itself (the provider must allow browser CORS requests). The agent sees only the public
          registry text and must answer &quot;not reported&quot; when information is absent. Every annotation stays
          unverified until a clinician ticks the box.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="label" htmlFor="base">Endpoint base URL</label>
          <input id="base" className="input" value={s.baseUrl} onChange={(e) => update({ baseUrl: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="model">Model</label>
          <input id="model" className="input" value={s.model} onChange={(e) => update({ model: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="mode">Mode</label>
          <select id="mode" className="input" value={s.mode} onChange={(e) => update({ mode: e.target.value as LlmSettings["mode"] })}>
            <option value="relay">Relay via app server (no storage)</option>
            <option value="direct">Direct from browser</option>
          </select>
        </div>
        <div className="md:col-span-3">
          <label className="label" htmlFor="key">API key</label>
          <div className="flex gap-2">
            <input
              id="key"
              className="input"
              type={showKey ? "text" : "password"}
              autoComplete="off"
              value={s.apiKey}
              onChange={(e) => update({ apiKey: e.target.value })}
              placeholder="Paste your key (stored in this browser only)"
            />
            <button className="btn-outline" type="button" onClick={() => setShowKey((v) => !v)}>
              {showKey ? "Hide" : "Show"}
            </button>
            <button className="btn-outline" type="button" onClick={() => update({ apiKey: "" })}>
              Forget key
            </button>
          </div>
        </div>
        <div className="flex items-end">
          <button className="btn w-full" disabled={busy || !s.apiKey || selected.length === 0} onClick={run}>
            {busy ? "Annotating..." : `Annotate ${Math.min(selected.length, MAX_BATCH)} selected`}
          </button>
        </div>
      </div>
      {selected.length > MAX_BATCH && (
        <p className="text-xs text-amber-700">Only the first {MAX_BATCH} selected trials are annotated per batch.</p>
      )}
      {!s.apiKey && <p className="text-xs text-slate-500">No key entered. All rule-based features above work without one.</p>}
      {log.length > 0 && (
        <pre className="max-h-40 overflow-auto rounded bg-slate-50 p-2 text-xs">{log.join("\n")}</pre>
      )}

      {list.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-navy">
              Saved annotations ({list.length}; {list.filter((a) => a.verified).length} clinician-verified)
            </h3>
            <div className="flex gap-2">
              <button className="btn-outline" onClick={exportCsv}>Export annotations CSV</button>
              <button
                className="btn-outline"
                onClick={() => {
                  if (confirm("Delete all saved annotations from this browser?")) setAnnotations({});
                }}
              >
                Clear all
              </button>
            </div>
          </div>
          {list.map((a) => (
            <div key={a.nctId} className={`rounded border p-3 text-sm ${a.verified ? "border-green-600 bg-green-50" : "border-amber-400 bg-amber-50"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <a className="font-semibold text-navy underline" href={`https://clinicaltrials.gov/study/${a.nctId}`} target="_blank" rel="noreferrer">
                  {a.nctId}
                </a>
                <span className="text-xs text-slate-600">
                  {a.model}, confidence {a.confidence}, {new Date(a.createdAt).toLocaleString()}
                </span>
              </div>
              <dl className="mt-2 grid gap-x-4 gap-y-1 md:grid-cols-2">
                {(
                  [
                    ["target_population", "Target population"],
                    ["intervention_type", "Intervention type"],
                    ["dose", "Dose"],
                    ["outcome_measure", "Outcome measure"],
                    ["primary_outcome_direction", "Primary outcome direction"],
                    ["evidence_quote", "Supporting quote"],
                  ] as const
                ).map(([k, label]) => (
                  <div key={k}>
                    <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
                    <dd>
                      <textarea
                        className="input min-h-[2.5rem] bg-white"
                        value={a[k]}
                        onChange={(e) => setField(a.nctId, { [k]: e.target.value, verified: false })}
                      />
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 font-semibold">
                  <input type="checkbox" checked={a.verified} onChange={(e) => setField(a.nctId, { verified: e.target.checked })} />
                  Clinician verifies this annotation against the registry record
                </label>
                <input
                  className="input max-w-md flex-1 bg-white"
                  placeholder="Clinician note (optional)"
                  value={a.clinicianNote}
                  onChange={(e) => setField(a.nctId, { clinicianNote: e.target.value })}
                />
                <button
                  className="text-xs text-red-700 underline"
                  onClick={() =>
                    setAnnotations((prev) => {
                      const n = { ...prev };
                      delete n[a.nctId];
                      return n;
                    })
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
