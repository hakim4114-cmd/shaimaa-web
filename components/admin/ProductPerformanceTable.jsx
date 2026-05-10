import { products } from "@/data/products";
import { AdminStatusBadge } from "@/components/admin/AdminUI";

export function ProductPerformanceTable() {
  return (
    <div className="overflow-x-auto bg-ivory shadow-soft">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-cedar text-ivory">
          <tr>
            <th className="p-4">Product</th>
            <th className="p-4">Slug</th>
            <th className="p-4">Price</th>
            <th className="p-4">Status</th>
            <th className="p-4">Colors</th>
            <th className="p-4">Sizes</th>
            <th className="p-4">Featured</th>
            <th className="p-4">SEO</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.slug} className="border-b border-brass/20 align-top">
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 border border-brass/25" style={{ background: product.placeholderGradient }} />
                  <div>
                    <p className="font-semibold text-cedar">{product.name}</p>
                    <p className="text-xs text-coffee">{product.tag}</p>
                  </div>
                </div>
              </td>
              <td className="p-4 font-mono text-xs">{product.slug}</td>
              <td className="p-4 font-semibold text-henna">{product.price}</td>
              <td className="p-4">
                <AdminStatusBadge tone="success">Published</AdminStatusBadge>
              </td>
              <td className="p-4">{product.colors.join(", ")}</td>
              <td className="p-4">{product.sizes.join(", ")}</td>
              <td className="p-4">
                <AdminStatusBadge>Manual</AdminStatusBadge>
              </td>
              <td className="p-4">
                <AdminStatusBadge tone={product.description ? "success" : "warning"}>
                  {product.description ? "Covered" : "Missing"}
                </AdminStatusBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-brass/20 px-5 py-4 text-sm leading-6 text-coffee">
        Product edits are read-only in this version because product data still lives in the repository.
      </div>
    </div>
  );
}
