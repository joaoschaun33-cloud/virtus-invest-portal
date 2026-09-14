import { fetchB3IssuerIdentity } from "./b3ReferenceData";
import { fetchCvmFinancialStatementsBatch } from "./cvmFinancialData";
import {
  listCvmIngestionTargets,
  saveCvmFinancialStatements,
} from "./cvmFinancialRepository";
import { CircuitBreaker, withRetry } from "./reliability";
import { logger } from "./_core/logger";

const cvmCircuit = new CircuitBreaker("cvm.financials", 4, 60_000);

type IngestionDependencies = {
  listTargets: typeof listCvmIngestionTargets;
  identifyIssuer: typeof fetchB3IssuerIdentity;
  fetchBatch: typeof fetchCvmFinancialStatementsBatch;
  save: typeof saveCvmFinancialStatements;
};

const productionDependencies: IngestionDependencies = {
  listTargets: listCvmIngestionTargets,
  identifyIssuer: fetchB3IssuerIdentity,
  fetchBatch: fetchCvmFinancialStatementsBatch,
  save: saveCvmFinancialStatements,
};

export async function runCvmFinancialIngestion(
  options: { limit?: number } = {},
  dependencies: IngestionDependencies = productionDependencies
) {
  const targets = await dependencies.listTargets(options.limit ?? 25);
  const identified = (
    await Promise.all(
      targets.map(async asset => {
        const issuer = await withRetry(
          () => cvmCircuit.exec(() => dependencies.identifyIssuer(asset.ticker, asset.assetType)),
          { attempts: 3, baseDelayMs: 300, maxDelayMs: 3_000 }
        );
        return issuer ? { asset, issuer } : null;
      })
    )
  ).filter((item): item is NonNullable<typeof item> => item !== null);
  const statements = await withRetry(
    () =>
      cvmCircuit.exec(() =>
        dependencies.fetchBatch(
          identified.map(item => ({
            ticker: item.asset.ticker,
            cnpj: item.issuer.cnpj,
          }))
        )
      ),
    { attempts: 3, baseDelayMs: 500, maxDelayMs: 4_000 }
  );
  let saved = 0;
  const failures: string[] = [];
  for (const item of identified) {
    const statement = statements.get(item.issuer.cnpj);
    if (!statement) {
      failures.push(item.asset.ticker);
      continue;
    }
    try {
      await dependencies.save(item.asset.id, statement);
      saved += 1;
    } catch (error) {
      logger.error("cvm-ingestion-save-failed", error, {
        ticker: item.asset.ticker,
      });
      failures.push(item.asset.ticker);
    }
  }
  return {
    scanned: targets.length,
    identified: identified.length,
    saved,
    failures,
    completedAt: new Date().toISOString(),
  };
}
