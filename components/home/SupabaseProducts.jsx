import Image from "next/image";
import { getActiveSupabaseProducts } from "@/lib/supabaseProducts";

function formatProductValue(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
}

export async function SupabaseProducts() {
  const { products, error } = await getActiveSupabaseProducts();

  return (
    <section className="bg-pearl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-henna">
            Supabase products
          </p>
          <h2 className="mt-3 font-display text-4xl font-bold text-cedar sm:text-5xl">
            Active products
          </h2>
        </div>

        {error ? (
          <div className="border border-henna/30 bg-ivory p-5 text-sm font-semibold text-henna">
            Supabase error: {error}
          </div>
        ) : null}

        {!error && products.length === 0 ? (
          <div className="border border-brass/50 bg-ivory p-6 text-coffee">
            No active products found in Supabase.
          </div>
        ) : null}

        {products.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const price = formatProductValue(product.price);
              const compareAtPrice = formatProductValue(product.compare_at_price);
              const stock = formatProductValue(product.stock);

              return (
                <article key={product.id || product.name} className="bg-ivory shadow-soft">
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
                  ) : null}

                  <div className="p-5">
                    <h3 className="font-display text-3xl font-semibold text-cedar">
                      {product.name}
                    </h3>

                    {product.description ? (
                      <p className="mt-3 leading-7 text-coffee">{product.description}</p>
                    ) : null}

                    <div className="mt-5 space-y-2 text-sm text-coffee">
                      {price ? (
                        <p>
                          <span className="font-bold text-cedar">Price:</span> {price}
                        </p>
                      ) : null}

                      {compareAtPrice ? (
                        <p>
                          <span className="font-bold text-cedar">Compare at:</span>{" "}
                          {compareAtPrice}
                        </p>
                      ) : null}

                      {stock ? (
                        <p>
                          <span className="font-bold text-cedar">Stock:</span> {stock}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
