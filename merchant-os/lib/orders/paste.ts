// "Paste the customer's message": pulls phone, city, name and address out of
// a WhatsApp/Instagram message so the order form fills itself. Heuristic by
// nature: the merchant always reviews the fields before saving.
import { normalizeMoroccanPhone } from "@/lib/phone";

export type PasteCity = { id: number; nameFr: string; nameAr: string; aliases: string[] };
export type PastedCustomer = { phone: string | null; cityId: number | null; fullName: string; address: string };

const phonePattern = /(?:\+|00)?212[\s.-]?0?[5-7](?:[\s.-]?\d){8}|0[5-7](?:[\s.-]?\d){8}/;
const nameLabel = /^(?:الاسم(?:\s+الكامل)?|الإسم|سمية|smiya|nom(?:\s+complet)?|name|full\s*name)\s*[:：\-–]?\s*/i;
const addressLabel = /^(?:العنوان|عنوان|adresse|address|l?3onwan|l?3nwan)\s*[:：\-–]?\s*/i;
const cityLabel = /^(?:المدينة|مدينة|ville|city|lmdina|mdina)\s*[:：\-–]?\s*/i;
const phoneLabel = /^(?:الهاتف|رقم(?:\s+الهاتف)?|تلفون|téléphone|telephone|tel|tél|phone|numero|numéro|nemra)\s*[:：\-–]?\s*/i;

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .trim();

function findCity(text: string, cities: PasteCity[]): PasteCity | null {
  const haystack = ` ${fold(text).replace(/[^\p{L}\p{N}]+/gu, " ")} `;
  let best: { city: PasteCity; length: number } | null = null;
  for (const city of cities) {
    for (const name of [city.nameFr, city.nameAr, ...city.aliases]) {
      const needle = fold(name).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
      if (needle.length < 3) continue;
      if (haystack.includes(` ${needle} `) && (!best || needle.length > best.length)) best = { city, length: needle.length };
    }
  }
  return best?.city ?? null;
}

export function parseCustomerMessage(text: string, cities: PasteCity[]): PastedCustomer {
  const input = text.slice(0, 2000);
  const phoneMatch = input.match(phonePattern);
  const phone = phoneMatch ? normalizeMoroccanPhone(phoneMatch[0].replace(/[\s.-]/g, "")) : null;
  const city = findCity(input, cities);
  const cityNames = city ? [city.nameFr, city.nameAr, ...city.aliases].map(fold) : [];

  let fullName = "";
  let address = "";
  const rest: string[] = [];
  for (const raw of input.split(/\r?\n/)) {
    let line = raw.replace(phoneMatch?.[0] ?? "\u0000", "").trim();
    if (!line) continue;
    if (nameLabel.test(line)) {
      fullName ||= line.replace(nameLabel, "").trim();
      continue;
    }
    if (addressLabel.test(line)) {
      address ||= line.replace(addressLabel, "").trim();
      continue;
    }
    if (cityLabel.test(line) || phoneLabel.test(line)) continue;
    line = line.replace(/^[-•*·]\s*/, "");
    if (cityNames.includes(fold(line))) continue; // a line that is only the city
    rest.push(line);
  }
  // Unlabelled: a short line without digits is the name; the next lines are the address.
  if (!fullName) {
    const index = rest.findIndex((line) => !/\d/.test(line) && line.split(/\s+/).length <= 4 && line.length <= 40);
    if (index >= 0) fullName = rest.splice(index, 1)[0] ?? "";
  }
  if (!address) address = rest.join("، ").slice(0, 500);

  return { phone, cityId: city?.id ?? null, fullName: fullName.slice(0, 120), address };
}
