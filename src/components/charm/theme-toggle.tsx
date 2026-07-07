import { Moon, Sun } from 'lucide-react'
import { Switch } from '#/components/ui/switch'
import { useThemeContext } from '#/lib/theme-context'
import type { Theme } from '#/lib/theme-context'

/** Shared by the onboarding wizard and Settings — both call the same updateMyProfile mutation via onChange. */
export function ThemeToggle({ onChange }: { onChange?: (theme: Theme) => void }) {
  const { theme, setTheme } = useThemeContext()

  function handleChange(checked: boolean) {
    const next: Theme = checked ? 'dark' : 'light'
    setTheme(next)
    onChange?.(next)
  }

  return (
    <div className="flex items-center gap-2.5">
      <Sun className="size-4 text-[var(--charm-ink-soft)]" />
      <Switch checked={theme === 'dark'} onCheckedChange={handleChange} />
      <Moon className="size-4 text-[var(--charm-ink-soft)]" />
    </div>
  )
}
