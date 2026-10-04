import type { Metadata } from "next";
import AssessmentClient from "./AssessmentClient";

export const metadata: Metadata = { title: "Assessment division" };

export default function AssessmentPage() {
  return <AssessmentClient />;
}
