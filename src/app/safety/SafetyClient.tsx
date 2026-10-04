"use client";

import { useState } from "react";

interface Section {
  id: string;
  title: string;
  intro: string;
  action: string;
  urgent?: boolean;
  items: string[];
}

const SECTIONS: Section[] = [
  {
    id: "urgent",
    title: "Seek urgent or emergency medical help",
    intro: "These signs can indicate a medical emergency. Follow your local emergency pathway first.",
    action: "Arrange immediate medical assessment through your local emergency pathway.",
    urgent: true,
    items: [
      "Sudden onset of speech, language or swallowing difficulty, especially with facial droop, limb weakness or confusion (possible stroke)",
      "Choking episode with airway compromise, or breathing difficulty or noisy breathing (stridor) during or after eating",
      "Sudden loss of voice with breathing difficulty, or after neck trauma or surgery",
      "Sudden hearing loss in one or both ears",
    ],
  },
  {
    id: "dysphagia",
    title: "Dysphagia: signs of possible aspiration or unsafe swallow",
    intro: "Observed during bedside or mealtime observation, or reported by the person or carers.",
    action: "Consider a comprehensive swallowing assessment, diet and fluid review, and discussion with the medical team.",
    items: [
      "Coughing, throat clearing or choking during or soon after eating or drinking",
      "Wet or gurgly voice quality after swallowing",
      "Recurrent chest infections or pneumonia, or unexplained fever",
      "Unexplained weight loss, dehydration or reduced intake",
      "Prolonged mealtimes, fatigue during meals or avoidance of certain foods or liquids",
      "Food or liquid escaping from the nose (nasal regurgitation)",
      "Residue or pocketing of food in the mouth after swallowing",
      "Changes in breathing or colour during feeding (including in infants)",
    ],
  },
  {
    id: "instrumental",
    title: "Dysphagia: when an instrumental assessment (for example VFSS or FEES) may be warranted",
    intro: "Clinical swallow examinations cannot see the pharyngeal stage or detect silent aspiration reliably.",
    action: "Discuss referral for instrumental assessment according to local protocols and availability.",
    items: [
      "Suspected silent aspiration (for example reduced cough, reduced alertness, recent stroke or neurological condition, chest infections without observed coughing)",
      "Pharyngeal stage concerns that cannot be characterised at bedside",
      "Inconsistent or unclear clinical findings, or findings that do not match the person's history",
      "Need to test the effect of postures, manoeuvres or texture changes before recommending them",
      "Planning a return to oral intake after a period of non-oral feeding, or tracheostomy or ventilation history",
      "Head and neck cancer, before or after treatment, with swallowing changes",
    ],
  },
  {
    id: "medical",
    title: "Dysphagia: signs that warrant medical or specialist referral",
    intro: "Some symptoms suggest oesophageal, structural or other medical causes outside the SLP scope.",
    action: "Refer to the treating doctor (for example gastroenterology or ENT) as appropriate.",
    items: [
      "Food sticking in the chest, or difficulty that is getting progressively worse",
      "Pain on swallowing (odynophagia)",
      "Persistent heartburn, regurgitation of undigested food or vomiting",
      "A lump in the neck or a persistent sensation of something in the throat with other symptoms",
      "Blood in saliva or vomit",
    ],
  },
  {
    id: "voice",
    title: "Voice: refer for laryngeal examination",
    intro: "Voice therapy usually follows visualisation of the larynx by an ENT or laryngologist.",
    action: "Refer for laryngoscopy before or alongside voice therapy.",
    items: [
      "Hoarseness persisting beyond 4 weeks, or sooner if a serious underlying cause is suspected",
      "Hoarseness with a history of smoking or heavy alcohol use",
      "Voice change with pain, coughing up blood, swallowing difficulty, a neck lump or weight loss",
      "Voice change after neck, chest or thyroid surgery or intubation",
      "Hoarseness in a professional voice user that affects work",
    ],
  },
  {
    id: "child",
    title: "Child communication: signs that warrant prompt evaluation",
    intro: "Developmental timelines vary. These are commonly used prompts for referral, not diagnostic criteria.",
    action: "Arrange a comprehensive speech, language and hearing evaluation, and a paediatric review when indicated.",
    items: [
      "Any loss of previously acquired words, babble or social skills, at any age",
      "Not responding to name or sounds, or a failed or missed newborn hearing screen",
      "Limited babbling, gesture (pointing, waving) or shared attention by around 12 months",
      "No single words by around 16 months, or no spontaneous two-word phrases by around 24 months",
      "Speech that is very hard for unfamiliar listeners to understand by around 3 to 4 years",
      "Stuttering with visible tension or struggle, avoidance, distress, or a family history of persistent stuttering",
      "Feeding difficulties with weight faltering, coughing or distress at meals",
    ],
  },
  {
    id: "adult",
    title: "Adult communication: signs that warrant further medical evaluation",
    intro: "Some communication changes are early signs of neurological or other medical conditions.",
    action: "Refer to the treating doctor or neurology for medical evaluation alongside SLP assessment.",
    items: [
      "Gradually worsening speech, language or word-finding without a known cause",
      "Slurred speech that is progressing, especially with swallowing change, weakness, or muscle twitching",
      "New stuttering-like speech in adulthood without a previous history (acquired stuttering)",
      "Communication change with memory, behaviour or personality change",
      "Hearing loss in one ear only, with tinnitus, or with dizziness",
    ],
  },
];

const SOURCES = [
  { label: "IDDSI Framework (International Dysphagia Diet Standardisation Initiative)", href: "https://iddsi.org/framework" },
  { label: "ASHA Practice Portal: Adult Dysphagia", href: "https://www.asha.org/practice-portal/clinical-topics/adult-dysphagia/" },
  { label: "ASHA Practice Portal: Pediatric Dysphagia", href: "https://www.asha.org/practice-portal/clinical-topics/pediatric-dysphagia/" },
  { label: "ASHA Practice Portal: Voice Disorders", href: "https://www.asha.org/practice-portal/clinical-topics/voice-disorders/" },
  { label: "ASHA Practice Portal: Late Language Emergence", href: "https://www.asha.org/practice-portal/clinical-topics/late-language-emergence/" },
  { label: "ASHA Practice Portal: Childhood Fluency Disorders", href: "https://www.asha.org/practice-portal/clinical-topics/childhood-fluency-disorders/" },
  { label: "ASHA Practice Portal: Autism", href: "https://www.asha.org/practice-portal/clinical-topics/autism/" },
  {
    label: "Stachler RJ, et al. Clinical Practice Guideline: Hoarseness (Dysphonia) (Update). Otolaryngol Head Neck Surg. 2018;158(1 Suppl):S1 to S42. doi:10.1177/0194599817751030",
    href: "https://doi.org/10.1177/0194599817751030",
  },
  {
    label: "Joint Committee on Infant Hearing. Year 2019 Position Statement. Journal of Early Hearing Detection and Intervention. 2019. doi:10.15142/fptk-b748",
    href: "https://doi.org/10.15142/fptk-b748",
  },
];

export default function SafetyClient() {
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setTicked((t) => ({ ...t, [k]: !t[k] }));
  const count = (s: Section) => s.items.filter((_, i) => ticked[`${s.id}-${i}`]).length;
  const totalTicked = Object.values(ticked).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">Safety division: red-flag checklists</h1>
        <div className="mt-2 rounded border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">
          <b>Educational use only.</b> These general prompts summarise widely taught warning signs. They are not a
          diagnostic tool, not exhaustive, and not a substitute for clinical judgment, local protocols or medical
          advice. Nothing you tick here is saved or sent anywhere.
        </div>
      </div>

      <div className="no-print flex flex-wrap items-center gap-3">
        <span className="text-sm">{totalTicked} item(s) ticked</span>
        <button className="btn-outline" onClick={() => setTicked({})}>Clear all</button>
        <button className="btn" onClick={() => window.print()}>Print checklist</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {SECTIONS.map((s) => {
          const c = count(s);
          return (
            <section key={s.id} className={`card ${s.urgent ? "border-red-400" : ""}`}>
              <h2 className={s.urgent ? "text-lg font-bold text-red-700" : "h2"}>{s.title}</h2>
              <p className="muted mt-1">{s.intro}</p>
              <ul className="mt-2 space-y-1.5">
                {s.items.map((it, i) => {
                  const k = `${s.id}-${i}`;
                  return (
                    <li key={k}>
                      <label className="flex items-start gap-2 text-sm">
                        <input type="checkbox" className="mt-1" checked={!!ticked[k]} onChange={() => toggle(k)} />
                        <span>{it}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              {c > 0 && (
                <div className={`mt-3 rounded p-2 text-sm ${s.urgent ? "bg-red-50 text-red-800" : "bg-navy-light text-navy"}`}>
                  <b>{c} sign(s) noted.</b> {s.action}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <section className="card">
        <h2 className="h2">Further reading (verified links)</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {SOURCES.map((s) => (
            <li key={s.href}>
              <a className="text-navy underline" href={s.href} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          Checklist wording is a general summary written for this tool and is not quoted from these sources. Always
          follow the guidance and protocols that apply in your setting and country.
        </p>
      </section>
    </div>
  );
}
