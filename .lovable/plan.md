# North American Platform Pivot

Major rebrand from Mozambique-focused (PT/MZN) to US/Canada (EN/USD-CAD) with native PayPal and full mock removal.

## 1. Brand & Identity
- Rename `Bateu` → **`Jackpot Drop`** (or keep `Bateu` — confirm if you want a new name; default proposal: `Jackpot Drop`).
- Update `index.html` title, meta, OG tags, JSON-LD to English.
- New tagline: *"America's Premium Raffle Platform"*.
- Replace emerald/gold "Mozambique premium" tokens with a US/Canada-leaning palette: deep navy (#0A1F44), patriotic red (#D7263D), crisp white, with gold accent retained for prizes. Tailwind tokens in `index.css` updated; HSL only.
- Typography: keep display font but ensure English-first ligatures; default copy to English.
- Replace favicon/brand SVGs with new mark.

## 2. Language (EN-US only)
- Set `LanguageContext` default to `en` and **remove PT/ES/FR strings** (keep keys, English values only).
- Translate all hardcoded PT strings in pages/components to EN-US. Hide language switcher.
- Update auth flow, dashboards (user, business, admin), Live Studio, Profile, FAQ, Terms, Privacy, HowItWorks to EN-US copy.

## 3. Regions & Geography
- `regions.ts`: keep only **US** + **CA** as countries; expand US to all 50 states + DC, Canada to all 13 provinces/territories.
- Remove `provinces.ts` (Mozambique) and `CountryRegionFilter` references to MZ/AO/etc. Replace with `StateProvinceFilter`.
- Default country detection via browser locale → US fallback.
- Update `Register.tsx` geo step, business profile, raffle geo restrictions.

## 4. Currency (USD + CAD auto)
- `currency.ts`: add `formatUSD`, `formatCAD`, and `formatMoney(value, currency)`.
- New `CurrencyContext`: detects user country (US→USD, CA→CAD), allows manual override, persists in `localStorage`.
- Replace every `formatMZN` import across the codebase with `formatMoney` using context currency.
- Store raffle prices in cents (smallest unit) with `currency` column. Add migration:
  - `raffles.currency text default 'USD'`
  - `payments.currency text default 'USD'`
  - `prestacao_products.currency text default 'USD'`

## 5. PayPal Integration (native SDK)
- Install `@paypal/react-paypal-js`.
- Wrap app in `<PayPalScriptProvider>` with client ID from `VITE_PAYPAL_CLIENT_ID` (publishable, OK in code).
- New `PayPalCheckout` component renders Smart Buttons on the ticket purchase page (`RaffleDetail`, checkout wizard).
- Server-side capture via new edge function `paypal-capture-order`:
  - Validates JWT
  - Calls PayPal REST `/v2/checkout/orders/{id}/capture` using `PAYPAL_CLIENT_ID` + `PAYPAL_SECRET` (added via secrets tool, sandbox or live URL per `PAYPAL_ENV`)
  - On success: inserts ticket + payment row with status `confirmed`
- New edge function `paypal-create-order` for server-authoritative pricing (prevents tampering).
- Remove M-Pesa, e-Mola, Multicaixa, Unitel Money, Africell Money, BAI/BFA Transfer, PIX, Boleto from `oneClick.ts`, payment UI, and admin payment moderation.
- Keep manual receipt upload only as a fallback (optional — confirm).

## 6. Remove All Mock-ups / Seed Data
- Delete seed edge functions: `seed-contests`, `seed-data`, `seed-demo-users`.
- Remove demo content from `HeroSection`, `StatsBar`, `LiveTicker`, `LiveFeed`, `PopularLeaderboard`, `WinnersSection`, `ContestTypesShowcase`, `AIRecommendations`, `TrustSignals`, `StoriesCarousel`, `DesktopWidgets` — wire each to real Supabase queries and show empty-states ("No active raffles yet") instead of fake names/numbers.
- Remove hardcoded demo raffles, fake user activity, fake winner cards, mock chat in Community.
- Purge any `mock*` / `fake*` / `demo*` constants in `src/lib/`.
- Truncate demo rows from DB: I'll run a data migration to delete rows tagged `is_demo = true` (where the column exists) and rows inserted by seed functions.

## 7. Cleanup
- Remove unused pages tied to Mozambique-specific flows (Prestações catálogo — confirm keep or remove; default keep but rebrand to "Installments").
- Update memory files to reflect US/CA identity (replace MZ brand notes).

## Technical Section

### Files to add
- `src/contexts/CurrencyContext.tsx`
- `src/components/payments/PayPalCheckout.tsx`
- `src/components/StateProvinceFilter.tsx`
- `supabase/functions/paypal-create-order/index.ts`
- `supabase/functions/paypal-capture-order/index.ts`

### Files to edit (high-level)
- `index.html`, `src/main.tsx`, `src/App.tsx`
- `src/contexts/LanguageContext.tsx` (EN-only)
- `src/lib/{currency,regions,oneClick}.ts`
- `src/index.css`, `tailwind.config.ts` (palette)
- All `src/pages/**` and `src/components/**` that contain PT strings, MZN formatting, or mock arrays
- `src/components/Navbar.tsx`, `Footer.tsx` (new brand)

### Files to delete
- `src/lib/provinces.ts`
- `supabase/functions/seed-*`
- Demo constants in components

### DB migration
- Add `currency` columns
- Delete demo/seed rows (via insert tool — actually DELETE goes through insert tool per rules)

### Secrets needed
- `PAYPAL_CLIENT_ID` (also expose publishable as `VITE_PAYPAL_CLIENT_ID`)
- `PAYPAL_SECRET`
- `PAYPAL_ENV` (`sandbox` or `live`)

## Execution Order
1. Confirm new brand name (or keep Bateu).
2. Run DB migration (currency columns + delete demo rows).
3. Add PayPal secrets.
4. Pivot core libs: `regions`, `currency`, `LanguageContext`, palette.
5. Rewrite shell: `index.html`, `Navbar`, `Footer`, `HeroSection`.
6. Wire PayPal checkout end-to-end (edge functions + component + RaffleDetail).
7. Strip mocks page-by-page, replace with real queries + empty states.
8. Translate remaining PT strings to EN-US.
9. Update memory.

## Scope Warning
This is **~40–60 file edits + 2 edge functions + 1 migration**. It will take multiple turns and use significant credits. I'll execute in batches and check in after each major phase. Confirm the brand name and whether to keep the manual receipt fallback before I start.
