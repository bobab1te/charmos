import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Eye, Loader2, Palette } from 'lucide-react'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Button } from '#/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { ThemeToggle } from '#/components/charm/theme-toggle'
import { useWidgetVisibility } from '#/lib/use-widget-visibility'
import { WIDGET_LABELS } from '#/lib/widget-ids'
import { updateMyProfile } from '#/server/profile'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/_app/settings')({ component: SettingsPage })

type PlatformValue = 'tiktok' | 'instagram' | 'youtube'
type AudienceTier = 'nano' | 'micro' | 'mid' | 'macro'

const PLATFORMS: Array<{ value: PlatformValue; label: string }> = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
]

const AUDIENCE_TIERS: Array<{ value: AudienceTier; label: string }> = [
  { value: 'nano', label: 'Nano' },
  { value: 'micro', label: 'Micro' },
  { value: 'mid', label: 'Mid' },
  { value: 'macro', label: 'Macro' },
]

const NICHES = ['Beauty', 'Fashion', 'Tech', 'Fitness', 'Food', 'Lifestyle', 'Travel', 'Gaming', 'Finance', 'Parenting']
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD']

function SettingsPage() {
  const { profile } = Route.useRouteContext()
  const { hidden, show } = useWidgetVisibility()

  const isPresetNiche = profile.niche ? NICHES.includes(profile.niche) : false

  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [platforms, setPlatforms] = useState<Array<PlatformValue>>(profile.platforms as Array<PlatformValue>)
  const [audienceTier, setAudienceTier] = useState<AudienceTier | ''>(profile.audience_tier ?? '')
  const [niche, setNiche] = useState(profile.niche ? (isPresetNiche ? profile.niche : 'Other') : '')
  const [nicheOther, setNicheOther] = useState(profile.niche && !isPresetNiche ? profile.niche : '')
  const [currency, setCurrency] = useState(profile.currency ?? 'USD')
  const [country, setCountry] = useState(profile.country ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function togglePlatform(value: PlatformValue) {
    setPlatforms((prev) => (prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      await updateMyProfile({
        data: {
          displayName: displayName.trim() || undefined,
          platforms,
          audienceTier: audienceTier || undefined,
          niche: (niche === 'Other' ? nicheOther.trim() : niche) || undefined,
          currency,
          country: country.trim() || undefined,
        },
      })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong saving your profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative z-10 mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="font-display-bold text-2xl font-semibold text-[var(--charm-ink)]">Settings</h1>
        <p className="text-sm text-[var(--charm-ink-soft)]">Your profile, appearance, and dashboard preferences.</p>
      </div>

      <div className="charm-glass flex flex-col gap-4 rounded-2xl p-5">
        <h2 className="font-display text-sm font-semibold text-[var(--charm-ink)]">Profile</h2>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-display-name">Display name</Label>
          <Input id="settings-display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Platforms</Label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => togglePlatform(p.value)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Audience size</Label>
            <Select value={audienceTier} onValueChange={(v) => setAudienceTier(v as AudienceTier)}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a tier" />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_TIERS.map((tier) => (
                  <SelectItem key={tier.value} value={tier.value}>
                    {tier.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-niche">Niche</Label>
            <Select value={niche} onValueChange={setNiche}>
              <SelectTrigger id="settings-niche">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-country">Country</Label>
            <Input id="settings-country" value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-[var(--urgency-red)]/10 px-3 py-2 text-sm text-[var(--urgency-red)]">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="gap-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
          {saved && <span className="text-sm text-[var(--urgency-green)]">Saved.</span>}
        </div>
      </div>

      <div className="charm-glass flex items-center gap-3 rounded-2xl p-5">
        <Palette className="size-4.5 shrink-0 text-[var(--charm-ink-soft)]" />
        <div className="flex-1">
          <h2 className="font-display text-sm font-semibold text-[var(--charm-ink)]">Appearance</h2>
          <p className="text-sm text-[var(--charm-ink-soft)]">Switch between light and dark mode.</p>
        </div>
        <ThemeToggle onChange={(theme) => void updateMyProfile({ data: { theme } }).catch(() => {})} />
      </div>

      <div className="charm-glass rounded-2xl p-5">
        <h2 className="mb-3 font-display text-sm font-semibold text-[var(--charm-ink)]">Dashboard widgets</h2>
        {hidden.length === 0 ? (
          <p className="text-sm text-[var(--charm-ink-soft)]">Every widget is currently visible on the Dashboard.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {hidden.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => show(id)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-[var(--charm-ink)] transition hover:bg-white/50"
                >
                  {WIDGET_LABELS[id] ?? id}
                  <span className="flex items-center gap-1 text-xs text-[var(--charm-ink-soft)]">
                    <Eye className="size-3.5" /> Show
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
