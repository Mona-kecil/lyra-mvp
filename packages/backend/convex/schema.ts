import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  practices: defineTable({
    name: v.string(),
    ownerId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  practiceMembers: defineTable({
    practiceId: v.id("practices"),
    userId: v.string(),
    role: v.union(v.literal("owner"), v.literal("member")),
    createdAt: v.number(),
  })
    .index("by_practice", ["practiceId"])
    .index("by_user", ["userId"])
    .index("by_practice_and_user", ["practiceId", "userId"]),

  documents: defineTable({
    practiceId: v.id("practices"),
    storageId: v.id("_storage"),
    filename: v.string(),
    contentType: v.string(),
    sizeBytes: v.number(),
    status: v.union(
      v.literal("uploaded"),
      v.literal("queued"),
      v.literal("processing"),
      v.literal("complete"),
      v.literal("error"),
    ),
    uploadedBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_practice", ["practiceId"])
    .index("by_practice_and_status", ["practiceId", "status"]),

  analyses: defineTable({
    documentId: v.id("documents"),
    practiceId: v.id("practices"),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("complete"),
      v.literal("error"),
    ),
    report: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_document", ["documentId"])
    .index("by_practice", ["practiceId"]),
});
