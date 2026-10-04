import type { Metadata } from "next";
import SafetyClient from "./SafetyClient";

export const metadata: Metadata = { title: "Safety division" };

export default function SafetyPage() {
  return <SafetyClient />;
}
