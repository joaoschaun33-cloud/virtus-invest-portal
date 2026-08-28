import { fetchB3IssuerIdentity } from "../server/b3ReferenceData";
import { fetchCvmIssuer } from "../server/cvmData";
import { fetchCvmFinancialStatements } from "../server/cvmFinancialData";
import { deriveFinancialMetrics } from "../server/financialMetrics";
import { getMacroBrief } from "../server/macroData";

const b3 = await fetchB3IssuerIdentity("PETR4", "STOCK");
const cvm = b3 ? await fetchCvmIssuer("PETR4", b3.cnpj) : null;
const cvmFinancials = b3
  ? await fetchCvmFinancialStatements("PETR4", b3.cnpj)
  : null;
const derivedMetrics = cvmFinancials
  ? deriveFinancialMetrics(cvmFinancials)
  : [];
const macro = await getMacroBrief();

const status = {
  b3: Boolean(b3),
  cvm: Boolean(cvm),
  cvmFinancials: Boolean(cvmFinancials?.values.totalAssets),
  cvmQuarterlyHistory: Boolean(cvmFinancials?.quarterlyHistory.length),
  derivedFinancialMetrics: derivedMetrics.length > 0,
  ibge: macro.indicators.some(
    indicator => indicator.id === "ipca12m" && indicator.source === "ibge"
  ),
  checkedAt: new Date().toISOString(),
};

console.log(JSON.stringify(status, null, 2));
if (
  !status.b3 ||
  !status.cvm ||
  !status.cvmFinancials ||
  !status.cvmQuarterlyHistory ||
  !status.derivedFinancialMetrics ||
  !status.ibge
)
  process.exitCode = 1;
