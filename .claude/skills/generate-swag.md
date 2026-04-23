# Generate SWAG — Shopify App ROI Analysis

Use this skill when Sean or Peter says "generate a SWAG for [partner]" or "/generate-swag [url]". This skill takes a Shopify app's public website and produces a structured SWAG spec — a first-party dtcmvp ROI analysis that tells brands what the tool is worth to their store.

## What is a SWAG

SWAG = Scientific Wild-Ass Guess. dtcmvp publishes first-party ROI analyses for Shopify apps using the partner's public marketing, industry benchmarks, and the brand's own metrics. The partner does not need to participate. Every number we don't know for certain, we SWAG — and label it as such.

The key move: instead of showing the partner's price and asking "is this a good deal?", we flip it. The brand sets a target ROI multiple (5x, 8x, 15x) and we tell them the maximum they should pay to hit that target.

## Invocation

```
/generate-swag https://orderediting.com
/generate-swag https://aftersell.com
```

Or conversationally: "generate a SWAG for Klaviyo" / "make the SWAG for this partner: [url]"

If no URL is provided, ask for one. If a partner name is given without a URL, do a web search to find their main site.

## The exercise (5 steps)

### Step 1 — Read the website (waterfall order)

Fetch the partner's site using WebFetch. **Follow this priority order** — the best possible SWAG comes from the highest-quality source available:

**Priority 1: Look for an existing ROI calculator on the partner's site.**
Check the homepage, footer nav, resources section, and tools/calculator pages. Common URL patterns: `/roi-calculator`, `/revenue-calculator`, `/savings-calculator`, `/tools/*`. If found, this is a Tier 1 opportunity — their own math is the strongest source we can cite. Note the URL and flag it immediately. Even if we don't do a full Tier 1 scrape of the JS, knowing the calculator exists and what inputs it asks for tells us how the partner thinks about their own value.

**Priority 2: Case studies with hard numbers.**
Fetch `/case-studies`, `/customers`, `/success-stories`, or any linked customer page. Named brands + specific metrics ($X revenue, Y% lift, Zx ROAS) are the next best thing to a calculator. These give us real-world benchmarks to anchor our SWAGs.

**Priority 3: Pricing page.**
Fetch `/pricing`. Even if exact dollar amounts are hidden, the pricing MODEL (per-ticket, per-contact, per-order, flat tier) tells us what drives cost and lets us build better pricing intel for the brand.

**Priority 4: Features / product page.**
Fetch `/features`, `/product`, `/how-it-works`. This is where we identify the quantifiable benefits (what the app actually does that has dollar value).

**Priority 5: Homepage claims and testimonials.**
Often has the headline claims ("34x ROI", "reduces tickets 60%") and social proof, but less specific than case studies.

**For each page, extract:**
- **What does this app do?** (1-2 sentences)
- **What merchant-facing benefits do they claim?** (support reduction, upsell, return prevention, revenue lift, time savings, etc.)
- **Any quantitative claims?** ("reduces tickets by 85%", "$22k upsell revenue in 2 months", "3.5x ROI")
- **Named case studies with numbers?** (brand name + specific metric)
- **Pricing model and amounts?** (monthly cost, tiers, per-unit pricing, free trial)
- **Published ROI calculator?** (URL, what inputs it asks for, what it outputs)

**Important:** Only extract numbers that are actually on the site. Do NOT invent or estimate at this stage. That comes in Step 3. The waterfall above is about finding the BEST numbers the partner has already published — partners will appreciate brands having access to their own data presented fairly.

### Step 2 — Identify quantifiable benefits

From the claims you found, identify 2-5 benefits that a brand could put a dollar figure on. Each benefit needs to answer: "what specific cost does this reduce, or what revenue does this add?"

Common Shopify app benefit patterns (use as inspiration, not a checklist):
- **Support ticket deflection** — app automates something that previously required a CS ticket
- **Upsell / cross-sell revenue** — app creates a new add-on purchasing moment
- **Return prevention** — app catches errors before they become returns
- **Cart abandonment recovery** — app recovers carts that would have been lost
- **Subscription revenue** — app converts one-time buyers to recurring
- **Time savings** — app automates manual work (express in hours × hourly cost)
- **Shipping cost reduction** — app optimizes fulfillment
- **Ad spend efficiency** — app improves ROAS or attribution
- **Email/SMS revenue** — app generates attributed flow revenue
- **Review/UGC conversion lift** — app increases conversion rate via social proof
- **Processing fee avoidance** — app prevents unnecessary Shopify transaction fees

Skip benefits that can't be reasonably quantified (e.g., "better brand experience", "peace of mind").

### Step 3 — Map each benefit to inputs and formulas

For each benefit, answer two questions:

**A. What would a brand need to know to put a dollar on this?**
Break it down into the specific numbers needed for the calculation.

**B. Where does each input come from?**
- **Brand profile** — something the brand enters once during onboarding (annual orders, AOV, return rate, avg cost per item, category). These are reusable across all SWAGs.
- **dtcmvp SWAG** — an industry average or educated guess we provide as a default. Every SWAG must have a source attribution (even if the source is "dtcmvp estimate"). Every SWAG is editable by the brand.

For each SWAG default, choose a reasonable, slightly conservative number. Better to understate than overstate — the brand can always adjust upward. When the partner's own site claims a specific number (e.g., "85% ticket reduction"), use a discounted version (e.g., 70-80%) as the default and note the partner's claim as context.

Write the formula explicitly. Use simple arithmetic — multiplication, addition, percentages. No complex models.

**Brand inputs come in three tiers.** Know what's available before writing formulas — use Tier 1 fields whenever possible so the SWAG works immediately from the brand's onboarding data.

**Tier 1 — Onboarding metrics (collected once, available for every SWAG):**
These are the fields every brand fills in when they create their profile. Build your formulas around these first.

| Field | Type | Example | Who uses it |
|---|---|---|---|
| `annualOrders` | number | 250,000 | Nearly every SWAG |
| `aov` | dollars | $120 | Nearly every SWAG |
| `monthlyWebTraffic` | number | 200,000 | Checkout, chat, conversion tools |
| `emailListSize` | number | 50,000 | Email/retention tools |
| `smsListSize` | number | 20,000 | SMS tools |
| `returnRate` | decimal | 0.15 | Returns, post-purchase, CX tools |
| `avgCostPerItem` | dollars | $50 | Upsell, margin-dependent tools |
| `primaryCategory` | string | "apparel" | Helps pick better SWAG defaults |

**Tier 2 — Common SWAGs the brand can override (saved to profile when they do):**
These are industry defaults we guess at. The brand sees our SWAG on first visit. If they override it, the new value saves to their profile and carries forward to every future SWAG that uses it.

| Default | Typical SWAG | Who uses it |
|---|---|---|
| Cost per support ticket | $2–5 | CX tools (Gorgias, OE) |
| Ticket rate (% of orders) | 1.5–5% | CX tools |
| Site conversion rate | 2–3.5% | Checkout/conversion tools |
| Martech spend as % of revenue | 2–5% | Platform consolidation plays |
| Customer repeat rate | 1.5–2x | Retention, direct mail, loyalty |
| Churn rate (annual) | 30–50% | Winback, reactivation tools |
| Hourly cost of ops/CX labor | $25–40 | Time-saving benefits |

Put these in `swagDefaults` on the benefit, NOT in `brandInputs`. They are guesses, not things we ask for.

**Tier 3 — Partner-specific inputs (asked inline on that partner's page):**
Some partners need a metric no one else uses. These get prompted inline before the SWAG computes. Once the brand answers, it saves to their profile.

Examples:
- Number of active affiliates/creators (Superfiliate)
- Monthly ad spend (affiliate/paid-media tools)
- Direct mail budget (PostPilot)
- Current email revenue (Klaviyo, for gap analysis)

Use Tier 3 sparingly. If you can derive it from Tier 1 fields + a SWAG, do that instead. Only add a Tier 3 input when the SWAG would be meaningless without it.

**Rule: only list Tier 1 fields in `brandInputs`.** Tier 2 goes in `swagDefaults`. Tier 3 goes in a `partnerSpecificInputs` array on the spec (not yet implemented in the renderer — coming soon).

**C. What type of benefit is this?**

Every benefit must be classified as one of three types. This determines how it's displayed and grouped in the SWAG page — cost savings, revenue generation, and time savings are fundamentally different value stories and should not be lumped together.

- `"cost-saving"` — the app reduces a cost the brand is currently paying. Support ticket deflection, return prevention, processing fee avoidance. Framed as "saves you $X/yr."
- `"revenue-generation"` — the app creates new revenue the brand isn't currently earning. Upsell, email/SMS flows, affiliate sales, conversion lift. Framed as "adds $X/yr."
- `"time-saving"` — the app automates manual work, freeing up team hours. Warehouse time, manual CX triage, campaign setup. Framed as "frees up $X/yr" (valued at hours × hourly rate).

The SWAG page groups benefits by type, shows a color-coded subtotal for each group, and rolls them into a "Total impact" number. This makes it immediately clear to a brand how much they're saving vs. how much new revenue they'd earn.

**D. Label the benefit using the canonical vocabulary (MANDATORY).**

Cross-tool comparability is a core value of dtcmvp. When a brand looks at Klaviyo and Postscript side-by-side and both claim "Attributed Revenue (SMS)", they can compare apples to apples. If one says "SMS flow and campaign revenue" and the other says "SMS revenue" and a third says "text message attributed sales", you've killed the comparison.

Every benefit's `label` field must be one of the canonical labels below. The long form goes in `description`.

**Revenue generation:**
| Label | Measures |
|---|---|
| `CVR Lift` | net-new conversions (non-buyers who now buy) |
| `AOV Lift` | bigger carts from existing buyers |
| `Repeat Rate Lift` | customers buying more often |
| `LTV Lift` | longer customer lifecycle value |
| `Cart Recovery` | abandoned checkouts recaptured |
| `Upsell Revenue` | post-purchase add-on revenue |
| `Subscription Revenue` | one-time → recurring unlock |
| `Attributed Revenue (Channel)` | channel-specific (Email, SMS, Affiliate, DM, Organic, Display) — ALWAYS name the channel in parens |
| `Winback Revenue` | lapsed customer reactivation |
| `Retention Revenue` | keeping existing customers engaged |
| `List Growth Revenue` | new subscribers onboarded via partner tools |
| `Ad Revenue` | display/ad-network revenue (e.g., thank-you page ad placements) |
| `Organic Revenue` | SEO/ranking-driven revenue growth (for marketplace/search partners) |
| `Flow Optimization` | incremental lift on existing flows (AI optimization, A/B testing) |

**Cost savings:**
| Label | Measures |
|---|---|
| `Ticket Deflection` | CS labor cost avoided |
| `Return Prevention` | return cost avoided |
| `ROAS Improvement` | ad spend efficiency (paid channels) |
| `Fee Avoidance` | processing / Shopify / other fees avoided |
| `Shipping Optimization` | fulfillment cost reduction |
| `Tool Consolidation` | replacing multiple point solutions with one |

**Time savings:**
| Label | Measures |
|---|---|
| `Workflow Automation` | manual hours automated |

**Rules:**
- Use exact casing and wording. `CVR Lift` not `cvr lift` or `CVR lift`.
- If genuinely none fit, stop and ask the user to approve a new canonical label before inventing one. Every new label permanently expands the vocabulary, so bar is high.
- `Attributed Revenue` ALWAYS needs a channel in parens. `Attributed Revenue` alone is meaningless.
- The long-form partner-specific explanation goes in `description`, not `label`. Label is the metric. Description explains the mechanism.

**E. Tier the SWAG defaults by category when case studies support it.**

Every `swagDefaults` entry can optionally include a `byCategory` map. The engine resolves `byCategory[brand.primaryCategory]` first and falls back to `value` if no category-specific number exists.

```json
"conversionLiftPct": {
  "value": 0.05,                    // fallback (blended mid-range, all brands)
  "byCategory": {
    "Apparel & Fashion": 0.07,
    "Beauty & Cosmetics": 0.06,
    "Home & Electronics": 0.05
  },
  "label": "% conversion rate increase",
  "source": "..."
}
```

**When to add `byCategory`:**
- Partner publishes case studies in multiple categories AND the results differ meaningfully (>20% variance across categories)
- You can clearly attribute each case study to one of our 9 categories

**When NOT to add `byCategory`:**
- Partner only has generic claims (no named brands)
- Case studies cluster in one category — just use `value` and note the single-category skew in `source`
- You're guessing — if you don't have evidence, don't split

Audit each case study and tag it with its category when updating `sources[]`. Example: "Dr Squatch (Beauty): +3.2% CVR, +26% CVR spike" rather than just "Dr Squatch: +3.2%".

**The resolution priority (what the engine actually does):**

1. User override (entered manually in SWAG Defaults panel) — always wins
2. `byCategory[brand.primaryCategory]` — if present
3. `value` — fallback

When `byCategory` fires, the UI shows an "adjusted for [Category]" hint next to the source.

### Step 4 — Write the spec file

Output a JSON spec file following this exact format. Save it to `partners/[slug].json` in the repo.

**The `narrative` object is REQUIRED.** The SWAG page renders a personalized hero headline and role-specific paragraphs using this block. Without it, the hero falls back to a generic "Here's what X is worth to Y" — noticeably weaker than the headline treatment every seeded spec ships with. Any swarm-generated spec missing `narrative` will be bounced back for regeneration.

```json
{
  "slug": "orderediting",
  "partnerName": "Order Editing",
  "partnerUrl": "https://orderediting.com",
  "tagline": "Self-serve post-purchase order edits for Shopify",
  "tags": ["post-purchase", "cx", "upsell"],
  "pricingMonthly": 800,
  "tier": 0,
  "narrative": {
    "headline": "Order Editing could add {totalValue}/yr to {brandName} by letting customers fix their own orders.",
    "byDepartment": {
      "CX / Support": "For {contactName} on the CX side: self-serve order edits deflect the single most common ticket type. {brandName} stops burning agent time on address changes and size swaps, and the customer experience improves because they get the edit instantly instead of waiting on a reply.",
      "Ecommerce / DTC": "For {contactName} on the ecom side: the editing flow doubles as a post-purchase upsell surface. Every customer who opens the editor to change their order sees complementary add-ons, which creates {benefit_upsell_revenue}/yr in net-new revenue for {brandName}.",
      "Finance / Accounting": "For {contactName} reviewing the budget: at {targetMultiple} target, the ceiling on what {brandName} should pay is {maxMonthly}/mo. The blended value of {totalValue}/yr is split between support savings and upsell revenue.",
      "Founder & CEO": "For {contactName}: Order Editing removes the most repetitive class of support tickets and turns post-purchase moments into revenue. {totalValue}/yr to {brandName} at {targetMultiple} target.",
      "Other": "Order Editing adds {totalValue}/yr to {brandName} by reducing support volume and creating post-purchase upsell moments."
    },
    "byCategory": {
      "Apparel & Fashion": "Apparel brands benefit most because size changes and swaps are the dominant ticket type. Self-serve editing typically resolves 90%+ of size-related contacts without a human in the loop.",
      "Beauty & Cosmetics": "Beauty brands see strong post-purchase upsell on the editing flow because complementary products (trial sizes, related items) convert naturally at the point of review.",
      "Other": "Self-serve editing performance varies by catalog depth and product type, but the core insight holds: the most-edited moment is also a natural upsell surface."
    }
  },
  "benefits": [
    {
      "id": "support_reduction",
      "label": "Ticket Deflection",
      "description": "Self-serve order edits. When customers can edit their own orders, they stop emailing support about it.",
      "type": "cost-saving",
      "formula": "annualOrders * editTicketRate * costPerTicket * reductionRate",
      "brandInputs": ["annualOrders"],
      "swagDefaults": {
        "editTicketRate": {
          "value": 0.015,
          "label": "% of orders that generate an edit-related ticket",
          "source": "industry avg (Gorgias CX benchmarks)"
        },
        "costPerTicket": {
          "value": 2.00,
          "label": "Cost per support ticket",
          "source": "industry avg (Zendesk CX report)"
        },
        "reductionRate": {
          "value": 0.80,
          "label": "Ticket reduction from self-serve editing",
          "source": "dtcmvp estimate (partner claims up to 98%, Oh Polly apparel case study)",
          "byCategory": {
            "Apparel & Fashion": 0.90
          }
        }
      }
    },
    {
      "id": "upsell_revenue",
      "label": "Upsell Revenue",
      "description": "Post-purchase add-ons. The editing flow surfaces upsell items, creating a net-new revenue stream from customers who already bought.",
      "type": "revenue-generation",
      "formula": "annualOrders * upsellRate * (aov * upsellPctOfAov)",
      "brandInputs": ["annualOrders", "aov"],
      "swagDefaults": {
        "upsellRate": {
          "value": 0.015,
          "label": "% of orders that convert an upsell",
          "source": "dtcmvp estimate (partner cites Origin USA $22k/2mo, David Protein ~$1k/day)"
        },
        "upsellPctOfAov": {
          "value": 0.40,
          "label": "Upsell value as % of AOV",
          "source": "dtcmvp estimate (typical add-on is ~40% of original cart)"
        }
      }
    }
  ],
  "sources": [
    "https://orderediting.com — homepage + features",
    "Oh Polly case study: 98% reduction in order-change enquiries (2,000→40/month)",
    "Origin USA: $22,000 upsell revenue in 2 months",
    "David Protein: ~$1,000/day attributed to Order Editing"
  ],
  "notes": "Site does not mention return prevention or processing-fee recovery. Those benefits may exist but are not publicly supported — omitted from this SWAG.",
  "generatedAt": "2026-04-16"
}
```

**Spec rules:**
- `slug` must be URL-safe (lowercase, hyphens, no spaces)
- `pricingMonthly` is null if not found on the site — that's fine, the target-ROI flip works without it
- `tier` is 0 (dtcmvp SWAG from public info), 1 (partner-aligned, absorbed their calculator), or 2 (partner-authored, used private data)
- Every `swagDefaults` entry must have a `source` string — even "dtcmvp estimate" counts
- `label` on each benefit must be from the canonical vocabulary in Step 3D. No inventing.
- `byCategory` is optional on any `swagDefaults` entry — add it when case studies span categories with meaningfully different results
- `formula` uses the exact variable names from `brandInputs` + `swagDefaults` keys. Keep it readable arithmetic.
- `brandInputs` only lists fields from the standard brand profile (see Step 3). Don't invent new profile fields.
- `sources` lists URLs and specific claims so anyone can verify. Tag each case study with its category when known: "Dr Squatch (Beauty): +3.2% CVR".

**Narrative rules:**
- `narrative` is required on every spec. No exceptions.
- `headline` is one sentence. Lead with the partner name, name the mechanism, end with `{totalValue}/yr to {brandName}` (or similar). This is the first thing a brand reads, so it has to land.
- `byDepartment` MUST include an `"Other"` key as the fallback. Add entries for the 2 to 4 departments that are the real audience for this tool (e.g. `CX / Support` for Gorgias, `Retention / CRM` for Klaviyo, `Performance / Paid` for AIX). Don't populate every department — empty entries fall back to `Other`.
- `byCategory` MUST include an `"Other"` key. Add entries for the 2 to 4 categories where the partner's case studies cluster (e.g. Apparel for post-purchase tools, Health & Wellness for subscriptions). Use CANONICAL category names from this exact list: `Apparel & Fashion`, `Beauty & Cosmetics`, `Health & Wellness`, `Sports & Fitness`, `Food & Drink`, `Home & Electronics`, `Baby & Kids`, `Pet & Vet`, `Other`. `Pet & Vet` not `Pets`. `Food & Drink` not `Food & Beverage`.
- Available template variables: `{partnerName}`, `{brandName}`, `{contactName}`, `{totalValue}` (compact like "$1.1M"), `{totalValueFull}` (like "$1,057,500"), `{maxMonthly}`, `{maxAnnual}`, `{targetMultiple}` (like "8x"), `{revenueTotal}`, `{costSavingsTotal}`, `{timeSavingsTotal}`, `{benefitCount}`, and `{benefit_<id>}` for each benefit's individual annual value. Use the IDs you defined in the `benefits` array.
- Canonical department keys: `Retention / CRM`, `Creative / Brand`, `Influencer / Affiliate`, `Performance / Paid`, `SEO / Content`, `Ecommerce / DTC`, `Marketing / Growth`, `Finance / Accounting`, `CX / Support`, `Operations / Logistics`, `Data / Analytics`, `Sales / B2B`, `Engineering / Technology`, `Product / UX`, `People / HR`, `PR / Communications`, `Founder & CEO`, `Other C-Suite`, `Other`. Exact casing matters.
- Tone: the narrative paragraphs talk directly to `{contactName}` at `{brandName}`. Keep each one to 2 to 3 sentences max. Reference specific benefits by name or by their compact `{benefit_<id>}` value when it helps the argument.

### Step 5 — Verify the math

Before presenting the spec, run a quick sanity check with a sample brand:
- 250,000 annual orders
- $120 AOV
- 15% return rate
- $50 avg cost per item

Compute each benefit's annual value. Sum them. Apply an 8x target ROI to get the max monthly price. Report:

```
Sample brand (250k orders, $120 AOV):
  Benefit 1: $X/yr
  Benefit 2: $Y/yr
  Total annual value: $Z
  At 8x target: max $W/mo
  [If pricing known] At $P/mo actual: Nx ROI
```

If the total feels wildly high or low, revisit your SWAG defaults. A healthy total annual value for a Shopify app is typically $5k–$500k depending on the app category and brand size. If you're above $1M or below $1k for a 250k-order brand, something is probably off.

### Overlap check (MANDATORY, do not skip)

This is the most common mistake in SWAG generation. You MUST test every pair of benefits before presenting the spec. If you get this wrong, the SWAG loses all credibility with anyone who thinks about it for 10 seconds.

**The test:** For every pair of benefits A and B, ask: **"Is B a subset of A, a component of A, or measuring the same effect as A from a different angle?"** If yes to any, you have overlap. Fix it before presenting.

**The golden rule: every benefit must target a different audience OR a different mechanism. Not both from the same bucket.**

Good splits (independent, no overlap):
- **Different audiences:** "new conversions from non-buyers" vs "larger carts from existing buyers" (Videowise). Two different groups of people.
- **Different mechanisms:** "email revenue" vs "SMS revenue" (Klaviyo). Same customers potentially, but reached through independent channels.
- **Different cost centers:** "ad spend efficiency" vs "organic revenue growth" (AIX). One is saving money on paid, the other is earning money for free. Independent levers.
- **Different stages:** "support ticket deflection" vs "post-purchase upsell" (Order Editing). One saves cost pre-resolution, the other earns revenue post-purchase.

Bad splits (overlapping, must fix):
- **Metric vs outcome:** "conversion lift" + "revenue per session" = same effect measured two ways. RPS IS the outcome of conversion lift. Pick one.
- **Component vs total:** "organic growth" + "total revenue growth" = organic IS a component of total. The total includes the organic. Pick the more specific one.
- **Same audience, same moment:** "checkout upsell" + "post-purchase upsell" might overlap if both fire on the same order. Verify they target different moments.
- **Restatement:** "AOV increase" + "larger carts" = literally the same thing with different names.

**Mandatory self-check before presenting:**

For each benefit, write one sentence answering: "This benefit captures value from [specific audience] through [specific mechanism] that is NOT counted in any other benefit because [reason]."

If you cannot write that sentence clearly, you have overlap. Collapse the overlapping benefits into one.

**Real examples from our library:**

Videowise (FIXED): Had 3 benefits that were all measuring "video makes people buy more." Collapsed to 2: `CVR Lift` (audience: non-buyers who now buy) + `AOV Lift` (audience: existing buyers who add more to their cart). Independent audiences, different canonical labels — cleanly non-overlapping.

AIX (FIXED): Had 3 benefits where "total Amazon revenue growth" overlapped with "organic sales growth" because organic IS a component of total. Collapsed to 2: `ROAS Improvement` (cost-saving on paid channel) + `Organic Revenue` (revenue from free channel). Independent mechanisms.

**If in doubt, fewer benefits is better.** Two honest benefits are more credible than three where one is secretly a subset of another. Brands will notice.

## Sourcing tiers

- **Tier 0** (default): Pure public info. Read the site, apply our formulas.
- **Tier 1**: Partner has a live ROI calculator on their site. Fetch the page source, extract the JS-embedded coefficients, and use their own math (with the target-ROI flip added). Cite "using the partner's own published forecast methodology." ~45 min instead of ~15.
- **Tier 2**: Partner gave us private data (sheets, transcripts, case study numbers). Highest confidence. Note the source.

If during Step 1 you discover a live calculator on the partner's site, mention it and ask whether to do a Tier 0 or Tier 1 analysis.

## After generating

1. Present the spec to the user for review
2. If they approve, save to `partners/[slug].json`
3. Note anything you're uncertain about — flag low-confidence SWAGs explicitly
4. If the user wants changes ("drop benefit 3", "bump the upsell SWAG to 2%"), update the spec and re-verify the math

## Common pitfalls

- **Don't ship overlapping benefits.** This is the number one credibility killer. Run the mandatory overlap check in Step 5 for EVERY pair of benefits. If you can't clearly explain why two benefits are independent (different audience or different mechanism), collapse them into one. Two honest benefits beat three inflated ones.
- **Don't invent benefits.** If the site doesn't claim it, don't SWAG it. Stick to what's publicly observable.
- **Anchor SWAGs to case study results, not marketing headlines.** Partners put their best number in the headline ("28% AOV increase!") but case studies with named brands and specific metrics tell the real story. If 5 case studies show 3-8% lifts, your SWAG should sit in the mid-range of those real results (around 5%), not above the highest one. Case studies are already cherry-picked happy customers, so the mid-range of case study data is already an optimistic SWAG. The headline claim is the theoretical ceiling that a brand can override to if they believe it. When there are no case studies and only a headline claim, be more conservative and note the low confidence. A brand who clicks "research this with your AI" will see what real users report, and our SWAG needs to hold up against that.
- **Don't require brand inputs that aren't standard.** If a benefit needs "% of customers who use Apple Pay" — that's not a standard profile field. Either SWAG it or skip the benefit.
- **Don't make the formula complex.** If you need more than 5-6 variables in a single formula, you're overcomplicating it. Split into two benefits or simplify.
- **Don't skip the sanity check.** The sample-brand math catches formula errors and absurd SWAG defaults before they go live.
- **Never use hyphens as punctuation.** No double hyphens (`--`), no em dashes, no en dashes in any copy that renders on the page (descriptions, labels, notes, taglines, sources). Use commas, periods, parentheses, or rewrite the sentence. This is a dtcmvp brand rule. The only acceptable hyphens are in compound words (e.g., "post-purchase", "one-click").
- **No AI speak.** Copy should read like a human wrote it, not a language model. Avoid: "leveraging", "utilizing", "comprehensive", "cutting-edge", "state-of-the-art", "seamlessly", "robust". Write plainly.
