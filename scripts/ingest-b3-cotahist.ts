import "dotenv/config";
import { runB3CotahistIngestion } from "../server/b3Cotahist";

const requestedDate = process.argv.slice(2).find(value => value !== "--");
const referenceDate = requestedDate
  ? new Date(`${requestedDate}T12:00:00.000Z`)
  : new Date();
if (Number.isNaN(referenceDate.valueOf()))
  throw new Error("Data inválida. Use YYYY-MM-DD.");

const result = await runB3CotahistIngestion({ referenceDate });
console.log(JSON.stringify(result, null, 2));
