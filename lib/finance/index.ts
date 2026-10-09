/**
 * lib/finance/index.ts
 *
 * Public API surface for the CRAVE Finance module.
 * Import from here rather than from individual files.
 *
 * Usage:
 *   import { calculateOrderPrice, Money, buildOrderConfirmedJournal } from '@/lib/finance'
 */

export { Money, rupees, paise, sumMoney, PAISE_PER_RUPEE } from './money'
export type { RoundingMode } from './money'

export {
  calculateTaxBreakdown,
  resolveTaxSplitPaise,
  calculateRestaurantServiceGst,
  calculatePlatformServiceGst,
  calculateCommissionGst,
  calculateGroceryItemGst,
  getTaxRate,
  verifyTaxInclusiveExample,
} from './tax-engine'
export type { TaxBreakdown, TaxMode, PriceTaxMode, TaxCategory, ItemTaxResult } from './tax-engine'

export { calculateOrderPrice, tolegacyCalculatorResult } from './pricing-engine'
export type {
  CanonicalPriceResult,
  OrderPriceInput,
  PricingItem,
  CommercialContractInput,
  SurchargeConfig,
  DeliveryConfig,
  ItemPriceResult,
  CommercialModel,
  CommissionBasis,
  GstStatus,
  OrderType,
  FundingSource,
} from './pricing-engine'

export {
  validateJournalBalance,
  buildOrderConfirmedJournal,
  buildVendorSettlementJournal,
  buildRiderSettlementJournal,
  buildRefundInitiatedJournal,
  persistJournalTransaction,
  CHART_OF_ACCOUNTS,
} from './ledger-service'
export type {
  AccountCode,
  NormalBalance,
  AccountType,
  JournalLine,
  JournalTransaction,
  JournalEventType,
} from './ledger-service'
