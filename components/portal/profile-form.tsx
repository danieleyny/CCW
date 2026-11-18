"use client"

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Camera,
  Check,
  Database,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  ListChecks,
  LockKeyhole,
  LogOut,
  Mail,
  Phone,
  User,
} from "lucide-react"
import { signOut } from "@/app/auth/actions"
import { updateProfile, changePassword, type ProfileState } from "@/app/portal/profile/actions"
import { Button } from "@/components/ui/button"
import { LocaleSwitcher } from "@/components/shared/locale-switcher"
import { usePortalI18n, interpolate } from "@/components/shared/portal-i18n-provider"
import { ProfilePhotoPicker } from "@/components/portal/profile-photo-picker"
import { usePortalUserAvatar } from "@/components/portal/portal-user-avatar-provider"
import { UserAvatar } from "@/components/shared/user-avatar"

type SequencedProfileState = ProfileState & { submissionId: number }

const initialState: SequencedProfileState = { submissionId: 0 }

async function updateProfileWithSequence(
  previous: SequencedProfileState,
  formData: FormData
): Promise<SequencedProfileState> {
  const result = await updateProfile(previous, formData)
  return { ...result, submissionId: previous.submissionId + 1 }
}

async function changePasswordWithSequence(
  previous: SequencedProfileState,
  formData: FormData
): Promise<SequencedProfileState> {
  const result = await changePassword(previous, formData)
  return { ...result, submissionId: previous.submissionId + 1 }
}

function TimedSuccess({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 3000)
    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null
  return (
    <p className="profile-success" role="status">
      <Check aria-hidden />
      {children}
    </p>
  )
}

export function ProfileForms({
  fullName,
  email,
  phone,
  serviceMode,
  memberSince,
}: {
  fullName: string
  email: string
  phone: string
  serviceMode: "concierge" | "self_guided" | null
  memberSince: string | null
}) {
  const { locale, messages } = usePortalI18n()
  const portalUser = usePortalUserAvatar()
  const avatarButton = useRef<HTMLButtonElement>(null)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [photoSession, setPhotoSession] = useState(0)
  const t = messages.ui
  const plan = serviceMode === "concierge"
    ? t.fullConcierge
    : serviceMode === "self_guided"
      ? t.selfGuided
      : null
  const memberDate = memberSince
    ? new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
        month: "short",
        year: "numeric",
        timeZone: "America/New_York",
      }).format(new Date(memberSince))
    : null

  function openPhotoPicker() {
    setPhotoSession((session) => session + 1)
    setPhotoOpen(true)
  }

  function changePhotoOpen(nextOpen: boolean) {
    setPhotoOpen(nextOpen)
    if (!nextOpen) window.requestAnimationFrame(() => avatarButton.current?.focus())
  }

  return (
    <div className="profile-v2-stack">
      <section className="profile-identity-card" aria-label={t.profileIdentityLabel}>
        <button
          ref={avatarButton}
          type="button"
          className="profile-avatar-button"
          aria-label="Change profile photo"
          onClick={openPhotoPicker}
        >
          <UserAvatar
            name={fullName}
            avatar={portalUser?.avatar ?? { kind: null, key: null, path: null, url: null }}
            className="profile-avatar"
          />
          <span className="profile-avatar-camera" aria-hidden><Camera /></span>
        </button>
        <div className="profile-identity-copy">
          <h2>{fullName}</h2>
          <p>{email}</p>
          <button type="button" className="profile-change-photo" onClick={openPhotoPicker}>
            Change photo
          </button>
          {(plan || memberDate) && (
            <div className="profile-identity-chips">
              {plan && (
                <span>
                  <IdCard aria-hidden />
                  {plan}
                </span>
              )}
              {memberDate && (
                <span>
                  <Check aria-hidden />
                  {interpolate(t.memberSince, { date: memberDate })}
                </span>
              )}
            </div>
          )}
        </div>
      </section>
      <ProfilePhotoPicker key={photoSession} open={photoOpen} onOpenChange={changePhotoOpen} />

      <div className="profile-forms-grid">
        <ContactCard fullName={fullName} email={email} phone={phone} />
        <PasswordCard />
      </div>

      <Link href="/portal/details" className="profile-details-pointer">
        <span className="profile-details-icon" aria-hidden>
          <ListChecks />
        </span>
        <span>
          <strong>{t.applicationDetailsTitle}</strong>
          <small>{t.applicationDetailsDescription}</small>
        </span>
        <ArrowRight className="profile-details-arrow" aria-hidden />
      </Link>

      <section aria-labelledby="profile-shortcuts-title">
        <h2 id="profile-shortcuts-title" className="profile-shortcuts-heading">
          {t.shortcuts}
        </h2>
        <div className="profile-shortcuts-grid">
          <ProfileShortcut
            href="/portal/details"
            icon={<IdCard />}
            title={t.yourDetailsShortcut}
            description={t.yourDetailsShortcutDescription}
          />
          <ProfileShortcut
            href="/portal/privacy"
            icon={<Database />}
            title={t.yourDataShortcut}
            description={t.yourDataShortcutDescription}
          />
          <LocaleSwitcher
            current={locale}
            label={t.languageShortcut}
            variant="tile"
          />
          <form action={signOut} className="profile-shortcut-form">
            <button type="submit" className="profile-shortcut profile-signout-shortcut">
              <span className="profile-shortcut-icon" aria-hidden>
                <LogOut />
              </span>
              <span className="profile-shortcut-copy">
                <strong>{messages.common.signOut}</strong>
                <small>{t.signOutShortcutDescription}</small>
              </span>
              <ArrowRight aria-hidden />
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}

function ProfileShortcut({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <Link href={href} className="profile-shortcut">
      <span className="profile-shortcut-icon" aria-hidden>
        {icon}
      </span>
      <span className="profile-shortcut-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <ArrowRight aria-hidden />
    </Link>
  )
}

function CardHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <header className="profile-card-header">
      <span className="profile-card-icon" aria-hidden>
        {icon}
      </span>
      <span>
        <h2>{title}</h2>
        <p>{description}</p>
      </span>
    </header>
  )
}

function ContactCard({ fullName, email, phone }: { fullName: string; email: string; phone: string }) {
  const [state, formAction, pending] = useActionState<SequencedProfileState, FormData>(
    updateProfileWithSequence,
    initialState
  )
  const { messages } = usePortalI18n()
  const t = messages.ui

  return (
    <article className="profile-form-card">
      <CardHeader icon={<User />} title={t.yourAccount} description={t.yourAccountDescription} />
      <form action={formAction} className="profile-form-body">
        <ProfileField label={t.fullName} htmlFor="fullName" icon={<User />}>
          <input id="fullName" name="fullName" defaultValue={fullName} required />
        </ProfileField>
        <ProfileField label={t.phone} htmlFor="phone" icon={<Phone />}>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={phone}
            placeholder="(212) 555-0100"
          />
        </ProfileField>
        <ProfileField
          label={t.email}
          htmlFor="email"
          icon={<Mail />}
          tag={
            <span className="profile-email-tag">
              <LockKeyhole aria-hidden />
              {t.signInEmail}
            </span>
          }
          hint={t.signInEmailHelp}
          readOnly
        >
          <input id="email" value={email} readOnly aria-readonly="true" />
        </ProfileField>

        {state.error && (
          <p className="profile-error" role="alert">
            {state.error}
          </p>
        )}

        <footer className="profile-form-footer">
          <div aria-live="polite">
            {state.ok && <TimedSuccess key={state.submissionId}>{t.saved}</TimedSuccess>}
          </div>
          <Button type="submit" disabled={pending} className="profile-submit-button">
            {pending ? t.saving : t.saveChanges}
          </Button>
        </footer>
      </form>
    </article>
  )
}

function ProfileField({
  label,
  htmlFor,
  icon,
  tag,
  hint,
  readOnly = false,
  children,
}: {
  label: string
  htmlFor: string
  icon: ReactNode
  tag?: ReactNode
  hint?: string
  readOnly?: boolean
  children: ReactNode
}) {
  return (
    <div className="profile-field">
      <div className="profile-field-label-row">
        <label htmlFor={htmlFor}>{label}</label>
        {tag}
      </div>
      <div className={`profile-input-wrap${readOnly ? " is-readonly" : ""}`}>
        <span aria-hidden>{icon}</span>
        {children}
      </div>
      {hint && <p className="profile-field-hint">{hint}</p>}
    </div>
  )
}

function PasswordCard() {
  const [state, formAction, pending] = useActionState<SequencedProfileState, FormData>(
    changePasswordWithSequence,
    initialState
  )
  const { messages } = usePortalI18n()
  const t = messages.ui

  return (
    <article className="profile-form-card">
      <CardHeader icon={<KeyRound />} title={t.password} description={t.passwordDescription} />
      <form action={formAction} className="profile-form-body">
        <PasswordInputs key={state.ok ? `success-${state.submissionId}` : "editing"} />

        {state.error && (
          <p className="profile-error" role="alert">
            {state.error}
          </p>
        )}

        <footer className="profile-form-footer profile-password-footer">
          <div aria-live="polite">
            {state.ok && <TimedSuccess key={state.submissionId}>{t.passwordUpdated}</TimedSuccess>}
          </div>
          <Button type="submit" disabled={pending} className="profile-submit-button">
            {pending ? t.updating : t.updatePassword}
          </Button>
        </footer>
      </form>
    </article>
  )
}

function PasswordInputs() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { messages } = usePortalI18n()
  const t = messages.ui
  const strength = password.length === 0
    ? 0
    : password.length < 4
      ? 1
      : password.length < 8
        ? 2
        : password.length < 12
          ? 3
          : 4
  const lengthMet = password.length >= 8
  const passwordsMatch = confirm.length > 0 && password === confirm

  return (
    <>
      <PasswordField
        id="password"
        name="password"
        label={t.newPassword}
        placeholder={t.atLeastEight}
        value={password}
        onChange={setPassword}
        shown={showPassword}
        onToggle={() => setShowPassword((current) => !current)}
        showLabel={t.showPassword}
        hideLabel={t.hidePassword}
      />
      <PasswordField
        id="confirm"
        name="confirm"
        label={t.confirmPassword}
        placeholder={t.typeItAgain}
        value={confirm}
        onChange={setConfirm}
        shown={showConfirm}
        onToggle={() => setShowConfirm((current) => !current)}
        showLabel={t.showPassword}
        hideLabel={t.hidePassword}
      />

      <div className="profile-password-checks" aria-live="polite">
        <div className="profile-strength-bar" aria-hidden>
          {[1, 2, 3, 4].map((segment) => (
            <span key={segment} data-filled={segment <= strength} />
          ))}
        </div>
        <div className="profile-check-list">
          <span data-met={lengthMet}>
            <Check aria-hidden />
            {t.passwordAtLeastEight}
          </span>
          <span data-met={passwordsMatch}>
            <Check aria-hidden />
            {t.passwordsMatch}
          </span>
        </div>
      </div>
    </>
  )
}

function PasswordField({
  id,
  name,
  label,
  placeholder,
  value,
  onChange,
  shown,
  onToggle,
  showLabel,
  hideLabel,
}: {
  id: string
  name: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  shown: boolean
  onToggle: () => void
  showLabel: string
  hideLabel: string
}) {
  return (
    <div className="profile-field">
      <div className="profile-field-label-row">
        <label htmlFor={id}>{label}</label>
      </div>
      <div className="profile-input-wrap profile-password-input">
        <span aria-hidden>
          <LockKeyhole />
        </span>
        <input
          id={id}
          name={name}
          type={shown ? "text" : "password"}
          autoComplete="new-password"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
        />
        <button
          type="button"
          className="profile-password-toggle"
          aria-pressed={shown}
          aria-label={shown ? hideLabel : showLabel}
          onClick={onToggle}
        >
          {shown ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </button>
      </div>
    </div>
  )
}
