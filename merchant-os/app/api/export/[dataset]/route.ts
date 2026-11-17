import { NextResponse, type NextRequest } from "next/server";
import { requireOrganization } from "@/lib/data/context";
import { buildDataset, datasets, ExportForbidden } from "@/lib/export/datasets";
import { toCsv, toXlsx } from "@/lib/export/table";
import { locales, type Locale } from "@/lib/i18n/config";
import { parsePreset, resolveRange } from "@/lib/ranges";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ dataset: string }> }) {
  const { dataset } = await params;
  const name = datasets.find((d) => d === dataset);
  if (!name) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const search = request.nextUrl.searchParams;
  const format = search.get("format") === "csv" ? "csv" : "xlsx";
  const lang = (locales as readonly string[]).includes(search.get("lang") ?? "") ? (search.get("lang") as Locale) : "ar";
  const { from, to } = resolveRange(parsePreset(search.get("range"), "30d"));

  const ctx = await requireOrganization();
  let table;
  try {
    table = await buildDataset(ctx, name, lang, from, to);
  } catch (error) {
    if (error instanceof ExportForbidden) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw error;
  }
  const filename = `merchant-os-${name}-${from}_${to}.${format}`;
  const headers = {
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
    "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  };
  if (format === "csv") return new NextResponse(toCsv(table), { headers });
  return new NextResponse(new Uint8Array(await toXlsx(table)), { headers });
}
