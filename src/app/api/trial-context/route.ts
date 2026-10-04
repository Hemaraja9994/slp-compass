import { NextRequest } from "next/server";
import { fetchStudyDetail } from "@/lib/ctgov";
import { buildTrialContext } from "@/lib/annotate";

export const runtime = "nodejs";

// Returns a text-only context for one trial, used by the browser-direct annotation mode.
export async function GET(req: NextRequest) {
  const nct = (req.nextUrl.searchParams.get("nct") ?? "").toUpperCase();
  if (!/^NCT\d{8}$/.test(nct)) return Response.json({ error: "Invalid NCT ID" }, { status: 400 });
  try {
    const study = await fetchStudyDetail(nct);
    return Response.json(
      { nctId: nct, hasResults: Boolean((study as { hasResults?: boolean }).hasResults), context: buildTrialContext(study) },
      { headers: { "Cache-Control": "public, s-maxage=3600" } },
    );
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
