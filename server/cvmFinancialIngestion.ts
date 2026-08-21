import { fetchB3IssuerIdentity } from "./b3ReferenceData";
import { fetchCvmFinancialStatementsBatch } from "./cvmFinancialData";
import {
  listCvmIngestionTargets,
  saveCvmFinancialStatements,
} from "./cvmFinancialRepository";

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
        const issuer = await dependencies.identifyIssuer(
          asset.ticker,
          asset.assetType
        );
        return issuer ? { asset, issuer } : null;
      })
    )
  ).filter((item): item is NonNullable<typeof item> => item !== null);
  const statements = await dependencies.fetchBatch(
    identified.map(item => ({
      ticker: item.asset.ticker,
      cnpj: item.issuer.cnpj,
    }))
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
      console.error(`[CVM Ingestion] failed to save ${item.asset.ticker}`, error);
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
