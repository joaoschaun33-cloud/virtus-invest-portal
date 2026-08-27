import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import {
  approveQueuedEditorialDraft,
  enqueueEditorialDraft,
  listEditorialDrafts,
  recordQueuedEditorialPublication,
  rejectQueuedEditorialDraft,
} from "../editorialQueue";

const status = z.enum([
  "draft",
  "needs_review",
  "approved",
  "rejected",
  "published",
]);

const reviewerName = (user: { email: string | null; openId: string }) =>
  user.email?.trim() || user.openId;

export const editorialRouter = router({
  list: adminProcedure
    .input(z.object({ status: status.optional(), limit: z.number().int().min(1).max(100).default(50) }).optional())
    .query(({ input }) => listEditorialDrafts(input)),
  createBreakingDraft: adminProcedure
    .input(
      z.object({
        title: z.string().trim().min(1).max(240),
        body: z.string().trim().min(1).max(5_000),
        facts: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
        sources: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(160),
              url: z.string().url().max(2_000),
              official: z.boolean(),
              observedAt: z.string().datetime(),
            })
          )
          .min(1)
          .max(10),
      })
    )
    .mutation(({ ctx, input }) =>
      enqueueEditorialDraft({
        ...input,
        slot: "breaking",
        generationKey: `editorial:breaking:${crypto.randomUUID()}`,
        createdBy: reviewerName(ctx.user),
      })
    ),
  approve: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      approveQueuedEditorialDraft(input.id, reviewerName(ctx.user))
    ),
  reject: adminProcedure
    .input(z.object({ id: z.string().uuid(), note: z.string().trim().min(3).max(1_000) }))
    .mutation(({ ctx, input }) =>
      rejectQueuedEditorialDraft(input.id, reviewerName(ctx.user), input.note)
    ),
  recordPublication: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        channel: z.string().trim().min(1).max(80),
        url: z.string().url().max(2_000).optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      recordQueuedEditorialPublication(input.id, {
        publisher: reviewerName(ctx.user),
        channel: input.channel,
        url: input.url,
      })
    ),
});
