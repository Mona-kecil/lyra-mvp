import { v } from "convex/values";
import { authComponent } from "./auth";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) throw new Error("Not authenticated");
  return user;
}

async function requirePracticeMembership(
  ctx: QueryCtx | MutationCtx,
  userId: string,
): Promise<Id<"practices">> {
  const membership = await ctx.db
    .query("practiceMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (!membership) throw new Error("User is not a member of any practice");
  return membership.practiceId;
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

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createDocument = mutation({
  args: {
    storageId: v.id("_storage"),
    filename: v.string(),
    contentType: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const practiceId = await requirePracticeMembership(ctx, user._id);

    const now = Date.now();
    const documentId = await ctx.db.insert("documents", {
      practiceId,
      storageId: args.storageId,
      filename: args.filename,
      contentType: args.contentType,
      sizeBytes: args.sizeBytes,
      status: "uploaded",
      uploadedBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    return documentId;
  },
});

export const listDocuments = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    const membership = await ctx.db
      .query("practiceMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!membership) return [];

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_practice", (q) => q.eq("practiceId", membership.practiceId))
      .order("desc")
      .collect();

    return await Promise.all(
      documents.map(async (doc) => ({
        ...doc,
        url: await ctx.storage.getUrl(doc.storageId),
      })),
    );
  },
});

export const getDocument = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const document = await ctx.db.get(args.documentId);
    if (!document) throw new Error("Document not found");

    await verifyPracticeAccess(ctx, document.practiceId, user._id);

    return {
      ...document,
      url: await ctx.storage.getUrl(document.storageId),
    };
  },
});

export const deleteDocument = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const document = await ctx.db.get(args.documentId);
    if (!document) throw new Error("Document not found");

    await verifyPracticeAccess(ctx, document.practiceId, user._id);

    const analyses = await ctx.db
      .query("analyses")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();

    for (const analysis of analyses) {
      await ctx.db.delete(analysis._id);
    }

    await ctx.storage.delete(document.storageId);
    await ctx.db.delete(args.documentId);
  },
});
