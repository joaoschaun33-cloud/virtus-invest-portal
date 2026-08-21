type NumericLike = string | number | null | undefined;

type TransactionRow = {
  transaction: {
    transactionType: "BUY" | "SELL";
    quantity: NumericLike;
    unitPrice: NumericLike;
    fees: NumericLike;
    transactionDate?: Date | string;
    id?: number;
  };
};

type DividendEvent<TAsset> = {
  asset: TAsset;
  dividend: {
    id: number;
    eventDate: Date | string;
    amountPerShare: NumericLike;
    kind: string;
    sourceName: string;
  };
};

export function applyWatchlistChange(
  existingAssetIds: number[],
  assetId: number,
  action: "add" | "remove"
) {
  const next = new Set(existingAssetIds);
  if (action === "add") next.add(assetId);
  else next.delete(assetId);
  return Array.from(next);
}

export function summarizePortfolioRows<
  TAsset extends { id: number; lastPrice: NumericLike },
>(rows: Array<TransactionRow & { asset: TAsset }>) {
  return summarizePortfolioPerformance(rows).positions;
}

export function summarizePortfolioPerformance<
  TAsset extends { id: number; lastPrice: NumericLike },
>(rows: Array<TransactionRow & { asset: TAsset }>) {
  const toNumber = (value: NumericLike) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };
  // A position must always be reconstructed from the oldest operation forward.
  // The UI intentionally displays transactions newest-first, so never rely on
  // the query order here.
  const chronologicalRows = [...rows].sort((left, right) => {
    const leftTime = left.transaction.transactionDate
      ? new Date(left.transaction.transactionDate).valueOf()
      : 0;
    const rightTime = right.transaction.transactionDate
      ? new Date(right.transaction.transactionDate).valueOf()
      : 0;
    return (
      leftTime - rightTime ||
      (left.transaction.id ?? 0) - (right.transaction.id ?? 0)
    );
  });
  const byAsset = new Map<
    number,
    {
      asset: TAsset;
      quantity: number;
      invested: number;
      realizedProfit: number;
    }
  >();

  for (const row of chronologicalRows) {
    const item = byAsset.get(row.asset.id) ?? {
      asset: row.asset,
      quantity: 0,
      invested: 0,
      realizedProfit: 0,
    };
    const quantity = toNumber(row.transaction.quantity);
    const gross =
      quantity * toNumber(row.transaction.unitPrice) +
      toNumber(row.transaction.fees);

    if (row.transaction.transactionType === "BUY") {
      item.quantity += quantity;
      item.invested += gross;
    } else {
      const averageCost = item.quantity > 0 ? item.invested / item.quantity : 0;
      const proceeds =
        quantity * toNumber(row.transaction.unitPrice) -
        toNumber(row.transaction.fees);
      item.realizedProfit += proceeds - averageCost * quantity;
      item.quantity -= quantity;
      item.invested -= averageCost * quantity;
    }

    byAsset.set(row.asset.id, item);
  }

  const positions = Array.from(byAsset.values())
    .filter(item => item.quantity > 0)
    .map(item => {
      const currentPrice = toNumber(item.asset.lastPrice);
      const currentValue = currentPrice * item.quantity;
      const profit = currentValue - item.invested;
      return {
        asset: item.asset,
        quantity: item.quantity,
        invested: item.invested,
        currentValue,
        profit,
        realizedProfit: item.realizedProfit,
        returnPercent: item.invested ? (profit / item.invested) * 100 : 0,
      };
    });

  return {
    positions,
    realizedProfit: Array.from(byAsset.values()).reduce(
      (total, item) => total + item.realizedProfit,
      0
    ),
  };
}

export function estimateDividendIncome<
  TAsset extends { id: number; ticker: string },
>(
  rows: Array<TransactionRow & { asset: TAsset }>,
  events: Array<DividendEvent<TAsset>>
) {
  const toNumber = (value: NumericLike) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };
  const orderedRows = [...rows].sort((left, right) => {
    const leftTime = left.transaction.transactionDate
      ? new Date(left.transaction.transactionDate).valueOf()
      : 0;
    const rightTime = right.transaction.transactionDate
      ? new Date(right.transaction.transactionDate).valueOf()
      : 0;
    return (
      leftTime - rightTime ||
      (left.transaction.id ?? 0) - (right.transaction.id ?? 0)
    );
  });

  return events
    .map(event => {
      const eventTime = new Date(event.dividend.eventDate).valueOf();
      const quantityAtEvent = orderedRows
        .filter(
          row =>
            row.asset.id === event.asset.id &&
            (!row.transaction.transactionDate ||
              new Date(row.transaction.transactionDate).valueOf() <= eventTime)
        )
        .reduce(
          (quantity, row) =>
            quantity +
            (row.transaction.transactionType === "BUY"
              ? toNumber(row.transaction.quantity)
              : -toNumber(row.transaction.quantity)),
          0
        );
      const amountPerShare = toNumber(event.dividend.amountPerShare);
      return {
        ...event,
        quantityAtEvent: Math.max(0, quantityAtEvent),
        estimatedGrossIncome: Math.max(0, quantityAtEvent) * amountPerShare,
      };
    })
    .filter(item => item.quantityAtEvent > 0)
    .sort(
      (left, right) =>
        new Date(right.dividend.eventDate).valueOf() -
        new Date(left.dividend.eventDate).valueOf()
    );
}
