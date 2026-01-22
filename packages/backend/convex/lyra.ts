import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";

import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const NA = "–";

const InsurancePlanReportSchema = z.object({
  planOverview: z.object({
    planName: z.string().describe("Name of the insurance plan"),
    carrier: z.string().describe("Insurance carrier/company name"),
    planType: z.string().describe("Type of plan (e.g., PPO, HMO, EPO, POS)"),
    effectiveDate: z.string().default(NA).describe(`Plan effective date if visible, or "${NA}" if not found`),
    groupNumber: z.string().default(NA).describe(`Group number if visible, or "${NA}" if not found`),
  }),

  costSharing: z.object({
    deductible: z
      .object({
        individual: z.string().default(NA),
        family: z.string().default(NA),
        inNetwork: z.string().default(NA),
        outOfNetwork: z.string().default(NA),
      })
      .describe(`Deductible amounts. Use "${NA}" for values not found in the document`),
    outOfPocketMax: z
      .object({
        individual: z.string().default(NA),
        family: z.string().default(NA),
        inNetwork: z.string().default(NA),
        outOfNetwork: z.string().default(NA),
      })
      .describe(`Out-of-pocket maximum amounts. Use "${NA}" for values not found`),
    copays: z
      .array(
        z.object({
          service: z.string().describe("Service type (e.g., Primary Care Visit, Specialist)"),
          amount: z.string().describe("Copay amount"),
          notes: z.string().default(NA).describe(`Additional notes or conditions, or "${NA}" if none`),
        }),
      )
      .describe("Copay amounts for various services"),
    coinsurance: z
      .array(
        z.object({
          service: z.string().describe("Service type"),
          inNetwork: z.string().default(NA).describe(`In-network coinsurance percentage, or "${NA}" if not found`),
          outOfNetwork: z
            .string()
            .default(NA)
            .describe(`Out-of-network coinsurance percentage, or "${NA}" if not found`),
        }),
      )
      .describe("Coinsurance percentages"),
  }),

  coverageDetails: z
    .array(
      z.object({
        category: z.string().describe("Coverage category (e.g., Preventive Care, Emergency, Rx)"),
        items: z.array(
          z.object({
            service: z.string().describe("Specific service or benefit"),
            coverage: z.string().describe("Coverage description"),
            limitations: z.string().default(NA).describe(`Any limitations or exclusions, or "${NA}" if none`),
            priorAuth: z.boolean().default(false).describe("Whether prior authorization is required"),
          }),
        ),
      }),
    )
    .describe("Detailed coverage by category"),

  prescriptionDrug: z
    .object({
      tiers: z
        .array(
          z.object({
            tier: z.string().describe("Tier name (e.g., Tier 1 - Generic)"),
            copay: z.string().default(NA).describe(`Copay amount, or "${NA}" if not applicable`),
            coinsurance: z.string().default(NA).describe(`Coinsurance percentage, or "${NA}" if not applicable`),
          }),
        )
        .default([]),
      deductible: z.string().default(NA).describe(`Prescription drug deductible if separate, or "${NA}"`),
      mailOrder: z.string().default(NA).describe(`Mail order pharmacy benefits, or "${NA}" if not found`),
    })
    .describe("Prescription drug coverage details"),

  additionalBenefits: z
    .array(
      z.object({
        benefit: z.string().describe("Benefit name"),
        details: z.string().describe("Benefit details and coverage"),
      }),
    )
    .default([])
    .describe("Additional benefits (dental, vision, wellness, etc.)"),

  importantNotes: z
    .array(z.string())
    .default([])
    .describe("Important notes, exclusions, or things the practice should be aware of"),

  extractedFields: z
    .array(
      z.object({
        fieldName: z.string().describe("Name/label of the field"),
        fieldValue: z.string().describe("Value of the field"),
        category: z.string().default("Other").describe("Category this field belongs to"),
        confidence: z.enum(["high", "medium", "low"]).describe("Confidence in extraction accuracy"),
      }),
    )
    .describe(
      "Any additional fields extracted from the document that don't fit the structured categories above",
    ),

  documentQuality: z.object({
    isReadable: z.boolean().describe("Whether the document was readable"),
    imageQuality: z.enum(["good", "fair", "poor"]).describe("Quality of the document image"),
    missingInfo: z
      .array(z.string())
      .default([])
      .describe("Information that appears to be missing or unclear"),
    suggestedActions: z
      .array(z.string())
      .default([])
      .describe("Suggested actions (e.g., request clearer copy, verify with carrier)"),
  }),
});

export type InsurancePlanReport = z.infer<typeof InsurancePlanReportSchema>;

const SYSTEM_PROMPT = `You are Lyra, an expert insurance benefit analyst for healthcare practices. Your job is to analyze insurance plan documents (PDFs, images of benefit summaries, EOBs, etc.) and extract structured benefit information.

Guidelines:
1. Extract ALL visible information from the document
2. For any values you cannot clearly read or find, use "–" (en-dash) rather than leaving empty or guessing
3. Pay special attention to:
   - Deductibles (individual vs family, in-network vs out-of-network)
   - Out-of-pocket maximums
   - Copays for different service types
   - Coinsurance percentages
   - Prior authorization requirements
   - Coverage limitations and exclusions
4. Use the "extractedFields" array for any information that doesn't fit the structured categories
5. Always note document quality issues that might affect accuracy
6. Be precise with dollar amounts and percentages - include the $ or % symbols
7. If this appears to be a partial document, note what information might be on other pages

Remember: Healthcare practices rely on this information for patient care and billing. Accuracy is critical.`;

export const analyzeDocument = internalAction({
  args: {
    analysisId: v.id("analyses"),
    documentUrl: v.string(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.lyra.updateAnalysisStatus, {
      analysisId: args.analysisId,
      status: "processing",
    });

    try {
      const isImage = args.contentType.startsWith("image/");
      const isPdf = args.contentType === "application/pdf";

      const mediaType = isImage
        ? (args.contentType as "image/png" | "image/jpeg" | "image/gif" | "image/webp")
        : isPdf
          ? ("application/pdf" as const)
          : undefined;

      if (!mediaType) {
        throw new Error(`Unsupported content type: ${args.contentType}`);
      }

      const { object: report } = await generateObject({
        model: openrouter("google/gemini-3-flash-preview", {
          reasoning: {
            effort: "high",
          },
        }),
        schema: InsurancePlanReportSchema,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze this insurance plan document and extract all benefit information into a structured format.",
              },
              {
                type: "file",
                data: new URL(args.documentUrl),
                mediaType,
              },
            ],
          },
        ],
      });

      await ctx.runMutation(internal.lyra.completeAnalysis, {
        analysisId: args.analysisId,
        report,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      await ctx.runMutation(internal.lyra.failAnalysis, {
        analysisId: args.analysisId,
        errorMessage,
      });
    }
  },
});

export const updateAnalysisStatus = internalMutation({
  args: {
    analysisId: v.id("analyses"),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("complete"),
      v.literal("error"),
    ),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis) return;

    await ctx.db.patch(args.analysisId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    await ctx.db.patch(analysis.documentId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const completeAnalysis = internalMutation({
  args: {
    analysisId: v.id("analyses"),
    report: v.any(),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis) return;

    const now = Date.now();

    await ctx.db.patch(args.analysisId, {
      status: "complete",
      report: args.report,
      updatedAt: now,
    });

    await ctx.db.patch(analysis.documentId, {
      status: "complete",
      updatedAt: now,
    });
  },
});

export const failAnalysis = internalMutation({
  args: {
    analysisId: v.id("analyses"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis) return;

    const now = Date.now();

    await ctx.db.patch(args.analysisId, {
      status: "error",
      errorMessage: args.errorMessage,
      updatedAt: now,
    });

    await ctx.db.patch(analysis.documentId, {
      status: "error",
      updatedAt: now,
    });
  },
});
