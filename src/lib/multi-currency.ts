/**
 * Helper za prikaz cene v več valutah (za turiste).
 *
 * Fiksni tečaji (približni, za prikazne namene):
 * - EUR -> USD: 1.08
 *
 * OPOMBA: To je samo za Prikazne namene. Računi se vedno izdajo v EUR
 * (FURS zahteva EUR kot osnovno valuto).
 */


export const CURRENCY_RATES: Record<DisplayCurrency, number> = {
  EUR: 1,
  USD: 1.08,
};

export const CURRENCY_SYMBOLS: Record<DisplayCurrency, string> = {
  EUR: "€",
  USD: "$",
};

export const CURRENCY_LABELS: Record<DisplayCurrency, string> = {
  EUR: "EUR (€)",
  USD: "USD ($)",
};

/**
 * Pretvori EUR znesek v prikazno valuto in formatira.
 */
export function formatMultiCurrency(
  eurAmount: number,
  currency: DisplayCurrency = "EUR"
): string {
  const converted = eurAmount * CURRENCY_RATES[currency];
  const symbol = CURRENCY_SYMBOLS[currency];

  if (currency === "EUR") {
    return new Intl.NumberFormat("sl-SI", {
      style: "currency",
      currency: "EUR",
    }).format(eurAmount);
  }

  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(converted);
  }

  return `${converted.toFixed(2)} ${symbol}`;
}

/**
 * Vrne sekundarni prikaz cene za turiste (npr. "≈ 7,53 kn").
 * Če je displayCurrency EUR, vrne prazen string.
 */
export function formatSecondaryCurrency(
  eurAmount: number,
  currency: DisplayCurrency = "EUR"
): string {
  if (currency === "EUR") return "";
  return `≈ ${formatMultiCurrency(eurAmount, currency)}`;
}
