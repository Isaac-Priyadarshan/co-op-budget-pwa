function App() {
  return (
    <div className="min-h-dvh w-full bg-transparent text-white">
      <main className="flex min-h-dvh items-center justify-center px-6 py-10">
        <section className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/8 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="mb-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.32em] text-cyan-300/80">
              Co-Op Budget PWA
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Phase 1 starter is working
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Tailwind CSS v4 is now connected. Next, we will replace this with the
              premium native-app shell, 12 screens, bottom navigation, UserContext,
              and ErrorBoundary.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Current step
              </p>
              <p className="mt-2 text-base font-medium text-white">
                Tailwind + Vite wiring complete
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/80">
                Status
              </p>
              <p className="mt-2 text-base font-medium text-emerald-100">
                Ready for Phase 1 file generation
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App