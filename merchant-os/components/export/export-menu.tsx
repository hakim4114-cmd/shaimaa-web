"use client";

import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n/provider";

const languages = [
  { code: "ar", label: "العربية" },
  { code: "fr", label: "Français" },
  { code: "en", label: "English" }
] as const;

/** Excel / CSV download in a chosen language, and print (save as PDF from the browser). */
export function ExportMenu({ dataset, range = "30d", print = true }: { dataset: string; range?: string; print?: boolean }) {
  const { t } = useI18n();
  const te = t.exports;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="print:hidden">
          <Download /> {te.export}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {(["xlsx", "csv"] as const).map((format, index) => (
          <div key={format}>
            {index > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel>{format === "xlsx" ? te.excel : te.csv}</DropdownMenuLabel>
            {languages.map((lang) => (
              <DropdownMenuItem key={lang.code} asChild>
                <a href={`/api/export/${dataset}?format=${format}&lang=${lang.code}&range=${range}`} download>
                  {lang.label}
                </a>
              </DropdownMenuItem>
            ))}
          </div>
        ))}
        {print ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => window.print()}>
              <Printer className="size-4" /> {te.print}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
