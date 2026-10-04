import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="h1">About SLP Compass</h1>

      <section className="space-y-2">
        <h2 className="h2">Purpose</h2>
        <p className="text-sm text-slate-800">
          SLP Compass is an open web platform for evidence-guided speech-language pathology practice. It is a free, open tool that helps speech-language pathologists (SLPs) and researchers explore
          the registered intervention evidence in their field and support everyday clinical reasoning. It is organised
          as divisions: Evidence, Assessment, Planning, Safety and Outcomes. Each division does one job, and the
          clinician coordinates them.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="h2">Inspiration</h2>
        <p className="text-xs text-slate-500">SLP Compass was first released under the working name Virtual SLP Lab.</p>
        <p className="text-sm text-slate-800">
          The design is inspired by the Virtual Biotech, a multi-agent AI framework in which AI agents are organised
          like a drug company, with divisions for target discovery, safety, modality and clinical development, working
          under human guidance. In that work, tens of thousands of agents annotated outcomes from more than 55,000
          clinical trials.
        </p>
        <blockquote className="card text-sm">
          Zhang HG, Eckmann P, Miao J, Mahon AB, Zou J. The Virtual Biotech: A multi-agent AI framework for therapeutic
          discovery and development. <i>Science</i>. 2026;eaeg6779. doi:{" "}
          <a className="text-navy underline" href="https://doi.org/10.1126/science.aeg6779" target="_blank" rel="noreferrer">
            10.1126/science.aeg6779
          </a>
        </blockquote>
        <p className="text-xs text-slate-500">
          SLP Compass is an independent project. It is not affiliated with or endorsed by the authors of that
          paper or by the journal.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="h2">Human in the loop</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
          <li>Automated outputs are suggestions. Rule-based extraction shows the matched text so you can check it.</li>
          <li>AI annotations are marked unverified until a clinician ticks the verification box, and editing an annotation resets it to unverified.</li>
          <li>Calculators, goal text and red-flag prompts support, but never replace, professional judgment.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="h2">Data sources</h2>
        <p className="text-sm text-slate-800">
          Trial data comes live from the public{" "}
          <a className="text-navy underline" href="https://clinicaltrials.gov/data-api/api" target="_blank" rel="noreferrer">
            ClinicalTrials.gov API v2
          </a>{" "}
          maintained by the U.S. National Library of Medicine. Nothing is invented or cached beyond short-term
          performance caching. Registry records can be incomplete or out of date; always open the record to confirm.
          Indian trials are often registered only with the{" "}
          <a className="text-navy underline" href="https://ctri.nic.in" target="_blank" rel="noreferrer">
            Clinical Trials Registry of India (CTRI)
          </a>
          , which is not yet included.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="h2">Privacy statement</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
          <li>No patient or client data is stored on the server. There are no accounts, no database and no analytics.</li>
          <li>Assessment and planning tools process input in your browser only. Outcome tracking uses your browser&apos;s local storage on your device.</li>
          <li>The server only relays requests for public registry data to ClinicalTrials.gov.</li>
          <li>
            If you use the optional AI annotation agent, your API key is kept in your browser&apos;s local storage and sent
            only with each annotation request. In relay mode it passes through the server for that request and is not
            logged or stored. Only public registry text is sent to the AI provider you choose.
          </li>
          <li>Use participant codes, never names or other identifiers, and follow your institution&apos;s data protection rules.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="h2">Disclaimer</h2>
        <p className="text-sm text-slate-800">
          SLP Compass is for educational and research use only. It is not a medical device, does not provide a
          diagnosis or treatment recommendation, and is not a substitute for clinical judgment, local protocols or
          medical advice. The authors accept no liability for decisions made using this tool.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="h2">Author</h2>
        <p className="text-sm text-slate-800">
          Hemaraja Nayaka S, Associate Professor, Department of Audiology and Speech-Language Pathology, Yenepoya
          Medical College, Yenepoya (Deemed to be University), Mangaluru, Karnataka, India.
        </p>
        <p className="text-xs text-slate-500">Version 1.0. Released under the MIT License.</p>
      </section>
    </div>
  );
}
