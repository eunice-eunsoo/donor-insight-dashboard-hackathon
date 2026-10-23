# Kestrel Ledger: Donor Insights

An interactive dashboard that answers **who gives to The Kestrel Ledger, what they want from us, and how we keep them giving.** It's built from first-party donor and reader data unified to the ADC schema (v1.0.0).

The home screen shows a 2x2 donor segment grid and the key takeaways. Click a segment to open its breakdown, in this order: **What They're Telling Us** (comment themes and quotes), **What They Think** (NPS and reading channel), and **How They Give**.

## Run it locally

Requires Node 20+.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## How the data works

The dashboard reads one generated file, `src/data/donors.ts`. It contains only aggregates and a few anonymous quotes, with no names or emails.

To regenerate it from the unified workbook:

```bash
pip install pandas openpyxl
mkdir data && cp /path/to/ADC_unified_audience_dataset_ER_v3.xlsx data/
python scripts/build_donor_data.py data/ADC_unified_audience_dataset_ER_v3.xlsx
```

The `data/` folder and all `.xlsx`, `.jsonl` and `.csv` files are git-ignored because the raw files contain personal information. **Don't commit them.**

### Sources (unified upstream into the ADC workbook)
| Source | Raw rows | People |
|---|---|---|
| `donors_npsp_export.csv` | 1,396 gifts | 520 donors |
| `reader_pulse_nps.csv` | 2,419 responses | 2,024 |
| `reader_survey_responses.csv` + `_shortform.csv` | 300 (290 after dedup) | 290 |

People were matched across sources by email: 84 people appear in 2+ sources, and 34 donors are linked to the reader survey. Five candidate matches remain unmerged for manual review.

### Segmentation
- **Recurring vs. Occasional:** uses the dataset's `donor_frequency` tag. Recurring means at least 3 Closed Won gifts at a regular, roughly monthly rhythm. Occasional means repeat or one-time givers.
- **Major vs. Small:** compares the donor's average gift with the median donor average gift ($50). Major is $50 or more.

### Feedback
- NPS uses each person's **latest** scored Reader Pulse response: % promoters (9–10) minus % detractors (0–6).
- Comment themes are keyword-coded (see `THEMES` in the script). Quotes and the one-line headlines are curated by hand in `QUOTES` and `HEADLINES`. **Re-check them whenever the data or the split changes.**

### What didn't fit ADC
- **Dollar amounts:** ADC has no amount field, so amounts live in the Donor Gift Bridge and are aggregated by `userID`.
- **Recurring donor type:** not in the source data, so it's derived from gift timing.
- **NPS (0–10):** doesn't map to `engagementScore` (1–5), so it's kept as the raw survey answer.
- **Lapsed status:** not assigned, because no newsroom rule exists yet.

### Caveats
- Only 49 donors have a scored NPS response, so per-segment feedback is directional. Each panel shows its sample size.
- "Last 12 months" means Sep 2025–Aug 2026 (the gift data ends 2026-08-31).

## Stack
React 19, TypeScript, Vite, Tailwind CSS v4, Radix UI (shadcn-style components), lucide-react and motion. The styling follows The Daily Northwestern style guide (Daily purple `#521B4E`, Georgia headings).

## What's next
- Scheduled refresh straight from the donor system and survey tools
- A newsroom rule for "lapsed" donors
- Resolve the 5 manual-review matches and grow donor ↔ survey linkage
