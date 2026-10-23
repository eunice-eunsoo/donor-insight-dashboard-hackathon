import { HomePage } from "@/pages/home";

export function App() {
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <a href="#seg-title" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-background focus:px-3 focus:py-2">Skip to donor segments</a>
      <header className="border-b-[3px] border-white bg-[#521b4e] text-white shadow-[0_3px_0_0_#521b4e]">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-sm bg-white font-serif text-2xl font-bold text-[#521b4e]">K</span>
          <span className="font-serif text-2xl">The Kestrel Ledger</span>
          <span className="ml-auto font-serif text-sm uppercase tracking-[0.15em]">Donor Insights</span>
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <HomePage />
      </main>
    </div>
  );
}
