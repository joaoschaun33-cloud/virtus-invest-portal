export type PortfolioImportRow = {
  line: number;
  ticker: string;
  transactionType: "BUY" | "SELL";
  quantity: number;
  unitPrice: number;
  fees: number;
  transactionDate: string;
};

export type PortfolioImportPreview = {
  rows: PortfolioImportRow[];
  errors: Array<{ line: number; reason: string }>;
};

const normalizeHeader = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const aliases: Record<string, string[]> = {
  ticker: ["ticker", "ativo", "codigo", "papel"],
  type: ["tipo", "operacao", "movimentacao", "compra/venda", "compravenda"],
  quantity: ["quantidade", "qtd", "qtde"],
  price: ["precounitario", "preco", "valorunitario", "valor"],
  fees: ["taxas", "taxa", "corretagem", "custos"],
  date: ["data", "datadaoperacao", "dataoperacao"],
};

const findValue = (
  row: Record<string, unknown>,
  field: keyof typeof aliases
) => {
  const normalized = new Map(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])
  );
  return aliases[field]
    .map(normalizeHeader)
    .map(alias => normalized.get(alias))
    .find(value => value !== undefined && value !== null && value !== "");
};

const parseNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  let text = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/R\$/gi, "");
  if (text.includes(",")) text = text.replace(/\./g, "").replace(",", ".");
  return Number(text);
};

const parseDate = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.valueOf()))
    return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const parsed = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (!Number.isNaN(parsed.valueOf()))
      return parsed.toISOString().slice(0, 10);
  }
  const text = String(value ?? "").trim();
  const br = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : "";
};

function parseCsv(text: string) {
  const firstLine = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "";
  const delimiter =
    firstLine.split(";").length >= firstLine.split(",").length ? ";" : ",";
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  const normalized = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    if (character === '"') {
      if (quoted && normalized[index + 1] === '"') {
        field += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      record.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && normalized[index + 1] === "\n") index += 1;
      record.push(field);
      if (record.some(value => value.trim())) records.push(record);
      record = [];
      field = "";
    } else field += character;
  }
  record.push(field);
  if (record.some(value => value.trim())) records.push(record);
  const headers = records.shift() ?? [];
  return records.map(values =>
    Object.fromEntries(
      headers.map((header, index) => [header.trim(), values[index] ?? ""])
    )
  );
}

export async function parsePortfolioFile(
  file: File
): Promise<PortfolioImportPreview> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["csv", "xlsx", "xls"].includes(extension))
    throw new Error("Use um arquivo CSV, XLSX ou XLS.");
  let source: Array<Record<string, unknown>>;
  if (extension === "csv") source = parseCsv(await file.text());
  else {
    const { readSheet } = await import("read-excel-file/browser");
    const matrix = await readSheet(file);
    const headers = matrix.shift()?.map(value => String(value ?? "")) ?? [];
    source = matrix.map(values =>
      Object.fromEntries(
        headers.map((header, index) => [header, values[index] ?? ""])
      )
    );
  }
  if (!source.length) throw new Error("O arquivo está vazio.");

  const rows: PortfolioImportRow[] = [];
  const errors: PortfolioImportPreview["errors"] = [];
  source.forEach((item, index) => {
    const line = index + 2;
    const ticker = String(findValue(item, "ticker") ?? "")
      .trim()
      .toUpperCase();
    const rawType = normalizeHeader(findValue(item, "type"));
    const transactionType = ["compra", "buy", "c"].includes(rawType)
      ? "BUY"
      : ["venda", "sell", "v"].includes(rawType)
        ? "SELL"
        : null;
    const quantity = parseNumber(findValue(item, "quantity"));
    const unitPrice = parseNumber(findValue(item, "price"));
    const feesValue = findValue(item, "fees");
    const fees = feesValue === undefined ? 0 : parseNumber(feesValue);
    const transactionDate = parseDate(findValue(item, "date"));
    const reasons: string[] = [];
    if (!ticker) reasons.push("ticker ausente");
    if (!transactionType) reasons.push("tipo deve ser Compra ou Venda");
    if (!Number.isFinite(quantity) || quantity <= 0)
      reasons.push("quantidade inválida");
    if (!Number.isFinite(unitPrice) || unitPrice <= 0)
      reasons.push("preço inválido");
    if (!Number.isFinite(fees) || fees < 0) reasons.push("taxas inválidas");
    if (!transactionDate) reasons.push("data inválida");
    if (reasons.length) errors.push({ line, reason: reasons.join(", ") });
    else
      rows.push({
        line,
        ticker,
        transactionType: transactionType!,
        quantity,
        unitPrice,
        fees,
        transactionDate,
      });
  });
  return { rows, errors };
}

export async function downloadPortfolioTemplate() {
  const content =
    "Ticker;Tipo;Quantidade;Preço unitário;Taxas;Data\r\n" +
    "PETR4;Compra;100;36,20;4,90;18/08/2026\r\n";
  const blob = new Blob(["\uFEFF", content], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "modelo-importacao-carteira-virtus.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
