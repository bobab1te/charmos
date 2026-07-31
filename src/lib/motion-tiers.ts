/**
 * The two motion tiers CharmOS uses everywhere, named so new code reuses them instead of
 * re-typing the same values. See CLAUDE.md-adjacent design notes: everyday interactions stay
 * fast and CSS-only; only genuinely important moments (drag, completing a workflow, opening a
 * major widget) get the slower, weightier spring.
 */

/** Tier 1 — everyday: buttons, tabs, dropdowns, hover/press states. Fast, CSS-only, always-on. */
export const CHARM_TIER_1_TRANSITION = 'transition duration-150 ease-out'

/** Tier 2 — signature: dragging, completing a workflow, opening a major widget, successful
 * actions. Already the exact spring WidgetCard/MetricCard use for their mount/exit — reuse this
 * constant in new code rather than retyping the literal. */
export const CHARM_TIER_2_SPRING = { type: 'spring', stiffness: 260, damping: 26 } as const
