import { useEffect, useRef, useState } from 'react'
import { describeConnectionError } from '../lib/supabaseConnectionTest.js'
import {
  completeQueueService,
  loadBarberDashboard,
  startQueueService,
} from '../lib/barberQueue.js'

const cardClass = 'rounded-3xl border border-white/10 bg-slate-950/35 p-5 shadow-xl shadow-black/10 sm:p-7'
const secondaryButtonClass = 'inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-5 py-3 font-semibold text-slate-100 transition hover:border-[#D4A017]/60 hover:text-[#F4D37A] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A017]'
const primaryButtonClass = 'inline-flex min-h-12 items-center justify-center rounded-full bg-[#D4A017] px-5 py-3 font-semibold text-[#1F2937] transition hover:bg-[#F4D37A] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A017]'

function tokenLabel(tokenNumber) {
  return String(tokenNumber).padStart(3, '0')
}

function formatPrice(price, language) {
  return new Intl.NumberFormat(language === 'gu' ? 'gu-IN' : 'en-IN', {
    maximumFractionDigits: 2,
  }).format(Number(price))
}

function statusStyle(status) {
  if (status === 'In chair') return 'border-sky-300/20 bg-sky-300/10 text-sky-100'
  if (status === 'Called') return 'border-[#D4A017]/35 bg-[#D4A017]/10 text-[#F4D37A]'
  if (status === 'On break') return 'border-amber-300/20 bg-amber-300/10 text-amber-100'
  if (status === 'Available') return 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100'
  return 'border-white/10 bg-white/[0.04] text-slate-300'
}

function ServiceSnapshots({ services, language, copy }) {
  if (!services.length) {
    return <p className="text-sm text-slate-400">{copy.noSelectedServices}</p>
  }

  return (
    <ul className="mt-4 divide-y divide-white/10">
      {services.map((service) => (
        <li key={service.position} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
          <span className="min-w-0">
            <span className="block font-medium text-slate-100">
              {language === 'gu' ? service.service_name_gu : service.service_name_en}
            </span>
            <span className="mt-1 block text-sm text-slate-400">
              {copy.durationValue(service.duration_minutes)}
            </span>
          </span>
          <span className="whitespace-nowrap text-sm font-medium text-slate-200">
            {copy.currency}{formatPrice(service.price, language)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function getAvailability(barber, currentEntry, copy) {
  if (!barber.is_on_duty) return { label: copy.barberOffDuty, status: 'Off duty' }
  if (barber.is_on_break) return { label: copy.barberOnBreak, status: 'On break' }
  if (currentEntry?.status === 'In chair') return { label: copy.barberBusy, status: 'In chair' }
  if (currentEntry?.status === 'Called') return { label: copy.customerCalled, status: 'Called' }
  return { label: copy.barberAvailable, status: 'Available' }
}

function formatElapsed(startedAt, now, copy) {
  if (!startedAt) return ''
  const startTime = new Date(startedAt).getTime()
  if (!Number.isFinite(startTime)) return ''
  const totalSeconds = Math.max(0, Math.floor((now.getTime() - startTime) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return copy.elapsedTime(
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  )
}

function getLoadErrorMessage(error, copy) {
  if (error.name === 'StaffSessionRequiredError') return copy.staffSignInRequired
  if (error.name === 'BarberNameAmbiguousError') return copy.barberNameAmbiguous
  if (error.name === 'MultipleCurrentCustomersError') return copy.multipleCurrentCustomers
  return describeConnectionError(error)
}

export default function BarberDashboard({ barberName, language, copy }) {
  const [dashboard, setDashboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [pendingAction, setPendingAction] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionNotice, setActionNotice] = useState('')
  const [now, setNow] = useState(() => new Date())
  const actionInProgressRef = useRef(false)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let active = true
    let requestInFlight = false

    async function refresh() {
      if (requestInFlight) return
      requestInFlight = true
      setIsLoading(true)
      try {
        const data = await loadBarberDashboard(barberName)
        if (active) {
          setDashboard(data)
          setLoadError('')
          setLastUpdatedAt(new Date())
        }
      } catch (error) {
        if (active) setLoadError(getLoadErrorMessage(error, copy))
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
  }, [barberName, refreshVersion, copy])

  async function handleServiceAction(action) {
    const entry = dashboard?.currentEntry
    const allowedStatus = action === 'start' ? 'Called' : 'In chair'
    if (!entry || entry.status !== allowedStatus || actionInProgressRef.current) return

    actionInProgressRef.current = true
    setPendingAction(action)
    setActionError('')
    setActionNotice('')
    try {
      if (action === 'start') {
        await startQueueService(entry.id)
        setActionNotice(copy.startConfirmed)
      } else {
        await completeQueueService(entry.id)
        setActionNotice(copy.doneConfirmed)
      }
      setRefreshVersion((current) => current + 1)
    } catch (error) {
      setActionError(describeConnectionError(error))
    } finally {
      actionInProgressRef.current = false
      setPendingAction('')
    }
  }

  const barber = dashboard?.barber
  const currentEntry = dashboard?.currentEntry
  const nextEntry = dashboard?.nextEntry
  const availability = barber ? getAvailability(barber, currentEntry, copy) : null
  const elapsed = currentEntry?.status === 'In chair'
    ? formatElapsed(currentEntry.service_started_at, now, copy)
    : ''

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      {(loadError || actionError) && (
        <div role="alert" className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
          {loadError && <p>{copy.barberLoadError}: {loadError}</p>}
          {actionError && <p>{copy.barberActionError}: {actionError}</p>}
        </div>
      )}
      {actionNotice && (
        <p role="status" className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-100">
          {actionNotice}
        </p>
      )}

      {isLoading && !dashboard ? (
        <section className={cardClass}><p className="text-slate-300">{copy.barberLoading}</p></section>
      ) : !dashboard && loadError ? null
      : !barber ? (
        <section className={`${cardClass} text-center`}>
          <h1 className="text-2xl font-semibold text-white">{copy.barberNotFound}</h1>
        </section>
      ) : (
        <>
          <section className={`${cardClass} flex flex-col gap-5 sm:flex-row sm:items-center`}>
            {barber.photo_url ? (
              <img src={barber.photo_url} alt="" className="size-16 rounded-2xl object-cover" />
            ) : (
              <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-2xl bg-[#D4A017]/10 text-2xl font-semibold text-[#D4A017]">
                {barber.name.slice(0, 1)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D4A017]">{copy.barberViewTitle}</p>
              <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight text-white">{barber.name}</h1>
            </div>
            <span className={`inline-flex w-fit rounded-full border px-4 py-2 text-sm font-semibold ${statusStyle(availability.status)}`}>
              {availability.label}
            </span>
            <button
              type="button"
              disabled
              title={copy.availabilityControlsUnavailable}
              className={secondaryButtonClass}
            >
              {copy.breakControlsUnavailable}
            </button>
          </section>

          <section className={cardClass}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#D4A017]">{copy.currentCustomer}</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {currentEntry ? copy.tokenLabel(tokenLabel(currentEntry.token_number)) : copy.noCurrentCustomer}
                </h2>
                {currentEntry && (
                  <p className="mt-2 text-sm text-slate-400">
                    {copy.statusLabels[currentEntry.status] ?? copy.statusUnknown}
                  </p>
                )}
              </div>
              {elapsed && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-wide text-slate-400">{copy.serviceElapsed}</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-[#F4D37A]">{elapsed}</p>
                </div>
              )}
            </div>

            {currentEntry ? (
              <ServiceSnapshots services={currentEntry.services} language={language} copy={copy} />
            ) : (
              <p className="mt-4 text-sm text-slate-400">{copy.noCurrentCustomerDetails}</p>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleServiceAction('start')}
                disabled={!currentEntry || currentEntry.status !== 'Called' || Boolean(pendingAction)}
                className={primaryButtonClass}
              >
                {pendingAction === 'start' ? copy.startingService : copy.startService}
              </button>
              <button
                type="button"
                onClick={() => handleServiceAction('done')}
                disabled={!currentEntry || currentEntry.status !== 'In chair' || Boolean(pendingAction)}
                className={secondaryButtonClass}
              >
                {pendingAction === 'done' ? copy.completingService : copy.doneService}
              </button>
            </div>
          </section>

          <section className={cardClass}>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#D4A017]">{copy.nextCustomerTitle}</p>
            {nextEntry ? (
              <>
                <p className="mt-3 font-mono text-4xl font-bold tracking-wider text-[#F4D37A]">
                  {tokenLabel(nextEntry.token_number)}
                </p>
                <p className="mt-1 text-sm text-slate-400">{copy.nextCustomerNote}</p>
                <ServiceSnapshots services={nextEntry.services} language={language} copy={copy} />
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-400">{copy.nextCustomerNotVisible}</p>
            )}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              {copy.barberPolling}
              {lastUpdatedAt
                ? ` ${copy.lastUpdated(new Intl.DateTimeFormat(language === 'gu' ? 'gu-IN' : 'en-IN', {
                    hour: 'numeric',
                    minute: '2-digit',
                  }).format(lastUpdatedAt))}`
                : ''}
            </p>
            <button
              type="button"
              onClick={() => setRefreshVersion((current) => current + 1)}
              className={secondaryButtonClass}
            >
              {copy.retry}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
