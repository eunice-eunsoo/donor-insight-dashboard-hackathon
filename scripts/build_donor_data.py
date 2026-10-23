"""Regenerate src/data/donors.ts from the unified ADC audience workbook.

Usage:
    pip install pandas openpyxl
    python scripts/build_donor_data.py data/ADC_unified_audience_dataset_ER_v3.xlsx

Steps:
  1. Collapse Closed Won gifts (Donor Gift Bridge) to one row per donor.
  2. Classify donors into a 2x2:
       frequency  = dataset donor_frequency tag: recurring vs occasional (repeat + single)
       gift size  = donor's average gift vs the median donor average gift (Major = at or above median)
  3. Join Reader Pulse NPS + reader survey responses to donors via the Response Bridge userID.
     NPS uses each person's latest scored response (promoters 9-10 minus detractors 0-6).
  4. Code free-text comments into themes with keyword rules (THEMES below).
  5. Write src/data/donors.ts. Quotes and one-line headlines are curated in QUOTES / HEADLINES;
     re-check them whenever the data or the split changes.
"""
import collections, json, re, sys
from pathlib import Path
import pandas as pd

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "data/ADC_unified_audience_dataset_ER_v3.xlsx")
OUT = Path(__file__).resolve().parents[1] / "src" / "data" / "donors.ts"
CUTOFF = pd.Timestamp("2025-09-01", tz="UTC")  # "last 12 months" = Sep 2025 - Aug 2026 (data ends 2026-08-31)

THEMES = [
    ("schools", "More schools coverage", r"school|kfcs|teacher|district|four-day"),
    ("accountability", "Values watchdog & meeting coverage", r"investigat|keep digging|ballot guide|zoning|planning commission|trustee|property tax|nobody else|tv stations skip|show up|showing up|lead pipe|in the room"),
    ("county", "Wants county & township coverage", r"township|county|out here|out in the|downtown|tolland|pike|harlan"),
    ("newsletter", "Loves the newsletter", r"love the newsletter|newsletter is the only|only one i open|weekly roundup|short summaries|part of my routine|first thing i read"),
    ("emails", "Too many emails", r"too many (news|e-?mail)|fewer emails|every day is a lot|once a week|archive most|unsubscribed|newsletter is too long|sent less"),
    ("asks", "Too many donation asks", r"stop asking|already gave|requests for money|asking me to donate|need money"),
    ("mobile", "Hard to read on phone / site", r"phone|iphone|pop-?ups|mobile|text is too small"),
    ("print", "Wants a print option", r"print|not everyone is online|screens are hard"),
    ("bias", "Concerns about bias", r"cozy|agenda|slant|lean left|facts, not opinions|chamber of commerce|fair and balanced|pocket"),
]
NAMES = {"hf": "Major Recurring", "lf": "Small Recurring", "hi": "Major Occasional", "li": "Small Occasional", "all": "All donors", "readers": "Non-donor readers"}
QUOTES = {
    "hf": ["My kids are in KFCS and I want more about it! I have 5 kids in the district", "The ballot guide is so useful. Nobody else is in the room anymore."],
    "lf": ["Honestly, every day is a lot! I archive most of them without reading.", "Feels like a Kestrel Falls paper, not a Kestrel County paper!"],
    "hi": ["More on the schools please.", "No one reports on what happens in the townships and it shows."],
    "li": ["You show up to the boring planning commission meetings so I don't have to!", "I finally understand my property tax bill because of you."],
}
HEADLINES = {
    "hf": "They want more schools coverage.",
    "hi": "Schools first, then the townships and watchdog reporting.",
    "li": "They value watchdog and public-meeting coverage.",
    "lf": "No single theme stands out; email volume, county coverage, print and bias each come up.",
}
CHANNELS = ["The email newsletter", "The website", "Someone shares stories with me", "Facebook or other social media"]
NPS_Q = "How likely are you to recommend The Kestrel Ledger to a friend or neighbor?"

x = pd.ExcelFile(SRC)
gifts = x.parse("Donor Gift Bridge", header=3)
objs = x.parse("ADC Survey Objects", header=3).reset_index(drop=True)
bridge = x.parse("Response Bridge", header=3)

# 1. donors
w = gifts[gifts.Stage == "Closed Won"].copy()
w["Close Date"] = pd.to_datetime(w["Close Date"])
d = w.groupby("userID").agg(
    n=("Amount", "size"), tot=("Amount", "sum"), avg=("Amount", "mean"),
    freq=("Donor Frequency", "first"), last=("Close Date", "max"),
    camp=("Campaign Source", lambda v: v.dropna().iloc[-1] if v.notna().any() else None))

# 2. classify
MEDIAN_GIFT = float(d.avg.median())
d["seg"] = [("hf" if a >= MEDIAN_GIFT else "lf") if f == "recurring" else ("hi" if a >= MEDIAN_GIFT else "li") for a, f in zip(d.avg, d.freq)]
d["active"] = d["last"] >= CUTOFF
segmap = dict(zip(d.index, d.seg))

# 3. survey responses -> people
objs["userID"] = bridge.set_index("adcObjectIndex").loc[range(1, len(objs) + 1), "userID"].values
objs["a"] = objs.responses.map(lambda r: {q["question"]: q["answer"] for q in json.loads(r)})
objs["seg"] = objs.userID.map(segmap).fillna("reader")
nps = objs[objs.dataSource == "reader_pulse_nps.csv"].copy()
nps["score"] = pd.to_numeric(nps.a.map(lambda a: a.get(NPS_Q)), errors="coerce")
nps["reason"] = nps.a.map(lambda a: a.get("What's the main reason for your score?", ""))
nps["chan"] = nps.a.map(lambda a: a.get("How do you usually read us?", ""))
nps = nps[nps.score.notna()].sort_values("published")
survey = objs[objs.dataSource != "reader_pulse_nps.csv"]

# 4. comments -> themes
text = collections.defaultdict(list)
for u, t in zip(nps.userID, nps.reason):
    if len(t.strip()) > 3: text[u].append(t)
for u, a in zip(survey.userID, survey.a):
    t = a.get("Anything else you want us to know?", "")
    if t and len(t) > 3: text[u].append(t)

def themes_of(t):
    t = t.lower(); return {k for k, _, rx in THEMES if re.search(rx, t)}

latest = nps.groupby("userID").last()

def feedback(ids):
    L = latest[latest.index.isin(ids)]
    n = len(L)
    p, pa, de = (L.score >= 9).mean() * 100, L.score.between(7, 8).mean() * 100, (L.score <= 6).mean() * 100
    ch = collections.Counter(L.chan)
    users = [u for u in ids if u in text]
    c = collections.Counter()
    for u in users: c.update(set().union(*[themes_of(t) for t in text[u]]))
    return dict(n=n, nps=round(p - de), promoters=round(p), passives=round(pa), detractors=round(de),
                channels={k: round(ch.get(k, 0) / n * 100) for k in CHANNELS},
                commenters=len(users), themes={k: c.get(k, 0) for k, _, _ in THEMES})

tot, ngifts = d.tot.sum(), d.n.sum()

def giving(g):
    camp = g.camp.fillna("None recorded").value_counts()
    return dict(donors=len(g), shareDonors=round(len(g) / len(d) * 100), total=round(g.tot.sum()),
                shareGiving=round(g.tot.sum() / tot * 100), gifts=int(g.n.sum()), shareGifts=round(g.n.sum() / ngifts * 100),
                avgGift=round(g.tot.sum() / g.n.sum()), giftsPerDonor=round(g.n.mean(), 1), medianLifetime=round(g.tot.median()),
                activePct=round(g.active.mean() * 100),
                acquisition={k: round(camp.get(k, 0) / len(g) * 100) for k in ["Newsletter", "Events", "None recorded"]})

groups = {}
for k in ["hf", "lf", "hi", "li", "all"]:
    g = d if k == "all" else d[d.seg == k]
    groups[k] = dict(id=k, name=NAMES[k], headline=HEADLINES.get(k, ""), giving=giving(g), feedback=feedback(list(g.index)), quotes=QUOTES.get(k, []))
readers = [u for u in latest.index if u not in segmap]
groups["readers"] = dict(id="readers", name=NAMES["readers"], headline="", giving=None, feedback=feedback(readers), quotes=[])
support = collections.Counter(survey[survey.seg == "reader"].a.map(lambda a: a.get("Would you consider supporting us financially?")))

# 5. write
OUT.write_text(f"""// Generated by scripts/build_donor_data.py from the unified ADC audience workbook. Do not edit by hand.
// Segments: frequency = dataset donor_frequency tag (recurring vs repeat/single);
// giving level = donor's average Closed Won gift vs the median donor average gift (${MEDIAN_GIFT:.0f}): major = ${MEDIAN_GIFT:.0f} or more.
// Feedback = each person's latest scored Reader Pulse response; themes coded from comments.
export type SegmentId = "hf" | "lf" | "hi" | "li";
export type GroupId = SegmentId | "all" | "readers";
export interface Giving {{ donors: number; shareDonors: number; total: number; shareGiving: number; gifts: number; shareGifts: number; avgGift: number; giftsPerDonor: number; medianLifetime: number; activePct: number; acquisition: Record<string, number>; }}
export interface Feedback {{ n: number; nps: number; promoters: number; passives: number; detractors: number; channels: Record<string, number>; commenters: number; themes: Record<string, number>; }}
export const MEDIAN_GIFT = {MEDIAN_GIFT:.0f};
export interface Group {{ id: GroupId; name: string; headline: string; giving: Giving | null; feedback: Feedback; quotes: string[]; }}
export const THEMES: [string, string][] = {json.dumps([[k, l] for k, l, _ in THEMES])};
export const CHANNELS = {json.dumps(CHANNELS)};
export const GROUPS: Record<GroupId, Group> = {json.dumps(groups, indent=1)};
export const SURVEY = {json.dumps(dict(readerYes=support.get("Yes", 0), readerMaybe=support.get("Maybe", 0), readerN=int((survey.seg == "reader").sum())))};
""")
print(f"Wrote {OUT} - {len(d)} donors, median avg gift ${MEDIAN_GIFT:.0f}")
