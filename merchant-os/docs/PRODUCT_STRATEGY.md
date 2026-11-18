# Product strategy and roadmap (written 2026-11-18)

Decision of the owner (2026-11-18): Merchant OS will be offered to other COD merchants, not only used by Maison Shaimaa. Nothing below is being built yet; this is the agreed direction, to revisit with real usage data.

Confidence labels: **[confirmed]** checked in code, docs or official sources; **[likely]** strong inference; **[guess]** not verified.

## 0. Trial period (owner decision, 2026-11-18)

Merchant OS is used only by Maison Shaimaa for **3 to 6 months** on the free plans. Paid hosting and opening to other merchants come after, when cash allows.

During the trial:
- Sign-up stays closed; no other merchant is onboarded.
- Free-plan risks to manage: Vercel Hobby is meant for non-commercial use **[confirmed]**, so running a business on it is tolerated at best **[likely]**; Supabase Free has no downloadable daily backups **[likely]** and pauses projects inactive for a week **[likely]**. Mitigation: a weekly Excel export of orders, products and money, kept outside the app; move to paid plans as soon as real money depends on the data.
- Measure, to decide Phase B/C with evidence: orders per day, confirmation rate, refusal rate (overall, per city, per source), delay to delivery, cash waiting at the carrier, time spent per order, and which screens are actually used.
- Exit criteria to go paid and open: the app runs the shop daily without spreadsheets for at least 2 months, the numbers above are trusted, and Phase A items are ready.

## 1. The market position

Existing Moroccan tools (for example eGrow, seen in a 2026-11 ad) already sell: one order board fed by Shopify, YouCan and WooCommerce; WhatsApp confirmation with buttons (confirm, edit, cancel); automatic sending to carriers; WhatsApp tracking messages to the customer. **[confirmed from the ad; their full feature list and pricing are a guess]**

Copying that list makes Merchant OS a late copy. The goal is to be **the tool that tells a COD merchant whether they really make money, and protects it**, while matching the basics.

The problem these tools leave open **[likely]**: in COD, the loss comes from refused parcels (shipping paid both ways, ads paid for nothing), cash stuck at the carrier, and owners who spend money that is not profit. A tool that only moves orders faster can make a merchant lose money faster.

## 2. What makes Merchant OS different

| # | Differentiator | Status |
| --- | --- | --- |
| D1 | **True profit per order, product, campaign, city**, after refusals, shipping both ways, returns, ads and carrier fees, instead of revenue | Partly built: P&L, campaign report, pricing center |
| D2 | **Owner money discipline**: safe owner pay, recurring obligations, reserve, monthly close with funds | Built (1.3–1.4); unique as far as known **[guess]** |
| D3 | **Risk-based confirmation**: each new order gets a refusal-risk score from the merchant's own history (phone history, city refusal rate, product, source, order value, time of order). Low risk → WhatsApp button confirmation. High risk → phone call, and optionally a deposit. Not "buttons for everyone" | Not built; the blocklist and customer history are the base |
| D4 | **Carrier choice by real results**: delivery rate, delay and cost per carrier **per city**, from the merchant's own parcels; the order suggests the best carrier for that city | Planned (carrier scorecard in BUSINESS_RULES) |
| D5 | **Cash follow-up**: COD money at the carrier by age, invoice reconciliation, missing payouts flagged | Built for Sendit |
| D6 | **A weekly brief in Darija** (Claude): "stop campaign X: each delivered order costs 85 MAD, your margin is 70", "Kénitra refuses 40%: ask for a deposit there" | The read-only Claude connector exists; the proactive brief is not built |
| D7 | **Pricing aligned with the merchant's pain** **[guess, to validate]**: charge per delivered order, not per order received, so the tool only earns when the merchant does | Business decision, nothing to build first |

Rule for every new feature: it must either protect margin (D1, D3, D4, D5), protect the owner's money (D2), or save time without increasing refusals.

## 3. Roadmap

Each phase starts only when the previous one is used for real. Order inside a phase = priority.

### Phase A — Before opening to other merchants (must)
1. Legal: terms of use, privacy policy, CNDP declaration (law 09-08) for customer personal data. **[confirmed requirement; exact procedure to check]**
2. Paid hosting: Vercel Pro (Hobby forbids commercial use **[confirmed]**), Supabase plan with backups.
3. Onboarding: sign-up open or by invitation, first-run checklist (products with SKU, Sendit keys, a store, shipping rates).
4. Billing for merchants (manual invoice first; online payment later).
5. Support channel and status page; error monitoring.

### Phase B — Matching the basics, done better
1. ✅ 1.7.0 — **Auto-send to the carrier on confirmation** (opt-in): only when the Sendit district is certain (remembered per city, or unique); otherwise it stays manual. No Meta needed.
2. **WhatsApp Business Platform (Cloud API)** with the merchant's own number and keys (same pattern as Sendit keys):
   - confirmation with buttons, used by D3 for low-risk orders only;
   - tracking messages from Sendit status events (shipped, out for delivery, failed attempt);
   - a message after a refused parcel (reason).
   Needs a Meta Business account, verification, a number and approved templates; billed per message by Meta **[likely]**. Test on Maison Shaimaa first.
3. More carriers (whichever merchants ask for most), via the adapter interface.
4. YouCan, through a YouCan partner app (OAuth); Shopify as an app later if the webhook setup is too hard for merchants.

### Phase C — The differentiators
1. D3 risk score and risk-based confirmation (explainable score, never a black box; the merchant sees why).
2. D4 carrier scorecard per city and carrier suggestion.
3. D6 weekly Darija brief with 3 concrete actions, and alerts when a campaign or a city turns unprofitable.
4. D1 profit per city and per product in the dashboard; ad kill rules.

### Phase D — Scale
1. Meta Tech Provider (embedded sign-up), so a merchant connects WhatsApp in one click.
2. Shared risk signals across merchants (refusal history by phone) — **only after legal review**: it is personal data shared between companies; hashed numbers and consent are not automatically enough under 09-08 **[likely]**.
3. Mobile app wrapper if the PWA is not enough.

## 4. Things not to do

- Auto-confirm every order by WhatsApp button: fewer calls, but more refusals for risky orders **[guess, to measure]**.
- Features that only look good in a demo (AI agents, chatbots) before D1–D5 are solid.
- Building for merchants before Maison Shaimaa runs real orders through the app: real usage decides the order of Phase B and C.

## 5. Open questions for the owner

- Who is the first paying merchant profile: small (5–20 orders/day) or larger?
- Price: per delivered order, monthly plan, or both?
- Which carriers do target merchants use besides Sendit?
