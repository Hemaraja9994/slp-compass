// SLP domain definitions used to query the ClinicalTrials.gov API v2.
// `cond` maps to query.cond and `term` (optional) to query.term (Essie syntax).

export type DomainId =
  | "dysphagia"
  | "aphasia"
  | "dysarthria"
  | "apraxia"
  | "fluency"
  | "voice"
  | "dld"
  | "ssd"
  | "autism"
  | "hearing";

export interface DomainDef {
  id: DomainId;
  label: string;
  cond: string;
  term?: string;
}

export const DOMAINS: DomainDef[] = [
  {
    id: "dysphagia",
    label: "Dysphagia / swallowing",
    cond: 'dysphagia OR "deglutition disorders" OR "swallowing disorder" OR "swallowing disorders"',
  },
  { id: "aphasia", label: "Aphasia", cond: "aphasia" },
  { id: "dysarthria", label: "Dysarthria", cond: "dysarthria" },
  {
    id: "apraxia",
    label: "Apraxia of speech",
    cond: '"apraxia of speech" OR "speech apraxia" OR "verbal apraxia" OR "childhood apraxia of speech"',
  },
  {
    id: "fluency",
    label: "Stuttering / fluency",
    cond: 'stuttering OR stammering OR cluttering OR "fluency disorder"',
  },
  {
    id: "voice",
    label: "Voice",
    cond: '"voice disorders" OR "voice disorder" OR dysphonia OR "vocal fold nodules" OR "vocal fold paralysis" OR "vocal cord paralysis" OR "vocal fold lesion" OR hoarseness',
  },
  {
    id: "dld",
    label: "Developmental language disorder",
    cond: '"developmental language disorder" OR "specific language impairment" OR "language delay" OR "late talker" OR "language development disorders" OR "expressive language disorder"',
  },
  {
    id: "ssd",
    label: "Speech sound disorder",
    cond: '"speech sound disorder" OR "articulation disorder" OR "phonological disorder" OR "cleft palate"',
    term: "speech",
  },
  {
    id: "autism",
    label: "Autism: social communication",
    cond: 'autism OR "autism spectrum disorder"',
    term: 'communication OR language OR speech OR "social communication"',
  },
  {
    id: "hearing",
    label: "Hearing-related communication",
    cond: '"hearing loss" OR deafness OR "cochlear implant" OR "hearing impairment"',
    term: 'speech OR language OR communication OR "auditory training"',
  },
];

export const DOMAIN_IDS = DOMAINS.map((d) => d.id);

export function domainLabel(id: string): string {
  return DOMAINS.find((d) => d.id === id)?.label ?? id;
}

export const INTERVENTION_TYPES = ["BEHAVIORAL", "DEVICE", "OTHER"] as const;
export type InterventionTypeFilter = (typeof INTERVENTION_TYPES)[number];
