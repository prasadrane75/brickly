export function formatCurrency(value: number | null | undefined, maximumFractionDigits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(value);
}

export function formatSignedCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  const prefix = value >= 0 ? "+" : "-";
  return `${prefix}${formatCurrency(Math.abs(value))}`;
}

export function formatPercent(value: number | null | undefined, maximumFractionDigits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return `${value.toFixed(maximumFractionDigits)}%`;
}

export function formatDate(value: string | null | undefined, options?: Intl.DateTimeFormatOptions) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString(
    "en-US",
    options ?? { month: "short", day: "numeric", year: "numeric" }
  );
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatBlockchainHash(value: string | null | undefined, size = 6) {
  if (!value) {
    return "—";
  }

  if (value.length <= size * 2 + 2) {
    return value;
  }

  return `${value.slice(0, size + 2)}…${value.slice(-size)}`;
}

export function buildExplorerHref(
  value: string | null | undefined,
  chainId?: number | null
) {
  if (!value || !value.startsWith("0x")) {
    return null;
  }

  if (chainId === 11155111) {
    return `https://sepolia.etherscan.io/tx/${value}`;
  }

  return null;
}
