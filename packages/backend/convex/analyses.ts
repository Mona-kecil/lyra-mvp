import { v } from "convex/values";
import { authComponent } from "./auth";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) throw new Error("Not authenticated");
  return user;
}

async function verifyPracticeAccess(
  ctx: QueryCtx | MutationCtx,
  practiceId: Id<"practices">,
  userId: string,
): Promise<void> {
  const membership = await ctx.db
    .query("practiceMembers")
    .withIndex("by_practice_and_user", (q) => q.eq("practiceId", practiceId).eq("userId", userId))
    .first();

  if (!membership) throw new Error("Access denied to this practice");
}

export const runLyra = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const document = await ctx.db.get(args.documentId);
    if (!document) throw new Error("Document not found");

    await verifyPracticeAccess(ctx, document.practiceId, user._id);

    const now = Date.now();

    const analysisId = await ctx.db.insert("analyses", {
      documentId: args.documentId,
      practiceId: document.practiceId,
      status: "queued",
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.documentId, {
      status: "queued",
      updatedAt: now,
    });

    const documentUrl = await ctx.storage.getUrl(document.storageId);
    if (!documentUrl) {
      throw new Error("Could not get document URL");
    }

    await ctx.scheduler.runAfter(0, internal.lyra.analyzeDocument, {
      analysisId,
      documentUrl,
      contentType: document.contentType,
    });

    return analysisId;
  },
});

export const listAnalyses = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    const document = await ctx.db.get(args.documentId);
    if (!document) return [];

    await verifyPracticeAccess(ctx, document.practiceId, user._id);

    return await ctx.db
      .query("analyses")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .order("desc")
      .collect();
  },
});

export const getAnalysis = query({
  args: { analysisId: v.id("analyses") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis) throw new Error("Analysis not found");

    await verifyPracticeAccess(ctx, analysis.practiceId, user._id);

    return analysis;
  },
});
