import { z } from 'zod';

// Negotiate endpoint body
export const NegotiateBodySchema = z.object({
  domain: z.string().optional(),
  urls: z.array(z.string().url()).optional(),
  htmlSnippets: z.array(z.object({
    url: z.string(),
    html: z.string(),
  })).optional(),
  dupRateEst: z.number().min(0).max(1).optional().default(0.1),
  freshnessNeedMs: z.number().positive().optional().default(86400000), // 1 day
  qualityTarget: z.number().min(0).max(1).optional().default(0.8),
  deadlineMs: z.number().positive().optional().default(5000),
  riskFail: z.number().min(0).max(1).optional().default(0.1),
});

export type NegotiateBody = z.infer<typeof NegotiateBodySchema>;

// Respond endpoint body
export const RespondBodySchema = z.object({
  threadId: z.string().uuid(),
  sellerOffer: z.number().positive(),
  sellerRefund: z.number().min(0).max(1),
  sla: z.object({
    latencyMaxMs: z.number().positive(),
    qualityMin: z.number().min(0).max(1),
  }),
  t: z.number().int().min(1).optional().default(1),
  T: z.number().int().min(1).optional().default(3),
});

export type RespondBody = z.infer<typeof RespondBodySchema>;

// Confirm endpoint body
export const ConfirmBodySchema = z.object({
  threadId: z.string().uuid(),
  acceptedPrice: z.number().positive(),
  idempotencyKey: z.string().optional(),
});

export type ConfirmBody = z.infer<typeof ConfirmBodySchema>;

// Crawl endpoint body
export const CrawlBodySchema = z.object({
  threadId: z.string().uuid(),
  forceFail: z.boolean().optional().default(false),
  simulatedLatencyMs: z.number().positive().optional(),
  simulatedQuality: z.number().min(0).max(1).optional(),
});

export type CrawlBody = z.infer<typeof CrawlBodySchema>;

// Refund endpoint body
export const RefundBodySchema = z.object({
  paymentId: z.string(),
  amount: z.number().positive(),
  reason: z.string(),
  idempotencyKey: z.string().optional(),
});

export type RefundBody = z.infer<typeof RefundBodySchema>;
