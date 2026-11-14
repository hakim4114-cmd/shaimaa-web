import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="tabular text-sm font-medium text-subtle-foreground">404</p>
      <Link href="/" className={buttonVariants({ variant: "secondary" })}>
        Merchant OS
      </Link>
    </div>
  );
}
