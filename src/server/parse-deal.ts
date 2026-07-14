import { createServerFn } from '@tanstack/react-start'
import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'

const EXTRACT_DEAL_TOOL = {
  type: 'function',
  name: 'extract_deal',
  description:
    'Extract brand-deal details from a pasted email, DM, or brief. Omit any field entirely if it is not stated in the text — never guess.',
  parameters: {
    type: 'object',
    properties: {
      brandName: { type: 'string' },
      brandContactName: { type: 'string' },
      brandContactEmail: { type: 'string' },
      deliverables: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'e.g. "1 TikTok video", "2 Instagram Reels"' },
            description: { type: 'string' },
            dueDate: { type: 'string', description: 'ISO 8601 date (YYYY-MM-DD), resolved against the reference date given in the prompt' },
          },
          required: ['type'],
        },
      },
      compensationAmount: { type: 'number' },
      compensationCurrency: { type: 'string', description: 'ISO 4217 currency code, e.g. USD' },
      usageRights: { type: 'string' },
      shipment: {
        type: 'object',
        properties: {
          carrier: { type: 'string' },
          trackingNumber: { type: 'string' },
          shippedDate: { type: 'string', description: 'ISO 8601 date' },
          estimatedDelivery: { type: 'string', description: 'ISO 8601 date' },
        },
      },
      contentRequirements: {
        type: 'object',
        properties: {
          hashtags: { type: 'array', items: { type: 'string' } },
          accountsToTag: { type: 'array', items: { type: 'string' } },
          clipsToUse: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' },
        },
      },
    },
    required: [],
  },
} as const

export interface ParsedDealDeliverable {
  type: string
  description: string | null
  dueDate: string | null
}

export interface ParsedDeal {
  brandName: string | null
  brandContactName: string | null
  brandContactEmail: string | null
  deliverables: Array<ParsedDealDeliverable>
  compensationAmount: number | null
  compensationCurrency: string | null
  usageRights: string | null
  shipment: {
    carrier: string | null
    trackingNumber: string | null
    shippedDate: string | null
    estimatedDelivery: string | null
  }
  contentRequirements: {
    hashtags: Array<string>
    accountsToTag: Array<string>
    clipsToUse: Array<string>
    notes: string | null
  }
}

/** Gemini omits absent fields rather than returning null for them (unlike Anthropic's strict-schema tool use) — this backfills the same shape the rest of the app expects. */
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function normalize(raw: Record<string, unknown>): ParsedDeal {
  const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null)
  const num = (v: unknown): number | null => (typeof v === 'number' ? v : null)
  const arr = (v: unknown): Array<string> => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
  // Gemini is asked for strict "YYYY-MM-DD" but nothing enforces that in its output — a
  // malformed date (wrong format, natural language) would otherwise flow straight into a
  // native date input and get silently dropped there. Reject anything non-conforming here
  // instead, so the field just comes back empty and the user fills it in manually.
  const dateStr = (v: unknown): string | null => {
    const s = str(v)
    return s && DATE_ONLY_PATTERN.test(s) ? s : null
  }

  const rawDeliverables = Array.isArray(raw.deliverables) ? raw.deliverables : []
  const rawShipment = (raw.shipment ?? {}) as Record<string, unknown>
  const rawContentRequirements = (raw.contentRequirements ?? {}) as Record<string, unknown>

  return {
    brandName: str(raw.brandName),
    brandContactName: str(raw.brandContactName),
    brandContactEmail: str(raw.brandContactEmail),
    deliverables: rawDeliverables.map((d) => {
      const item = d as Record<string, unknown>
      return {
        type: str(item.type) ?? 'Deliverable',
        description: str(item.description),
        dueDate: dateStr(item.dueDate),
      }
    }),
    compensationAmount: num(raw.compensationAmount),
    compensationCurrency: str(raw.compensationCurrency),
    usageRights: str(raw.usageRights),
    shipment: {
      carrier: str(rawShipment.carrier),
      trackingNumber: str(rawShipment.trackingNumber),
      shippedDate: dateStr(rawShipment.shippedDate),
      estimatedDelivery: dateStr(rawShipment.estimatedDelivery),
    },
    contentRequirements: {
      hashtags: arr(rawContentRequirements.hashtags),
      accountsToTag: arr(rawContentRequirements.accountsToTag),
      clipsToUse: arr(rawContentRequirements.clipsToUse),
      notes: str(rawContentRequirements.notes),
    },
  }
}

export type ParseDealResult =
  | { ok: true; deal: ParsedDeal }
  | { ok: false; error: string }

const parseDealInput = z.object({ text: z.string().min(1) })

export const parseDealText = createServerFn({ method: 'POST' })
  .validator((input: unknown) => parseDealInput.parse(input))
  .handler(async ({ data }): Promise<ParseDealResult> => {
    if (!process.env.GEMINI_API_KEY) {
      return { ok: false, error: 'AI parsing is not configured yet (missing GEMINI_API_KEY). Fill in the deal manually below.' }
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const today = new Date().toISOString().slice(0, 10)

    try {
      const interaction = await ai.interactions.create({
        model: 'gemini-3.5-flash',
        input: `Reference date (for resolving relative deadlines like "next Friday"): ${today}\n\nExtract the brand deal details from this text:\n\n${data.text}`,
        tools: [EXTRACT_DEAL_TOOL],
        generation_config: {
          tool_choice: { allowed_tools: { mode: 'any', tools: ['extract_deal'] } },
        },
      })

      const fcStep = interaction.steps?.find((s: { type: string }) => s.type === 'function_call') as
        | { type: 'function_call'; name: string; arguments: Record<string, unknown> }
        | undefined
      if (!fcStep) {
        return { ok: false, error: 'Could not extract any fields from that text. Fill in the deal manually below.' }
      }

      return { ok: true, deal: normalize(fcStep.arguments) }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { ok: false, error: `AI parsing failed: ${message}. Fill in the deal manually below.` }
    }
  })
