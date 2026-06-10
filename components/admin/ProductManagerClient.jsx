"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AdminEmptyState, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminUI";

const inputClass =
  "w-full border border-brass/30 bg-pearl px-4 py-3 text-cedar outline-none transition focus:border-henna";

const emptyForm = {
  id: "",
  name: "",
  description: "",
  price: "",
  compare_at_price: "",
  stock: "",
  status: "active",
  main_image_url: ""
};

const fieldErrorMessages = {
  name: "Please enter a product name (at least 2 characters).",
  price: "Please enter a valid price (numbers only, for example 890).",
  compare_at_price: "The old price must be a number, or leave it empty.",
  stock: "Stock must be a whole number, or leave it empty.",
  status: "Please choose a valid status."
};

function getStatusTone(status) {
  if (status === "active") {
    return "success";
  }

  if (status === "archived") {
    return "danger";
  }

  return "neutral";
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return `${value} MAD`;
}

function FieldLabel({ label, children }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-cedar">
      {label}
      {children}
    </label>
  );
}

export function ProductManagerClient() {
  const [products, setProducts] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [loadMessage, setLoadMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const response = await fetch("/api/admin/products", { cache: "no-store" });
        const result = await response.json().catch(() => ({}));

        if (!isMounted) {
          return;
        }

        if (response.status === 401) {
          setLoadState("unauthorized");
          return;
        }

        if (response.status === 503) {
          setLoadState("unconfigured");
          setLoadMessage(result?.configError || "");
          return;
        }

        if (!response.ok || result?.success === false) {
          setLoadState("error");
          setLoadMessage(result?.message || "Products could not be loaded.");
          return;
        }

        setProducts(Array.isArray(result.products) ? result.products : []);
        setLoadState("success");
      } catch {
        if (isMounted) {
          setLoadState("error");
          setLoadMessage("Products could not be loaded. Please check your connection and refresh.");
        }
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, [refreshCount]);

  function refreshProducts() {
    setRefreshCount((count) => count + 1);
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEditing(product) {
    setForm({
      id: product.id,
      name: product.name || "",
      description: product.description || "",
      price: product.price ?? "",
      compare_at_price: product.compare_at_price ?? "",
      stock: product.stock ?? "",
      status: product.status || "draft",
      main_image_url: product.main_image_url || ""
    });
    setFormErrors([]);
    setFeedback("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(emptyForm);
    setFormErrors([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploading(true);
    setFeedback("");

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const response = await fetch("/api/admin/products/upload", {
        method: "POST",
        body: uploadData
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.url) {
        const message =
          result?.message === "FILE_TOO_LARGE"
            ? "This photo is too large. Please use a photo under 5MB."
            : result?.message === "FILE_TYPE_NOT_ALLOWED"
              ? "Please choose a JPG, PNG, or WebP photo."
              : "The photo could not be uploaded. Please try again.";
        setFeedback(message);
        return;
      }

      updateField("main_image_url", result.url);
    } catch {
      setFeedback("The photo could not be uploaded. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSaving || isUploading) {
      return;
    }

    setIsSaving(true);
    setFormErrors([]);
    setFeedback("");

    const isEditing = Boolean(form.id);

    try {
      const response = await fetch(isEditing ? `/api/admin/products/${form.id}` : "/api/admin/products", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
        if (Array.isArray(result?.errors) && result.errors.length > 0) {
          setFormErrors(result.errors.map((error) => fieldErrorMessages[error.field] || "Please check the form."));
        } else {
          setFeedback("The product could not be saved. Please try again.");
        }
        return;
      }

      resetForm();
      setFeedback(isEditing ? "Product updated." : "Product added. It is now on the website if its status is Active.");
      refreshProducts();
    } catch {
      setFeedback("The product could not be saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(`Delete "${product.name}"? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
        setFeedback("The product could not be deleted. Please try again.");
        return;
      }

      setFeedback("Product deleted.");
      refreshProducts();
    } catch {
      setFeedback("The product could not be deleted. Please try again.");
    }
  }

  async function handleStatusToggle(product) {
    const nextStatus = product.status === "active" ? "draft" : "active";

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...product, status: nextStatus })
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
        setFeedback("The status could not be changed. Please try again.");
        return;
      }

      refreshProducts();
    } catch {
      setFeedback("The status could not be changed. Please try again.");
    }
  }

  if (loadState === "loading") {
    return (
      <div className="bg-ivory p-6 shadow-soft">
        <div className="h-4 w-40 bg-brass/20" />
        <div className="mt-5 grid gap-3">
          <div className="h-12 bg-pearl" />
          <div className="h-12 bg-pearl" />
          <div className="h-12 bg-pearl" />
        </div>
      </div>
    );
  }

  if (loadState === "unauthorized") {
    return (
      <AdminEmptyState
        title="Admin session required"
        description="Please log in again to manage products."
        href="/admin/login"
        actionLabel="Go to login"
      />
    );
  }

  if (loadState === "unconfigured") {
    return (
      <AdminEmptyState
        title="One-time setup needed"
        description={`Product management needs the Supabase connection to be completed (see docs/product-manager-setup.md for the simple steps). ${loadMessage}`}
      />
    );
  }

  if (loadState === "error") {
    return <AdminEmptyState title="Products could not be loaded" description={loadMessage} />;
  }

  return (
    <div className="grid gap-6">
      <AdminSectionCard
        title={form.id ? "Edit product" : "Add a new product"}
        description="Fill in the product details and upload a photo. Products with status Active appear on the website immediately."
      >
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldLabel label="Product name">
              <input
                required
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                className={inputClass}
                placeholder="Amina Ivory Djellaba"
              />
            </FieldLabel>
            <FieldLabel label="Status">
              <select
                value={form.status}
                onChange={(event) => updateField("status", event.target.value)}
                className={inputClass}
              >
                <option value="active">Active (visible on the website)</option>
                <option value="draft">Draft (hidden)</option>
                <option value="archived">Archived (hidden)</option>
              </select>
            </FieldLabel>
          </div>

          <FieldLabel label="Description">
            <textarea
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              className={`${inputClass} min-h-24`}
              placeholder="A soft ivory djellaba with refined Moroccan elegance."
            />
          </FieldLabel>

          <div className="grid gap-4 sm:grid-cols-3">
            <FieldLabel label="Price (MAD)">
              <input
                required
                value={form.price}
                onChange={(event) => updateField("price", event.target.value)}
                className={inputClass}
                inputMode="decimal"
                placeholder="890"
                dir="ltr"
              />
            </FieldLabel>
            <FieldLabel label="Old price (optional)">
              <input
                value={form.compare_at_price}
                onChange={(event) => updateField("compare_at_price", event.target.value)}
                className={inputClass}
                inputMode="decimal"
                placeholder="1190"
                dir="ltr"
              />
            </FieldLabel>
            <FieldLabel label="Stock (optional)">
              <input
                value={form.stock}
                onChange={(event) => updateField("stock", event.target.value)}
                className={inputClass}
                inputMode="numeric"
                placeholder="10"
                dir="ltr"
              />
            </FieldLabel>
          </div>

          <FieldLabel label="Product photo">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="text-sm text-coffee file:mr-4 file:rounded-full file:border-0 file:bg-cedar file:px-5 file:py-2.5 file:text-xs file:font-bold file:uppercase file:tracking-[0.1em] file:text-ivory hover:file:bg-henna"
            />
          </FieldLabel>

          {isUploading ? <p className="text-sm font-semibold text-coffee">Uploading photo…</p> : null}

          {form.main_image_url ? (
            <div className="flex items-center gap-4 border border-brass/25 bg-pearl p-3">
              <Image
                src={form.main_image_url}
                alt="Product photo preview"
                width={72}
                height={72}
                className="h-18 w-18 border border-brass/25 object-cover"
              />
              <div className="grid gap-1">
                <p className="text-sm font-semibold text-cedar">Photo ready.</p>
                <button
                  type="button"
                  onClick={() => updateField("main_image_url", "")}
                  className="justify-self-start text-xs font-bold uppercase tracking-[0.1em] text-henna underline-offset-4 hover:underline"
                >
                  Remove photo
                </button>
              </div>
            </div>
          ) : null}

          {formErrors.length > 0 ? (
            <div className="grid gap-1 bg-henna/10 px-4 py-3">
              {formErrors.map((message) => (
                <p key={message} className="text-sm font-semibold leading-6 text-henna">
                  {message}
                </p>
              ))}
            </div>
          ) : null}

          {feedback ? (
            <p className="bg-pearl px-4 py-3 text-sm font-semibold leading-6 text-cedar">{feedback}</p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="rounded-full bg-henna px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] text-ivory shadow-soft transition hover:bg-cedar disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Saving…" : form.id ? "Save changes" : "Add product"}
            </button>
            {form.id ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-brass/50 px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] text-cedar transition hover:border-henna hover:text-henna"
              >
                Cancel editing
              </button>
            ) : null}
          </div>
        </form>
      </AdminSectionCard>

      <AdminSectionCard
        title="Your products"
        description="Products marked Active appear on the website. Use Hide to take a product offline without deleting it."
      >
        {products.length === 0 ? (
          <AdminEmptyState
            title="No products yet"
            description="Add your first product with the form above. It will appear on the website as soon as its status is Active."
          />
        ) : (
          <div className="grid gap-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex flex-wrap items-center gap-4 border border-brass/25 bg-pearl p-4"
              >
                {product.main_image_url ? (
                  <Image
                    src={product.main_image_url}
                    alt={product.name || "Product photo"}
                    width={64}
                    height={64}
                    className="h-16 w-16 border border-brass/25 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center border border-dashed border-brass/40 text-[10px] font-bold uppercase tracking-wide text-coffee">
                    No photo
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-xl font-semibold text-cedar">{product.name}</p>
                  <p className="mt-1 text-sm text-coffee">
                    {formatPrice(product.price)}
                    {product.stock !== null && product.stock !== "" ? ` · Stock: ${product.stock}` : ""}
                  </p>
                </div>

                <AdminStatusBadge tone={getStatusTone(product.status)}>{product.status}</AdminStatusBadge>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleStatusToggle(product)}
                    className="rounded-full border border-brass/50 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-cedar transition hover:border-henna hover:text-henna"
                  >
                    {product.status === "active" ? "Hide" : "Publish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditing(product)}
                    className="rounded-full border border-brass/50 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-cedar transition hover:border-henna hover:text-henna"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(product)}
                    className="rounded-full border border-red-900/30 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-red-900 transition hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminSectionCard>
    </div>
  );
}
