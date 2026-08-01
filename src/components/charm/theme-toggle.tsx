import { Moon, Sun, SunMoon } from 'lucide-react'
import { useThemeContext } from '#/lib/theme-context'
import type { Theme, ThemePreference } from '#/lib/theme-context'
import { cn } from '#/lib/utils'

const OPTIONS: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: 'auto', label: 'Auto', icon: SunMoon },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]

/**
 * Shared by the onboarding wizard and Settings. Auto follows local time — the same day → sunset →
 * night arc the dashboard's environment runs on — and light/dark are manual overrides.
 *
 * `onChange` still receives a concrete 'light' | 'dark' even when Auto is picked, because the
 * profile column only accepts those two. Auto itself is stored per-device (see theme-context), so
 * choosing it here also saves whatever it currently resolves to, leaving other devices somewhere
 * sensible rather than stale.
 */
export function ThemeToggle({ onChange }: { onChange?: (theme: Theme) => void }) {
  const { theme, preference, setTheme } = useThemeContext()

  function handleSelect(next: ThemePreference) {
    setTheme(next)
    onChange?.(next === 'auto' ? theme : next)
  }

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className="inline-flex items-center gap-1 rounded-full bg-white/40 p-1 dark:bg-white/10"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon
        const active = preference === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => handleSelect(option.value)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition duration-150 ease-out active:scale-95',
              active
                ? 'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm'
                : 'text-[var(--charm-ink-soft)] hover:text-[var(--charm-ink)]',
            )}
          >
            <Icon className="size-3.5" />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
