import { runB3IndexSeed } from "../server/b3IndexSeed";

console.log("[Seed] Starting B3 index composition seed (Ibovespa + IFIX)...");
const result = await runB3IndexSeed();
console.log("[Seed] Finished B3 index composition seed:");
console.log(JSON.stringify(result, null, 2));
