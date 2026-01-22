import { authComponent } from "./auth";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) throw new Error("Not authenticated");
  return user;
}

export const getOrCreatePractice = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    const existingMembership = await ctx.db
      .query("practiceMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existingMembership) {
      const practice = await ctx.db.get(existingMembership.practiceId);
      if (!practice) throw new Error("Practice not found");
      return practice;
    }

    const now = Date.now();
    const isAnonymous = user.email?.startsWith("temp-") || user.email?.startsWith("temp@");
    const practiceName = isAnonymous ? "Guest Practice" : `${user.email}'s Practice`;

    const practiceId = await ctx.db.insert("practices", {
      name: practiceName,
      ownerId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("practiceMembers", {
      practiceId,
      userId: user._id,
      role: "owner",
      createdAt: now,
    });

    const practice = await ctx.db.get(practiceId);
    return practice;
  },
});

export const getCurrentPractice = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;

    const membership = await ctx.db
      .query("practiceMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!membership) return null;

    return await ctx.db.get(membership.practiceId);
  },
});
