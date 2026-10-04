import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: {
    default: "SLP Compass: An open web platform for evidence-guided speech-language pathology practice",
    template: "%s | SLP Compass",
  },
  description:
    "SLP Compass is an open web platform for evidence-guided speech-language pathology practice: evidence from ClinicalTrials.gov, assessment calculators, ICF goal planning, safety red flags and outcome tracking, with the clinician in charge.",
  applicationName: "SLP Compass",
  openGraph: {
    title: "SLP Compass",
    description: "An open web platform for evidence-guided speech-language pathology practice.",
    siteName: "SLP Compass",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <Nav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <footer className="no-print border-t border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-600">
            <p>
              SLP Compass is for educational and research use only. It is not a medical device and does not
              replace clinical judgment. No patient data is stored on the server.
            </p>
            <p className="mt-1">
              Built by Hemaraja Nayaka S, Department of Audiology and Speech-Language Pathology, Yenepoya Medical
              College, Yenepoya (Deemed to be University), Mangaluru, India.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
