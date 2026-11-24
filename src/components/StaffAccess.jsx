import { useRef, useState } from 'react'

const cardClass = 'rounded-3xl border border-white/10 bg-slate-950/35 p-5 shadow-xl shadow-black/10 sm:p-7'
const fieldClass = 'mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/50 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/20'
const primaryButtonClass = 'inline-flex min-h-12 items-center justify-center rounded-full bg-[#D4A017] px-6 py-3 font-semibold text-[#1F2937] transition hover:bg-[#F4D37A] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A017]'
const secondaryButtonClass = 'inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-5 py-2.5 font-medium text-slate-100 transition hover:border-[#D4A017]/60 hover:text-[#F4D37A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A017]'

export function StaffLogin({ copy, onLogin, onHome, warning }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submissionInProgressRef = useRef(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (submissionInProgressRef.current) return
    submissionInProgressRef.current = true
    setError('')
    setIsSubmitting(true)
    try {
      await onLogin(email, password)
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      submissionInProgressRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <section className={`${cardClass} mx-auto w-full max-w-xl`}>
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A017]">{copy.staffWorkspace}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.staffLoginTitle}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">{copy.staffLoginDescription}</p>
      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-slate-200">
          {copy.email}
          <input
            type="email"
            autoComplete="username"
            className={fieldClass}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          {copy.password}
          <input
            type="password"
            autoComplete="current-password"
            className={fieldClass}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {warning && !error && (
          <p role="alert" className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
            {warning}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm leading-6 text-rose-100">
            {error}
          </p>
        )}
        <button type="submit" disabled={isSubmitting} className={`${primaryButtonClass} w-full`}>
          {isSubmitting ? copy.staffSigningIn : copy.staffSignIn}
        </button>
      </form>
      <button type="button" onClick={onHome} className={`${secondaryButtonClass} mt-5 w-full`}>
        {copy.backHome}
      </button>
    </section>
  )
}

export function StaffDashboardUnavailable({ copy, onLogout, isLoggingOut, logoutError }) {
  return (
    <section className={`${cardClass} mx-auto w-full max-w-xl`}>
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A017]">{copy.staffWorkspace}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{copy.dashboardNotImplemented}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">{copy.dashboardNotImplementedDescription}</p>
      {logoutError && <p role="alert" className="mt-5 text-sm text-rose-100">{logoutError}</p>}
      <button
        type="button"
        onClick={onLogout}
        disabled={isLoggingOut}
        className={`${primaryButtonClass} mt-7 w-full`}
      >
        {isLoggingOut ? copy.staffSigningOut : copy.staffSignOut}
      </button>
    </section>
  )
}

export function StaffAccessGate({ copy, message, onLogin }) {
  return (
    <section className={`${cardClass} mx-auto w-full max-w-xl`}>
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A017]">{copy.staffWorkspace}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{copy.staffSignInRequired}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">{message}</p>
      <button type="button" onClick={onLogin} className={`${primaryButtonClass} mt-7 w-full`}>
        {copy.staffSignIn}
      </button>
    </section>
  )
}
