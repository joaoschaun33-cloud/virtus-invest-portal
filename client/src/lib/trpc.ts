import { createTRPCReact } from "@trpc/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

/** Inferred output types for every tRPC procedure, kept in sync with the server automatically. */
export type RouterOutputs = inferRouterOutputs<AppRouter>;
