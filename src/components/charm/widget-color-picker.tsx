import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import { WIDGET_COLOR_PALETTE } from '#/lib/widget-colors'

/**
 * Shared color-override picker for any colorable widget card (deal, idea, partnership, ...) —
 * one palette, one interaction, everywhere a card supports a custom color. Every trigger stops
 * propagation since it's always nested inside a clickable/draggable card.
 */
export function WidgetColorPicker({
  color,
  onChange,
  label = 'Change card color',
}: {
  color: string
  onChange: (color: string | null) => void
  label?: string
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          aria-label={label}
          className="size-4 shrink-0 rounded-full border border-black/15 shadow-sm transition duration-150 ease-out hover:scale-110 active:scale-95"
          style={{ background: color }}
        />
      </PopoverTrigger>
      <PopoverContent onPointerDown={(e) => e.stopPropagation()} align="end" className="w-auto p-3">
        <div className="flex flex-wrap gap-2">
          {WIDGET_COLOR_PALETTE.map((swatch) => (
            <button
              key={swatch.id}
              type="button"
              aria-label={swatch.label}
              onClick={() => onChange(swatch.value)}
              className="size-6 rounded-full border border-black/15 transition duration-150 ease-out hover:scale-110 active:scale-95"
              style={{ background: swatch.value }}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-[var(--charm-ink-soft)]">
            Custom
            <input
              type="color"
              value={color}
              onChange={(e) => onChange(e.target.value)}
              className="size-6 cursor-pointer rounded border border-black/15 bg-transparent p-0"
            />
          </label>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs font-medium text-[var(--charm-ink-soft)] underline underline-offset-2 hover:text-[var(--charm-ink)]"
          >
            Reset
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
