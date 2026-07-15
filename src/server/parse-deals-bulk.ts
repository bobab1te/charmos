import { createServerFn } from '@tanstack/react-start'
import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'

const STAGES = ['negotiating', 'confirmed', 'live', 'completed'] as const
const COMPENSATION_TYPES = ['paid', 'gifted', 'commission'] as const

const EXTRACT_DEALS_TOOL = {
  type: 'function',
  name: 'extract_deals',
  description:
    'Extract a list of individual brand deals from pasted table/spreadsheet/list content (e.g. copied Notion rows, spreadsheet cells, or a plain list) — each distinct row or entry is a separate deal. Omit a field entirely if it is not stated for that particular deal — never guess amounts, dates, or brand names.',
  parameters: {
    type: 'object',
    properties: {
      deals: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            brandName: { type: 'string' },
            stage: {
              type: 'string',
              enum: STAGES,
              description:
                'Best guess from any status/stage text for this row (e.g. "posted"/"done" -> completed, "filming"/"shooting" -> confirmed, "live"/"posted live" -> live); omit entirely if there is no status signal at all',
            },
            compensationAmount: { type: 'number' },
            compensationCurrency: { type: 'string', description: 'ISO 4217 currency code, e.g. USD' },
            compensationType: { type: 'string', enum: COMPENSATION_TYPES },
            dueDate: {
              type: 'string',
              description: 'ISO 8601 date (YYYY-MM-DD), resolved against the reference date given in the prompt',
            },
            deliverableType: { type: 'string', description: 'e.g. "1 TikTok video", "2 Instagram Reels"' },
          },
          required: ['brandName'],
        },
      },
    },
    required: ['deals'],
  },
} as const

export interface ParsedBulkDeal {
  brandName: string | null
  stage: (typeof STAGES)[number] | null
  compensationAmount: number | null
  compensationCurrency: string | null
  compensationType: (typeof COMPENSATION_TYPES)[number] | null
  dueDate: string | null
  deliverableType: string | null
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function normalizeOne(raw: Record<string, unknown>): ParsedBulkDeal {
  const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null)
  const num = (v: unknown): number | null => (typeof v === 'number' ? v : null)
  // Reject anything that isn't strictly YYYY-MM-DD — see parse-deal.ts's dateStr for why:
  // an unvalidated AI date string flowing into a native date input just gets silently dropped.
  const dateStr = (v: unknown): string | null => {
    const s = str(v)
    return s && DATE_ONLY_PATTERN.test(s) ? s : null
  }
  // Defensive against the model not perfectly respecting the schema's enum constraint.
  function enumStr<T extends string>(v: unknown, allowed: ReadonlyArray<T>): T | null {
    const s = str(v)
    return s && (allowed as ReadonlyArray<string>).includes(s) ? (s as T) : null
  }

  return {
    brandName: str(raw.brandName),
    stage: enumStr(raw.stage, STAGES),
    compensationAmount: num(raw.compensationAmount),
    compensationCurrency: str(raw.compensationCurrency),
    compensationType: enumStr(raw.compensationType, COMPENSATION_TYPES),
    dueDate: dateStr(raw.dueDate),
    deliverableType: str(raw.deliverableType),
  }
}

export type ParseDealsBulkResult = { ok: true; deals: Array<ParsedBulkDeal> } | { ok: false; error: string }

const parseDealsBulkInput = z.object({ text: z.string().min(1) })

export const parseDealsBulkText = createServerFn({ method: 'POST' })
  .validator((input: unknown) => parseDealsBulkInput.parse(input))
  .handler(async ({ data }): Promise<ParseDealsBulkResult> => {
    if (!process.env.GEMINI_API_KEY) {
      return { ok: false, error: 'AI parsing is not configured yet (missing GEMINI_API_KEY).' }
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const today = new Date().toISOString().slice(0, 10)

    try {
      const interaction = await ai.interactions.create({
        model: 'gemini-3.5-flash',
        input: `Reference date (for resolving relative deadlines like "next Friday"): ${today}\n\nExtract every individual brand deal from this pasted content — it may be a table, spreadsheet paste, or plain list, and each row/entry describes a separate deal:\n\n${data.text}`,
        tools: [EXTRACT_DEALS_TOOL],
        generation_config: {
          tool_choice: { allowed_tools: { mode: 'any', tools: ['extract_deals'] } },
        },
      })

      const fcStep = interaction.steps?.find((s: { type: string }) => s.type === 'function_call') as
        | { type: 'function_call'; name: string; arguments: Record<string, unknown> }
        | undefined
      if (!fcStep) {
        return { ok: false, error: 'Could not extract any deals from that text.' }
      }

      const rawDeals = Array.isArray(fcStep.arguments.deals) ? fcStep.arguments.deals : []
      if (rawDeals.length === 0) {
        return { ok: false, error: 'Could not extract any deals from that text.' }
      }

      return { ok: true, deals: rawDeals.map((d) => normalizeOne(d as Record<string, unknown>)) }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { ok: false, error: `AI parsing failed: ${message}.` }
    }
  })
