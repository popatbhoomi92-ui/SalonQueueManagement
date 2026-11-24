import { useEffect, useRef, useState } from 'react'
import { getSalonOpenState } from '../lib/customerQueue.js'
import { describeConnectionError } from '../lib/supabaseConnectionTest.js'
import {
  loadAdminDashboard,
  updateAdminSalonSettings,
  upsertAdminBarber,
  upsertAdminService,
} from '../lib/adminDashboard.js'

const cardClass = 'rounded-3xl border border-white/10 bg-slate-950/35 p-5 shadow-xl shadow-black/10 sm:p-7'
const inputClass = 'mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/45 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-[#D4A017]/70'
const primaryButtonClass = 'inline-flex min-h-11 items-center justify-center rounded-full bg-[#D4A017] px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-[#E3B52B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A017] disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButtonClass = 'inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-4 py-2.5 font-medium text-slate-100 transition hover:border-[#D4A017]/60 hover:text-[#F4D37A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A017] disabled:cursor-not-allowed disabled:opacity-50'

function formatPrice(price, language) {
  return new Intl.NumberFormat(language === 'gu' ? 'gu-IN' : 'en-IN', {
    maximumFractionDigits: 2,
  }).format(Number(price))
}

function formatCount(count, language) {
  return new Intl.NumberFormat(language === 'gu' ? 'gu-IN' : 'en-IN').format(count)
}

function StatCard({ label, value, accent }) {
  return (
    <article className={cardClass}>
      <p className="text-sm leading-6 text-slate-400">{label}</p>
      <p className={`mt-3 text-4xl font-semibold tracking-tight ${accent}`}>{value}</p>
    </article>
  )
}

function ServiceList({ services, language, copy, onEdit }) {
  if (!services.length) return <p className="mt-5 text-sm text-slate-400">{copy.noServices}</p>

  return (
    <ul className="mt-5 divide-y divide-white/10">
      {services.map((service) => (
        <li key={service.id} className="grid gap-3 py-4 first:pt-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="font-semibold text-white">{service.name_en}</p>
            <p className="mt-1 text-sm text-slate-400">{service.name_gu}</p>
            <p className="mt-2 text-sm text-slate-300">{copy.durationValue(service.duration_minutes)}</p>
          </div>
          <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
            <p className="whitespace-nowrap font-medium text-slate-100">{copy.currency}{formatPrice(service.price, language)}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
              service.is_active
                ? 'bg-emerald-300/10 text-emerald-200'
                : 'bg-white/[0.06] text-slate-400'
            }`}>
              {service.is_active ? copy.adminActive : copy.adminInactive}
            </span>
            <button type="button" onClick={() => onEdit(service)} className={secondaryButtonClass}>
              {copy.adminEdit}
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}

function BarberList({ barbers, copy, onEdit }) {
  if (!barbers.length) return <p className="mt-5 text-sm text-slate-400">{copy.adminNoBarbers}</p>

  return (
    <ul className="mt-5 space-y-3">
      {barbers.map((barber) => {
        const status = !barber.is_on_duty
          ? copy.barberOffDuty
          : barber.is_on_break
            ? copy.barberOnBreak
            : copy.adminOnDuty
        const color = !barber.is_on_duty
          ? 'bg-white/[0.06] text-slate-400'
          : barber.is_on_break
            ? 'bg-amber-300/10 text-amber-100'
            : 'bg-emerald-300/10 text-emerald-200'
        return (
          <li key={barber.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <div className="flex min-w-0 items-center gap-3">
              {barber.photo_url ? (
                <img src={barber.photo_url} alt="" className="size-11 shrink-0 rounded-xl object-cover" />
              ) : (
                <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#D4A017]/10 font-semibold text-[#D4A017]">
                  {barber.name.slice(0, 1)}
                </span>
              )}
              <div className="min-w-0">
                <span className="block truncate font-medium text-white">{barber.name}</span>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${color}`}>{status}</span>
              </div>
            </div>
            <button type="button" onClick={() => onEdit(barber)} className={secondaryButtonClass}>
              {copy.adminEdit}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function ServiceForm({ service, copy, onCancel, onSave, saving }) {
  const [nameEn, setNameEn] = useState(service?.name_en ?? '')
  const [nameGu, setNameGu] = useState(service?.name_gu ?? '')
  const [duration, setDuration] = useState(service?.duration_minutes?.toString() ?? '')
  const [price, setPrice] = useState(service?.price?.toString() ?? '')
  const [isActive, setIsActive] = useState(service?.is_active ?? true)
  const [formError, setFormError] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (saving) return

    const trimmedNameEn = nameEn.trim()
    const trimmedNameGu = nameGu.trim()
    const durationValue = Number(duration)
    const trimmedPrice = price.trim()
    const priceValue = Number(trimmedPrice)

    if (!trimmedNameEn || !trimmedNameGu) {
      setFormError(copy.adminRequiredBilingualNames)
      return
    }
    if (!Number.isInteger(durationValue) || durationValue <= 0) {
      setFormError(copy.adminPositiveDuration)
      return
    }
    if (!trimmedPrice || !Number.isFinite(priceValue) || priceValue < 0) {
      setFormError(copy.adminNonNegativePrice)
      return
    }

    setFormError('')
    await onSave({
      serviceId: service?.id ?? null,
      nameEn: trimmedNameEn,
      nameGu: trimmedNameGu,
      durationMinutes: durationValue,
      price: priceValue,
      isActive,
    })
  }

  return (
    <form onSubmit={submit} className="mt-5 grid gap-4 rounded-2xl border border-[#D4A017]/25 bg-slate-950/35 p-4 sm:grid-cols-2">
      <label className="text-sm font-medium text-slate-200">
        {copy.adminServiceNameEn}
        <input className={inputClass} value={nameEn} onChange={(event) => setNameEn(event.target.value)} disabled={saving} />
      </label>
      <label className="text-sm font-medium text-slate-200">
        {copy.adminServiceNameGu}
        <input className={inputClass} value={nameGu} onChange={(event) => setNameGu(event.target.value)} disabled={saving} />
      </label>
      <label className="text-sm font-medium text-slate-200">
        {copy.adminDurationMinutes}
        <input type="number" min="1" step="1" className={inputClass} value={duration} onChange={(event) => setDuration(event.target.value)} disabled={saving} />
      </label>
      <label className="text-sm font-medium text-slate-200">
        {copy.adminPrice}
        <input type="number" min="0" step="0.01" className={inputClass} value={price} onChange={(event) => setPrice(event.target.value)} disabled={saving} />
      </label>
      <label className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 px-4 text-sm text-slate-200 sm:col-span-2">
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} disabled={saving} className="size-4 accent-[#D4A017]" />
        {copy.adminActiveService}
      </label>
      {formError && <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100 sm:col-span-2">{formError}</p>}
      <div className="flex flex-wrap justify-end gap-3 sm:col-span-2">
        <button type="button" onClick={onCancel} disabled={saving} className={secondaryButtonClass}>{copy.cancelEntry}</button>
        <button type="submit" disabled={saving} className={primaryButtonClass}>{saving ? copy.adminSaving : copy.adminSave}</button>
      </div>
    </form>
  )
}

function BarberForm({ barber, copy, onCancel, onSave, saving }) {
  const [name, setName] = useState(barber?.name ?? '')
  const [photoUrl, setPhotoUrl] = useState(barber?.photo_url ?? '')
  const [isOnDuty, setIsOnDuty] = useState(barber?.is_on_duty ?? true)
  const [isOnBreak, setIsOnBreak] = useState(barber?.is_on_break ?? false)
  const [formError, setFormError] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (saving) return
    const trimmedName = name.trim()
    const trimmedPhotoUrl = photoUrl.trim()
    if (!trimmedName) {
      setFormError(copy.adminBarberNameRequired)
      return
    }
    setFormError('')
    await onSave({
      barberId: barber?.id ?? null,
      name: trimmedName,
      photoUrl: trimmedPhotoUrl || null,
      isOnDuty,
      isOnBreak,
    })
  }

  return (
    <form onSubmit={submit} className="mt-5 grid gap-4 rounded-2xl border border-[#D4A017]/25 bg-slate-950/35 p-4">
      <label className="text-sm font-medium text-slate-200">
        {copy.adminBarberName}
        <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} disabled={saving} />
      </label>
      <label className="text-sm font-medium text-slate-200">
        {copy.adminPhotoUrl}
        <input type="url" className={inputClass} value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} disabled={saving} placeholder={copy.adminPhotoUrlOptional} />
      </label>
      <label className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 px-4 text-sm text-slate-200">
        <input type="checkbox" checked={isOnDuty} onChange={(event) => setIsOnDuty(event.target.checked)} disabled={saving} className="size-4 accent-[#D4A017]" />
        {copy.adminOnDuty}
      </label>
      <label className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 px-4 text-sm text-slate-200">
        <input type="checkbox" checked={isOnBreak} onChange={(event) => setIsOnBreak(event.target.checked)} disabled={saving || !isOnDuty} className="size-4 accent-[#D4A017]" />
        {copy.barberOnBreak}
      </label>
      {formError && <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{formError}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onCancel} disabled={saving} className={secondaryButtonClass}>{copy.cancelEntry}</button>
        <button type="submit" disabled={saving} className={primaryButtonClass}>{saving ? copy.adminSaving : copy.adminSave}</button>
      </div>
    </form>
  )
}

export default function AdminDashboard({ copy, language }) {
  const [dashboard, setDashboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionNotice, setActionNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [savingAction, setSavingAction] = useState('')
  const [serviceEditor, setServiceEditor] = useState(null)
  const [barberEditor, setBarberEditor] = useState(null)
  const [settingsDraft, setSettingsDraft] = useState(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [now, setNow] = useState(() => new Date())
  const submissionInProgressRef = useRef(false)

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
      try {
        const data = await loadAdminDashboard()
        if (active) {
          setDashboard(data)
          setSettingsDraft((current) => current ?? {
            openingTime: data.settings?.opening_time?.slice(0, 5) ?? '',
            closingTime: data.settings?.closing_time?.slice(0, 5) ?? '',
            onlineQueueEnabled: data.settings?.online_queue_enabled ?? false,
          })
          setError('')
          setLastUpdatedAt(new Date())
        }
      } catch (loadError) {
        if (active) setError(describeConnectionError(loadError))
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
  }, [refreshVersion])

  function retry() {
    setIsLoading(true)
    setRefreshVersion((current) => current + 1)
  }

  function formatActionError() {
    return copy.adminActionError
  }

  async function saveService(values) {
    if (submissionInProgressRef.current) return
    submissionInProgressRef.current = true
    setSavingAction('service')
    setActionError('')
    setActionNotice('')
    try {
      await upsertAdminService(values)
      setServiceEditor(null)
      setActionNotice(copy.adminServiceSaved)
      setRefreshVersion((current) => current + 1)
    } catch {
      setActionError(formatActionError())
    } finally {
      setSavingAction('')
      submissionInProgressRef.current = false
    }
  }

  async function saveBarber(values) {
    if (submissionInProgressRef.current) return
    submissionInProgressRef.current = true
    setSavingAction('barber')
    setActionError('')
    setActionNotice('')
    try {
      await upsertAdminBarber({
        ...values,
        isOnBreak: values.isOnDuty ? values.isOnBreak : false,
      })
      setBarberEditor(null)
      setActionNotice(copy.adminBarberSaved)
      setRefreshVersion((current) => current + 1)
    } catch {
      setActionError(formatActionError())
    } finally {
      setSavingAction('')
      submissionInProgressRef.current = false
    }
  }

  async function saveSettings(event) {
    event.preventDefault()
    if (submissionInProgressRef.current || savingAction || !settingsDraft) return

    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/
    if (!timePattern.test(settingsDraft.openingTime) || !timePattern.test(settingsDraft.closingTime)) {
      setActionError(copy.adminValidTimesRequired)
      return
    }
    const openingMinutes = Number(settingsDraft.openingTime.slice(0, 2)) * 60 + Number(settingsDraft.openingTime.slice(3, 5))
    const closingMinutes = Number(settingsDraft.closingTime.slice(0, 2)) * 60 + Number(settingsDraft.closingTime.slice(3, 5))
    if (closingMinutes <= openingMinutes) {
      setActionError(copy.adminOpeningBeforeClosing)
      return
    }

    submissionInProgressRef.current = true
    setSavingAction('settings')
    setActionError('')
    setActionNotice('')
    try {
      await updateAdminSalonSettings({
        openingTime: settingsDraft.openingTime,
        closingTime: settingsDraft.closingTime,
        onlineQueueEnabled: settingsDraft.onlineQueueEnabled,
      })
      setActionNotice(copy.adminSettingsSaved)
      setRefreshVersion((current) => current + 1)
    } catch {
      setActionError(formatActionError())
    } finally {
      setSavingAction('')
      submissionInProgressRef.current = false
    }
  }

  const queueState = getSalonOpenState(now, dashboard?.settings, null)
  const configuredEnabled = dashboard?.settings?.online_queue_enabled
  const stats = dashboard?.stats

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <section className={cardClass}>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A017]">{copy.ownerDashboard}</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{copy.adminTitle}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">{copy.adminDescription}</p>
          </div>
          <p className="text-sm text-slate-400">
            {lastUpdatedAt
              ? copy.lastUpdated(new Intl.DateTimeFormat(language === 'gu' ? 'gu-IN' : 'en-IN', {
                  hour: 'numeric',
                  minute: '2-digit',
                }).format(lastUpdatedAt))
              : copy.adminPolling}
          </p>
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
          <p>{copy.adminLoadError}</p>
          <p className="mt-1 break-words text-rose-200/80">{error}</p>
        </div>
      )}
      {actionError && (
        <p role="alert" className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-100">
          {actionError}
        </p>
      )}
      {actionNotice && (
        <p role="status" className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-100">
          {actionNotice}
        </p>
      )}

      {isLoading && !dashboard ? (
        <section className={cardClass}><p className="text-slate-300">{copy.adminLoading}</p></section>
      ) : dashboard ? (
        <>
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">{copy.adminStatistics}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard label={copy.adminServedToday} value={formatCount(stats.served, language)} accent="text-[#F4D37A]" />
              <StatCard
                label={copy.adminAverageWait}
                value={`${formatCount(Number(stats.averageWaitMinutes.toFixed(1)), language)} ${copy.minutesShort}`}
                accent="text-violet-200"
              />
              <StatCard label={copy.adminWaiting} value={formatCount(stats.waiting, language)} accent="text-sky-200" />
              <StatCard label={copy.adminCancelled} value={formatCount(stats.cancelled, language)} accent="text-amber-100" />
              <StatCard label={copy.adminNoShow} value={formatCount(stats.noShow, language)} accent="text-rose-200" />
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
            <section className={cardClass}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#D4A017]">{copy.adminServicesTitle}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{copy.adminServiceCount(formatCount(dashboard.services.length, language))}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActionError('')
                    setActionNotice('')
                    setServiceEditor({ mode: 'create' })
                  }}
                  disabled={savingAction !== ''}
                  className={primaryButtonClass}
                >
                  {copy.adminAddService}
                </button>
              </div>
              {serviceEditor && (
                <ServiceForm
                  service={serviceEditor.mode === 'edit' ? serviceEditor.service : null}
                  copy={copy}
                  onCancel={() => setServiceEditor(null)}
                  onSave={saveService}
                  saving={savingAction === 'service'}
                />
              )}
              <ServiceList
                services={dashboard.services}
                language={language}
                copy={copy}
                onEdit={(service) => {
                  setActionError('')
                  setActionNotice('')
                  setServiceEditor({ mode: 'edit', service })
                }}
              />
            </section>

            <div className="space-y-5">
              <section className={cardClass}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#D4A017]">{copy.adminBarbersTitle}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setActionError('')
                      setActionNotice('')
                      setBarberEditor({ mode: 'create' })
                    }}
                    disabled={savingAction !== ''}
                    className={secondaryButtonClass}
                  >
                    {copy.adminAddBarber}
                  </button>
                </div>
                {barberEditor && (
                  <BarberForm
                    barber={barberEditor.mode === 'edit' ? barberEditor.barber : null}
                    copy={copy}
                    onCancel={() => setBarberEditor(null)}
                    onSave={saveBarber}
                    saving={savingAction === 'barber'}
                  />
                )}
                <BarberList
                  barbers={dashboard.barbers}
                  copy={copy}
                  onEdit={(barber) => {
                    setActionError('')
                    setActionNotice('')
                    setBarberEditor({ mode: 'edit', barber })
                  }}
                />
              </section>

              <section className={cardClass}>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#D4A017]">{copy.adminQueueTitle}</p>
                <span className={`mt-4 inline-flex rounded-full border px-4 py-2 text-sm font-semibold ${
                  queueState.canJoin
                    ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'
                    : 'border-white/15 bg-white/[0.04] text-slate-300'
                }`}>
                  {!queueState.valid
                    ? copy.queueStatusUnknown
                    : queueState.canJoin
                      ? copy.queueOpen
                      : copy.queueClosed}
                </span>
                <p className="mt-3 text-sm text-slate-300">
                  {copy.adminQueueConfigured}: {configuredEnabled === true
                    ? copy.adminEnabled
                    : configuredEnabled === false
                      ? copy.adminDisabled
                      : copy.queueStatusUnknown}
                </p>
                {dashboard.settings?.opening_time && dashboard.settings?.closing_time && (
                  <p className="mt-2 text-sm text-slate-400">
                    {copy.openingHours}: {dashboard.settings.opening_time.slice(0, 5)} – {dashboard.settings.closing_time.slice(0, 5)}
                  </p>
                )}
                {settingsDraft && (
                  <form onSubmit={saveSettings} className="mt-5 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                    <label className="text-sm font-medium text-slate-200">
                      {copy.adminOpeningTime}
                      <input type="time" className={inputClass} value={settingsDraft.openingTime} onChange={(event) => setSettingsDraft((current) => ({ ...current, openingTime: event.target.value }))} disabled={savingAction !== ''} />
                    </label>
                    <label className="text-sm font-medium text-slate-200">
                      {copy.adminClosingTime}
                      <input type="time" className={inputClass} value={settingsDraft.closingTime} onChange={(event) => setSettingsDraft((current) => ({ ...current, closingTime: event.target.value }))} disabled={savingAction !== ''} />
                    </label>
                    <label className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 px-4 text-sm text-slate-200">
                      <input type="checkbox" checked={settingsDraft.onlineQueueEnabled} onChange={(event) => setSettingsDraft((current) => ({ ...current, onlineQueueEnabled: event.target.checked }))} disabled={savingAction !== ''} className="size-4 accent-[#D4A017]" />
                      {copy.adminOnlineQueueEnabled}
                    </label>
                    <p className="text-xs text-slate-400">{copy.adminFixedTimezone}</p>
                    <button type="submit" disabled={savingAction !== ''} className={primaryButtonClass}>
                      {savingAction === 'settings' ? copy.adminSaving : copy.adminSaveSettings}
                    </button>
                  </form>
                )}
              </section>
            </div>
          </div>
        </>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{copy.adminPolling}</p>
        <button type="button" onClick={retry} className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-5 py-2.5 font-medium text-slate-100 transition hover:border-[#D4A017]/60 hover:text-[#F4D37A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A017]">
          {copy.retry}
        </button>
      </div>
    </div>
  )
}
