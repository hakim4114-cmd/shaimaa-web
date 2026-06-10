import Image from "next/image";
import { getActiveSupabaseProducts } from "@/lib/supabaseProducts";
import { whatsappNumber } from "@/lib/constants";

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return `${value} MAD`;
}

function getWhatsAppOrderHref(productName) {
  const message = `Salam, I want to order ${productName} from Maison Shaimaa.`;

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export async function SupabaseProducts() {
  const { products, error } = await getActiveSupabaseProducts();

  if (error || products.length === 0) {
    // Customers should never see a backend error; surface it in development only.
    if (error && process.env.NODE_ENV === "development") {
      return (
        <section className="bg-pearl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl border border-henna/30 bg-ivory p-5 text-sm font-semibold text-henna">
            Products error (visible in development only): {error}
          </div>
        </section>
      );
    }

    return null;
  }

  return (
    <section className="bg-pearl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-henna">New arrivals</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-cedar sm:text-5xl">
            Fresh pieces, ready to reserve.
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const price = formatPrice(product.price);
            const compareAtPrice = formatPrice(product.compare_at_price);

            return (
              <article key={product.id || product.name} className="flex flex-col bg-ivory shadow-soft">
                {product.main_image_url ? (
                  <div className="relative aspect-[4/5] overflow-hidden bg-sand">
                    <Image
                      src={product.main_image_url}
                      alt={product.name}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="aspect-[4/5]"
                    style={{
                      background: "linear-gradient(135deg, #fbf7ef 0%, #dcc8ad 58%, #c69a4a 100%)"
                    }}
                  />
                )}

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-3xl font-semibold text-cedar">{product.name}</h3>

                  {product.description ? (
                    <p className="mt-3 leading-7 text-coffee">{product.description}</p>
                  ) : null}

                  {price ? (
                    <p className="mt-5 text-sm text-coffee" dir="ltr">
                      <strong className="text-lg text-cedar">{price}</strong>
                      {compareAtPrice ? (
                        <span className="ml-3 text-coffee/70 line-through">{compareAtPrice}</span>
                      ) : null}
                    </p>
                  ) : null}

                  <a
                    href={getWhatsAppOrderHref(product.name)}
                    className="mt-5 inline-flex items-center justify-center rounded-full bg-henna px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] text-ivory shadow-soft transition hover:bg-cedar"
                  >
                    Order on WhatsApp
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
