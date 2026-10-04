import type { Metadata } from "next";
import OutcomesClient from "./OutcomesClient";

export const metadata: Metadata = { title: "Outcomes division" };

export default function OutcomesPage() {
  return <OutcomesClient />;
}
