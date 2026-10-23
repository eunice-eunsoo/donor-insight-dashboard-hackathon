import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { BarChart3, HandCoins, MessageSquareQuote, TrendingDown, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHANNELS, GROUPS, MEDIAN_GIFT, THEMES, type Group, type GroupId, type SegmentId } from "@/data/donors";

const usd = (n: number) => "$" + n.toLocaleString("en-US");
const signed = (n: number) => (n > 0 ? "+" : "") + n;

const TILE = "border-[#521b4e]/25 bg-[#f6eef5] text-foreground hover:border-[#521b4e] dark:border-[#d9b3d5]/30 dark:bg-[#2a0f28]";
const TILE_SELECTED = "border-[#521b4e] bg-[#521b4e] text-white shadow-lg dark:border-[#d9b3d5] dark:bg-[#d9b3d5] dark:text-[#2a0f28]";
const LABEL = "inline-block bg-[#521b4e] px-2 py-0.5 font-serif text-sm font-normal uppercase tracking-[0.12em] text-white dark:bg-[#d9b3d5] dark:text-[#2a0f28]";
const PURPLE_TEXT = "text-[#521b4e] dark:text-[#e6cbe3]";
const COMPARE_TEXT = "text-slate-600 dark:text-slate-300";
const PRIMARY_BAR = "bg-[#521b4e] dark:bg-[#d9b3d5]";
const COMPARE_BAR = "bg-slate-500 dark:bg-slate-400";
const PANEL = "rounded border border-t-4 border-t-[#521b4e] p-4 dark:border-t-[#d9b3d5]";

const ALL = GROUPS.all.giving!;

function SegmentTile({ g, selected, onSelect }: { g: Group; selected: boolean; onSelect: () => void }) {
  const v = g.giving!;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${g.name}: ${v.donors} donors, ${v.shareGiving}% of giving. Show breakdown`}
      className={`h-full w-full rounded border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${selected ? TILE_SELECTED : TILE}`}
    >
      <div className="font-serif text-lg">{g.name}</div>
      <div className="mt-1 flex items-center gap-1.5 text-sm"><Users className="size-4" aria-hidden="true" />{v.donors} donors · {v.shareDonors}% of donors</div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
        <dt>Total giving</dt><dd className="font-medium tabular-nums">{usd(v.total)} <span className="font-normal">({v.shareGiving}%)</span></dd>
        <dt>Avg. gift</dt><dd className="font-medium tabular-nums">{usd(v.avgGift)}</dd>
      </dl>
    </button>
  );
}

function Bar({ value, cls, max = 100 }: { value: number; cls: string; max?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-3 flex-1 rounded-sm bg-muted">
        <div className={`h-3 rounded-sm ${cls}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
      <span className="w-10 text-right tabular-nums">{value}%</span>
    </div>
  );
}

function PairBar({ label, a, b, max }: { label: string; a: number; b?: number; max?: number }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr_1fr] items-center gap-3 text-sm">
      <span>{label}</span>
      <Bar value={a} cls={PRIMARY_BAR} max={max} />
      {b === undefined ? <span /> : <Bar value={b} cls={COMPARE_BAR} max={max} />}
    </div>
  );
}

function Legend({ a, b }: { a: string; b?: string }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs">
      <span className="flex items-center gap-1.5"><span className={`size-2.5 rounded-full ${PRIMARY_BAR}`} aria-hidden="true" />{a}</span>
      {b && <span className="flex items-center gap-1.5"><span className={`size-2.5 rounded-full ${COMPARE_BAR}`} aria-hidden="true" />{b}</span>}
    </div>
  );
}

function Stat({ label, a, b }: { label: string; a: string; b?: string }) {
  return (
    <div className="border-b border-border py-1.5 last:border-0">
      <div className="text-xs uppercase tracking-wide">{label}</div>
      <div className="flex gap-4 font-serif text-xl tabular-nums">
        <span className={PURPLE_TEXT}>{a}</span>
        {b && <span className={COMPARE_TEXT}>{b}</span>}
      </div>
    </div>
  );
}

function Breakdown({ g, compareId, setCompareId, onClose }: { g: Group; compareId: GroupId | "none"; setCompareId: (v: GroupId | "none") => void; onClose: () => void }) {
  const cmp = compareId === "none" ? undefined : GROUPS[compareId];
  const v = g.giving!;
  const cv = cmp?.giving ?? undefined;
  const f = g.feedback;
  const cf = cmp?.feedback;
  const ranked = THEMES.map(([k, label]) => ({ k, label, n: f.themes[k] })).filter((t) => t.n > 0).sort((x, y) => y.n - x.n).slice(0, 5);
  const topN = ranked[0]?.n ?? 0;
  const pct = (n: number, d: number) => Math.round((n / d) * 100);

  return (
    <section id="breakdown" tabIndex={-1} aria-labelledby="breakdown-title" className="rounded border bg-card outline-none">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b px-5 py-3">
        <span className={LABEL}>Selected segment</span>
        <h2 id="breakdown-title" className="font-serif text-2xl">{g.name} Donors</h2>
        <span className="text-sm text-muted-foreground">{v.donors} donors · {v.gifts} gifts · {usd(v.total)} total giving</span>
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="compare" className="text-sm">Compare with</label>
          <Select value={compareId} onValueChange={(x) => setCompareId(x as GroupId | "none")}>
            <SelectTrigger id="compare" className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No comparison</SelectItem>
              <SelectItem value="all">All donors</SelectItem>
              <SelectItem value="readers">Non-donor readers</SelectItem>
              {(["hf", "lf", "hi", "li"] as SegmentId[]).filter((s) => s !== g.id).map((s) => <SelectItem key={s} value={s}>{GROUPS[s].name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close breakdown"><X className="size-4" /></Button>
        </div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-3">
        <div className={PANEL}>
          <h3 className="flex items-center gap-2 font-serif text-lg"><MessageSquareQuote className={`size-5 ${PURPLE_TEXT}`} aria-hidden="true" />What They're Telling Us</h3>
          <p className="mt-2 font-serif text-lg font-bold leading-snug">{g.headline}</p>
          <div className="mt-1 text-xs">{f.commenters} donors left comments</div>
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">Most common feedback themes</caption>
            <thead><tr className="text-left text-xs uppercase tracking-wide"><th className="pb-1 font-normal">Theme</th><th className="pb-1 text-right font-normal">Donors</th>{cf && <th className="pb-1 text-right font-normal">{cmp!.name}</th>}</tr></thead>
            <tbody>
              {ranked.map((t) => (
                <tr key={t.k} className={`border-t border-border ${t.n === topN && t.n > 2 ? "font-bold" : ""}`}>
                  <td className="py-1.5">{t.label}</td>
                  <td className={`py-1.5 text-right tabular-nums ${PURPLE_TEXT}`}>{t.n} <span className="font-normal">({pct(t.n, f.commenters)}%)</span></td>
                  {cf && <td className={`py-1.5 text-right tabular-nums ${COMPARE_TEXT}`}>{pct(cf.themes[t.k], cf.commenters)}%</td>}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 space-y-2">
            {g.quotes.map((q) => (
              <blockquote key={q} className="border-l-4 border-[#521b4e] bg-muted p-3 font-serif text-sm italic dark:border-[#d9b3d5]">“{q}”<footer className="mt-1 text-xs not-italic">— {g.name} donor</footer></blockquote>
            ))}
          </div>
        </div>
        <div className={PANEL}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="flex items-center gap-2 font-serif text-lg"><BarChart3 className={`size-5 ${PURPLE_TEXT}`} aria-hidden="true" />What They Think</h3>
            <Legend a={g.name} b={cmp?.name} />
          </div>
          <div className="mt-3 flex items-end gap-6">
            <div>
              <div className="text-xs uppercase tracking-wide">Net Promoter Score</div>
              <div className="flex gap-4 font-serif text-4xl tabular-nums">
                <span className={PURPLE_TEXT}>{signed(f.nps)}</span>
                {cf && <span className={COMPARE_TEXT}>{signed(cf.nps)}</span>}
              </div>
            </div>
            <div className="pb-1 text-xs">n = {f.n} donors{cf ? ` vs ${cf.n.toLocaleString("en-US")}` : ""}</div>
          </div>
          <div className="mt-3 space-y-1.5" role="group" aria-label="NPS distribution">
            <PairBar label="Promoters (9–10)" a={f.promoters} b={cf?.promoters} />
            <PairBar label="Passives (7–8)" a={f.passives} b={cf?.passives} />
            <PairBar label="Detractors (0–6)" a={f.detractors} b={cf?.detractors} />
          </div>
          <div className="mt-4 text-sm font-medium">How they usually read us</div>
          <div className="mt-1.5 space-y-1.5" role="group" aria-label="Reading channel">
            {CHANNELS.map((c) => <PairBar key={c} label={c.replace("Someone shares stories with me", "Shared by others").replace("Facebook or other social media", "Social media").replace("The email newsletter", "Email newsletter").replace("The website", "Website")} a={f.channels[c]} b={cf?.channels[c]} />)}
          </div>
        </div>

        <div className={PANEL}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="flex items-center gap-2 font-serif text-lg"><HandCoins className={`size-5 ${PURPLE_TEXT}`} aria-hidden="true" />How They Give</h3>
            <Legend a={g.name} b={cv ? cmp!.name : undefined} />
          </div>
          <div className="mt-3 space-y-1.5" role="group" aria-label="Share of donors, gifts and dollars">
            <PairBar label="Share of donors" a={v.shareDonors} b={cv?.shareDonors} />
            <PairBar label="Share of gifts" a={v.shareGifts} b={cv?.shareGifts} />
            <PairBar label="Share of dollars" a={v.shareGiving} b={cv?.shareGiving} />
            <PairBar label="Gave in last 12 mo." a={v.activePct} b={cv?.activePct} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4">
            <Stat label="Avg. gift" a={usd(v.avgGift)} b={cv ? usd(cv.avgGift) : undefined} />
            <Stat label="Gifts per donor" a={String(v.giftsPerDonor)} b={cv ? String(cv.giftsPerDonor) : undefined} />
            <Stat label="Median lifetime giving" a={usd(v.medianLifetime)} b={cv ? usd(cv.medianLifetime) : undefined} />
          </div>
          <div className="mt-3 text-sm font-medium">How they came in (campaign source)</div>
          <div className="mt-1.5 space-y-1.5">
            {["Newsletter", "Events", "None recorded"].map((k) => <PairBar key={k} label={k} a={v.acquisition[k]} b={cv?.acquisition[k]} />)}
          </div>
          {cmp && !cv && <p className="mt-3 text-xs">Non-donor readers have no giving history to compare.</p>}
        </div>

      </div>
    </section>
  );
}

const D = GROUPS.all.feedback;
const HI = GROUPS.hi.giving!;
const TAKEAWAYS = [
  { icon: MessageSquareQuote, title: "Donors want schools, watchdog and county coverage.", body: `Among the ${D.commenters} donors who commented, the top themes were more schools coverage (${D.themes.schools}), watchdog and public-meeting reporting (${D.themes.accountability}) and coverage beyond Kestrel Falls in the county and townships (${D.themes.county}). Complaints centered on reading on phones, email volume and donation asks.` },
  { icon: HandCoins, title: "Major Occasional donors carry the budget.", body: `They are ${HI.shareDonors}% of donors but gave ${HI.shareGiving}% of all dollars (${usd(HI.total)}), averaging ${usd(HI.avgGift)} per gift.` },
  { icon: TrendingDown, title: "Retention is the biggest gap.", body: `Only ${ALL.activePct}% of donors gave in the last 12 months (Sep 2025–Aug 2026), including just ${GROUPS.hf.giving!.activePct}% of Major Recurring donors.` },
];

export function HomePage() {
  const [selected, setSelected] = useState<SegmentId | null>(null);
  const [compareId, setCompareId] = useState<GroupId | "none">("none");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
      (ref.current.querySelector("#breakdown") as HTMLElement | null)?.focus({ preventScroll: true });
    }
  }, [selected]);

  const select = (id: SegmentId) => setSelected((cur) => (cur === id ? null : id));

  const kpis = [
    { label: "Donors", value: ALL.donors.toLocaleString("en-US") },
    { label: "Total giving", value: usd(ALL.total) },
    { label: "Avg. gift", value: usd(ALL.avgGift) },
    { label: "Gave in last 12 months", value: `${ALL.activePct}%` },
  ];

  return (
    <div className="mx-auto h-full w-full max-w-7xl space-y-5 px-5 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Donor Insights at a Glance</h1>
          <p className="text-sm text-muted-foreground">Gifts Jan 2019 – Aug 2026 · Reader Pulse and reader survey responses</p>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="flex flex-col-reverse rounded border border-t-4 border-t-[#521b4e] bg-card px-4 py-2.5 dark:border-t-[#d9b3d5]">
              <dt className="text-xs uppercase tracking-wide">{k.label}</dt>
              <dd className="font-serif text-2xl tabular-nums">{k.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <section aria-labelledby="seg-title" className="rounded border bg-card p-5">
          <h2 id="seg-title" className={LABEL}>Donor Segments</h2>
          <p className="mt-2 text-sm text-muted-foreground">By giving pattern and average gift, split at the median of ${MEDIAN_GIFT}</p>
          <div className="mt-4 grid grid-cols-[6.5rem_1fr_1fr] gap-3">
            <span />
            <div className="text-center text-sm font-medium">Small<div className="text-xs font-normal text-muted-foreground">(avg. gift under ${MEDIAN_GIFT})</div></div>
            <div className="text-center text-sm font-medium">Major<div className="text-xs font-normal text-muted-foreground">(avg. gift ${MEDIAN_GIFT}+)</div></div>
            <div className="self-center text-sm font-medium">Recurring<div className="text-xs font-normal text-muted-foreground">(regular, often monthly)</div></div>
            <SegmentTile g={GROUPS.lf} selected={selected === "lf"} onSelect={() => select("lf")} />
            <SegmentTile g={GROUPS.hf} selected={selected === "hf"} onSelect={() => select("hf")} />
            <div className="self-center text-sm font-medium">Occasional<div className="text-xs font-normal text-muted-foreground">(one-time or repeat)</div></div>
            <SegmentTile g={GROUPS.li} selected={selected === "li"} onSelect={() => select("li")} />
            <SegmentTile g={GROUPS.hi} selected={selected === "hi"} onSelect={() => select("hi")} />
          </div>
        </section>

        <section aria-labelledby="kt-title" className="rounded border bg-card p-5">
          <h2 id="kt-title" className={LABEL}>Key Takeaways</h2>
          <ul className="mt-2 divide-y divide-border">
            {TAKEAWAYS.map((t) => (
              <li key={t.title} className="flex gap-3 py-2.5 text-sm">
                <t.icon className={`mt-0.5 size-5 shrink-0 ${PURPLE_TEXT}`} aria-hidden="true" />
                <p><span className="font-serif text-base font-bold">{t.title} </span>{t.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div ref={ref} className="scroll-mt-4">
        {selected && (
          <motion.div key={selected} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Breakdown g={GROUPS[selected]} compareId={compareId} setCompareId={setCompareId} onClose={() => setSelected(null)} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
