import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { marketRouter } from "./routers/market";
import { portfolioRouter } from "./routers/portfolio";
import { editorialRouter } from "./routers/editorial";

export const appRouter = router({
  system: systemRouter,
  health: publicProcedure.query(() => ({
    ok: true,
    service: "apex-financial",
  })),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(() => ({ success: true }) as const),
  }),
  market: marketRouter,
  portfolio: portfolioRouter,
  editorial: editorialRouter,
});

export type AppRouter = typeof appRouter;
