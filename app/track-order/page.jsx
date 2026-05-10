import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { StickyWhatsAppButton } from "@/components/layout/StickyWhatsAppButton";
import { TrackOrderForm } from "@/components/orders/TrackOrderForm";

export const metadata = {
  title: "Track Order | Maison Shaimaa",
  description:
    "Check a Maison Shaimaa cash-on-delivery order status using the order ID and phone number.",
  alternates: {
    canonical: "/track-order"
  }
};

export default function TrackOrderPage() {
  return (
    <main className="min-h-screen overflow-hidden pt-24 sm:pt-28">
      <Header />
      <section className="px-4 pb-20 pt-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <TrackOrderForm />
        </div>
      </section>
      <Footer />
      <StickyWhatsAppButton />
    </main>
  );
}
