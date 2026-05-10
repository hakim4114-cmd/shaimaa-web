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
    <main className="min-h-screen overflow-x-hidden pt-16 sm:pt-20">
      <Header />
      <section className="px-4 pb-12 pt-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="mx-auto max-w-7xl">
          <TrackOrderForm />
        </div>
      </section>
      <Footer />
      <StickyWhatsAppButton />
    </main>
  );
}
