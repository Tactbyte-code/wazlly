/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * ============================================================
 *
 * Single source of truth for which currencies each payment
 * gateway can technically accept and which payment methods it
 * exposes. Used as:
 *
 *   1. The option pool for the "Supported Currencies" multi-select
 *      in Settings → Gateway Settings (admin picks a subset).
 *   2. The seed value when a provider row is first inserted.
 *   3. The one-time backfill source for legacy rows whose
 *      supported_currencies was saved as an empty array by
 *      earlier versions of the Gateway Settings form.
 *
 * This module is deliberately NOT used as a runtime fallback when
 * filtering providers by currency. If an operator has unchecked a
 * currency for a gateway, that gateway must not appear under that
 * currency in the upgrade modal.
 */

export type PaymentProviderKey =
  | "stripe"
  | "razorpay"
  | "paypal"
  | "paystack"
  | "mercadopago";

export const PROVIDER_CURRENCY_OPTIONS: Record<PaymentProviderKey, string[]> = {
  stripe: ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "SGD", "HKD", "NZD"],
  razorpay: ["INR"],
  paypal: [
    "USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "SGD", "HKD", "NZD",
    "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "ILS", "MXN", "BRL", "TWD",
    "THB", "PHP", "MYR",
  ],
  paystack: ["NGN", "GHS", "ZAR", "KES", "USD"],
  mercadopago: ["BRL", "ARS", "MXN", "CLP", "COP", "PEN", "UYU"],
};

export const PROVIDER_METHOD_OPTIONS: Record<PaymentProviderKey, string[]> = {
  stripe: ["card"],
  razorpay: ["card", "upi", "wallet", "netbanking"],
  paypal: ["paypal", "card"],
  paystack: ["card", "bank_transfer", "mobile_money", "ussd"],
  mercadopago: ["card", "pix", "boleto", "debit"],
};

export function getProviderCurrencyOptions(providerKey: string): string[] {
  return PROVIDER_CURRENCY_OPTIONS[providerKey as PaymentProviderKey] ?? [];
}

export function getProviderMethodOptions(providerKey: string): string[] {
  return PROVIDER_METHOD_OPTIONS[providerKey as PaymentProviderKey] ?? [];
}
