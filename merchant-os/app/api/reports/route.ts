import { NextResponse, type NextRequest } from "next/server";
import { requireOrganization } from "@/lib/data/context";
import { getPeriodReport } from "@/lib/data/reports";
import { businessDay } from "@/lib/datetime";
import { toXlsxBook } from "@/lib/export/table";
import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { parseHalf, parseMonth, reportPeriod } from "@/lib/reports/periods";
import { reportWorkbook } from "@/lib/reports/workbook";

export const dynamic = "force-dynamic";

// The period report (summary, products, variants, cities, campaigns, sleeping stock) as one Excel file.
export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const ctx = await requireOrganization();
  if (!ctx.can.seeMoney) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const today = businessDay(new Date());
  const period = reportPeriod(parseMonth(search.get("month"), today), parseHalf(search.get("half")));
  const lang = (locales as readonly string[]).includes(search.get("lang") ?? "") ? (search.get("lang") as Locale) : "ar";
  const report = await getPeriodReport(ctx, period, today);
  const file = await toXlsxBook(reportWorkbook(report, getDictionary(lang), lang === "ar"));
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Disposition": `attachment; filename="merchant-os-report-${period.from}_${period.to}.xlsx"`,
      "Cache-Control": "no-store",
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
  });
}
