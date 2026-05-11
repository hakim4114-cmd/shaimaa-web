import { getSupabaseConfigError, supabase } from "@/lib/supabaseClient";

function normalizeProduct(product) {
  return {
    id: product.id,
    name: product.name || "Untitled product",
    description: product.description || "",
    price: product.price ?? "",
    compare_at_price: product.compare_at_price ?? "",
    stock: product.stock ?? "",
    main_image_url: product.main_image_url || ""
  };
}

export async function getActiveSupabaseProducts() {
  const configError = getSupabaseConfigError();

  if (configError || !supabase) {
    return {
      products: [],
      error: configError || "Supabase client is not configured."
    };
  }

  try {
    const { data, error } = await supabase
      .from("products")
      .select("id,name,description,price,compare_at_price,stock,main_image_url")
      .eq("status", "active");

    if (error) {
      return {
        products: [],
        error: error.message
      };
    }

    return {
      products: Array.isArray(data) ? data.map(normalizeProduct) : [],
      error: ""
    };
  } catch (error) {
    return {
      products: [],
      error: error instanceof Error ? error.message : "Unable to load Supabase products."
    };
  }
}
