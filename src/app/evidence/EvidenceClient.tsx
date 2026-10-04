"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DOMAINS, domainLabel, INTERVENTION_TYPES } from "@/lib/domains";
import type { TrialRecord } from "@/lib/extract";
import { BarList, Stat } from "@/components/Charts";
import { downloadText, toCsv } from "@/lib/csv";
import AnnotationPanel from "./AnnotationPanel";

interface DomainMeta {
  domain: string;
  totalCount: number;
  fetched: number;
  query: string;
}
interface Payload {
  generatedAt: string;
  source: string;
  interventionTypes: string[];
  maxPerDomain: number;
  domains: DomainMeta[];
  errors: { domain: string; message: string }[];
  records: TrialRecord[];
}

const STOPPED = ["TERMINATED", "WITHDRAWN", "SUSPENDED"];
const PAGE = 25;

function prettyStatus(s: string) {
  return s
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function countBy<T>(items: T[], key: (t: T) => string | string[]): { label: string; value: number }[] {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    for (const kk of Array.isArray(k) ? k : [k]) {
      if (!kk) continue;
      m.set(kk, (m.get(kk) ?? 0) + 1);
    }
  }
  return Array.from(m.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function median(xs: (number | null)[]): number | null {
  const v = xs.filter((x): x is number => typeof x === "number").sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

function doseText(r: TrialRecord) {
  const parts: string[] = [];
  if (r.sessions !== null) parts.push(`${r.sessions} sessions`);
  if (r.minutesPerSession !== null) parts.push(`${r.minutesPerSession} min`);
  if (r.sessionsPerWeek !== null) parts.push(`${r.sessionsPerWeek}/wk`);
  if (r.durationWeeks !== null) parts.push(`${r.durationWeeks} wk`);
  return parts.join(", ");
}

async function fetchPayload(ds: string[], ts: string[], mx: number): Promise<Payload> {
  const p = new URLSearchParams({ domains: ds.join(","), types: ts.join(","), max: String(mx) });
  const res = await fetch(`/api/trials?${p.toString()}`);
  const json = await res.json();
  if (!res.ok && !json.records) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json as Payload;
}

export default function EvidenceClient() {
  const [domains, setDomains] = useState<string[]>(DOMAINS.map((d) => d.id));
  const [types, setTypes] = useState<string[]>(["BEHAVIORAL", "DEVICE"]);
  const [maxPer, setMaxPer] = useState(1000);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // table filters
  const [q, setQ] = useState("");
  const [fDomain, setFDomain] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fCountry, setFCountry] = useState("");
  const [fResults, setFResults] = useState(false);
  const [fTele, setFTele] = useState(false);
  const [sort, setSort] = useState("start");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);

  const apply = useCallback((p: Promise<Payload>) => {
    p.then((json) => {
      setData(json);
      setPage(0);
      setSelected([]);
    })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const load = (ds: string[], ts: string[], mx: number) => {
    setLoading(true);
    setError("");
    apply(fetchPayload(ds, ts, mx));
  };

  useEffect(() => {
    apply(fetchPayload(DOMAINS.map((d) => d.id), ["BEHAVIORAL", "DEVICE"], 1000));
  }, [apply]);

  const records = useMemo(() => data?.records ?? [], [data]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const out = records.filter((r) => {
      if (fDomain && !r.domains.includes(fDomain)) return false;
      if (fStatus === "STOPPED" ? !STOPPED.includes(r.status) : fStatus && r.status !== fStatus) return false;
      if (fCountry && !r.countries.includes(fCountry)) return false;
      if (fResults && !r.hasResults) return false;
      if (fTele && !r.delivery.includes("Telepractice / remote")) return false;
      if (qq) {
        const hay = `${r.nctId} ${r.title} ${r.interventions.join(" ")} ${r.sponsor} ${r.primaryOutcomes.join(" ")}`.toLowerCase();
        if (!hay.includes(qq)) return false;
      }
      return true;
    });
    const sorted = [...out];
    if (sort === "start") sorted.sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
    if (sort === "enrollment") sorted.sort((a, b) => (b.enrollment ?? -1) - (a.enrollment ?? -1));
    if (sort === "nct") sorted.sort((a, b) => a.nctId.localeCompare(b.nctId));
    return sorted;
  }, [records, q, fDomain, fStatus, fCountry, fResults, fTele, sort]);

  const stats = useMemo(() => {
    const f = filtered;
    const byStatus = countBy(f, (r) => prettyStatus(r.status));
    const countries = countBy(f, (r) => r.countries);
    const india = countries.find((c) => c.label === "India")?.value ?? 0;
    const topCountries = countries.slice(0, 15);
    if (!topCountries.some((c) => c.label === "India")) topCountries.push({ label: "India", value: india });
    const domainRows = DOMAINS.filter((d) => data?.domains.some((m) => m.domain === d.id)).map((d) => {
      const inD = f.filter((r) => r.domains.includes(d.id));
      const meta = data?.domains.find((m) => m.domain === d.id);
      const completed = inD.filter((r) => r.status === "COMPLETED").length;
      const terminated = inD.filter((r) => r.status === "TERMINATED").length;
      const withdrawn = inD.filter((r) => r.status === "WITHDRAWN").length;
      const suspended = inD.filter((r) => r.status === "SUSPENDED").length;
      const stopped = terminated + withdrawn + suspended;
      const results = inD.filter((r) => r.hasResults).length;
      const resultsAmongCompleted = inD.filter((r) => r.hasResults && r.status === "COMPLETED").length;
      return {
        id: d.id,
        label: d.label,
        total: meta?.totalCount ?? 0,
        fetched: meta?.fetched ?? 0,
        n: inD.length,
        completed,
        terminated,
        withdrawn,
        suspended,
        stoppedPct: completed + stopped ? Math.round((stopped / (completed + stopped)) * 100) : 0,
        results,
        resultsPct: inD.length ? Math.round((results / inD.length) * 100) : 0,
        resultsAmongCompleted,
        india: inD.filter((r) => r.countries.includes("India")).length,
        tele: inD.filter((r) => r.delivery.includes("Telepractice / remote")).length,
        medSessions: median(inD.map((r) => r.sessions)),
        medMinutes: median(inD.map((r) => r.minutesPerSession)),
        medWeeks: median(inD.map((r) => r.durationWeeks)),
      };
    });
    return {
      n: f.length,
      byStatus,
      topCountries,
      india,
      countriesN: countries.length,
      completed: f.filter((r) => r.status === "COMPLETED").length,
      terminated: f.filter((r) => r.status === "TERMINATED").length,
      withdrawn: f.filter((r) => r.status === "WITHDRAWN").length,
      results: f.filter((r) => r.hasResults).length,
      tele: f.filter((r) => r.delivery.includes("Telepractice / remote")).length,
      stopCats: countBy(f.filter((r) => r.whyStopped), (r) => r.stopCategory),
      stoppedList: f.filter((r) => r.whyStopped),
      delivery: countBy(f, (r) => (r.delivery.length ? r.delivery : ["Not stated"])),
      intensity: countBy(f, (r) => r.intensity),
      population: countBy(f, (r) => r.populationTags).slice(0, 12),
      ages: countBy(f, (r) => r.ageGroups),
      phase: countBy(f, (r) => r.phase),
      withDose: f.filter((r) => r.sessions !== null || r.durationWeeks !== null || r.sessionsPerWeek !== null).length,
      domainRows,
    };
  }, [filtered, data]);

  const allCountries = useMemo(() => countBy(records, (r) => r.countries).map((c) => c.label).sort(), [records]);
  const allStatuses = useMemo(() => countBy(records, (r) => r.status).map((c) => c.label), [records]);

  const pageRows = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const selectedRecords = records.filter((r) => selected.includes(r.nctId));

  function exportCsv() {
    const rows = filtered.map((r) => ({
      nct_id: r.nctId,
      url: r.url,
      title: r.title,
      slp_domains: r.domains.map(domainLabel),
      overall_status: r.status,
      why_stopped: r.whyStopped,
      stop_category: r.stopCategory,
      phase: r.phase,
      allocation: r.allocation,
      masking: r.masking,
      intervention_types: r.interventionTypes,
      interventions: r.interventions,
      enrollment: r.enrollment,
      enrollment_type: r.enrollmentType,
      start_date: r.startDate,
      completion_date: r.completionDate,
      countries: r.countries,
      lead_sponsor: r.sponsor,
      sponsor_class: r.sponsorClass,
      has_posted_results: r.hasResults,
      age_groups: r.ageGroups,
      min_age: r.minAge,
      max_age: r.maxAge,
      population_tags: r.populationTags,
      rule_sessions_total: r.sessions,
      rule_minutes_per_session: r.minutesPerSession,
      rule_sessions_per_week: r.sessionsPerWeek,
      rule_duration_weeks: r.durationWeeks,
      rule_total_hours: r.totalHours,
      rule_intensity: r.intensity,
      rule_delivery_mode: r.delivery,
      primary_outcomes: r.primaryOutcomes,
      rule_dose_evidence_text: r.doseEvidence,
    }));
    const stamp = new Date().toISOString().slice(0, 10);
    downloadText(`virtual-slp-lab_trials_${stamp}.csv`, toCsv(rows));
  }

  function toggle<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">Evidence division</h1>
        <p className="muted mt-1 max-w-3xl">
          Live interventional studies from the public ClinicalTrials.gov API v2, filtered to behavioural and device
          interventions in SLP domains. Features such as dose, intensity and delivery mode are extracted by
          transparent text rules and should be verified against the registry record.
        </p>
      </div>

      {/* Query controls */}
      <section className="card space-y-3">
        <div>
          <span className="label">SLP domains</span>
          <div className="flex flex-wrap gap-2">
            {DOMAINS.map((d) => (
              <label key={d.id} className="flex items-center gap-1.5 rounded border border-slate-200 px-2 py-1 text-sm">
                <input type="checkbox" checked={domains.includes(d.id)} onChange={() => setDomains((x) => toggle(x, d.id))} />
                {d.label}
              </label>
            ))}
          </div>
          <div className="mt-1 flex gap-3 text-xs">
            <button className="text-navy underline" onClick={() => setDomains(DOMAINS.map((d) => d.id))}>
              Select all
            </button>
            <button className="text-navy underline" onClick={() => setDomains([])}>
              Clear
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <span className="label">Intervention types</span>
            <div className="flex gap-2">
              {INTERVENTION_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={types.includes(t)} onChange={() => setTypes((x) => toggle(x, t))} />
                  {prettyStatus(t)}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="maxper">
              Max records per domain
            </label>
            <select id="maxper" className="input w-32" value={maxPer} onChange={(e) => setMaxPer(Number(e.target.value))}>
              {[100, 250, 500, 1000, 2000].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn"
            disabled={loading || domains.length === 0 || types.length === 0}
            onClick={() => load(domains, types, maxPer)}
          >
            {loading ? "Querying ClinicalTrials.gov..." : "Run query"}
          </button>
        </div>
        {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">Error: {error}</p>}
        {data?.errors?.length ? (
          <p className="rounded bg-amber-50 p-2 text-sm text-amber-800">
            Some domains failed: {data.errors.map((e) => `${domainLabel(e.domain)} (${e.message})`).join("; ")}
          </p>
        ) : null}
        {data && (
          <p className="text-xs text-slate-500">
            Source: {data.source}. Retrieved {new Date(data.generatedAt).toLocaleString()}. Intervention types:{" "}
            {data.interventionTypes.join(", ")}. Interventional studies only.
          </p>
        )}
      </section>

      {loading && !data && <p className="muted">Loading live registry data...</p>}

      {data && (
        <>
          {/* Filters */}
          <section className="card">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div className="lg:col-span-2">
                <label className="label" htmlFor="q">
                  Search title, intervention, sponsor, outcome
                </label>
                <input id="q" className="input" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="e.g. telepractice, LSVT, VNeST" />
              </div>
              <div>
                <label className="label" htmlFor="fd">Domain</label>
                <select id="fd" className="input" value={fDomain} onChange={(e) => { setFDomain(e.target.value); setPage(0); }}>
                  <option value="">All</option>
                  {data.domains.map((d) => (
                    <option key={d.domain} value={d.domain}>{domainLabel(d.domain)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="fs">Status</label>
                <select id="fs" className="input" value={fStatus} onChange={(e) => { setFStatus(e.target.value); setPage(0); }}>
                  <option value="">All</option>
                  <option value="STOPPED">Stopped (terminated, withdrawn, suspended)</option>
                  {allStatuses.map((s) => (
                    <option key={s} value={s}>{prettyStatus(s)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="fc">Country</label>
                <select id="fc" className="input" value={fCountry} onChange={(e) => { setFCountry(e.target.value); setPage(0); }}>
                  <option value="">All</option>
                  {allCountries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col justify-end gap-1 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={fResults} onChange={(e) => { setFResults(e.target.checked); setPage(0); }} /> Posted results only
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={fTele} onChange={(e) => { setFTele(e.target.checked); setPage(0); }} /> Telepractice only
                </label>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Dashboards and table below reflect the current filters.</p>
          </section>

          {/* Headline stats */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
            <Stat label="Trials analysed" value={stats.n} note="unique NCT IDs" />
            <Stat label="Completed" value={stats.completed} />
            <Stat label="Terminated" value={stats.terminated} />
            <Stat label="Withdrawn" value={stats.withdrawn} />
            <Stat label="Posted results" value={stats.results} note={stats.n ? `${Math.round((stats.results / stats.n) * 100)}%` : ""} />
            <Stat label="With India site" value={stats.india} />
            <Stat label="Telepractice" value={stats.tele} note="rule-detected" />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <h2 className="h2">Trials by SLP domain</h2>
              <p className="muted mb-2">Bar: trials in current view. Right: registered total returned by the API for that domain query.</p>
              <BarList
                data={stats.domainRows.map((d) => ({ label: d.label, value: d.n, sub: `of ${d.total} registered${d.fetched < d.total ? ` (${d.fetched} fetched)` : ""}` }))}
              />
              <p className="mt-2 text-xs text-slate-500">A trial can match more than one domain.</p>
            </div>
            <div className="card">
              <h2 className="h2">Overall status</h2>
              <BarList data={stats.byStatus} />
            </div>
            <div className="card">
              <h2 className="h2">Countries (top 15)</h2>
              <p className="muted mb-2">{stats.countriesN} countries with at least one listed site. India highlighted.</p>
              <BarList data={stats.topCountries} highlight="India" />
            </div>
            <div className="card">
              <h2 className="h2">Why trials stopped</h2>
              <p className="muted mb-2">Rule-based grouping of the registry whyStopped text ({stats.stoppedList.length} trials with a reason).</p>
              <BarList data={stats.stopCats} emptyText="No stopped trials with a reason in this view." />
              {stats.stoppedList.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-navy">Show registry reasons verbatim</summary>
                  <ul className="mt-2 max-h-72 space-y-1 overflow-auto text-xs">
                    {stats.stoppedList.map((r) => (
                      <li key={r.nctId}>
                        <a className="font-semibold text-navy underline" href={r.url} target="_blank" rel="noreferrer">{r.nctId}</a>{" "}
                        <span className="text-slate-500">[{prettyStatus(r.status)}; {r.stopCategory}]</span> {r.whyStopped}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </section>

          <section className="card overflow-x-auto">
            <h2 className="h2">Completed vs stopped, posted results and dose by domain</h2>
            <table className="mt-2 w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-slate-500">
                  <th className="py-1 pr-2">Domain</th>
                  <th className="py-1 pr-2 text-right">In view</th>
                  <th className="py-1 pr-2 text-right">Completed</th>
                  <th className="py-1 pr-2 text-right">Terminated</th>
                  <th className="py-1 pr-2 text-right">Withdrawn</th>
                  <th className="py-1 pr-2 text-right">Suspended</th>
                  <th className="py-1 pr-2 text-right" title="(terminated + withdrawn + suspended) / (completed + those)">% stopped</th>
                  <th className="py-1 pr-2 text-right">Posted results</th>
                  <th className="py-1 pr-2 text-right">India</th>
                  <th className="py-1 pr-2 text-right">Tele</th>
                  <th className="py-1 pr-2 text-right" title="Median of rule-extracted values">Median sessions / min / weeks</th>
                </tr>
              </thead>
              <tbody>
                {stats.domainRows.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100">
                    <td className="py-1 pr-2 font-medium">{d.label}</td>
                    <td className="py-1 pr-2 text-right tabular-nums">{d.n}</td>
                    <td className="py-1 pr-2 text-right tabular-nums">{d.completed}</td>
                    <td className="py-1 pr-2 text-right tabular-nums">{d.terminated}</td>
                    <td className="py-1 pr-2 text-right tabular-nums">{d.withdrawn}</td>
                    <td className="py-1 pr-2 text-right tabular-nums">{d.suspended}</td>
                    <td className="py-1 pr-2 text-right tabular-nums">{d.stoppedPct}%</td>
                    <td className="py-1 pr-2 text-right tabular-nums">{d.results} ({d.resultsPct}%)</td>
                    <td className="py-1 pr-2 text-right tabular-nums">{d.india}</td>
                    <td className="py-1 pr-2 text-right tabular-nums">{d.tele}</td>
                    <td className="py-1 pr-2 text-right tabular-nums">
                      {d.medSessions ?? "-"} / {d.medMinutes ?? "-"} / {d.medWeeks ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="card">
              <h2 className="h2">Delivery mode</h2>
              <p className="muted mb-2">Rule-detected, multiple allowed.</p>
              <BarList data={stats.delivery} />
            </div>
            <div className="card">
              <h2 className="h2">Intensity</h2>
              <p className="muted mb-2">{stats.withDose} trials with any dose detail extracted.</p>
              <BarList data={stats.intensity} />
            </div>
            <div className="card">
              <h2 className="h2">Population</h2>
              <p className="muted mb-2">Age groups (registry) and condition tags (rules).</p>
              <BarList data={stats.ages} />
              <div className="mt-3" />
              <BarList data={stats.population} />
            </div>
            <div className="card">
              <h2 className="h2">Phase</h2>
              <p className="muted mb-2">Most behavioural trials report Not Applicable.</p>
              <BarList data={stats.phase} />
            </div>
          </section>

          {/* Table */}
          <section className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="h2">Trials ({filtered.length})</h2>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm">
                  Sort{" "}
                  <select className="input inline-block w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
                    <option value="start">Start date (newest)</option>
                    <option value="enrollment">Enrollment (largest)</option>
                    <option value="nct">NCT ID</option>
                  </select>
                </label>
                <button className="btn-outline" onClick={exportCsv} disabled={!filtered.length}>
                  Export CSV ({filtered.length})
                </button>
              </div>
            </div>
            <p className="muted mt-1">
              Tick trials to send them to the AI annotation agent below. {selected.length} selected.
              {selected.length > 0 && (
                <button className="ml-2 text-navy underline" onClick={() => setSelected([])}>Clear selection</button>
              )}
            </p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-slate-500">
                    <th className="py-1 pr-2"></th>
                    <th className="py-1 pr-2">Trial</th>
                    <th className="py-1 pr-2">Domain</th>
                    <th className="py-1 pr-2">Status</th>
                    <th className="py-1 pr-2 text-right">N</th>
                    <th className="py-1 pr-2">Countries</th>
                    <th className="py-1 pr-2">Dose (rules)</th>
                    <th className="py-1 pr-2">Delivery</th>
                    <th className="py-1 pr-2">Results</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.nctId} className="border-b border-slate-100 align-top">
                      <td className="py-1.5 pr-2">
                        <input
                          type="checkbox"
                          aria-label={`Select ${r.nctId}`}
                          checked={selected.includes(r.nctId)}
                          onChange={() => setSelected((s) => toggle(s, r.nctId))}
                        />
                      </td>
                      <td className="max-w-md py-1.5 pr-2">
                        <a href={r.url} target="_blank" rel="noreferrer" className="font-semibold text-navy underline">
                          {r.nctId}
                        </a>
                        <div className="text-slate-800">{r.title}</div>
                        <details className="text-xs text-slate-600">
                          <summary className="cursor-pointer text-navy">Details</summary>
                          <div className="mt-1 space-y-0.5">
                            <div><b>Interventions:</b> {r.interventions.join("; ")}</div>
                            <div><b>Phase:</b> {r.phase}; <b>Allocation:</b> {r.allocation || "n/a"}; <b>Masking:</b> {r.masking || "n/a"}</div>
                            <div><b>Ages:</b> {r.ageGroups.join(", ")} ({r.minAge || "?"} to {r.maxAge || "?"})</div>
                            {r.populationTags.length > 0 && <div><b>Population tags:</b> {r.populationTags.join(", ")}</div>}
                            <div><b>Primary outcomes:</b> {r.primaryOutcomes.join("; ") || "not listed"}</div>
                            <div><b>Dates:</b> start {r.startDate || "?"}, completion {r.completionDate || "?"}</div>
                            <div><b>Sponsor:</b> {r.sponsor} ({r.sponsorClass})</div>
                            {r.whyStopped && <div><b>Why stopped:</b> {r.whyStopped}</div>}
                            {r.doseEvidence && <div><b>Dose text matched:</b> <i>{r.doseEvidence}</i></div>}
                            <div><b>Intensity (rules):</b> {r.intensity}{r.totalHours !== null ? `; about ${r.totalHours} h total` : ""}</div>
                          </div>
                        </details>
                      </td>
                      <td className="py-1.5 pr-2 text-xs">{r.domains.map(domainLabel).join(", ")}</td>
                      <td className="py-1.5 pr-2 text-xs">
                        {prettyStatus(r.status)}
                        {r.stopCategory && <div className="text-slate-500">{r.stopCategory}</div>}
                      </td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{r.enrollment ?? "-"}</td>
                      <td className="max-w-[10rem] py-1.5 pr-2 text-xs">
                        {r.countries.slice(0, 4).join(", ")}
                        {r.countries.length > 4 ? ` +${r.countries.length - 4}` : ""}
                      </td>
                      <td className="py-1.5 pr-2 text-xs">{doseText(r) || <span className="text-slate-400">not detected</span>}</td>
                      <td className="py-1.5 pr-2 text-xs">{r.delivery.join(", ") || <span className="text-slate-400">not stated</span>}</td>
                      <td className="py-1.5 pr-2 text-xs">{r.hasResults ? <span className="badge">Posted</span> : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <button className="btn-outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span>
                Page {page + 1} of {pages}
              </span>
              <button className="btn-outline" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </section>

          <AnnotationPanel selected={selectedRecords} />

          <section className="card text-xs text-slate-600">
            <h2 className="h2 text-base">Queries used</h2>
            <ul className="mt-1 space-y-1 break-all">
              {data.domains.map((d) => (
                <li key={d.domain}>
                  <b>{domainLabel(d.domain)}</b> ({d.totalCount} registered, {d.fetched} fetched): {d.query}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
