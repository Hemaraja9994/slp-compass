"use client";

import { useEffect, useMemo, useState } from "react";

function num(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
function fmt(n: number, d = 2): string {
  return Number.isFinite(n) ? (Math.round(n * 10 ** d) / 10 ** d).toFixed(d) : "-";
}
function parseTime(v: string): number {
  // accepts "mm:ss", "h:mm:ss" or plain seconds
  const t = v.trim();
  if (!t) return 0;
  if (t.includes(":")) {
    const parts = t.split(":").map((x) => parseFloat(x) || 0);
    return parts.reduce((acc, p) => acc * 60 + p, 0);
  }
  return num(t);
}

function Field({ id, label, value, onChange, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} className="input" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function Result({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded bg-navy-light p-3">
      <div className="text-xs font-semibold uppercase text-slate-600">{label}</div>
      <div className="text-xl font-bold text-navy tabular-nums">{value}</div>
      {note && <div className="text-xs text-slate-600">{note}</div>}
    </div>
  );
}

function FluencyCalculator() {
  const [syll, setSyll] = useState("");
  const [ss, setSs] = useState("");
  const [pwr, setPwr] = useState("");
  const [mwr, setMwr] = useState("");
  const [pro, setPro] = useState("");
  const [blk, setBlk] = useState("");
  const [other, setOther] = useState("");
  const total = num(syll);
  const sld = num(pwr) + num(mwr) + num(pro) + num(blk);
  const od = num(other);
  const pct = total ? (num(ss) / total) * 100 : NaN;
  return (
    <section className="card space-y-3">
      <h2 className="h2">Fluency counts: %SS and SLD per 100 syllables</h2>
      <p className="muted">
        Enter counts from your own transcript or live count. Stuttering-like disfluencies (SLD) are part-word
        repetitions, single-syllable whole-word repetitions, prolongations and blocks (broken words). Other
        disfluencies include interjections, revisions and phrase or multisyllabic word repetitions. Definitions
        follow common research usage; apply your own protocol consistently.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field id="syll" label="Total syllables" value={syll} onChange={setSyll} />
        <Field id="ss" label="Stuttered syllables" value={ss} onChange={setSs} hint="for %SS" />
        <Field id="pwr" label="Part-word repetitions" value={pwr} onChange={setPwr} />
        <Field id="mwr" label="Single-syllable word reps" value={mwr} onChange={setMwr} />
        <Field id="pro" label="Prolongations" value={pro} onChange={setPro} />
        <Field id="blk" label="Blocks" value={blk} onChange={setBlk} />
        <Field id="oth" label="Other disfluencies" value={other} onChange={setOther} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Result label="% syllables stuttered" value={total ? fmt(pct) + " %" : "-"} />
        <Result label="SLD per 100 syllables" value={total ? fmt((sld / total) * 100) : "-"} note={`${sld} SLD counted`} />
        <Result label="Other disfluencies per 100" value={total ? fmt((od / total) * 100) : "-"} />
        <Result label="Total disfluencies per 100" value={total ? fmt(((sld + od) / total) * 100) : "-"} />
      </div>
      {total > 0 && num(ss) > total && <p className="text-sm text-red-700">Stuttered syllables exceed total syllables. Please check the counts.</p>}
    </section>
  );
}

function LiveCounter() {
  const [fluent, setFluent] = useState(0);
  const [stut, setStut] = useState(0);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.key === "f" || e.key === "F") setFluent((n) => n + 1);
      if (e.key === "s" || e.key === "S") setStut((n) => n + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const total = fluent + stut;
  return (
    <section className="card space-y-3">
      <h2 className="h2">Live syllable counter</h2>
      <p className="muted">Tap a button (or press F for a fluent syllable, S for a stuttered syllable) while listening.</p>
      <div className="flex flex-wrap gap-2">
        <button className="btn min-w-40 py-4 text-base" onClick={() => setFluent((n) => n + 1)}>Fluent syllable (F)</button>
        <button className="btn min-w-40 bg-amber-600 py-4 text-base hover:bg-amber-700" onClick={() => setStut((n) => n + 1)}>Stuttered syllable (S)</button>
        <button className="btn-outline" onClick={() => { setFluent(0); setStut(0); }}>Reset</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Result label="Total syllables" value={String(total)} />
        <Result label="Stuttered syllables" value={String(stut)} />
        <Result label="% syllables stuttered" value={total ? fmt((stut / total) * 100) + " %" : "-"} />
      </div>
    </section>
  );
}

function RateCalculator() {
  const [syll, setSyll] = useState("");
  const [words, setWords] = useState("");
  const [time, setTime] = useState("");
  const [pause, setPause] = useState("");
  const secs = parseTime(time);
  const pauseS = parseTime(pause);
  const mins = secs / 60;
  const artSecs = secs - pauseS;
  return (
    <section className="card space-y-3">
      <h2 className="h2">Speech rate and articulation rate</h2>
      <p className="muted">Speaking rate uses total sample time. Articulation rate excludes pause time you enter (for example pauses longer than 250 ms, per your protocol).</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field id="rs" label="Syllables" value={syll} onChange={setSyll} />
        <Field id="rw" label="Words" value={words} onChange={setWords} />
        <Field id="rt" label="Sample duration" value={time} onChange={setTime} hint="mm:ss or seconds" />
        <Field id="rp" label="Total pause time" value={pause} onChange={setPause} hint="mm:ss or seconds (optional)" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Result label="Syllables per minute" value={mins ? fmt(num(syll) / mins, 1) : "-"} />
        <Result label="Words per minute" value={mins ? fmt(num(words) / mins, 1) : "-"} />
        <Result label="Syllables per second" value={secs ? fmt(num(syll) / secs) : "-"} />
        <Result label="Articulation rate (syll/s)" value={artSecs > 0 && pauseS > 0 ? fmt(num(syll) / artSecs) : "-"} note={pauseS > 0 ? `${fmt(artSecs, 1)} s speaking time` : "enter pause time"} />
      </div>
      {pauseS >= secs && secs > 0 && <p className="text-sm text-red-700">Pause time must be less than sample duration.</p>}
    </section>
  );
}

const FILLERS = new Set(["um", "uh", "er", "erm", "ah", "hmm", "mm"]);
const UNINTELLIGIBLE = /^(x{3}|y{3}|www)$/i;

// Approximate English morpheme count (Brown-style, simplified). Verify manually.
function morphemes(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z']/g, "");
  if (!w) return 1;
  let m = 1;
  if (/n't$/.test(w)) return 2; // can't, don't
  if (/'(s|re|ll|ve|d|m)$/.test(w)) m += 1; // contractions and possessive
  const base = w.replace(/'(s|re|ll|ve|d|m)$/, "");
  const irregularPlural = new Set(["is", "was", "has", "this", "his", "yes", "us", "bus", "its", "does", "goes", "always", "glass", "grass", "class", "kiss", "miss", "dress", "boss", "nothing", "something", "everything", "anything", "thing", "king", "ring", "sing", "bring", "spring", "string", "morning", "evening", "ceiling", "red", "bed", "need", "seed", "feed", "bread", "head", "shed", "sled", "said", "kid", "lid", "hid", "did"]);
  if (irregularPlural.has(base)) return m;
  if (/ing$/.test(base) && base.length > 4) m += 1;
  else if (/ed$/.test(base) && base.length > 3) m += 1;
  else if (/(s|es)$/.test(base) && base.length > 3 && !/ss$/.test(base) && !/us$/.test(base)) m += 1;
  return m;
}

function MluCalculator() {
  const [text, setText] = useState("");
  const res = useMemo(() => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && !l.startsWith("%"));
    let words = 0;
    let morph = 0;
    let excluded = 0;
    const types = new Set<string>();
    for (const l of lines) {
      const toks = l
        .replace(/^\*?[A-Z]{3}:\s*/, "") // strip CHAT speaker codes like *CHI:
        .replace(/[.,!?;:"()[\]]/g, " ")
        .split(/\s+/)
        .filter(Boolean);
      for (const t of toks) {
        const low = t.toLowerCase();
        if (FILLERS.has(low) || UNINTELLIGIBLE.test(low)) {
          excluded++;
          continue;
        }
        words++;
        morph += morphemes(t);
        types.add(low);
      }
    }
    return { utt: lines.length, words, morph, ndw: types.size, excluded };
  }, [text]);
  return (
    <section className="card space-y-3">
      <h2 className="h2">Mean length of utterance (MLU)</h2>
      <p className="muted">
        Paste one utterance per line. Fillers (um, uh) and unintelligible markers (xxx, yyy, www) are excluded; CHAT
        speaker codes such as *CHI: are stripped. MLU in words works for any language written with spaces
        (including Kannada). MLU in morphemes is an English-only approximation using simple inflection rules and
        must be checked by hand. Text is processed only in your browser.
      </p>
      <textarea
        className="input min-h-40 font-mono"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"the dog is running\nI want more juice\nmummy's car"}
      />
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Result label="Utterances" value={String(res.utt)} />
        <Result label="Words" value={String(res.words)} />
        <Result label="MLU (words)" value={res.utt ? fmt(res.words / res.utt) : "-"} />
        <Result label="MLU (morphemes, approx.)" value={res.utt ? fmt(res.morph / res.utt) : "-"} note="English only, verify" />
        <Result label="Different words (NDW)" value={String(res.ndw)} />
        <Result label="Type-token ratio" value={res.words ? fmt(res.ndw / res.words) : "-"} note={`${res.excluded} tokens excluded`} />
      </div>
      {res.utt > 0 && res.utt < 50 && <p className="text-xs text-amber-700">Many protocols recommend at least 50 to 100 utterances for a stable MLU.</p>}
    </section>
  );
}

export default function AssessmentClient() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">Assessment division</h1>
        <p className="muted mt-1 max-w-3xl">
          Simple calculators that run entirely in your browser. Nothing you type is sent to a server. These tools
          compute descriptive metrics only; they do not include or replace standardised tests, norms or severity
          tables.
        </p>
      </div>
      <FluencyCalculator />
      <LiveCounter />
      <RateCalculator />
      <MluCalculator />
      <section className="card border-dashed">
        <h2 className="h2">Fluency annotator (separate project)</h2>
        <p className="muted mt-1">
          For syllable-level annotation of recorded speech samples, see the companion Fluency Annotator project by the
          same author. The repository is currently private; request access from the author.
        </p>
        <a className="btn-outline mt-2" href="https://github.com/Hemaraja9994/fluency-annotator" target="_blank" rel="noreferrer">
          github.com/Hemaraja9994/fluency-annotator
        </a>
      </section>
    </div>
  );
}
