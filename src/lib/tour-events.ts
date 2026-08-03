/**
 * A tiny event bus the real CRM emits into, so the tour can tell when a workflow genuinely
 * completed rather than guessing from the DOM.
 *
 * Some tour gates can be satisfied by watching the page — a click on a known element, text
 * appearing in a known input. Others cannot: "the deal was actually saved" is a fact the store
 * knows and the DOM only hints at, and inferring it from a modal closing would also fire when the
 * user cancels. So the store emits, and the tour listens.
 *
 * Deliberately one-directional and untyped at the call site beyond the event name: the CRM must
 * not gain a dependency on the tour, or the tour stops being something that sits on top of the
 * product. Emitting into a bus nobody is listening to is a no-op.
 */

export type TourEventName =
  | 'deal:created'
  | 'partnership:created'
  | 'idea:created'
  | 'idea:scheduled'
  | 'parse:succeeded'

type Listener = (detail?: unknown) => void

const listeners = new Map<TourEventName, Set<Listener>>()

export function emitTourEvent(name: TourEventName, detail?: unknown) {
  const set = listeners.get(name)
  if (!set) return
  // Copied before iterating: a listener that unsubscribes itself on fire — which the gate
  // resolution path does — would otherwise mutate the set mid-iteration.
  for (const fn of [...set]) fn(detail)
}

export function onTourEvent(name: TourEventName, fn: Listener) {
  const set = listeners.get(name) ?? new Set<Listener>()
  set.add(fn)
  listeners.set(name, set)
  return () => {
    set.delete(fn)
    if (set.size === 0) listeners.delete(name)
  }
}
