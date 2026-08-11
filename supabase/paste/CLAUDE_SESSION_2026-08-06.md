# Session notes for Claude — 2026-08-06

Kathryn’s product rules + code changes from this Cursor session. Read before changing CLocal.

Also read: `docs/HANDOFF_TO_CLAUDE.md`, `docs/SECURITY.md`, `docs/REPO_HEALTH.md`.

---

## Product rules (founder truth — do not confuse)

### Business paid (£149.99 / mo) — big reasons for the price
1. **Influencer gifting** — paid shops send free product/offers to creators so they post review videos. This is NOT the same as happy-hour consumer gifts.
2. **Happy hour / free consumer gifts** — e.g. free drinks for a time window for shoppers. **Paid businesses only.**
3. **Hot Now stories** — offer of the day / moment. **Paid businesses only.** Creators must NOT post these.
4. **Events management** — coming soon; paid businesses.

### LocalGems
- **Pay as you go** (not bundled as “free forever” marketing for paid).
- CLocal takes a cut on each redeem — **rate TBD** (Kathryn must decide). Show clearly at publish when wired.
- Do not call LocalGems “complimentary gift invites.”

### Two gift types (never mix up)
| Type | Who gets it | Who can post |
|------|-------------|--------------|
| Consumer happy-hour / free drinks | Shoppers | **Paid** businesses only |
| Influencer gifting | Creators (to film reviews) | **Paid** businesses only |

### Creators
- Post **feed review videos** (table `videos`), which should **link/tag the business**.
- Do **not** upload Hot Now / `business_stories` — that is paid shops only.
- Copy must say “review video / feed,” not “story.”
- **Creator paid (£14.99)** unlocks **CLocal Academy + free coaching to improve sales**, plus progress, rewards, exclusive events. Free/approved creators can still upload review videos.

### Consumer claim agreement
- Need a short **contract / agreement each time they claim** (consumer gift or LocalGem). Not built yet — implement before public claim scale.

### Admin
- **Only Kathryn** (`kedonnelly5@gmail.com`) may have `is_admin = true`.
- Nobody else gets admin unless Kathryn **explicitly asks** in chat.
- Paste: `supabase/paste/SOLE_ADMIN_KATHRYN_NOW.sql`
- Clients cannot self-grant (SECURITY_HARDENING + 025). Env `EXPO_PUBLIC_ADMIN_EMAILS` is UI hint only.

### Wallet / Apple Pay
- Hidden for MVP via `EXPO_PUBLIC_WALLET_LINKING` (default off).
- Plumbing kept; LocalGem-tied wallet matches bump streaks when turned on later.

### Legal
- Operated by **Clickclick Video Marketing Ltd**, trading as **CLocal**.
- Privacy + Terms updated (no company placeholder).

---

## Code / SQL done this session

### App (`/Users/kathryn/Projects/CLocal`)
- `lib/env.ts` — `isWalletLinkingEnabled()` (off unless `EXPO_PUBLIC_WALLET_LINKING=1`)
- `lib/walletCard.ts` — gate link/match; streak bump after LocalGem-tied wallet match
- Hide wallet UI: profile, rewards, LocalGemCard, flash detail, link-card “coming soon”
- `app/legal/privacy.tsx` + `terms.tsx` — company name + paid-feature wording
- `components/AccountHubFooter.tsx` — Account + Sign out (confirm) on Business hub + Creator studio
- `app/(main)/profile.tsx` — Sign out confirm
- `app/business/index.tsx` — LocalGem PAYG copy; happy-hour gifts **paid-gated**; Account footer
- `app/business/[id].tsx` — story “+” only if owner **and** `plan === 'paid'`
- `app/creator/index.tsx` — review-video copy (not stories); Account footer
- `lib/businessPricing.ts` — sell lines match paid features
- `.env.example` — wallet flag + sole-admin note

### SQL pastes (Kathryn must run in Supabase if not yet)
- `supabase/paste/SOLE_ADMIN_KATHRYN_NOW.sql` — only Kathryn is admin
- `supabase/paste/GIFTS_PAID_BUSINESS_ONLY_NOW.sql` — RLS: only paid businesses insert consumer gifts
- Security verify already **all PASS** on production (2026-08-06)

### Landing repo copies (for easy open)
- `clocal-landing/supabase/paste/VERIFY_SECURITY_CHECKS_ONLY.sql`

---

## Still TODO (not done this session)
- [ ] Decide LocalGem commission % / £ and wire billing
- [ ] Build influencer-gifting workflow (paid business ↔ creator)
- [ ] Claim agreement UI + server record each claim
- [ ] Events management section for paid businesses
- [ ] Creator upload: require business tag/link on review videos
- [ ] EAS / TestFlight / App Store
- [ ] Real Stripe (VIP + business + creator)
- [ ] Run `SOLE_ADMIN_KATHRYN_NOW.sql` + `GIFTS_PAID_BUSINESS_ONLY_NOW.sql` on live Supabase if not pasted yet

---

## Smoke path (still good)
Sign up → Business profile → LocalGem → Consumer claim gift (when paid shop posts) → My Gifts → till scan → free shopper streak up / VIP coins if VIP.

Do not demo Apple Pay as live.
