import { useEffect, useMemo, useRef, useState } from 'react'
import { describeConnectionError } from '../lib/supabaseConnectionTest.js'
import { getSalonOpenState, loadSalonData } from '../lib/customerQueue.js'
import {
  ACTIVE_QUEUE_STATUSES,
  callNextCustomer,
  cancelWaitingEntry,
  getLocalQueueDay,
  loadReceptionDashboard,
  markQueueEntryNoShow,
  registerWalkIn,
} from '../lib/receptionQueue.js'

const cardClass = 'rounded-3xl border border-white/10 bg-slate-950/35 p-5 shadow-xl shadow-black/10 sm:p-6'
const secondaryButtonClass = 'inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-5 py-2.5 font-medium text-slate-100 transition hover:border-[#D4A017]/60 hover:text-[#F4D37A] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A017]'
const primaryButtonClass = 'inline-flex min-h-11 items-center justify-center rounded-full bg-[#D4A017] px-5 py-2.5 font-semibold text-[#1F2937] transition hover:bg-[#F4D37A] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A017]'
const inputClass = 'mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/20'
const serviceStatuses = ACTIVE_QUEUE_STATUSES
const noShowThresholdMs = 10 * 60 * 1000

function tokenLabel(tokenNumber) {
  return String(tokenNumber).padStart(3, '0')
}

function serviceMinutes(entry) {
  if (!entry.services.length || entry.services.some((service) => (
    service.duration_minutes === null ||
    service.duration_minutes === undefined ||
    !Number.isFinite(Number(service.duration_minutes))
  ))) {
    return null
  }

  return entry.services.reduce((total, service) => total + Number(service.duration_minutes), 0)
}

function estimateWait(entry, entries, workingBarberCount) {
  if (!workingBarberCount) return null

  const aheadEntries = entries.filter(
    (candidate) =>
      Number(candidate.token_number) < Number(entry.token_number) &&
      serviceStatuses.includes(candidate.status),
  )

  const serviceMinutesAhead = aheadEntries.map(serviceMinutes)
  if (serviceMinutesAhead.some((minutes) => minutes === null)) return null
  const minutesAhead = serviceMinutesAhead.reduce((total, minutes) => total + minutes, 0)
  return minutesAhead / workingBarberCount
}

function statusColor(status) {
  if (status === 'Waiting') return 'border-amber-300/20 bg-amber-300/10 text-amber-100'
  if (status === 'Called') return 'border-[#D4A017]/35 bg-[#D4A017]/10 text-[#F4D37A]'
  if (status === 'In chair') return 'border-sky-300/20 bg-sky-300/10 text-sky-100'
  return 'border-white/10 bg-white/[0.04] text-slate-300'
}

function StatusBadge({ children, status }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusColor(status)}`}>
      {children}
    </span>
  )
}

function QueueEntryServices({ entry, language, copy, compact = false }) {
  if (!entry.services.length) {
    return <span className="text-sm text-slate-500">{copy.noServiceSnapshots}</span>
  }

  return (
    <ul className={`flex ${compact ? 'flex-col gap-1' : 'flex-wrap gap-2'}`}>
      {entry.services.map((service) => (
        <li
          key={`${entry.id}-${service.position}`}
          className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-slate-200"
        >
          <span>{language === 'gu' ? service.service_name_gu : service.service_name_en}</span>
          <span className="ml-2 whitespace-nowrap text-xs text-slate-400">
            {copy.durationValue(service.duration_minutes)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function WalkInRegistrationForm({ copy, language, pending, onCancel, onSubmit }) {
  const [catalog, setCatalog] = useState(null)
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [optionsError, setOptionsError] = useState(false)
  const [optionsRetry, setOptionsRetry] = useState(0)
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedServiceIds, setSelectedServiceIds] = useState([])
  const [preferredBarberId, setPreferredBarberId] = useState('')
  const [formError, setFormError] = useState('')
  const services = catalog?.services ?? []
  const barbers = (catalog?.barbers ?? []).filter(
    (barber) => barber.is_on_duty === true && barber.is_on_break === false,
  )

  useEffect(() => {
    let active = true
    setIsLoadingOptions(true)
    setOptionsError(false)

    loadSalonData()
      .then((data) => {
        if (active) setCatalog(data)
      })
      .catch(() => {
        if (active) setOptionsError(true)
      })
      .finally(() => {
        if (active) setIsLoadingOptions(false)
      })

    return () => {
      active = false
    }
  }, [optionsRetry])

  function toggleService(serviceId) {
    setFormError('')
    if (selectedServiceIds.includes(serviceId)) {
      setSelectedServiceIds((current) => current.filter((id) => id !== serviceId))
    } else if (selectedServiceIds.length >= 3) {
      setFormError(copy.walkInServiceLimit)
    } else {
      setSelectedServiceIds((current) => [...current, serviceId])
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    if (!customerName.trim()) {
      setFormError(copy.walkInNameRequired)
      return
    }
    if (!/^\d{10}$/.test(phone)) {
      setFormError(copy.walkInPhoneInvalid)
      return
    }
    if (selectedServiceIds.length < 1 || selectedServiceIds.length > 3) {
      setFormError(copy.walkInServicesRequired)
      return
    }
    if (isLoadingOptions || optionsError || !services.length) return

    const succeeded = await onSubmit({
      name: customerName.trim(),
      phone,
      serviceIds: selectedServiceIds,
      preferredBarberId: preferredBarberId || null,
    })

    if (succeeded) onCancel()
  }

  return (
    <section className={`${cardClass} space-y-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#D4A017]">{copy.walkInTitle}</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">{copy.walkInDescription}</p>
        </div>
      </div>

      <form className="grid gap-5 lg:grid-cols-2" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-slate-200">
          {copy.walkInName}
          <input
            type="text"
            autoComplete="off"
            className={inputClass}
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            disabled={pending}
            required
          />
        </label>

        <label className="block text-sm font-medium text-slate-200">
          {copy.walkInPhone}
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            className={inputClass}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={pending}
            aria-describedby="walk-in-phone-hint"
            required
          />
          <span id="walk-in-phone-hint" className="mt-1 block text-xs text-slate-400">
            {copy.phoneHint}
          </span>
        </label>

        <fieldset className="lg:col-span-2">
          <legend className="text-sm font-medium text-slate-200">{copy.walkInServices}</legend>
          <p className="mt-1 text-xs text-slate-400">{copy.serviceLimitHint}</p>
          {isLoadingOptions ? (
            <p className="mt-3 text-sm text-slate-400">{copy.walkInLoadingOptions}</p>
          ) : optionsError ? (
            <div className="mt-3 rounded-xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-100">
              <p>{copy.walkInOptionsError}</p>
              <button
                type="button"
                onClick={() => setOptionsRetry((current) => current + 1)}
                disabled={pending}
                className={`${secondaryButtonClass} mt-3`}
              >
                {copy.retry}
              </button>
            </div>
          ) : services.length ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {services.map((service) => (
                <label
                  key={service.id}
                  className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4"
                >
                  <input
                    type="checkbox"
                    checked={selectedServiceIds.includes(service.id)}
                    onChange={() => toggleService(service.id)}
                    disabled={pending}
                    className="mt-1 size-4 accent-[#D4A017]"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-white">
                      {language === 'gu' ? service.name_gu : service.name_en}
                    </span>
                    <span className="mt-1 block text-sm text-slate-400">
                      {copy.durationValue(service.duration_minutes)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">{copy.walkInNoServices}</p>
          )}
        </fieldset>

        <label className="block text-sm font-medium text-slate-200 lg:col-span-2">
          {copy.walkInPreferredBarber}
          <select
            className={inputClass}
            value={preferredBarberId}
            onChange={(event) => setPreferredBarberId(event.target.value)}
            disabled={pending || isLoadingOptions || optionsError}
          >
            <option value="">{copy.anyBarber}</option>
            {barbers.map((barber) => (
              <option key={barber.id} value={barber.id}>{barber.name}</option>
            ))}
          </select>
        </label>

        {formError && (
          <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100 lg:col-span-2">
            {formError}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-3 lg:col-span-2">
          <button type="button" onClick={onCancel} disabled={pending} className={secondaryButtonClass}>
            {copy.walkInCancel}
          </button>
          <button
            type="submit"
            disabled={pending || isLoadingOptions || optionsError || !services.length}
            className={primaryButtonClass}
          >
            {pending ? copy.walkInSubmitting : copy.walkInSubmit}
          </button>
        </div>
      </form>
    </section>
  )
}

function BarberCard({
  barber,
  currentEntry,
  eligibleWaitingEntry,
  language,
  copy,
  pending,
  isCalling,
  onCallNext,
  isMarkingNoShow,
  onMarkNoShow,
}) {
  let availabilityLabel = copy.barberAvailable
  let availabilityStyle = 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100'

  if (!barber.is_on_duty) {
    availabilityLabel = copy.barberOffDuty
    availabilityStyle = 'border-white/10 bg-white/[0.04] text-slate-400'
  } else if (barber.is_on_break) {
    availabilityLabel = copy.barberOnBreak
    availabilityStyle = 'border-amber-300/20 bg-amber-300/10 text-amber-100'
  } else if (currentEntry?.status === 'In chair') {
    availabilityLabel = copy.barberBusy
    availabilityStyle = 'border-sky-300/20 bg-sky-300/10 text-sky-100'
  } else if (currentEntry?.status === 'Called') {
    availabilityLabel = copy.customerCalled
    availabilityStyle = 'border-[#D4A017]/35 bg-[#D4A017]/10 text-[#F4D37A]'
  }

  const canCall = barber.is_on_duty && !barber.is_on_break && !currentEntry && Boolean(eligibleWaitingEntry)

  return (
    <article className={`${cardClass} flex h-full flex-col`}>
      <div className="flex items-start gap-3">
        {barber.photo_url ? (
          <img src={barber.photo_url} alt="" className="size-12 rounded-2xl object-cover" />
        ) : (
          <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-2xl bg-[#D4A017]/10 text-lg font-semibold text-[#D4A017]">
            {barber.name.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-white">{barber.name}</h3>
          <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${availabilityStyle}`}>
            {availabilityLabel}
          </span>
        </div>
      </div>

      <div className="mt-5 flex-1 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          {copy.currentCustomer}
        </p>
        {currentEntry ? (
          <>
            <p className="mt-2 font-mono text-3xl font-bold tracking-wider text-[#F4D37A]">
              {tokenLabel(currentEntry.token_number)}
            </p>
            <p className="mt-1 text-sm text-slate-300">{currentEntry.customer_name}</p>
            <div className="mt-3">
              <QueueEntryServices entry={currentEntry} language={language} copy={copy} compact />
            </div>
            {currentEntry.status === 'Called' && (
              calledLongEnough(currentEntry) ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onMarkNoShow(currentEntry)}
                  className={`${secondaryButtonClass} mt-4 w-full`}
                >
                  {isMarkingNoShow ? copy.markingNoShow : copy.markNoShow}
                </button>
              ) : (
                <p className="mt-4 text-center text-xs leading-5 text-slate-400">
                  {copy.noShowTooEarly}
                </p>
              )
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-400">{copy.noCurrentCustomer}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onCallNext(barber)}
        disabled={!canCall || pending}
        className={`${primaryButtonClass} mt-4 w-full`}
      >
        {isCalling ? copy.calling : copy.callNext}
      </button>
      {!eligibleWaitingEntry && barber.is_on_duty && !barber.is_on_break && !currentEntry && (
        <p className="mt-2 text-center text-xs text-slate-500">{copy.noEligibleCustomer}</p>
      )}
    </article>
  )
}

function calledLongEnough(entry) {
  return Boolean(entry.called_at) && Date.now() - new Date(entry.called_at).getTime() >= noShowThresholdMs
}

function getDashboardErrorMessage(error, copy) {
  return error.name === 'StaffSessionRequiredError'
    ? copy.staffSignInRequired
    : describeConnectionError(error)
}

export default function ReceptionDashboard({ copy, language }) {
  const [dashboard, setDashboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [pendingAction, setPendingAction] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionNotice, setActionNotice] = useState('')
  const [isWalkInFormOpen, setIsWalkInFormOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const actionInProgressRef = useRef(false)
  const today = getLocalQueueDay(now)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
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
        const data = await loadReceptionDashboard(today)
        if (active) {
          setDashboard(data)
          setLoadError('')
          setLastUpdatedAt(new Date())
        }
      } catch (error) {
        if (active) setLoadError(getDashboardErrorMessage(error, copy))
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
  }, [today, refreshVersion, copy])

  const entries = dashboard?.entries ?? []
  const barbers = dashboard?.barbers ?? []
  const waitingEntries = entries.filter((entry) => entry.status === 'Waiting')
  const workingBarberCount = barbers.filter((barber) => barber.is_on_duty && !barber.is_on_break).length
  const queueState = getSalonOpenState(now, dashboard?.settings, dashboard?.settingsError)
  const barberById = useMemo(
    () => new Map(barbers.map((barber) => [barber.id, barber])),
    [barbers],
  )

  async function runQueueAction(
    actionId,
    action,
    successMessage,
    formatError = (error) => getDashboardErrorMessage(error, copy),
  ) {
    if (actionInProgressRef.current) return false
    actionInProgressRef.current = true
    let succeeded = false
    setPendingAction(actionId)
    setActionError('')
    setActionNotice('')
    try {
      await action()
      setActionNotice(successMessage)
      setRefreshVersion((current) => current + 1)
      succeeded = true
    } catch (error) {
      setActionError(formatError(error))
    } finally {
      actionInProgressRef.current = false
      setPendingAction('')
    }
    return succeeded
  }

  function handleCallNext(barber) {
    return runQueueAction(
      `call-${barber.id}`,
      () => callNextCustomer(barber.id),
      copy.callNextComplete,
    )
  }

  function handleCancel(entry) {
    if (entry.status !== 'Waiting' || !window.confirm(copy.receptionCancelConfirm(entry.token_number))) return
    return runQueueAction(
      `cancel-${entry.id}`,
      () => cancelWaitingEntry(entry.id),
      copy.receptionCancelSuccess,
    )
  }

  function handleMarkNoShow(entry) {
    if (
      entry.status !== 'Called' ||
      !calledLongEnough(entry) ||
      pendingAction
    ) {
      return
    }

    return runQueueAction(
      `no-show-${entry.id}`,
      () => markQueueEntryNoShow(entry.id),
      copy.noShowSuccess,
      (error) => copy.noShowActionError(getDashboardErrorMessage(error, copy)),
    )
  }

  function handleRegisterWalkIn(details) {
    if (pendingAction) return Promise.resolve(false)

    return runQueueAction(
      'walk-in',
      () => registerWalkIn(details),
      copy.walkInSuccess,
      (error) => getWalkInErrorMessage(error, copy),
    )
  }

  const queueStatusLabel = !queueState.valid
    ? copy.queueStatusUnknown
    : queueState.canJoin
      ? copy.queueOpen
      : copy.queueClosed
  const waitingNumber = String(waitingEntries.length)

  return (
    <div className="space-y-6">
      <section className={`${cardClass} flex flex-col gap-5 md:flex-row md:items-center md:justify-between`}>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D4A017]">
            {copy.receptionEyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {copy.receptionTitle}
          </h1>
          <p className="mt-2 text-sm text-slate-400">{copy.todayQueue}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full border px-4 py-2 text-sm font-semibold ${
            !queueState.valid
              ? 'border-white/15 bg-white/[0.04] text-slate-300'
              : queueState.canJoin
                ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100'
                : 'border-amber-300/20 bg-amber-300/10 text-amber-100'
          }`}>
            {queueStatusLabel}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300">
            {dashboard ? copy.waitingCount(waitingNumber) : copy.queueCountUnavailable}
          </span>
          <button
            type="button"
            onClick={() => {
              setActionError('')
              setActionNotice('')
              setIsWalkInFormOpen(true)
            }}
            className={secondaryButtonClass}
          >
            {copy.addWalkIn}
          </button>
        </div>
      </section>

      {isWalkInFormOpen && (
        <WalkInRegistrationForm
          copy={copy}
          language={language}
          pending={pendingAction !== ''}
          onCancel={() => setIsWalkInFormOpen(false)}
          onSubmit={handleRegisterWalkIn}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          {copy.dashboardPolling}
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

      {(loadError || actionError) && (
        <div role="alert" className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
          {loadError && <p>{copy.dashboardLoadError}: {loadError}</p>}
          {actionError && <p>{copy.dashboardActionError}: {actionError}</p>}
        </div>
      )}
      {dashboard?.settingsError && (
        <p role="alert" className="rounded-xl border border-amber-300/15 bg-amber-300/[0.05] px-4 py-3 text-sm text-amber-100">
          {copy.queueStatusError}: {describeConnectionError(dashboard.settingsError)}
        </p>
      )}
      {actionNotice && (
        <p role="status" className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
          {actionNotice}
        </p>
      )}

      {isLoading && !dashboard ? (
        <section className={cardClass}><p className="text-slate-300">{copy.dashboardLoading}</p></section>
      ) : dashboard && (
        <>
          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#D4A017]">{copy.barbersTitle}</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">{copy.barberCards}</h2>
              </div>
              <p className="text-sm text-slate-400">{copy.workingBarbers(workingBarberCount)}</p>
            </div>
            {barbers.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {barbers.map((barber) => {
                  const currentEntry = entries.find(
                    (entry) =>
                      entry.assigned_barber_id === barber.id &&
                      entry.status === 'In chair',
                  ) ?? entries.find(
                    (entry) =>
                      entry.assigned_barber_id === barber.id &&
                      entry.status === 'Called',
                  )
                  const eligibleWaitingEntry = waitingEntries.find(
                    (entry) => entry.preferred_barber_id === null || entry.preferred_barber_id === barber.id,
                  )
                  return (
                    <BarberCard
                      key={barber.id}
                      barber={barber}
                      currentEntry={currentEntry}
                      eligibleWaitingEntry={eligibleWaitingEntry}
                      language={language}
                      copy={copy}
                      pending={pendingAction !== ''}
                      isCalling={pendingAction === `call-${barber.id}`}
                      onCallNext={handleCallNext}
                      isMarkingNoShow={pendingAction === `no-show-${currentEntry?.id}`}
                      onMarkNoShow={handleMarkNoShow}
                    />
                  )
                })}
              </div>
            ) : (
              <p className={`${cardClass} text-slate-300`}>{copy.noBarbersOnDuty}</p>
            )}
          </section>

          <section className={cardClass}>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#D4A017]">{copy.queueLabel}</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">{copy.waitingList}</h2>
              </div>
              <p className="text-sm text-slate-400">{copy.waitingCount(waitingNumber)}</p>
            </div>
            {waitingEntries.length ? (
              <ol className="space-y-3">
                {waitingEntries.map((entry) => {
                  const preferredBarber = entry.preferred_barber_id
                    ? barberById.get(entry.preferred_barber_id)?.name ?? copy.unknownBarber
                    : copy.anyBarber
                  const waitMinutes = estimateWait(entry, entries, workingBarberCount)
                  const isPending = pendingAction === `cancel-${entry.id}`
                  return (
                    <li key={entry.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
                      <div className="grid gap-4 xl:grid-cols-[auto_1fr_auto_auto] xl:items-center">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-2xl font-bold tracking-wider text-[#F4D37A]">
                            {tokenLabel(entry.token_number)}
                          </span>
                          <StatusBadge status={entry.status}>{copy.statusLabels[entry.status]}</StatusBadge>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white">{entry.customer_name}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            {copy.preferredBarber}: <span className="text-slate-200">{preferredBarber}</span>
                          </p>
                          <div className="mt-3">
                            <QueueEntryServices entry={entry} language={language} copy={copy} />
                          </div>
                        </div>
                        <div className="text-sm">
                          <p className="text-slate-400">{copy.waitingTime}</p>
                          <p className="mt-1 font-semibold text-slate-100">
                            {waitMinutes === null
                              ? copy.waitUnavailable
                              : copy.durationValue(Number(waitMinutes.toFixed(1)))}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={pendingAction !== ''}
                          onClick={() => handleCancel(entry)}
                          className={`${secondaryButtonClass} border-rose-300/25 text-rose-100 hover:border-rose-200/50 hover:text-white`}
                        >
                          {isPending ? copy.cancelling : copy.cancelEntry}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-slate-300">
                {copy.noCustomersWaiting}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function getWalkInErrorMessage(error, copy) {
  if (error.name === 'StaffSessionRequiredError') return copy.staffSignInRequired

  const code = typeof error.code === 'string' && /^[A-Z0-9]{5}$/.test(error.code)
    ? ` (${error.code})`
    : ''
  return `${copy.walkInSubmitError}${code}`
}
