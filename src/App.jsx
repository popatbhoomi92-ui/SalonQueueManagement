import { useEffect, useMemo, useRef, useState } from 'react'
import english from './locales/en.js'
import gujarati from './locales/gu.js'
import { describeConnectionError } from './lib/supabaseConnectionTest.js'
import AdminDashboard from './components/AdminDashboard.jsx'
import BarberDashboard from './components/BarberDashboard.jsx'
import DisplayDashboard from './components/DisplayDashboard.jsx'
import ReceptionDashboard from './components/ReceptionDashboard.jsx'
import { StaffAccessGate, StaffLogin } from './components/StaffAccess.jsx'
import {
  cancelCustomerQueueEntry,
  getSalonOpenState,
  joinSalonQueue,
  loadCustomerQueueStatus,
  loadSalonData,
} from './lib/customerQueue.js'
import { supabaseConfigIssues, getSupabaseClient } from './lib/supabase.js'
import { loadHomeQueueSummary } from './lib/homeQueue.js'
import { loadStaffProfile, signInStaff, signOutStaff } from './lib/staffAuth.js'

const messages = { en: english, gu: gujarati }
const cardClass = 'rounded-3xl border border-white/10 bg-slate-950/35 p-5 shadow-xl shadow-black/10 sm:p-7'
const fieldClass = 'mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/50 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/20'
const primaryButtonClass = 'inline-flex min-h-12 items-center justify-center rounded-full bg-[#D4A017] px-6 py-3 font-semibold text-[#1F2937] transition hover:bg-[#F4D37A] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A017]'
const secondaryButtonClass = 'inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-5 py-2.5 font-medium text-slate-100 transition hover:border-[#D4A017]/60 hover:text-[#F4D37A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A017]'

function getPath() {
  return window.location.pathname
}

function decodeRouteParam(value) {
  try {
    return decodeURIComponent(value)
  } catch (error) {
    if (error instanceof URIError) return ''
    throw error
  }
}

function formatPrice(price, language) {
  return new Intl.NumberFormat(language === 'gu' ? 'gu-IN' : 'en-IN', {
    maximumFractionDigits: 2,
  }).format(Number(price))
}

function formatSalonTime(value, language) {
  const match = /^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/.exec(String(value ?? ''))
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23) return null

  return new Intl.DateTimeFormat(language === 'gu' ? 'gu-IN' : 'en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2020, 0, 1, hours, minutes)))
}

function staffRouteFor(profile) {
  if (profile.role === 'receptionist') return '/reception'
  if (profile.role === 'barber') return `/barber/${encodeURIComponent(profile.barberName)}`
  if (profile.role === 'owner') return '/admin'
  if (profile.role === 'display') return '/display'
  return '/staff/login'
}

function staffRouteAllows(path, profile, barberName) {
  if ((path === '/reception' || path === '/reception/') && profile.role === 'receptionist') return true
  if ((path === '/admin' || path === '/admin/') && profile.role === 'owner') return true
  if ((path === '/display' || path === '/display/') && profile.role === 'display') return true
  if (path.match(/^\/barber\/([^/]+)\/?$/)) {
    return profile.role === 'barber' && barberName === profile.barberName
  }
  return false
}

function staffErrorMessage(error, copy, isLogin = false) {
  const knownMessages = {
    STAFF_PROFILE_REQUIRED: copy.staffProfileRequired,
    STAFF_ROLE_INVALID: copy.staffRoleInvalid,
    STAFF_BARBER_LINK_REQUIRED: copy.staffBarberLinkRequired,
    STAFF_BARBER_NOT_FOUND: copy.staffBarberNotFound,
    STAFF_USER_MISSING: copy.staffAccountValidationFailed,
    STAFF_SIGN_OUT_FAILED: copy.staffSignOutFailed,
  }
  const knownMessage = knownMessages[error?.code]
  if (knownMessage) return knownMessage
  const prefix = isLogin ? copy.staffLoginFailed : copy.staffAccessError
  return `${prefix}: ${describeConnectionError(error)}`
}

function LanguageButton({ copy, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copy.languageButtonLabel}
      className={secondaryButtonClass}
    >
      {copy.languageButton}
    </button>
  )
}

function Header({ copy, language, setLanguage, goHome, staffAction }) {
  return (
    <header className="mb-8 flex items-center justify-between gap-4">
      <button type="button" onClick={goHome} className="flex items-center gap-3 text-left">
        <span className="flex size-12 items-center justify-center rounded-2xl border border-[#D4A017]/30 bg-[#D4A017]/10 text-sm font-bold tracking-wide text-[#D4A017]">
          SQ
        </span>
        <span>
          <span className="block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            {copy.eyebrow}
          </span>
          <span className="mt-1 block text-sm font-semibold text-white">{copy.salonName}</span>
        </span>
      </button>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <LanguageButton
          copy={copy}
          onClick={() => setLanguage((current) => (current === 'en' ? 'gu' : 'en'))}
        />
        {staffAction}
      </div>
    </header>
  )
}

function CustomerStatus({
  copy,
  language,
  entry,
  loading,
  error,
  updatedAt,
  cancelNotice,
  cancelError,
  isCancelling,
  onRefresh,
  onCancel,
}) {
  const statusLabels = copy.statusLabels
  const statusMessages = copy.statusMessages

  return (
    <section className={`${cardClass} mx-auto max-w-3xl`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A017]">
            {copy.statusTitle}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.statusHeading}</h1>
        </div>
        <button type="button" onClick={onRefresh} className={secondaryButtonClass}>
          {copy.retry}
        </button>
      </div>

      <p className="mt-3 text-sm text-slate-400">{copy.pollingNotice}</p>
      {updatedAt && (
        <p className="mt-1 text-xs text-slate-500">
          {copy.lastUpdated(new Intl.DateTimeFormat(language === 'gu' ? 'gu-IN' : 'en-IN', {
            hour: 'numeric',
            minute: '2-digit',
          }).format(updatedAt))}
        </p>
      )}
      {error && (
        <div role="alert" className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-100">
          <p>{copy.statusRefreshError}</p>
          <p className="mt-1 break-words text-rose-200/80">{error}</p>
        </div>
      )}
      {cancelError && (
        <p role="alert" className="mt-4 rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {copy.cancelError}: {cancelError}
        </p>
      )}
      {cancelNotice && (
        <p role="status" className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
          {cancelNotice}
        </p>
      )}

      {loading && !entry ? (
        <p className="mt-8 text-slate-300">{copy.statusLoading}</p>
      ) : !entry ? (
        !error && <p className="mt-8 text-slate-300">{copy.statusNotFound}</p>
      ) : (
        <>
          <div className="mt-7 rounded-3xl border border-[#D4A017]/25 bg-[#D4A017]/[0.07] p-6 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-300">
              {copy.tokenNumber}
            </p>
            <p className="mt-2 font-mono text-5xl font-bold tracking-wider text-[#F4D37A]">
              {String(entry.token_number).padStart(3, '0')}
            </p>
            <p className="mt-4 inline-flex rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-sm font-semibold text-white">
              {statusLabels[entry.status] ?? copy.statusUnknown}
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <p className="text-sm text-slate-400">{copy.queuePosition}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{copy.positionUnavailable}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <p className="text-sm text-slate-400">{copy.estimatedWait}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{copy.waitUnavailable}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">{copy.positionWaitUnavailableNotice}</p>

          <p aria-live="polite" className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm leading-6 text-slate-200">
            {statusMessages[entry.status] ?? copy.statusUnknownMessage}
            {entry.status === 'Called' && entry.assignedBarberName
              ? ` ${copy.assignedBarber(entry.assignedBarberName)}`
              : ''}
          </p>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-white">{copy.selectedServices}</h2>
            {entry.services.length ? (
              <ul className="mt-3 divide-y divide-white/10">
                {entry.services.map((service) => (
                  <li key={service.position} className="flex items-center justify-between gap-4 py-3">
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
            ) : (
              <p className="mt-3 text-sm text-slate-400">{copy.noSelectedServices}</p>
            )}
          </section>

          {entry.status === 'Waiting' && !cancelNotice && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isCancelling}
              className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full border border-rose-300/30 px-5 py-2.5 font-medium text-rose-100 transition hover:bg-rose-300/10 disabled:cursor-wait disabled:opacity-60"
            >
              {isCancelling ? copy.cancelling : copy.cancelQueue}
            </button>
          )}
        </>
      )}
    </section>
  )
}

function LoadingError({ error, onRetry, copy }) {
  if (!error) return null
  return (
    <div role="alert" className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
      <p>{copy.loadError}</p>
      <p className="mt-1 break-words text-rose-200/80">{error}</p>
      <button type="button" onClick={onRetry} className={`${secondaryButtonClass} mt-4`}>
        {copy.retry}
      </button>
    </div>
  )
}

function App() {
  const [language, setLanguage] = useState('en')
  const [path, setPath] = useState(getPath)
  const [catalog, setCatalog] = useState({ services: [], barbers: [], settings: null, settingsError: null })
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const [now, setNow] = useState(() => new Date())
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedServiceIds, setSelectedServiceIds] = useState([])
  const [preferredBarberId, setPreferredBarberId] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingReference, setBookingReference] = useState('')
  const [statusDataState, setStatusDataState] = useState({ entryId: '', data: null })
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [statusLoadError, setStatusLoadError] = useState('')
  const [statusUpdatedAt, setStatusUpdatedAt] = useState(null)
  const [statusRefreshKey, setStatusRefreshKey] = useState(0)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [cancelNotice, setCancelNotice] = useState('')
  const [staffAccess, setStaffAccess] = useState({ status: 'checking', profile: null, error: null })
  const [isStaffSigningOut, setIsStaffSigningOut] = useState(false)
  const [staffLogoutError, setStaffLogoutError] = useState('')
  const joinSubmissionInProgressRef = useRef(false)
  const copy = messages[language]
  const routeMatch = path.match(/^\/status\/([^/]+)\/?$/)
  const barberRouteMatch = path.match(/^\/barber\/([^/]+)\/?$/)
  const isJoinPage = path === '/join' || path === '/join/'
  const isStatusPage = Boolean(routeMatch)
  const isReceptionPage = path === '/reception' || path === '/reception/'
  const isBarberPage = Boolean(barberRouteMatch)
  const isStaffLoginPage = path === '/staff/login' || path === '/staff/login/'
  const isOwnerPage = path === '/admin' || path === '/admin/'
  const isDisplayPage = path === '/display' || path === '/display/'
  const isStaffPage = isReceptionPage || isBarberPage || isOwnerPage || isDisplayPage
  const statusId = routeMatch ? routeMatch[1] : ''
  const barberName = barberRouteMatch ? decodeRouteParam(barberRouteMatch[1]) : ''
  const statusData = statusDataState.entryId === statusId ? statusDataState.data : null
  const staffProfile = staffAccess.profile
  const staffRouteAuthorized = staffAccess.status === 'authenticated'
    && staffRouteAllows(path, staffProfile, barberName)
  const openState = getSalonOpenState(now, catalog.settings, catalog.settingsError)
  const settingsErrorMessage = catalog.settingsError
    ? describeConnectionError(catalog.settingsError)
    : ''
  const availableBarbers = catalog.barbers.filter(
    (barber) => barber.is_on_duty === true && barber.is_on_break === false,
  )
  const selectedServices = useMemo(
    () => catalog.services.filter((service) => selectedServiceIds.includes(service.id)),
    [catalog.services, selectedServiceIds],
  )
  const totalDuration = selectedServices.reduce(
    (total, service) => total + Number(service.duration_minutes),
    0,
  )
  const totalPrice = selectedServices.reduce((total, service) => total + Number(service.price), 0)

  useEffect(() => {
    document.documentElement.lang = language === 'gu' ? 'gu' : 'en'
  }, [language])

  useEffect(() => {
    if (supabaseConfigIssues.length > 0) {
      setStaffAccess({ status: 'signedOut', profile: null, error: null })
      return undefined
    }

    let active = true
    async function checkStaffSession() {
      try {
        const { data, error } = await getSupabaseClient().auth.getSession()
        if (error) throw error
        const session = data.session
        if (!session || session.user.is_anonymous) {
          if (active) setStaffAccess({ status: 'signedOut', profile: null, error: null })
          return
        }

        const profile = await loadStaffProfile(session.user.id)
        if (active) setStaffAccess({ status: 'authenticated', profile, error: null })
      } catch (error) {
        if (active) setStaffAccess({ status: 'error', profile: null, error })
      }
    }

    void checkStaffSession()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    function handlePopState() {
      setPath(getPath())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (staffAccess.status !== 'authenticated' || (!isStaffLoginPage && !isStaffPage)) return
    const destination = staffRouteFor(staffAccess.profile)
    if (path !== destination && !(staffRouteAuthorized && path.endsWith('/'))) {
      navigate(destination)
    }
  }, [staffAccess, isStaffLoginPage, isStaffPage, path, staffRouteAuthorized])

  useEffect(() => {
    if (isStatusPage || isReceptionPage || isBarberPage || isStaffLoginPage || isOwnerPage || isDisplayPage) return undefined
    let active = true
    setIsLoadingCatalog(true)
    setCatalogError('')
    loadSalonData({ includeOffDutyBarbers: true })
      .then((data) => {
        if (active) setCatalog(data)
      })
      .catch((error) => {
        if (active) setCatalogError(describeConnectionError(error))
      })
      .finally(() => {
        if (active) setIsLoadingCatalog(false)
      })
    return () => {
      active = false
    }
  }, [isBarberPage, isDisplayPage, isJoinPage, isOwnerPage, isReceptionPage, isStaffLoginPage, isStatusPage])

  useEffect(() => {
    if (!isStatusPage) return undefined
    let active = true
    let requestInFlight = false

    async function refreshStatus() {
      if (requestInFlight) return
      requestInFlight = true
      setIsLoadingStatus(true)
      try {
        const data = await loadCustomerQueueStatus(statusId)
        if (active) {
          setStatusDataState({ entryId: statusId, data })
          setStatusLoadError('')
          setStatusUpdatedAt(new Date())
        }
      } catch (error) {
        if (active) setStatusLoadError(describeConnectionError(error))
      } finally {
        requestInFlight = false
        if (active) setIsLoadingStatus(false)
      }
    }

    void refreshStatus()
    const timer = window.setInterval(() => {
      void refreshStatus()
    }, 5000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [isStatusPage, statusId, statusRefreshKey])

  useEffect(() => {
    setCancelError('')
    setCancelNotice('')
  }, [statusId])

  function navigate(nextPath) {
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
    setFormError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function refreshCatalog() {
    setIsLoadingCatalog(true)
    setCatalogError('')
    loadSalonData({ includeOffDutyBarbers: true })
      .then(setCatalog)
      .catch((error) => setCatalogError(describeConnectionError(error)))
      .finally(() => setIsLoadingCatalog(false))
  }

  function toggleService(serviceId) {
    setFormError('')
    if (selectedServiceIds.includes(serviceId)) {
      setSelectedServiceIds((current) => current.filter((id) => id !== serviceId))
    } else if (selectedServiceIds.length >= 3) {
      setFormError(copy.serviceLimit)
    } else {
      setSelectedServiceIds((current) => [...current, serviceId])
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (joinSubmissionInProgressRef.current) return
    setFormError('')

    if (!customerName.trim()) {
      setFormError(copy.nameRequired)
      return
    }
    if (!/^\d{10}$/.test(phone)) {
      setFormError(copy.phoneInvalid)
      return
    }
    if (selectedServiceIds.length < 1 || selectedServiceIds.length > 3) {
      setFormError(copy.serviceRequired)
      return
    }
    if (!preferredBarberId) {
      setFormError(copy.barberRequired)
      return
    }
    if (!availableBarbers.length) {
      setFormError(copy.noAvailableBarbers)
      return
    }
    if (!openState.canJoin) {
      setFormError(openState.valid ? copy.onlineClosed : copy.availabilityUnknown)
      return
    }

    joinSubmissionInProgressRef.current = true
    setIsSubmitting(true)
    try {
      const reference = await joinSalonQueue({
        name: customerName.trim(),
        phone,
        serviceIds: selectedServiceIds,
        preferredBarberId: preferredBarberId === 'any' ? null : preferredBarberId,
      })
      setBookingReference(reference)
      navigate(`/status/${encodeURIComponent(reference)}`)
    } catch (error) {
      setFormError(describeConnectionError(error))
    } finally {
      joinSubmissionInProgressRef.current = false
      setIsSubmitting(false)
    }
  }

  async function handleCancelQueue() {
    if (!statusData || statusData.status !== 'Waiting' || isCancelling) return
    if (!window.confirm(copy.cancelConfirm)) return

    setIsCancelling(true)
    setCancelError('')
    setCancelNotice('')
    try {
      await cancelCustomerQueueEntry(statusId)
      setCancelNotice(copy.cancelSuccess)
      setStatusRefreshKey((current) => current + 1)
    } catch (error) {
      setCancelError(describeConnectionError(error))
    } finally {
      setIsCancelling(false)
    }
  }

  async function handleStaffLogin(email, password) {
    try {
      const profile = await signInStaff(email, password)
      setStaffAccess({ status: 'authenticated', profile, error: null })
      setStaffLogoutError('')
      navigate(staffRouteFor(profile))
    } catch (error) {
      setStaffAccess({ status: 'signedOut', profile: null, error: null })
      throw new Error(staffErrorMessage(error, copy, true))
    }
  }

  async function handleStaffLogout() {
    setIsStaffSigningOut(true)
    setStaffLogoutError('')
    try {
      await signOutStaff()
      setStaffAccess({ status: 'signedOut', profile: null, error: null })
      navigate('/staff/login')
    } catch (error) {
      setStaffLogoutError(describeConnectionError(error))
    } finally {
      setIsStaffSigningOut(false)
    }
  }

  const staffAction = staffAccess.status === 'authenticated' ? (
    <button
      type="button"
      onClick={handleStaffLogout}
      disabled={isStaffSigningOut}
      className={secondaryButtonClass}
    >
      {isStaffSigningOut ? copy.staffSigningOut : copy.staffSignOut}
    </button>
  ) : !isStaffLoginPage ? (
    <button type="button" onClick={() => navigate('/staff/login')} className={secondaryButtonClass}>
      {copy.staffLoginLink}
    </button>
  ) : null

  if (supabaseConfigIssues.length > 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#1F2937] px-4 py-10 text-white">
        <section className={`${cardClass} w-full max-w-xl`}>
          <Header copy={copy} language={language} setLanguage={setLanguage} goHome={() => navigate('/')} staffAction={staffAction} />
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A017]">
            {copy.configurationTitle}
          </p>
          <h1 className="mt-3 text-3xl font-semibold">{copy.configurationMessage}</h1>
          <ul className="mt-5 space-y-2">
            {supabaseConfigIssues.map((issue) => (
              <li key={issue} className="rounded-xl bg-white/[0.04] px-4 py-3 font-mono text-sm text-[#F4D37A]">
                {issue}
              </li>
            ))}
          </ul>
        </section>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#1F2937] px-4 py-6 text-white sm:px-6 sm:py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-[#D4A017]/10 blur-3xl" />
        <div className="absolute -bottom-48 -right-32 size-[26rem] rounded-full bg-amber-700/10 blur-3xl" />
      </div>
      <div className={`relative mx-auto w-full ${isDisplayPage ? 'max-w-[1800px]' : 'max-w-5xl'}`}>
        <Header
          copy={copy}
          language={language}
          setLanguage={setLanguage}
          goHome={() => navigate('/')}
          staffAction={staffAction}
        />

        {(isStaffPage || isStaffLoginPage) && staffAccess.status === 'checking' ? (
          <section className={`${cardClass} mx-auto max-w-xl`}>
            <p className="text-sm text-slate-300">{copy.staffAccessLoading}</p>
          </section>
        ) : isStaffLoginPage && staffAccess.status === 'authenticated' ? (
          <section className={`${cardClass} mx-auto max-w-xl`}>
            <p className="text-sm text-slate-300">{copy.staffAccessLoading}</p>
          </section>
        ) : isStaffLoginPage ? (
          <StaffLogin
            copy={copy}
            onLogin={handleStaffLogin}
            onHome={() => navigate('/')}
            warning={staffAccess.status === 'error' ? staffErrorMessage(staffAccess.error, copy) : ''}
          />
        ) : isStaffPage && staffAccess.status !== 'authenticated' ? (
          <StaffAccessGate
            copy={copy}
            message={staffAccess.status === 'error'
              ? staffErrorMessage(staffAccess.error, copy)
              : copy.staffLoginDescription}
            onLogin={() => navigate('/staff/login')}
          />
        ) : isStaffPage && !staffRouteAuthorized ? (
          <section className={`${cardClass} mx-auto max-w-xl`}>
            <p className="text-sm text-slate-300">{copy.staffAccessLoading}</p>
          </section>
        ) : isOwnerPage ? (
          <AdminDashboard copy={copy} language={language} />
        ) : isDisplayPage ? (
          <DisplayDashboard copy={copy} language={language} />
        ) : isReceptionPage ? (
          <ReceptionDashboard copy={copy} language={language} />
        ) : isBarberPage ? (
          <BarberDashboard
            key={barberName}
            barberName={barberName}
            language={language}
            copy={copy}
          />
        ) : isStatusPage ? (
          <div className="space-y-5">
            {bookingReference === statusId && (
              <p role="status" className={`${cardClass} mx-auto max-w-3xl text-sm text-emerald-100`}>
                {copy.joinSuccessDescription}
                <span className="mt-2 block break-all font-mono text-[#F4D37A]">{copy.bookingReference}: {statusId}</span>
              </p>
            )}
            <CustomerStatus
              copy={copy}
              language={language}
              entry={statusData}
              loading={isLoadingStatus}
              error={statusLoadError}
              updatedAt={statusUpdatedAt}
              cancelNotice={cancelNotice}
              cancelError={cancelError}
              isCancelling={isCancelling}
              onRefresh={() => setStatusRefreshKey((current) => current + 1)}
              onCancel={handleCancelQueue}
            />
            <div className="text-center">
              <button type="button" onClick={() => navigate('/')} className={secondaryButtonClass}>
                {copy.backHome}
              </button>
            </div>
          </div>
        ) : isJoinPage ? (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-start">
            <section className={cardClass}>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A017]">{copy.joinEyebrow}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.joinTitle}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">{copy.joinDescription}</p>
              <LoadingError error={catalogError || settingsErrorMessage} onRetry={refreshCatalog} copy={copy} />

              <form className="mt-7 space-y-6" onSubmit={handleSubmit} noValidate>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-200">
                    {copy.customerName}
                    <input
                      autoComplete="name"
                      className={fieldClass}
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      maxLength={100}
                      required
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-200">
                    {copy.phoneNumber}
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      className={fieldClass}
                      value={phone}
                      onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
                      maxLength={10}
                      aria-describedby="phone-hint"
                      required
                    />
                    <span id="phone-hint" className="mt-1 block text-xs text-slate-400">{copy.phoneHint}</span>
                  </label>
                </div>

                <fieldset>
                  <legend className="text-sm font-semibold text-white">{copy.chooseServices}</legend>
                  <p className="mt-1 text-sm text-slate-400">{copy.serviceLimitHint}</p>
                  {isLoadingCatalog ? (
                    <p className="mt-4 text-sm text-slate-400">{copy.loading}</p>
                  ) : catalog.services.length === 0 ? (
                    <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                      {copy.noServices}
                    </p>
                  ) : (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {catalog.services.map((service) => {
                        const selected = selectedServiceIds.includes(service.id)
                        const serviceName = language === 'gu' ? service.name_gu : service.name_en
                        return (
                          <button
                            type="button"
                            key={service.id}
                            aria-pressed={selected}
                            onClick={() => toggleService(service.id)}
                            className={`rounded-2xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A017] ${
                              selected
                                ? 'border-[#D4A017]/70 bg-[#D4A017]/10'
                                : 'border-white/10 bg-white/[0.025] hover:border-white/25'
                            }`}
                          >
                            <span className="flex items-start justify-between gap-3">
                              <span className="font-semibold text-white">{serviceName}</span>
                              <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-xs ${selected ? 'border-[#D4A017] bg-[#D4A017] text-[#1F2937]' : 'border-white/25 text-transparent'}`}>✓</span>
                            </span>
                            <span className="mt-3 block text-sm text-slate-400">
                              {copy.durationValue(service.duration_minutes)} <span aria-hidden="true">·</span> {copy.currency}{formatPrice(service.price, language)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </fieldset>

                <fieldset>
                  <legend className="text-sm font-semibold text-white">{copy.chooseBarber}</legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      aria-pressed={preferredBarberId === 'any'}
                      onClick={() => setPreferredBarberId('any')}
                      className={`rounded-2xl border p-4 text-left transition ${preferredBarberId === 'any' ? 'border-[#D4A017]/70 bg-[#D4A017]/10' : 'border-white/10 bg-white/[0.025] hover:border-white/25'}`}
                    >
                      <span className="font-semibold">{copy.anyBarber}</span>
                      <span className="mt-1 block text-sm text-slate-400">{copy.anyBarberDescription}</span>
                    </button>
                    {availableBarbers.map((barber) => (
                      <button
                        type="button"
                        key={barber.id}
                        aria-pressed={preferredBarberId === barber.id}
                        onClick={() => setPreferredBarberId(barber.id)}
                        className={`rounded-2xl border p-4 text-left transition ${preferredBarberId === barber.id ? 'border-[#D4A017]/70 bg-[#D4A017]/10' : 'border-white/10 bg-white/[0.025] hover:border-white/25'}`}
                      >
                        <span className="font-semibold">{barber.name}</span>
                        <span className="mt-1 block text-sm text-slate-400">{copy.barberAvailable}</span>
                      </button>
                    ))}
                  </div>
                  {availableBarbers.length === 0 && (
                    <p className="mt-3 text-sm text-amber-100">{copy.noAvailableBarbers}</p>
                  )}
                </fieldset>

                {formError && <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{formError}</p>}
                <button
                  type="submit"
                  disabled={isSubmitting || isLoadingCatalog || Boolean(catalogError) || !catalog.services.length || !availableBarbers.length || !openState.canJoin}
                  className={`${primaryButtonClass} w-full sm:w-auto`}
                >
                  {isSubmitting ? copy.submitting : copy.confirmJoin}
                </button>
                {!openState.canJoin && <p className="text-sm text-amber-100">{openState.valid ? copy.onlineClosed : copy.availabilityUnknown}</p>}
              </form>
            </section>

            <aside className={`${cardClass} lg:sticky lg:top-8`}>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#D4A017]">{copy.summaryTitle}</p>
              {selectedServices.length ? (
                <ul className="mt-5 space-y-3">
                  {selectedServices.map((service) => (
                    <li key={service.id} className="flex justify-between gap-3 text-sm text-slate-300">
                      <span>{language === 'gu' ? service.name_gu : service.name_en}</span>
                      <span className="whitespace-nowrap">{copy.currency}{formatPrice(service.price, language)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 text-sm text-slate-400">{copy.noServicesSelected}</p>
              )}
              <div className="mt-5 space-y-3 border-t border-white/10 pt-5 text-sm">
                <p className="flex justify-between gap-3 text-slate-300"><span>{copy.totalDuration}</span><strong className="text-white">{copy.durationValue(totalDuration)}</strong></p>
                <p className="flex justify-between gap-3 text-slate-300"><span>{copy.totalPrice}</span><strong className="text-white">{copy.currency}{formatPrice(totalPrice, language)}</strong></p>
                <p className="flex justify-between gap-3 text-slate-300"><span>{copy.barberPreference}</span><strong className="text-right text-white">{preferredBarberId === 'any' ? copy.anyBarber : availableBarbers.find((barber) => barber.id === preferredBarberId)?.name ?? copy.notSelected}</strong></p>
              </div>
            </aside>
          </div>
        ) : (
          <HomePage
            copy={copy}
            language={language}
            openState={openState}
            navigate={navigate}
            catalog={catalog}
            isLoading={isLoadingCatalog}
            error={catalogError}
            settingsError={settingsErrorMessage}
            onRetry={refreshCatalog}
          />
        )}
      </div>
    </main>
  )
}

function HomePage({ copy, language, openState, navigate, catalog, isLoading, error, settingsError, onRetry }) {
  const [queueSummary, setQueueSummary] = useState(null)
  const [isLoadingQueueSummary, setIsLoadingQueueSummary] = useState(true)
  const [queueSummaryError, setQueueSummaryError] = useState(false)
  const [queueSummaryRefresh, setQueueSummaryRefresh] = useState(0)
  const queueBarbers = catalog.barbers
  const openingTime = formatSalonTime(catalog.settings?.opening_time, language)
  const closingTime = formatSalonTime(catalog.settings?.closing_time, language)

  useEffect(() => {
    let active = true
    let requestInFlight = false

    async function refreshQueueSummary() {
      if (requestInFlight) return
      requestInFlight = true
      try {
        const summary = await loadHomeQueueSummary()
        if (active) {
          setQueueSummary(summary)
          setQueueSummaryError(false)
        }
      } catch {
        if (active) setQueueSummaryError(true)
      } finally {
        requestInFlight = false
        if (active) setIsLoadingQueueSummary(false)
      }
    }

    void refreshQueueSummary()
    const timer = window.setInterval(() => void refreshQueueSummary(), 5000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [queueSummaryRefresh])

  function retryQueueSummary() {
    setIsLoadingQueueSummary(true)
    setQueueSummaryRefresh((current) => current + 1)
  }

  return (
    <div className="space-y-6">
      <section className={`${cardClass} overflow-hidden`}>
        <div className="grid gap-8 md:grid-cols-[1.3fr_0.7fr] md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A017]">{copy.homeEyebrow}</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">{copy.homeTitle}</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">{copy.homeDescription}</p>
            <button type="button" onClick={() => navigate('/join')} disabled={!openState.canJoin} className={`${primaryButtonClass} mt-7`}>
              {copy.joinQueue}
            </button>
            {!openState.canJoin && <p className="mt-3 text-sm text-amber-100">{openState.valid ? copy.onlineClosed : copy.availabilityUnknown}</p>}
          </div>
          <div className="rounded-3xl border border-[#D4A017]/25 bg-[#D4A017]/[0.07] p-6">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${openState.isOpen ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200' : 'border-white/15 bg-white/5 text-slate-300'}`}>
              <span className={`size-2 rounded-full ${openState.isOpen ? 'bg-emerald-300' : 'bg-slate-400'}`} />
              {!openState.valid
                ? copy.availabilityUnknown
                : openState.isOpen
                  ? copy.openNow
                  : copy.closedNow}
            </span>
            <p className="mt-5 text-sm font-medium text-slate-300">{copy.openingHours}</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {openingTime && closingTime ? `${openingTime} – ${closingTime}` : copy.availabilityUnknown}
            </p>
            <p className="mt-2 text-sm text-slate-400">{copy.onlineCloseNote}</p>
          </div>
        </div>
      </section>

      <LoadingError error={error || settingsError} onRetry={onRetry} copy={copy} />

      <section className={cardClass}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#D4A017]">
              {copy.homeQueueSummaryTitle}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{copy.homeQueueSummaryHeading}</h2>
          </div>
          {queueSummaryError && (
            <button type="button" onClick={retryQueueSummary} className={secondaryButtonClass}>
              {copy.retry}
            </button>
          )}
        </div>
        {queueSummaryError && (
          <p role="alert" className="mt-4 rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {copy.homeQueueSummaryError}
          </p>
        )}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <p className="text-sm text-slate-400">{copy.waitingCustomers}</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {isLoadingQueueSummary && !queueSummary
                ? copy.loading
                : queueSummary
                  ? queueSummary.waitingCustomerCount === 0
                    ? copy.noCustomersWaiting
                    : copy.waitingCount(queueSummary.waitingCustomerCount)
                  : copy.queueCountUnavailable}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <p className="text-sm text-slate-400">{copy.estimatedWait}</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {isLoadingQueueSummary && !queueSummary
                ? copy.loading
                : queueSummary?.estimatedWaitMinutes === null
                  ? copy.waitUnavailable
                  : queueSummary
                    ? copy.durationValue(Number(queueSummary.estimatedWaitMinutes.toFixed(1)))
                    : copy.waitUnavailable}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className={cardClass}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#D4A017]">{copy.servicesTitle}</p>
              <h2 className="mt-2 text-2xl font-semibold">{copy.activeServices}</h2>
            </div>
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-sm text-slate-300">{catalog.services.length}</span>
          </div>
          {isLoading ? <p className="mt-5 text-sm text-slate-400">{copy.loading}</p> : catalog.services.length ? (
            <ul className="mt-5 divide-y divide-white/10">
              {catalog.services.slice(0, 6).map((service) => (
                <li key={service.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="font-medium text-slate-100">{language === 'gu' ? service.name_gu : service.name_en}</span>
                  <span className="whitespace-nowrap text-sm text-slate-400">{copy.durationValue(service.duration_minutes)} · {copy.currency}{formatPrice(service.price, language)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-5 text-sm text-slate-400">{copy.noServices}</p>}
        </section>

        <section className={cardClass}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#D4A017]">{copy.barbersTitle}</p>
              <h2 className="mt-2 text-2xl font-semibold">{copy.barberAvailability}</h2>
            </div>
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-sm text-slate-300">{queueBarbers.length}</span>
          </div>
          {isLoading ? <p className="mt-5 text-sm text-slate-400">{copy.loading}</p> : queueBarbers.length ? (
            <ul className="mt-5 space-y-3">
              {queueBarbers.map((barber) => (
                <li key={barber.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3">
                  {barber.photo_url ? (
                    <img src={barber.photo_url} alt="" className="size-11 rounded-xl object-cover" />
                  ) : (
                    <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-xl bg-[#D4A017]/10 font-semibold text-[#D4A017]">{barber.name.slice(0, 1)}</span>
                  )}
                  <span className="min-w-0 flex-1 truncate font-medium">{barber.name}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    !barber.is_on_duty
                      ? 'bg-white/[0.06] text-slate-400'
                      : barber.is_on_break
                        ? 'bg-amber-300/10 text-amber-100'
                        : 'bg-emerald-300/10 text-emerald-200'
                  }`}>
                    {!barber.is_on_duty
                      ? copy.barberOffDuty
                      : barber.is_on_break
                        ? copy.barberOnBreak
                        : copy.barberAvailable}
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-5 text-sm text-slate-400">{copy.noBarbersOnDuty}</p>}
        </section>
      </div>
    </div>
  )
}

export default App
