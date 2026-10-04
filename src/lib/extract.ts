// Rule-based feature extraction from ClinicalTrials.gov API v2 study records.
// Everything here is deterministic and transparent: regular expressions over
// the registry text. Extracted values are hints for a clinician to verify,
// not ground truth.

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface TrialRecord {
  nctId: string;
  title: string;
  url: string;
  domains: string[];
  status: string;
  whyStopped: string;
  stopCategory: string;
  phase: string;
  allocation: string;
  masking: string;
  interventionTypes: string[];
  interventions: string[];
  enrollment: number | null;
  enrollmentType: string;
  startDate: string;
  completionDate: string;
  countries: string[];
  sponsor: string;
  sponsorClass: string;
  hasResults: boolean;
  ageGroups: string[];
  minAge: string;
  maxAge: string;
  populationTags: string[];
  sessions: number | null;
  minutesPerSession: number | null;
  sessionsPerWeek: number | null;
  durationWeeks: number | null;
  totalHours: number | null;
  intensity: string;
  delivery: string[];
  primaryOutcomes: string[];
  doseEvidence: string;
}

const WORD_NUMS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  once: 1, twice: 2, thrice: 3,
};
const NUM = "(\\d{1,3}(?:\\.\\d)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|eighteen|twenty|thirty|forty|fifty|sixty)";

function toNum(s: string | undefined): number | null {
  if (!s) return null;
  const t = s.toLowerCase();
  if (t in WORD_NUMS) return WORD_NUMS[t];
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function snippet(text: string, index: number, len: number): string {
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + len + 40);
  return (start > 0 ? "..." : "") + text.slice(start, end).replace(/\s+/g, " ").trim() + (end < text.length ? "..." : "");
}

export interface DoseFeatures {
  sessions: number | null;
  minutesPerSession: number | null;
  sessionsPerWeek: number | null;
  durationWeeks: number | null;
  totalHours: number | null;
  intensity: string;
  evidence: string[];
}

export function extractDose(text: string): DoseFeatures {
  const evidence: string[] = [];
  let sessions: number | null = null;
  let minutesPerSession: number | null = null;
  let sessionsPerWeek: number | null = null;
  let durationWeeks: number | null = null;

  // Total sessions: "24 sessions", "a total of 12 therapy sessions", "10 treatment sessions"
  const sessRe = new RegExp(
    `(?:total of\\s+)?${NUM}\\s*(?:x\\s*)?(?:total\\s+|individual\\s+|group\\s+|weekly\\s+|daily\\s+|consecutive\\s+)?(?:treatment|therapy|training|intervention|practice|study|teletherapy|telepractice)?\\s*sessions?\\b`,
    "i",
  );
  const sm = text.match(sessRe);
  if (sm && sm.index !== undefined) {
    const n = toNum(sm[1]);
    // Ignore "1 session" style statements that are usually not totals, and absurd values
    if (n !== null && n >= 2 && n <= 400) {
      sessions = n;
      evidence.push(snippet(text, sm.index, sm[0].length));
    }
  }

  // Minutes per session: "45-minute sessions", "30 min", "60 minutes per session"; or hours
  const minRe = /(\d{1,3})\s*(?:-|to|–)?\s*(\d{1,3})?\s*-?\s*(?:min(?:ute)?s?)\b/i;
  const mm = text.match(minRe);
  if (mm && mm.index !== undefined) {
    const a = toNum(mm[1]);
    const b = toNum(mm[2]);
    const v = a !== null && b !== null && b > a ? (a + b) / 2 : a;
    if (v !== null && v >= 5 && v <= 240) {
      minutesPerSession = v;
      evidence.push(snippet(text, mm.index, mm[0].length));
    }
  }
  if (minutesPerSession === null) {
    const hr = text.match(
      new RegExp(`${NUM}\\s*-?\\s*(?:hours?|hrs?|h)\\b(?:\\s*(?:per|a|each|\\/)\\s*(?:session|day)|\\s+(?:[a-z]+\\s+)?sessions?)`, "i"),
    );
    if (hr && hr.index !== undefined) {
      const h = toNum(hr[1]);
      if (h !== null && h > 0 && h <= 6) {
        minutesPerSession = h * 60;
        evidence.push(snippet(text, hr.index, hr[0].length));
      }
    }
  }

  // Frequency: "3 times per week", "twice a week", "5 days/week", "3 sessions per week", "daily"
  const freqRe = new RegExp(
    `${NUM}\\s*(?:x|times?|days?|visits?|(?:\\d{1,3}(?:\\.\\d)?\\s*-?\\s*(?:minutes?|mins?|hours?|h)\\s+)?(?:[a-z]+\\s+)?sessions?)?\\s*(?:per|a|each|\\/|every)\\s*week`,
    "i",
  );
  const fm = text.match(freqRe);
  if (fm && fm.index !== undefined) {
    const n = toNum(fm[1]);
    if (n !== null && n >= 1 && n <= 14) {
      sessionsPerWeek = n;
      evidence.push(snippet(text, fm.index, fm[0].length));
    }
  } else {
    const twice = /\btwice (?:a day|daily|per day)\b|\b2 times (?:a|per) day\b/i;
    const daily = /\bonce (?:a day|daily|per day)\b|\bevery day\b|\bdaily (?:sessions?|practice|therapy|training|exercises?|treatment|intervention|use|for)\b|\b(?:performed|practised|practiced|administered|delivered|given|done|provided|completed) daily\b/i;
    const tm = text.match(twice);
    const dm2 = tm ? null : text.match(daily);
    const hit = tm ?? dm2;
    if (hit && hit.index !== undefined) {
      sessionsPerWeek = tm ? 14 : 7;
      evidence.push(snippet(text, hit.index, hit[0].length));
    }
  }

  // Duration: "for 6 weeks", "over 3 months", "8-week program", "12 weeks of therapy"
  const durRe = new RegExp(
    `(?:for|over|during|lasting|period of|across|within)\\s+(?:a\\s+|the\\s+)?(?:total of\\s+)?${NUM}\\s*(?:consecutive\\s+)?(weeks?|months?|days?)\\b|${NUM}\\s*-\\s*(week|month|day)\\s+(?:program|programme|intervention|treatment|therapy|training|period|course|protocol|block)`,
    "i",
  );
  const dm = text.match(durRe);
  if (dm && dm.index !== undefined) {
    const n = toNum(dm[1] ?? dm[3]);
    const unit = (dm[2] ?? dm[4] ?? "").toLowerCase();
    if (n !== null) {
      let w: number | null = null;
      if (unit.startsWith("week")) w = n;
      else if (unit.startsWith("month")) w = Math.round(n * 4.35 * 10) / 10;
      else if (unit.startsWith("day")) w = Math.round((n / 7) * 10) / 10;
      if (w !== null && w > 0 && w <= 260) {
        durationWeeks = w;
        evidence.push(snippet(text, dm.index, dm[0].length));
      }
    }
  }

  // Derived total hours
  let totalSessions = sessions;
  if (totalSessions === null && sessionsPerWeek !== null && durationWeeks !== null) {
    totalSessions = Math.round(sessionsPerWeek * durationWeeks);
  }
  const totalHours =
    totalSessions !== null && minutesPerSession !== null
      ? Math.round(((totalSessions * minutesPerSession) / 60) * 10) / 10
      : null;

  // Intensity label (simple, transparent rule)
  let intensity = "Not stated";
  const intensiveWords = /\b(intensive|intense|high[- ]intensity|massed practice|constraint[- ]induced|intensive comprehensive aphasia|ICAP|boot camp|LSVT)\b/i;
  if (intensiveWords.test(text) || (sessionsPerWeek !== null && sessionsPerWeek >= 4)) {
    intensity = "High (stated intensive or 4+ sessions/week)";
  } else if (sessionsPerWeek !== null && sessionsPerWeek >= 2) {
    intensity = "Moderate (2 to 3 sessions/week)";
  } else if (sessionsPerWeek !== null) {
    intensity = "Low (1 session/week or less)";
  }

  return { sessions, minutesPerSession, sessionsPerWeek, durationWeeks, totalHours, intensity, evidence };
}

export function extractDelivery(text: string): string[] {
  const out: string[] = [];
  if (/\btele[- ]?(practice|rehabilitation|rehab|therapy|health|medicine|speech|intervention|coaching)\b|\bremote(ly)?\b|\bvideo[- ]?conferenc|\bzoom\b|\bonline\b|\binternet[- ]based\b|\bweb[- ]based\b|\bvirtual(ly)? (session|delivery|visit|therapy)/i.test(text)) out.push("Telepractice / remote");
  if (/\bapp\b|\bapplication\b|\btablet\b|\bipad\b|\bsmartphone\b|\bcomputer[- ](based|assisted|program)|\bsoftware\b|\bdigital\b|\bvirtual reality\b|\bgame\b|\bgamified\b/i.test(text)) out.push("App / computer / digital");
  if (/\bgroup (therapy|sessions?|treatment|intervention|program|training)\b|\bgroup[- ]based\b/i.test(text)) out.push("Group");
  if (/\bhome[- ](based|practice|program|programme|exercise|training)\b|\bat home\b|\bparent[- ](implemented|mediated|delivered|training|coaching)\b|\bcaregiver[- ](mediated|delivered|training|implemented)\b/i.test(text)) out.push("Home / caregiver-mediated");
  if (/\bface[- ]to[- ]face\b|\bin[- ]person\b|\bclinic[- ]based\b|\bin the clinic\b|\binpatient\b|\boutpatient\b/i.test(text)) out.push("In-person");
  return out;
}

const POP_TAGS: [string, RegExp][] = [
  ["Stroke", /\bstroke\b|\bcerebrovascular\b|\bCVA\b/i],
  ["Parkinson disease", /\bparkinson/i],
  ["Head and neck cancer", /\bhead and neck cancer|\bhead & neck|\boropharyngeal cancer|\blaryngeal cancer|\bnasopharyngeal|\blaryngectom/i],
  ["Traumatic brain injury", /\btraumatic brain injur|\bTBI\b/i],
  ["ALS / MND", /\bamyotrophic|\bALS\b|\bmotor neuron/i],
  ["Multiple sclerosis", /\bmultiple sclerosis\b/i],
  ["Dementia / PPA", /\bdementia\b|\balzheimer|\bprimary progressive aphasia\b|\bPPA\b/i],
  ["Cerebral palsy", /\bcerebral palsy\b/i],
  ["Down syndrome", /\bdown syndrome\b|\btrisomy 21\b/i],
  ["Cleft lip / palate", /\bcleft\b/i],
  ["Preterm / neonatal", /\bpreterm\b|\bpremature infant|\bneonat|\bNICU\b/i],
  ["Older adults / frailty", /\bfrail|\bpresbyphagia\b|\bnursing home|\blong[- ]term care/i],
  ["Critical care / intubation", /\bintubat|\bmechanical ventilation|\bICU\b|\bintensive care|\btracheostom/i],
  ["Cochlear implant users", /\bcochlear implant/i],
  ["Hearing aid users", /\bhearing aid/i],
  ["Teachers / occupational voice", /\bteacher|\bprofessional voice|\bsinger/i],
];

export function extractPopulation(text: string): string[] {
  return POP_TAGS.filter(([, re]) => re.test(text)).map(([t]) => t);
}

export function categoriseWhyStopped(why: string): string {
  if (!why) return "";
  const w = why.toLowerCase();
  if (/covid|pandemic|sars-cov|coronavirus/.test(w)) return "COVID-19";
  if (/recruit|enrol|enroll|accrual|participants|subjects|patients? (were|was)? ?(not|un)|low (number|interest)|eligible/.test(w)) return "Recruitment / enrolment";
  if (/fund|budget|financ|grant|money|resources/.test(w)) return "Funding";
  if (/safety|adverse|harm|risk/.test(w)) return "Safety";
  if (/futil|efficacy|ineffect|interim analysis|no benefit|lack of effect/.test(w)) return "Efficacy / futility";
  if (/sponsor|business|strategic|company|commercial|portfolio/.test(w)) return "Sponsor / business decision";
  if (/\bpi\b|investigator|principal|staff|personnel|left the|relocat|retire|leave/.test(w)) return "Investigator / staffing";
  if (/irb|ethic|regulator|approval|fda/.test(w)) return "Regulatory / ethics";
  if (/device|equipment|technical|software|supply|logistic|site|feasib/.test(w)) return "Logistics / feasibility";
  return "Other / unspecified";
}

function ageGroupsFrom(std: string[] | undefined): string[] {
  const map: Record<string, string> = { CHILD: "Children", ADULT: "Adults", OLDER_ADULT: "Older adults" };
  return (std ?? []).map((s) => map[s] ?? s);
}

function joinText(ps: any): string {
  const parts: string[] = [];
  const d = ps?.descriptionModule;
  if (d?.briefSummary) parts.push(d.briefSummary);
  const di = ps?.designModule?.designInfo;
  if (di?.interventionModelDescription) parts.push(di.interventionModelDescription);
  for (const a of ps?.armsInterventionsModule?.armGroups ?? []) {
    if (a.description) parts.push(a.description);
  }
  for (const i of ps?.armsInterventionsModule?.interventions ?? []) {
    if (i.name) parts.push(i.name);
    if (i.description) parts.push(i.description);
  }
  return parts.join("\n");
}

export function studyToRecord(study: any, domain: string): TrialRecord {
  const ps = study?.protocolSection ?? {};
  const id = ps.identificationModule ?? {};
  const st = ps.statusModule ?? {};
  const de = ps.designModule ?? {};
  const ai = ps.armsInterventionsModule ?? {};
  const el = ps.eligibilityModule ?? {};
  const locs: any[] = ps.contactsLocationsModule?.locations ?? [];
  const text = joinText(ps);
  const condText = [
    ...(ps.conditionsModule?.conditions ?? []),
    ...(ps.conditionsModule?.keywords ?? []),
    id.briefTitle ?? "",
    el.eligibilityCriteria ? String(el.eligibilityCriteria).slice(0, 1500) : "",
  ].join(" ");
  const dose = extractDose(text);
  const interventions: any[] = ai.interventions ?? [];
  const countries = Array.from(new Set(locs.map((l) => l?.country).filter(Boolean))) as string[];
  const nctId: string = id.nctId ?? "";
  const whyStopped: string = st.whyStopped ?? "";
  return {
    nctId,
    title: id.briefTitle ?? id.officialTitle ?? "",
    url: `https://clinicaltrials.gov/study/${nctId}`,
    domains: [domain],
    status: st.overallStatus ?? "UNKNOWN",
    whyStopped,
    stopCategory: categoriseWhyStopped(whyStopped),
    phase: (de.phases ?? []).join("/") || "Not stated",
    allocation: de.designInfo?.allocation ?? "",
    masking: de.designInfo?.maskingInfo?.masking ?? "",
    interventionTypes: Array.from(new Set(interventions.map((i) => i.type).filter(Boolean))),
    interventions: interventions.map((i) => `${i.type ?? ""}: ${i.name ?? ""}`).slice(0, 8),
    enrollment: typeof de.enrollmentInfo?.count === "number" ? de.enrollmentInfo.count : null,
    enrollmentType: de.enrollmentInfo?.type ?? "",
    startDate: st.startDateStruct?.date ?? "",
    completionDate: st.completionDateStruct?.date ?? st.primaryCompletionDateStruct?.date ?? "",
    countries,
    sponsor: ps.sponsorCollaboratorsModule?.leadSponsor?.name ?? "",
    sponsorClass: ps.sponsorCollaboratorsModule?.leadSponsor?.class ?? "",
    hasResults: Boolean(study?.hasResults),
    ageGroups: ageGroupsFrom(el.stdAges),
    minAge: el.minimumAge ?? "",
    maxAge: el.maximumAge ?? "",
    populationTags: extractPopulation(condText + " " + text),
    sessions: dose.sessions,
    minutesPerSession: dose.minutesPerSession,
    sessionsPerWeek: dose.sessionsPerWeek,
    durationWeeks: dose.durationWeeks,
    totalHours: dose.totalHours,
    intensity: dose.intensity,
    delivery: extractDelivery(text),
    primaryOutcomes: (ps.outcomesModule?.primaryOutcomes ?? []).map((o: any) => o.measure).filter(Boolean).slice(0, 4),
    doseEvidence: dose.evidence.join(" | ").slice(0, 600),
  };
}
