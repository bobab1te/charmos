import { METRIC_WIDGET_IDS } from '#/components/dashboard/metrics-grid'

export const WIDGET_IDS = {
  ...METRIC_WIDGET_IDS,
  financeInsights: 'widget.finance-insights',
  pipeline: 'widget.pipeline',
  deadlines: 'widget.deadlines',
  ideas: 'widget.ideas',
  chart: 'widget.chart',
} as const

export const WIDGET_LABELS: Record<string, string> = {
  [METRIC_WIDGET_IDS.earnings]: 'Total earnings (year to date)',
  [METRIC_WIDGET_IDS.activeDeals]: 'Active deals',
  [METRIC_WIDGET_IDS.dueThisWeek]: 'Due this week',
  [METRIC_WIDGET_IDS.followUp]: 'Needs follow-up',
  [WIDGET_IDS.financeInsights]: 'Finance insights',
  [WIDGET_IDS.pipeline]: 'Deal Pipeline',
  [WIDGET_IDS.deadlines]: 'Upcoming Deadlines',
  [WIDGET_IDS.ideas]: 'Unassigned Ideas',
  [WIDGET_IDS.chart]: 'Monthly Earnings',
}
