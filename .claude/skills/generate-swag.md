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

### Step 1 — Read the website

Fetch the partner's site using WebFetch. Hit 3-5 pages:
- Homepage
- Features or product page
- Pricing page (if it exists)
- Case studies or customer stories
- Any page with ROI claims, calculators, or testimonials

For each page, extract:
- **What does this app do?** (1-2 sentences)
- **What merchant-facing benefits do they claim?** (support reduction, upsell, return prevention, revenue lift, time savings, etc.)
- **Any quantitative claims?** ("reduces tickets by 85%", "$22k upsell revenue in 2 months", "3.5x ROI")
- **Named case studies with numbers?** (brand name + specific metric)
- **Pricing?** (monthly cost, tiers, free trial)
- **Any published ROI calculator on their site?** (if yes, note the URL — this is a Tier 1 opportunity)

**Important:** Only extract numbers that are actually on the site. Do NOT invent or estimate at this stage. That comes in Step 3.

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

**Standard brand profile fields** (these are collected once during onboarding and reused across all SWAGs):
- `annualOrders` — annual order volume
- `aov` — average order value ($)
- `returnRate` — return rate as a decimal (e.g., 0.15 for 15%)
- `avgCostPerItem` — average cost per item / COGS ($)
- `monthlyWebTraffic` — monthly website visitors (optional, used by some SWAGs)
- `emailListSize` — email subscriber count (optional)
- `smsListSize` — SMS subscriber count (optional)

Only require the fields this specific partner's SWAG actually uses. Don't ask for all of them.

### Step 4 — Write the spec file

Output a JSON spec file following this exact format. Save it to `partners/[slug].json` in the repo.

```json
{
  "slug": "orderediting",
  "partnerName": "Order Editing",
  "partnerUrl": "https://orderediting.com",
  "tagline": "Self-serve post-purchase order edits for Shopify",
  "tags": ["post-purchase", "cx", "upsell"],
  "pricingMonthly": 800,
  "tier": 0,
  "benefits": [
    {
      "id": "support_reduction",
      "label": "Support ticket deflection",
      "description": "When customers can edit their own orders, they stop emailing support about it.",
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
          "source": "dtcmvp estimate (partner claims up to 98%, Oh Polly case study)"
        }
      }
    },
    {
      "id": "upsell_revenue",
      "label": "Post-purchase upsell revenue",
      "description": "The editing flow surfaces add-on items — a net-new revenue stream.",
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
- `formula` uses the exact variable names from `brandInputs` + `swagDefaults` keys. Keep it readable arithmetic.
- `brandInputs` only lists fields from the standard brand profile (see Step 3). Don't invent new profile fields.
- `sources` lists URLs and specific claims so anyone can verify

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

- **Don't invent benefits.** If the site doesn't claim it, don't SWAG it. Stick to what's publicly observable.
- **Don't use the partner's claimed numbers at face value.** Discount them 10-20% for the SWAG default. The brand can override upward if they believe the claim.
- **Don't require brand inputs that aren't standard.** If a benefit needs "% of customers who use Apple Pay" — that's not a standard profile field. Either SWAG it or skip the benefit.
- **Don't make the formula complex.** If you need more than 5-6 variables in a single formula, you're overcomplicating it. Split into two benefits or simplify.
- **Don't skip the sanity check.** The sample-brand math catches formula errors and absurd SWAG defaults before they go live.
