import { createServerFn } from '@tanstack/react-start'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] }
const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] }

const EXTRACT_DEAL_TOOL: Anthropic.Tool = {
  name: 'extract_deal',
  description:
    'Extract brand-deal details from a pasted email, DM, or brief. Use null for anything not stated in the text — never guess.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      brandName: nullableString,
      brandContactName: nullableString,
      brandContactEmail: nullableString,
      deliverables: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'e.g. "1 TikTok video", "2 Instagram Reels"' },
            description: nullableString,
            dueDate: { ...nullableString, description: 'ISO 8601 date (YYYY-MM-DD), resolved against the reference date given in the prompt' },
          },
          required: ['type', 'description', 'dueDate'],
          additionalProperties: false,
        },
      },
      compensationAmount: nullableNumber,
      compensationCurrency: { ...nullableString, description: 'ISO 4217 currency code, e.g. USD' },
      usageRights: nullableString,
      shipment: {
        type: 'object',
        properties: {
          carrier: nullableString,
          trackingNumber: nullableString,
          shippedDate: { ...nullableString, description: 'ISO 8601 date' },
          estimatedDelivery: { ...nullableString, description: 'ISO 8601 date' },
        },
        required: ['carrier', 'trackingNumber', 'shippedDate', 'estimatedDelivery'],
        additionalProperties: false,
      },
      contentRequirements: {
        type: 'object',
        properties: {
          hashtags: { type: 'array', items: { type: 'string' } },
          accountsToTag: { type: 'array', items: { type: 'string' } },
          clipsToUse: { type: 'array', items: { type: 'string' } },
          notes: nullableString,
        },
        required: ['hashtags', 'accountsToTag', 'clipsToUse', 'notes'],
        additionalProperties: false,
      },
    },
    required: [
      'brandName',
      'brandContactName',
      'brandContactEmail',
      'deliverables',
      'compensationAmount',
      'compensationCurrency',
      'usageRights',
      'shipment',
      'contentRequirements',
    ],
    additionalProperties: false,
  },
}

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

export type ParseDealResult =
  | { ok: true; deal: ParsedDeal }
  | { ok: false; error: string }

const parseDealInput = z.object({ text: z.string().min(1) })

export const parseDealText = createServerFn({ method: 'POST' })
  .validator((input: unknown) => parseDealInput.parse(input))
  .handler(async ({ data }): Promise<ParseDealResult> => {
    if (!process.env.ANTHROPIC_API_KEY) {
      return { ok: false, error: 'AI parsing is not configured yet (missing ANTHROPIC_API_KEY). Fill in the deal manually below.' }
    }

    const client = new Anthropic()
    const today = new Date().toISOString().slice(0, 10)

    try {
      const response = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 2048,
        tools: [EXTRACT_DEAL_TOOL],
        tool_choice: { type: 'tool', name: 'extract_deal' },
        messages: [
          {
            role: 'user',
            content: `Reference date (for resolving relative deadlines like "next Friday"): ${today}\n\nExtract the brand deal details from this text:\n\n${data.text}`,
          },
        ],
      })

      const toolUse = response.content.find((block) => block.type === 'tool_use')
      if (!toolUse || toolUse.type !== 'tool_use') {
        return { ok: false, error: 'Could not extract any fields from that text. Fill in the deal manually below.' }
      }

      return { ok: true, deal: toolUse.input as ParsedDeal }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { ok: false, error: `AI parsing failed: ${message}. Fill in the deal manually below.` }
    }
  })
