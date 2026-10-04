"use client";

import { useMemo, useState } from "react";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { LineChart } from "@/components/Charts";
import { downloadText, toCsv } from "@/lib/csv";

interface Entry {
  id: string;
  code: string;
  measure: string;
  unit: string;
  session: number;
  date: string;
  value: number;
  notes: string;
}

const CODE_RE = /^[A-Za-z0-9_-]{1,20}$/;

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function OutcomesClient() {
  const [entries, setEntries, hydrated] = useLocalStorage<Entry[]>("vslp.outcomes", []);
  const [code, setCode] = useState("");
  const [measure, setMeasure] = useState("");
  const [unit, setUnit] = useState("");
  const [session, setSession] = useState("");
  const [date, setDate] = useState(today);
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [viewCode, setViewCode] = useState("");
  const [viewMeasure, setViewMeasure] = useState("");

  const codes = useMemo(() => Array.from(new Set(entries.map((e) => e.code))).sort(), [entries]);
  const measures = useMemo(() => Array.from(new Set(entries.map((e) => e.measure))).sort(), [entries]);
  const vc = viewCode || codes[0] || "";
  const measuresForCode = useMemo(() => Array.from(new Set(entries.filter((e) => e.code === vc).map((e) => e.measure))).sort(), [entries, vc]);
  const vm = measuresForCode.includes(viewMeasure) ? viewMeasure : measuresForCode[0] || "";
  const series = useMemo(
    () => entries.filter((e) => e.code === vc && e.measure === vm).sort((a, b) => a.session - b.session || a.date.localeCompare(b.date)),
    [entries, vc, vm],
  );
  const nextSession = (c: string, m: string) => {
    const s = entries.filter((e) => e.code === c && e.measure === m).map((e) => e.session);
    return s.length ? Math.max(...s) + 1 : 1;
  };

  function add() {
    setErr("");
    if (!CODE_RE.test(code)) {
      setErr("Participant code must be 1 to 20 letters, numbers, dashes or underscores, with no spaces. Do not use names.");
      return;
    }
    if (!measure.trim()) return setErr("Enter a measure name, for example %SS or MLU.");
    const v = parseFloat(value);
    if (!Number.isFinite(v)) return setErr("Enter a numeric value.");
    const sess = session ? parseInt(session, 10) : nextSession(code, measure.trim());
    const e: Entry = {
      id: Math.random().toString(36).slice(2),
      code,
      measure: measure.trim(),
      unit: unit.trim(),
      session: Number.isFinite(sess) ? sess : 1,
      date,
      value: v,
      notes: notes.trim(),
    };
    setEntries((prev) => [...prev, e]);
    setViewCode(code);
    setViewMeasure(e.measure);
    setValue("");
    setNotes("");
    setSession("");
  }

  function exportCsv(all: boolean) {
    const rows = (all ? entries : series).map((e) => ({
      participant_code: e.code,
      measure: e.measure,
      unit: e.unit,
      session: e.session,
      date: e.date,
      value: e.value,
      notes: e.notes,
    }));
    downloadText(`virtual-slp-lab_outcomes_${all ? "all" : `${vc}_${vm}`}_${today()}.csv`.replace(/[^\w.-]+/g, "_"), toCsv(rows));
  }

  function importJson(file: File) {
    file.text().then((t) => {
      try {
        const data = JSON.parse(t) as Entry[];
        if (!Array.isArray(data)) throw new Error("not a list");
        const clean = data.filter((d) => d && CODE_RE.test(d.code) && typeof d.value === "number");
        if (confirm(`Import ${clean.length} entries and merge with the ${entries.length} already in this browser?`)) {
          setEntries((prev) => {
            const ids = new Set(prev.map((p) => p.id));
            return [...prev, ...clean.filter((c) => !ids.has(c.id))];
          });
        }
      } catch {
        alert("Could not read this file. Use a JSON backup exported from this page.");
      }
    });
  }

  const first = series[0]?.value;
  const last = series[series.length - 1]?.value;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">Outcomes division: session progress tracker</h1>
        <p className="muted mt-1 max-w-3xl">
          Record a measure per session for each participant and see the trend. Data is stored only in this
          browser&apos;s local storage on this device. It is not uploaded, synced or backed up; export a CSV or JSON
          backup regularly. Use participant codes only, never names or other identifiers.
        </p>
      </div>

      <section className="card space-y-3">
        <h2 className="h2">Add a session data point</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label" htmlFor="oc">Participant code</label>
            <input id="oc" className="input" list="codes" value={code} onChange={(e) => setCode(e.target.value.trim())} placeholder="e.g. P-014" />
            <datalist id="codes">{codes.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div>
            <label className="label" htmlFor="om">Measure</label>
            <input id="om" className="input" list="measures" value={measure} onChange={(e) => setMeasure(e.target.value)} placeholder="e.g. %SS, MLU, % accuracy /s/" />
            <datalist id="measures">{measures.map((m) => <option key={m} value={m} />)}</datalist>
          </div>
          <div>
            <label className="label" htmlFor="ou">Unit (optional)</label>
            <input id="ou" className="input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="%, words, syll/min" />
          </div>
          <div>
            <label className="label" htmlFor="ov">Value</label>
            <input id="ov" className="input" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="os">Session number</label>
            <input id="os" className="input" inputMode="numeric" value={session} onChange={(e) => setSession(e.target.value)} placeholder={code && measure ? `auto: ${nextSession(code, measure.trim())}` : "auto"} />
          </div>
          <div>
            <label className="label" htmlFor="od">Date</label>
            <input id="od" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="on">Notes (no identifiers)</label>
            <input id="on" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. reading task, telepractice session" />
          </div>
        </div>
        {err && <p className="text-sm text-red-700">{err}</p>}
        <button className="btn" onClick={add}>Add data point</button>
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="vc">Participant</label>
            <select id="vc" className="input w-40" value={vc} onChange={(e) => setViewCode(e.target.value)}>
              {codes.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="vm">Measure</label>
            <select id="vm" className="input w-56" value={vm} onChange={(e) => setViewMeasure(e.target.value)}>
              {measuresForCode.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-outline" disabled={!series.length} onClick={() => exportCsv(false)}>Export this series (CSV)</button>
            <button className="btn-outline" disabled={!entries.length} onClick={() => exportCsv(true)}>Export all (CSV)</button>
            <button className="btn-outline" disabled={!entries.length} onClick={() => downloadText(`virtual-slp-lab_outcomes_backup_${today()}.json`, JSON.stringify(entries, null, 1), "application/json")}>
              Backup (JSON)
            </button>
            <label className="btn-outline cursor-pointer">
              Restore JSON
              <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
            </label>
          </div>
        </div>
        {!hydrated ? (
          <p className="muted">Loading data from this browser...</p>
        ) : entries.length === 0 ? (
          <p className="muted">No data yet. Add a data point above.</p>
        ) : (
          <>
            <h2 className="h2">
              {vc}: {vm} {series[0]?.unit ? `(${series[0].unit})` : ""}
            </h2>
            {series.length >= 2 && (
              <p className="text-sm text-slate-700">
                Session {series[0].session} to {series[series.length - 1].session}: {first} to {last} (change {Math.round((last - first) * 100) / 100}). Interpret
                direction according to the measure.
              </p>
            )}
            <LineChart points={series.map((e) => ({ x: `S${e.session}`, y: e.value }))} yLabel={series[0]?.unit || vm} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-slate-500">
                    <th className="py-1">Session</th>
                    <th className="py-1">Date</th>
                    <th className="py-1 text-right">Value</th>
                    <th className="py-1 pl-3">Notes</th>
                    <th className="py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((e) => (
                    <tr key={e.id} className="border-b border-slate-100">
                      <td className="py-1">{e.session}</td>
                      <td className="py-1">{e.date}</td>
                      <td className="py-1 text-right tabular-nums">{e.value}</td>
                      <td className="py-1 pl-3">{e.notes}</td>
                      <td className="py-1 text-right">
                        <button className="text-xs text-red-700 underline" onClick={() => setEntries((p) => p.filter((x) => x.id !== e.id))}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {entries.length > 0 && (
          <button
            className="text-xs text-red-700 underline"
            onClick={() => {
              if (confirm("Delete ALL outcome data stored in this browser? Export a backup first if you need it.")) setEntries([]);
            }}
          >
            Delete all outcome data from this browser
          </button>
        )}
      </section>
    </div>
  );
}
