import { runCvmFinancialIngestion } from "../server/cvmFinancialIngestion";

const limit = Number(process.env.CVM_INGESTION_LIMIT ?? 25);
const result = await runCvmFinancialIngestion({ limit });
console.log(JSON.stringify(result, null, 2));
if (result.saved === 0 && result.scanned > 0) process.exitCode = 1;
