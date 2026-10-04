import type { Metadata } from "next";
import EvidenceClient from "./EvidenceClient";

export const metadata: Metadata = { title: "Evidence division" };

export default function EvidencePage() {
  return <EvidenceClient />;
}
