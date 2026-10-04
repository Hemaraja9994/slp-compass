import Link from "next/link";

const DIVISIONS = [
  {
    href: "/evidence",
    title: "Evidence division",
    text: "Live search of ClinicalTrials.gov for behavioural and device trials across ten SLP domains. Rule-based extraction of dose, intensity, delivery mode and outcomes, dashboards, CSV export and an optional AI annotation agent that you verify.",
  },
  {
    href: "/assessment",
    title: "Assessment division",
    text: "Browser-only calculators: percent syllables stuttered, stuttering-like disfluencies per 100 syllables, speech and articulation rate, and MLU from pasted utterances.",
  },
  {
    href: "/planning",
    title: "Planning division",
    text: "ICF-based goal builder covering Body Functions and Structures, Activity, Participation, Environmental and Personal factors. Generates printable SMART goal text from your inputs.",
  },
  {
    href: "/safety",
    title: "Safety division",
    text: "Educational red-flag checklists for dysphagia and communication that prompt timely referral or instrumental assessment. Not a substitute for clinical judgment.",
  },
  {
    href: "/outcomes",
    title: "Outcomes division",
    text: "Session-by-session progress tracker using participant codes only. Data stays in your browser. Line charts and CSV export.",
  },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="rounded-lg bg-navy px-6 py-8 text-white">
        <h1 className="text-2xl font-bold sm:text-3xl">SLP Compass</h1>
        <p className="mt-1 text-lg font-semibold text-slate-100">An open web platform for evidence-guided speech-language pathology practice</p>
        <p className="mt-2 max-w-3xl text-base text-slate-100">
          A human-guided, multi-division workspace for speech-language pathologists. Inspired by the Virtual Biotech
          framework (Zhang et al., Science, 2026), where AI agents are organised like divisions of an organisation and
          a human expert stays in charge of every decision.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/evidence" className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-slate-100">
            Open the Evidence division
          </Link>
          <Link href="/about" className="rounded-md border border-white px-4 py-2 text-sm font-semibold text-white hover:bg-navy-dark">
            About, privacy and disclaimer
          </Link>
        </div>
      </section>

      <section>
        <h2 className="h2">Divisions</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DIVISIONS.map((d) => (
            <Link key={d.href} href={d.href} className="card block transition hover:border-navy">
              <h3 className="font-bold text-navy">{d.title}</h3>
              <p className="mt-1 text-sm text-slate-700">{d.text}</p>
            </Link>
          ))}
          <div className="card border-dashed bg-slate-50">
            <h3 className="font-bold text-navy">Human in the loop</h3>
            <p className="mt-1 text-sm text-slate-700">
              Every automated output (rule-based or AI) is a suggestion. The clinician reviews, edits and verifies
              before anything is used for research or care.
            </p>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="h2">Privacy at a glance</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>No accounts, no database, no analytics. Nothing about clients or patients is sent to or stored on the server.</li>
          <li>Assessment, planning and outcomes tools run entirely in your browser. Outcome data lives in your browser storage only.</li>
          <li>The Evidence division only requests public registry data from ClinicalTrials.gov.</li>
          <li>If you use the optional AI agent, your API key stays in your browser and is sent only with each annotation request.</li>
        </ul>
      </section>
    </div>
  );
}
