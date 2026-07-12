import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Button } from '#/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { ThemeToggle } from '#/components/charm/theme-toggle'
import { getCurrentUserAndProfile } from '#/server/auth'
import { updateMyProfile } from '#/server/profile'
import { cn } from '#/lib/utils'
import { SUPPORTED_CURRENCIES } from '#/lib/currencies'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async () => {
    const result = await getCurrentUserAndProfile()
    if (!result.configured) throw redirect({ to: '/setup-required' })
    if (!result.user) throw redirect({ to: '/login' })
    if (result.profile?.onboarding_completed_at) throw redirect({ to: '/dashboard' })
    return { suggestedDisplayName: result.user.suggestedDisplayName }
  },
  component: OnboardingPage,
})

type PlatformValue = 'tiktok' | 'instagram' | 'youtube'
type AudienceTier = 'nano' | 'micro' | 'mid' | 'macro'

const PLATFORMS: Array<{ value: PlatformValue; label: string }> = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
]

const AUDIENCE_TIERS: Array<{ value: AudienceTier; label: string; hint: string }> = [
  { value: 'nano', label: 'Nano', hint: 'under 10K' },
  { value: 'micro', label: 'Micro', hint: '10K–100K' },
  { value: 'mid', label: 'Mid', hint: '100K–500K' },
  { value: 'macro', label: 'Macro', hint: '500K+' },
]

const NICHES = ['Beauty', 'Fashion', 'Tech', 'Fitness', 'Food', 'Lifestyle', 'Travel', 'Gaming', 'Finance', 'Parenting']

const STEPS = ['name', 'theme', 'platforms', 'audience', 'money'] as const

function OnboardingPage() {
  const { suggestedDisplayName } = Route.useRouteContext()
  const navigate = useNavigate()

  const [stepIndex, setStepIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [displayName, setDisplayName] = useState(suggestedDisplayName ?? '')
  const [platforms, setPlatforms] = useState<Array<PlatformValue>>([])
  const [audienceTier, setAudienceTier] = useState<AudienceTier | ''>('')
  const [niche, setNiche] = useState('')
  const [nicheOther, setNicheOther] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [country, setCountry] = useState('')

  const step = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1

  function togglePlatform(value: PlatformValue) {
    setPlatforms((prev) => (prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]))
  }

  function canAdvance() {
    if (step === 'name') return displayName.trim().length > 0
    if (step === 'audience') return Boolean(audienceTier) && (niche !== 'Other' || nicheOther.trim().length > 0)
    return true
  }

  async function handleNext() {
    if (!isLastStep) {
      setStepIndex((i) => i + 1)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await updateMyProfile({
        data: {
          displayName: displayName.trim(),
          platforms,
          audienceTier: audienceTier || undefined,
          niche: (niche === 'Other' ? nicheOther.trim() : niche) || undefined,
          currency,
          country: country.trim() || undefined,
          completeOnboarding: true,
        },
      })
      navigate({ to: '/dashboard' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong saving your profile.')
      setSubmitting(false)
    }
  }

  function handleBack() {
    setStepIndex((i) => Math.max(0, i - 1))
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="charm-glass w-full max-w-lg rounded-3xl p-8">
        <div className="mb-6 flex items-center justify-center gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                i <= stepIndex ? 'bg-[var(--accent)]' : 'bg-white/40',
              )}
            />
          ))}
        </div>

        {step === 'name' && (
          <div className="flex flex-col gap-3">
            <h1 className="font-display-bold text-xl font-semibold text-[var(--charm-ink)]">What should we call you?</h1>
            <p className="text-sm text-[var(--charm-ink-soft)]">This shows up around CharmOS — you can change it later.</p>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              autoFocus
            />
          </div>
        )}

        {step === 'theme' && (
          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className="font-display-bold text-xl font-semibold text-[var(--charm-ink)]">Light or dark?</h1>
            <p className="text-sm text-[var(--charm-ink-soft)]">You can switch anytime in Settings.</p>
            <ThemeToggle />
          </div>
        )}

        {step === 'platforms' && (
          <div className="flex flex-col gap-3">
            <h1 className="font-display-bold text-xl font-semibold text-[var(--charm-ink)]">Where do you create?</h1>
            <p className="text-sm text-[var(--charm-ink-soft)]">Pick all that apply.</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => togglePlatform(p.value)}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm font-medium transition duration-150 ease-out active:scale-95',
                    platforms.includes(p.value)
                      ? 'border-transparent bg-[var(--accent)] text-[var(--accent-foreground)]'
                      : 'border-[var(--charm-ink-soft)]/30 text-[var(--charm-ink-soft)] hover:bg-white/50',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'audience' && (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="font-display-bold text-xl font-semibold text-[var(--charm-ink)]">About your audience</h1>
              <p className="text-sm text-[var(--charm-ink-soft)]">Roughly how big is your following?</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {AUDIENCE_TIERS.map((tier) => (
                <button
                  key={tier.value}
                  type="button"
                  onClick={() => setAudienceTier(tier.value)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-left transition duration-150 ease-out active:scale-[0.97]',
                    audienceTier === tier.value
                      ? 'border-transparent bg-[var(--accent)] text-[var(--accent-foreground)]'
                      : 'border-[var(--charm-ink-soft)]/30 hover:bg-white/50',
                  )}
                >
                  <p className="text-sm font-semibold">{tier.label}</p>
                  <p
                    className={cn(
                      'text-xs',
                      audienceTier === tier.value ? 'text-[var(--accent-foreground)]/80' : 'text-[var(--charm-ink-soft)]',
                    )}
                  >
                    {tier.hint}
                  </p>
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="niche">Niche</Label>
              <Select value={niche} onValueChange={setNiche}>
                <SelectTrigger id="niche">
                  <SelectValue placeholder="Pick a niche" />
                </SelectTrigger>
                <SelectContent>
                  {NICHES.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {niche === 'Other' && (
                <Input value={nicheOther} onChange={(e) => setNicheOther(e.target.value)} placeholder="Your niche" />
              )}
            </div>
          </div>
        )}

        {step === 'money' && (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="font-display-bold text-xl font-semibold text-[var(--charm-ink)]">Money basics</h1>
              <p className="text-sm text-[var(--charm-ink-soft)]">Used to format earnings across CharmOS.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. United States"
              />
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-[var(--urgency-red)]/10 px-3 py-2 text-sm text-[var(--urgency-red)]">{error}</p>
        )}

        <div className="mt-6 flex justify-between gap-2">
          <Button type="button" variant="ghost" onClick={handleBack} disabled={stepIndex === 0 || submitting}>
            Back
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={!canAdvance() || submitting}
            className="gap-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {isLastStep ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  )
}
