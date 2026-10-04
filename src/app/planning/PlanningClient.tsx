"use client";

import { useState } from "react";

type Component = "Body Functions and Structures" | "Activity" | "Participation";

interface Goal {
  id: string;
  component: Component;
  icfCode: string;
  behaviour: string;
  condition: string;
  criterion: string;
  measure: string;
  support: string;
  weeks: string;
  rationale: string;
}

// Example ICF codes commonly used in SLP. Verify against the WHO ICF browser.
const ICF_SUGGESTIONS: Record<Component, string[]> = {
  "Body Functions and Structures": [
    "b167 Mental functions of language",
    "b230 Hearing functions",
    "b310 Voice functions",
    "b320 Articulation functions",
    "b330 Fluency and rhythm of speech functions",
    "b5105 Swallowing",
  ],
  Activity: [
    "d310 Communicating with, receiving, spoken messages",
    "d330 Speaking",
    "d350 Conversation",
    "d360 Using communication devices and techniques",
    "d550 Eating",
    "d560 Drinking",
  ],
  Participation: [
    "d710 Basic interpersonal interactions",
    "d760 Family relationships",
    "d820 School education",
    "d850 Remunerative employment",
    "d910 Community life",
    "d920 Recreation and leisure",
  ],
};

const EXAMPLES: Record<Component, Partial<Goal>> = {
  "Body Functions and Structures": {
    behaviour: "produce /s/ in word-initial position",
    condition: "during structured picture naming",
    criterion: "80% accuracy across 3 consecutive sessions",
    measure: "clinician probe of 20 untrained words",
    support: "with no more than minimal visual cues",
  },
  Activity: {
    behaviour: "use an easy-onset fluency strategy",
    condition: "in 5-minute structured conversations with the clinician",
    criterion: "fewer than 3% syllables stuttered in 2 of 3 samples",
    measure: "%SS from audio-recorded samples",
    support: "independently",
  },
  Participation: {
    behaviour: "order food at a local restaurant",
    condition: "during a community outing with a family member present",
    criterion: "success on 3 of 4 opportunities",
    measure: "client and caregiver report with clinician observation",
    support: "using a self-selected communication strategy",
  },
};

function newGoal(component: Component = "Activity"): Goal {
  return {
    id: Math.random().toString(36).slice(2),
    component,
    icfCode: "",
    behaviour: "",
    condition: "",
    criterion: "",
    measure: "",
    support: "",
    weeks: "12",
    rationale: "",
  };
}

export function smartText(g: Goal, code: string): string {
  const who = code.trim() || "The client";
  const parts = [
    `Within ${g.weeks || "[timeframe]"} weeks, ${who} will ${g.behaviour || "[observable behaviour]"}`,
    g.condition ? ` ${g.condition}` : " [condition or context]",
    g.support ? ` ${g.support}` : "",
    `, achieving ${g.criterion || "[measurable criterion]"}`,
    `, as measured by ${g.measure || "[measurement method]"}.`,
  ];
  return parts.join("").replace(/\s+/g, " ").replace(/ ,/g, ",");
}

export default function PlanningClient() {
  const [code, setCode] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [env, setEnv] = useState({ facilitators: "", barriers: "" });
  const [personal, setPersonal] = useState("");
  const [goals, setGoals] = useState<Goal[]>([newGoal("Body Functions and Structures"), newGoal("Activity"), newGoal("Participation")]);

  const upd = (id: string, patch: Partial<Goal>) => setGoals((gs) => gs.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  return (
    <div className="space-y-6">
      <div className="no-print">
        <h1 className="h1">Planning division: ICF goal builder</h1>
        <p className="muted mt-1 max-w-3xl">
          Build SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound) organised by the WHO
          International Classification of Functioning, Disability and Health (ICF). Everything stays in this page; use
          Print or Save as PDF to keep a copy. Use a participant code, not a name.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          ICF reference:{" "}
          <a className="text-navy underline" href="https://www.who.int/standards/classifications/international-classification-of-functioning-disability-and-health" target="_blank" rel="noreferrer">
            WHO ICF
          </a>{" "}
          and the{" "}
          <a className="text-navy underline" href="https://apps.who.int/classifications/icfbrowser/" target="_blank" rel="noreferrer">
            ICF browser
          </a>
          . Suggested codes are examples; confirm them in the browser.
        </p>
      </div>

      <section className="card no-print grid gap-3 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="pc">Participant code</label>
          <input id="pc" className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. P-014" />
        </div>
        <div>
          <label className="label" htmlFor="dx">Communication or swallowing profile</label>
          <input id="dx" className="input" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. developmental stuttering, adolescent" />
        </div>
        <div>
          <label className="label" htmlFor="ef">Environmental factors: facilitators</label>
          <textarea id="ef" className="input" value={env.facilitators} onChange={(e) => setEnv({ ...env, facilitators: e.target.value })} placeholder="e.g. supportive family (e310), access to telepractice (e125)" />
        </div>
        <div>
          <label className="label" htmlFor="eb">Environmental factors: barriers</label>
          <textarea id="eb" className="input" value={env.barriers} onChange={(e) => setEnv({ ...env, barriers: e.target.value })} placeholder="e.g. noisy classroom, limited travel to clinic" />
        </div>
        <div className="md:col-span-2">
          <label className="label" htmlFor="pf">Personal factors</label>
          <textarea id="pf" className="input" value={personal} onChange={(e) => setPersonal(e.target.value)} placeholder="e.g. motivated, bilingual Kannada and English, prefers evening sessions" />
        </div>
      </section>

      <div className="no-print space-y-4">
        {goals.map((g, idx) => (
          <section key={g.id} className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="h2">Goal {idx + 1}</h2>
              <div className="flex gap-2">
                <button className="btn-outline" onClick={() => upd(g.id, EXAMPLES[g.component])}>Fill example</button>
                <button className="btn-outline" onClick={() => setGoals((gs) => gs.filter((x) => x.id !== g.id))}>Remove</button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="label">ICF component</label>
                <select className="input" value={g.component} onChange={(e) => upd(g.id, { component: e.target.value as Component, icfCode: "" })}>
                  {(Object.keys(ICF_SUGGESTIONS) as Component[]).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">ICF code (optional)</label>
                <input className="input" list={`icf-${g.id}`} value={g.icfCode} onChange={(e) => upd(g.id, { icfCode: e.target.value })} placeholder="type or pick" />
                <datalist id={`icf-${g.id}`}>
                  {ICF_SUGGESTIONS[g.component].map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="label">Timeframe (weeks)</label>
                <input className="input" inputMode="numeric" value={g.weeks} onChange={(e) => upd(g.id, { weeks: e.target.value })} />
              </div>
              <div>
                <label className="label">Specific behaviour (will...)</label>
                <input className="input" value={g.behaviour} onChange={(e) => upd(g.id, { behaviour: e.target.value })} placeholder="observable action" />
              </div>
              <div>
                <label className="label">Condition or context</label>
                <input className="input" value={g.condition} onChange={(e) => upd(g.id, { condition: e.target.value })} placeholder="where, when, with what material" />
              </div>
              <div>
                <label className="label">Support level</label>
                <input className="input" value={g.support} onChange={(e) => upd(g.id, { support: e.target.value })} placeholder="e.g. with minimal verbal cues" />
              </div>
              <div>
                <label className="label">Measurable criterion</label>
                <input className="input" value={g.criterion} onChange={(e) => upd(g.id, { criterion: e.target.value })} placeholder="e.g. 80% accuracy over 3 sessions" />
              </div>
              <div>
                <label className="label">Measurement method</label>
                <input className="input" value={g.measure} onChange={(e) => upd(g.id, { measure: e.target.value })} placeholder="probe, rating, recording" />
              </div>
              <div>
                <label className="label">Relevance (why it matters)</label>
                <input className="input" value={g.rationale} onChange={(e) => upd(g.id, { rationale: e.target.value })} placeholder="link to client priorities" />
              </div>
            </div>
            <div className="rounded bg-navy-light p-3 text-sm">
              <span className="font-semibold text-navy">Generated goal: </span>
              {smartText(g, code)}
            </div>
          </section>
        ))}
        <div className="flex flex-wrap gap-2">
          <button className="btn-outline" onClick={() => setGoals((gs) => [...gs, newGoal()])}>Add goal</button>
          <button className="btn" onClick={() => window.print()}>Print or save as PDF</button>
        </div>
      </div>

      {/* Printable summary */}
      <section className="card">
        <h2 className="h2">Goal plan summary</h2>
        <p className="text-sm text-slate-700">
          <b>Participant code:</b> {code || "not entered"} {diagnosis && <> | <b>Profile:</b> {diagnosis}</>} | <b>Date:</b>{" "}
          <span suppressHydrationWarning>{new Date().toLocaleDateString()}</span>
        </p>
        {(["Body Functions and Structures", "Activity", "Participation"] as Component[]).map((c) => {
          const gs = goals.filter((g) => g.component === c);
          if (!gs.length) return null;
          return (
            <div key={c} className="mt-3">
              <h3 className="font-bold text-navy">{c}</h3>
              <ol className="ml-5 list-decimal space-y-1 text-sm">
                {gs.map((g) => (
                  <li key={g.id}>
                    {smartText(g, code)}
                    {g.icfCode && <span className="text-slate-600"> [ICF: {g.icfCode}]</span>}
                    {g.rationale && <span className="text-slate-600"> Relevance: {g.rationale}.</span>}
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
        <div className="mt-3 text-sm">
          <h3 className="font-bold text-navy">Contextual factors</h3>
          <p><b>Environmental facilitators:</b> {env.facilitators || "not recorded"}</p>
          <p><b>Environmental barriers:</b> {env.barriers || "not recorded"}</p>
          <p><b>Personal factors:</b> {personal || "not recorded"}</p>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Generated with Virtual SLP Lab (educational and research use). Goals are drafted from clinician inputs and
          must be reviewed by the treating clinician with the client and family.
        </p>
      </section>
    </div>
  );
}
