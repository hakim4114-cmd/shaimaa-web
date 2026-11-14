import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function FormAlert({ tone = "danger", children }: { tone?: "danger" | "success"; children: React.ReactNode }) {
  const Icon = tone === "danger" ? CircleAlert : CircleCheck;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-md px-3 py-2.5 text-sm",
        tone === "danger" ? "bg-danger-soft text-danger" : "bg-success-soft text-success"
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
