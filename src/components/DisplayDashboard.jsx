import { useEffect, useRef, useState } from 'react'
import { describeConnectionError } from '../lib/supabaseConnectionTest.js'
import { loadDisplayQueue } from '../lib/displayDashboard.js'

const cardClass = 'rounded-3xl border border-white/10 bg-slate-950/35 p-5 shadow-xl shadow-black/10 sm:p-7 2xl:p-9'

function tokenLabel(tokenNumber) {
  return String(tokenNumber).padStart(3, '0')
}

function playCallChime(audioContext) {
  const firstToneAt = audioContext.currentTime
  const frequencies = [659.25, 880]
  frequencies.forEach((frequency, index) => {
    const toneAt = firstToneAt + index * 0.16
    const oscillator = audioContext.createOscillator()
    const volume = audioContext.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    volume.gain.setValueAtTime(0.0001, toneAt)
    volume.gain.exponentialRampToValueAtTime(0.08, toneAt + 0.02)
    volume.gain.exponentialRampToValueAtTime(0.0001, toneAt + 0.24)
    oscillator.connect(volume)
    volume.connect(audioContext.destination)
    oscillator.start(toneAt)
    oscillator.stop(toneAt + 0.25)
  })
}

function BarberCard({ barber, copy }) {
  const nextTokens = barber.nextTokens.slice(0, 5)

  return (
    <article className={`${cardClass} flex min-h-44 flex-col gap-5 2xl:min-h-56`}>
      <div className="flex items-center gap-5">
        {barber.photoUrl ? (
          <img
            src={barber.photoUrl}
            alt=""
            className="size-16 shrink-0 rounded-2xl object-cover 2xl:size-24"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[#D4A017]/10 text-2xl font-semibold text-[#D4A017] 2xl:size-24 2xl:text-4xl"
          >
            {barber.barberName.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-xl font-semibold text-white 2xl:text-3xl">{barber.barberName}</h3>
          <p className="mt-2 text-sm text-slate-400 2xl:text-lg">
            {barber.isOnDuty ? copy.displayOnDuty : copy.barberOffDuty}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 2xl:p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400 2xl:text-base">
            {copy.displayCurrentToken}
          </p>
          {barber.currentToken !== null ? (
            <p className="mt-2 font-mono text-3xl font-bold tracking-wider text-[#F4D37A] 2xl:text-5xl">
              {copy.tokenLabel(tokenLabel(barber.currentToken))}
            </p>
          ) : (
            <p className="mt-2 text-lg font-semibold text-slate-300 2xl:text-xl">
              {!barber.isOnDuty
                ? copy.barberOffDuty
                : barber.calledToken !== null
                  ? copy.displayNoCurrentToken
                  : copy.barberAvailable}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 2xl:p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400 2xl:text-base">
            {copy.displayCalledToken}
          </p>
          {barber.calledToken !== null ? (
            <p aria-live="polite" className="mt-2">
              <span className="inline-flex rounded-xl bg-[#D4A017] px-4 py-2 font-mono text-3xl font-bold tracking-wider text-[#1F2937] shadow-[0_0_24px_rgba(212,160,23,0.45)] motion-safe:animate-pulse 2xl:text-5xl">
                {copy.tokenLabel(tokenLabel(barber.calledToken))}
              </span>
            </p>
          ) : (
            <p className="mt-2 text-lg font-semibold text-slate-500 2xl:text-xl">
              {copy.displayNoCalledToken}
            </p>
          )}
        </div>
      </div>

      <section className="flex-1 rounded-2xl border border-white/10 bg-white/[0.025] p-4 2xl:p-5">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400 2xl:text-base">
          {copy.displayNextTokens}
        </h4>
        {nextTokens.length ? (
          <ol className="mt-3 space-y-2">
            {nextTokens.map((token) => (
              <li
                key={token.tokenNumber}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/30 px-3 py-2"
              >
                <span className="font-mono text-xl font-bold tracking-wider text-white 2xl:text-2xl">
                  {copy.tokenLabel(tokenLabel(token.tokenNumber))}
                </span>
                <span className="text-right text-sm text-slate-400 2xl:text-base">
                  {copy.displayEstimatedWait}
                  <span className="ml-2 whitespace-nowrap font-semibold text-slate-200">
                    {copy.durationValue(token.estimatedWaitMinutes)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-slate-400 2xl:text-lg">{copy.displayNoNextTokens}</p>
        )}
      </section>
    </article>
  )
}

export default function DisplayDashboard({ copy, language }) {
  const [barbers, setBarbers] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [soundUnavailable, setSoundUnavailable] = useState(false)
  const audioContextRef = useRef(null)
  const soundEnabledRef = useRef(false)
  const hasCalledTokenSnapshotRef = useRef(false)
  const calledTokensRef = useRef(new Map())

  useEffect(() => {
    let active = true
    let requestInFlight = false

    async function refresh() {
      if (requestInFlight) return
      requestInFlight = true
      try {
        const data = await loadDisplayQueue()
        if (active) {
          const calledTokens = new Map(
            data.map((barber) => [barber.barberId, barber.calledToken]),
          )
          const hasNewCalledToken = data.some(
            (barber) =>
              barber.calledToken !== null &&
              calledTokensRef.current.get(barber.barberId) !== barber.calledToken,
          )
          const audioContext = audioContextRef.current
          calledTokensRef.current = calledTokens

          if (hasCalledTokenSnapshotRef.current && hasNewCalledToken && soundEnabledRef.current) {
            if (audioContext?.state === 'running') {
              try {
                playCallChime(audioContext)
              } catch {
                soundEnabledRef.current = false
                setSoundEnabled(false)
                setSoundUnavailable(true)
              }
            } else {
              soundEnabledRef.current = false
              setSoundEnabled(false)
              setSoundUnavailable(true)
            }
          }
          hasCalledTokenSnapshotRef.current = true
          setBarbers(data)
          setLoadError('')
          setLastUpdatedAt(new Date())
        }
      } catch (error) {
        if (active) setLoadError(describeConnectionError(error))
      } finally {
        requestInFlight = false
        if (active) setIsLoading(false)
      }
    }

    void refresh()
    const timer = window.setInterval(() => void refresh(), 5000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => () => {
    const audioContext = audioContextRef.current
    if (audioContext && audioContext.state !== 'closed') {
      void audioContext.close()
    }
  }, [])

  async function toggleSound() {
    if (soundEnabledRef.current) {
      soundEnabledRef.current = false
      setSoundEnabled(false)
      return
    }

    setSoundUnavailable(false)
    if (typeof window.AudioContext !== 'function') {
      setSoundUnavailable(true)
      return
    }

    try {
      let audioContext = audioContextRef.current
      if (!audioContext || audioContext.state === 'closed') {
        audioContext = new window.AudioContext()
        audioContextRef.current = audioContext
      }
      if (audioContext.state !== 'running') await audioContext.resume()
      if (audioContext.state !== 'running') throw new Error('Audio is not available.')

      soundEnabledRef.current = true
      setSoundEnabled(true)
    } catch {
      soundEnabledRef.current = false
      setSoundEnabled(false)
      setSoundUnavailable(true)
    }
  }

  return (
    <div className="space-y-6 2xl:space-y-10">
      <section className={cardClass}>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A017] 2xl:text-lg">
            {copy.displayEyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl 2xl:text-7xl">
            {copy.salonName}
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-300 2xl:text-2xl 2xl:leading-9">
            {copy.displayDescription}
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400 2xl:text-lg">
        <p>{copy.displayPolling}</p>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {lastUpdatedAt && (
            <p>
              {copy.lastUpdated(new Intl.DateTimeFormat(language === 'gu' ? 'gu-IN' : 'en-IN', {
                hour: 'numeric',
                minute: '2-digit',
              }).format(lastUpdatedAt))}
            </p>
          )}
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundEnabled ? copy.displayMuteChime : copy.displayEnableChime}
            aria-pressed={soundEnabled}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-[#D4A017]/60 hover:text-[#F4D37A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A017]"
          >
            {soundEnabled ? copy.displayMuteChime : copy.displayEnableChime}
          </button>
        </div>
      </div>

      {soundUnavailable && (
        <p role="status" className="rounded-xl border border-amber-300/15 bg-amber-300/[0.05] px-4 py-3 text-sm text-amber-100">
          {copy.displayChimeUnavailable}
        </p>
      )}

      {loadError && (
        <p role="alert" className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100 2xl:text-lg">
          {copy.displayLoadError}: {loadError}
        </p>
      )}

      {isLoading && !barbers ? (
        <section className={cardClass}>
          <p className="text-slate-300">{copy.displayLoading}</p>
        </section>
      ) : barbers !== null ? (
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#D4A017] 2xl:text-lg">
                {copy.barbersTitle}
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-white 2xl:text-4xl">
                {copy.displayBarbersTitle}
              </h2>
            </div>
          </div>
          {barbers.length ? (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3 2xl:gap-6">
              {barbers.map((barber) => (
                <BarberCard key={barber.barberId} barber={barber} copy={copy} />
              ))}
            </div>
          ) : (
            <p className={`${cardClass} text-slate-300 2xl:text-xl`}>{copy.displayNoBarbers}</p>
          )}
        </section>
      ) : null}
    </div>
  )
}
