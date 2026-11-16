"use client";

import { Plus, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { saveProduct, type ProductInput } from "@/app/(app)/products/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import {
  combineOptions,
  comboKey,
  maxOptions,
  maxVariants,
  parseOptionValues,
  suggestSku,
  variantTitle,
  type OptionValues,
  type ProductOption
} from "@/lib/catalog/variants";
import type { AppErrorCode } from "@/lib/data/errors";
import { useI18n } from "@/lib/i18n/provider";

type Status = "draft" | "active" | "archived";

export type ProductFormValue = {
  id?: string;
  name: string;
  description: string;
  category: string;
  status: Status;
  options: ProductOption[];
  variants: {
    id?: string;
    sku: string;
    barcode: string;
    optionValues: OptionValues;
    price: string;
    cost: string;
    minStock: number;
    active: boolean;
  }[];
};

type OptionRow = { key: string; name: string; values: string };
type VariantRow = ProductFormValue["variants"][number] & { key: string };

let rowCounter = 0;
const newKey = () => `row-${++rowCounter}`;

function toOptions(rows: OptionRow[]): ProductOption[] {
  return rows
    .map((row) => ({ name: row.name.trim(), values: parseOptionValues(row.values) }))
    .filter((option) => option.name && option.values.length > 0);
}

export function ProductForm({ initial, categories }: { initial: ProductFormValue; categories: string[] }) {
  const { t } = useI18n();
  const tp = t.products;
  const router = useRouter();
  const formId = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AppErrorCode | null>(null);

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [category, setCategory] = useState(initial.category);
  const [status, setStatus] = useState<Status>(initial.status);
  const [optionRows, setOptionRows] = useState<OptionRow[]>(() =>
    initial.options.map((option) => ({ key: newKey(), name: option.name, values: option.values.join(", ") }))
  );
  const [variants, setVariants] = useState<VariantRow[]>(() =>
    (initial.variants.length > 0 ? initial.variants : [{ sku: "", barcode: "", optionValues: {}, price: "", cost: "", minStock: 0, active: true }]).map(
      (variant) => ({ ...variant, key: newKey() })
    )
  );

  const options = toOptions(optionRows);

  function updateVariant(key: string, patch: Partial<VariantRow>) {
    setVariants((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  // Rebuilds the variant list from the options, keeping existing rows (and their
  // prices, SKUs and stock links) for combinations that still exist.
  function regenerate() {
    const combos = combineOptions(options).slice(0, maxVariants);
    const existing = new Map(variants.map((row) => [comboKey(row.optionValues), row]));
    const template = variants.find((row) => row.active) ?? variants[0];
    const next: VariantRow[] = combos.map((combo, index) => {
      const match = existing.get(comboKey(combo));
      if (match) {
        existing.delete(comboKey(combo));
        return { ...match, active: true };
      }
      return {
        key: newKey(),
        sku: suggestSku(name, combo, options, index),
        barcode: "",
        optionValues: combo,
        price: template?.price ?? "",
        cost: template?.cost ?? "",
        minStock: template?.minStock ?? 0,
        active: true
      };
    });
    // Saved variants that no longer match a combination stay, switched off (archived).
    const archived = [...existing.values()].filter((row) => row.id).map((row) => ({ ...row, active: false }));
    setVariants([...next, ...archived]);
  }

  function submit() {
    setError(null);
    const input: ProductInput = {
      id: initial.id,
      name,
      description,
      category,
      status,
      options,
      variants: variants.map((row) => ({
        id: row.id,
        sku: row.sku,
        barcode: row.barcode,
        title: variantTitle(row.optionValues, options),
        optionValues: row.optionValues,
        price: row.price,
        cost: row.cost,
        minStock: Number.isFinite(row.minStock) ? row.minStock : 0,
        active: row.active
      }))
    };
    startTransition(async () => {
      const result = await saveProduct(input);
      if (result.error || !result.productId) {
        setError(result.error ?? "UNKNOWN");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.push(`/products/${result.productId}?saved=1`);
      router.refresh();
    });
  }

  return (
    <form
      id={formId}
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      noValidate
    >
      {error ? <FormAlert>{t.errors[error]}</FormAlert> : null}

      <Card>
        <CardHeader title={tp.sectionDetails} />
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Field label={tp.name} htmlFor={`${formId}-name`}>
            <Input id={`${formId}-name`} value={name} onChange={(e) => setName(e.target.value)} placeholder={tp.namePlaceholder} maxLength={160} required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={tp.category} htmlFor={`${formId}-category`} hint={tp.categoryHint}>
              <Input id={`${formId}-category`} value={category} onChange={(e) => setCategory(e.target.value)} list={`${formId}-categories`} maxLength={80} />
            </Field>
            <Field label={tp.status} htmlFor={`${formId}-status`}>
              <NativeSelect id={`${formId}-status`} value={status} onChange={(e) => setStatus(e.target.value as Status)}>
                {(["draft", "active", "archived"] as const).map((value) => (
                  <option key={value} value={value}>
                    {t.productStatus[value]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <datalist id={`${formId}-categories`}>
              {categories.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>
          <div className="md:col-span-2">
            <Field label={tp.descriptionLabel} htmlFor={`${formId}-description`}>
              <Textarea id={`${formId}-description`} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={tp.sectionOptions}
          description={tp.optionsHint}
          action={
            optionRows.length < maxOptions ? (
              <Button variant="secondary" size="sm" onClick={() => setOptionRows((rows) => [...rows, { key: newKey(), name: "", values: "" }])}>
                <Plus /> {tp.addOption}
              </Button>
            ) : null
          }
        />
        {optionRows.length > 0 ? (
          <CardBody className="flex flex-col gap-3">
            {optionRows.map((row, index) => (
              <div key={row.key} className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
                <Field label={tp.optionName} htmlFor={`${row.key}-name`}>
                  <Input
                    id={`${row.key}-name`}
                    value={row.name}
                    placeholder={index === 0 ? tp.optionNamePlaceholder : undefined}
                    maxLength={40}
                    onChange={(e) => setOptionRows((rows) => rows.map((r) => (r.key === row.key ? { ...r, name: e.target.value } : r)))}
                  />
                </Field>
                <Field label={tp.optionValues} htmlFor={`${row.key}-values`}>
                  <Input
                    id={`${row.key}-values`}
                    value={row.values}
                    placeholder={index === 0 ? tp.optionValuesPlaceholder : undefined}
                    onChange={(e) => setOptionRows((rows) => rows.map((r) => (r.key === row.key ? { ...r, values: e.target.value } : r)))}
                  />
                </Field>
                <Button variant="ghost" size="icon" aria-label={tp.removeOption} onClick={() => setOptionRows((rows) => rows.filter((r) => r.key !== row.key))}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <div>
              <Button variant="secondary" onClick={regenerate}>
                <RefreshCw /> {tp.generate}
              </Button>
            </div>
          </CardBody>
        ) : null}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title={tp.sectionVariants} description={tp.variantsHint} />
        <Table>
          <THead>
            <TR className="hover:bg-transparent">
              <TH>{tp.colVariants}</TH>
              <TH>{tp.sku}</TH>
              <TH>{tp.price}</TH>
              <TH>{tp.cost}</TH>
              <TH>{tp.minStock}</TH>
              <TH>{tp.active}</TH>
            </TR>
          </THead>
          <TBody>
            {variants.map((row) => {
              const title = variantTitle(row.optionValues, options) || Object.values(row.optionValues).join(" / ") || tp.defaultVariant;
              return (
                <TR key={row.key} className={row.active ? undefined : "opacity-60"}>
                  <TD className="font-medium">{title}</TD>
                  <TD>
                    <Input aria-label={`${tp.sku} — ${title}`} dir="ltr" className="w-40" value={row.sku} maxLength={64} onChange={(e) => updateVariant(row.key, { sku: e.target.value })} />
                  </TD>
                  <TD>
                    <Input aria-label={`${tp.price} — ${title}`} dir="ltr" inputMode="decimal" className="w-28" value={row.price} onChange={(e) => updateVariant(row.key, { price: e.target.value })} />
                  </TD>
                  <TD>
                    <Input aria-label={`${tp.cost} — ${title}`} dir="ltr" inputMode="decimal" className="w-28" value={row.cost} placeholder="—" onChange={(e) => updateVariant(row.key, { cost: e.target.value })} />
                  </TD>
                  <TD>
                    <Input
                      aria-label={`${tp.minStock} — ${title}`}
                      dir="ltr"
                      type="number"
                      min={0}
                      className="w-20"
                      value={row.minStock}
                      onChange={(e) => updateVariant(row.key, { minStock: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                    />
                  </TD>
                  <TD>
                    <input
                      type="checkbox"
                      aria-label={`${tp.active} — ${title}`}
                      className="size-5 accent-[var(--accent)]"
                      checked={row.active}
                      onChange={(e) => updateVariant(row.key, { active: e.target.checked })}
                    />
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
        <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
          {tp.costHint} {tp.archivedVariants}
        </p>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Link href="/products" className={buttonVariants({ variant: "secondary" })}>
          {t.common.cancel}
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? t.common.loading : tp.save}
        </Button>
      </div>
    </form>
  );
}
