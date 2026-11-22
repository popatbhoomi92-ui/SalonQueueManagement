import { useEffect, useState } from 'react'
import english from './locales/en.js'
import gujarati from './locales/gu.js'

const messages = { en: english, gu: gujarati }

function ReadinessItem({ label }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-slate-200">
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#D4A017]/15 text-xs font-bold text-[#D4A017]"
      >
        ✓
      </span>
      <span>{label}</span>
    </li>
  )
}

export default function App() {
  const [language, setLanguage] = useState('en')
  const copy = messages[language]

  useEffect(() => {
    document.documentElement.lang = language === 'gu' ? 'gu' : 'en'
  }, [language])

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#1F2937] px-4 py-10 text-white sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-[#D4A017]/10 blur-3xl" />
        <div className="absolute -bottom-48 -right-32 size-[26rem] rounded-full bg-amber-700/10 blur-3xl" />
      </div>

      <section className="relative w-full max-w-3xl rounded-[2rem] border border-white/10 bg-slate-950/35 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-10">
        <header className="mb-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-[#D4A017]/30 bg-[#D4A017]/10 text-sm font-semibold tracking-wide text-[#D4A017]">
              SQ
            </div>
            <span className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
              {copy.eyebrow}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setLanguage((current) => (current === 'en' ? 'gu' : 'en'))}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-[#D4A017]/60 hover:text-[#F4D37A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A017]"
            aria-label={copy.languageButtonLabel}
          >
            {copy.languageButton}
          </button>
        </header>

        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A017]">
            {copy.kicker}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
            {copy.description}
          </p>
        </div>

        <div className="mt-10 grid gap-6 border-t border-white/10 pt-8 sm:grid-cols-[1fr_1.15fr] sm:items-start">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#D4A017]/30 bg-[#D4A017]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#F4D37A]">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-[#D4A017]" />
              {copy.status}
            </span>
            <p className="mt-4 text-sm leading-6 text-slate-400">{copy.note}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/15 p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold text-white">{copy.checkTitle}</h2>
            <ul className="space-y-2" aria-label={copy.checkTitle}>
              {copy.checks.map((label) => (
                <ReadinessItem key={label} label={label} />
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  )
}
