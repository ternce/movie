/**
 * Test Factories Index
 *
 * Re-exports all test factories for convenient importing.
 * Uses named re-exports to avoid naming conflicts between factories.
 */

// ── User factory ──────────────────────────────────────────────────────
// TYPES (только типы)
export type {
  MockUser,
  CreateUserOptions,
} from './user.factory';

// VALUES (функции, константы, enums)
export {
  DEFAULT_PASSWORD,
  DEFAULT_PASSWORD_HASH,
  AgeCategory,
  UserRole,
  VerificationStatus,
  VerificationMethod,
  generateReferralCode,
  getAgeCategory,
  createMockUser,
  createAdultUser,
  createMinorUser,
  createAdminUser,
  createPartnerUser,
  createModeratorUser,
  createInactiveUser,
  createVerifiedUser,
  createReferralChain,
} from './user.factory';

export { default as userFactory } from './user.factory';

// ── Content factory ───────────────────────────────────────────────────
// TYPES
export type {
  MockContent,
  MockCategory,
  MockTag,
  MockGenre,
  MockWatchHistory,
  CreateContentOptions,
  CreateCategoryOptions as CreateContentCategoryOptions,
  CreateTagOptions,
  CreateGenreOptions,
  CreateWatchHistoryOptions,
} from './content.factory';

// VALUES (runtime)
export {
  ContentStatus,
  ContentType,
  generateSlug as generateContentSlug,
  createMockContent,
  createPublishedContent,
  createDraftContent,
  createFreeContent,
  createAdultContent,
  createChildContent,
  createSeriesContent,
  createClipContent,
  createShortContent,
  createTutorialContent,
  createMockCategory,
  createMockTag,
  createMockGenre,
  createMockWatchHistory,
  createContentWithRelations,
  categoryFactory,
  tagFactory,
  genreFactory,
  watchHistoryFactory,
} from './content.factory';

export { default as contentFactory } from './content.factory';

// ── Bonus factory ─────────────────────────────────────────────────────

// TYPES
export type {
  MockBonusTransaction,
  MockPartnerCommission as MockBonusCommission,
  MockBonusCampaign,
  MockBonusWithdrawal,
  MockUserActivityBonus,
  MockBonusRate,
  CreateBonusTransactionOptions,
  CreatePartnerCommissionOptions as CreateBonusCommissionOptions,
  CreateBonusCampaignOptions,
  CreateBonusWithdrawalOptions,
  CreateBonusRateOptions,
} from './bonus.factory';

// VALUES (runtime)
export {
  BonusTransactionType,
  BonusSource,
  createMockBonusTransaction,
  createEarnTransaction,
  createSpendTransaction,
  createAdjustmentTransaction,
  createMockBonusRate,
  createUserWithBalance,
  createTransactionHistory,
  createExpiringTransaction,
  createExpiredTransaction,
  createMockCommission as createMockBonusCommission,
  createMockCampaign,
  createMockWithdrawal as createMockBonusWithdrawal,
  createMockUserActivityBonus,
  createUserWithReferrer,
} from './bonus.factory';

export { default as bonusFactory } from './bonus.factory';

// ── Partner factory ───────────────────────────────────────────────────

// TYPES
export type {
  MockPartnerCommission,
  MockPartnerRelationship,
  MockWithdrawalRequest,
  CreateCommissionOptions as CreatePartnerCommissionOptions,
  CreateRelationshipOptions,
  CreateWithdrawalOptions as CreatePartnerWithdrawalOptions,
  CommissionStatus as PartnerCommissionStatus,
  WithdrawalStatus as PartnerWithdrawalStatus,
  TaxStatus as PartnerTaxStatus,
} from './partner.factory';

// VALUES (runtime)
export {
  COMMISSION_RATES,
  TAX_RATES,
  createMockCommission as createMockPartnerCommission,
  createPendingCommission,
  createApprovedCommission,
  createMockRelationship,
  create5LevelReferralTree,
  createMockWithdrawal as createMockPartnerWithdrawal,
  createCommissionsAtAllLevels,
  calculateExpectedCommission,
  calculateExpectedTax,
} from './partner.factory';

export { default as partnerFactory } from './partner.factory';

// ── Product factory ───────────────────────────────────────────────────

// TYPES
export type {
  MockProduct,
  MockProductCategory,
  CreateProductOptions,
  CreateCategoryOptions as CreateProductCategoryOptions,
} from './product.factory';

// VALUES (runtime)
export {
  ProductStatus,
  createMockProduct,
  createActiveProduct,
  createOutOfStockProduct,
  createInactiveProduct,
  createProductWithBonusPrice,
  createMockProductCategory,
  createCategoryHierarchy,
  createProductsForCategory,
  createProductsWithPriceRange,
} from './product.factory';

export { default as productFactory } from './product.factory';

// ── Subscription factory ──────────────────────────────────────────────
// ── Subscription factory ──────────────────────────────────────────────

// TYPES
export type {
  MockSubscriptionPlan,
  MockUserSubscription,
  MockSubscriptionAccess,
  CreatePlanOptions,
  CreateUserSubscriptionOptions,
  CreateAccessOptions,
  SubscriptionType,
  SubscriptionStatus,
} from './subscription.factory';

// VALUES (runtime)
export {
  createMockSubscriptionPlan,
  createPremiumPlan,
  createContentPlan,
  createTutorialPlan,
  createInactivePlan,
  createMockUserSubscription,
  createActiveSubscription,
  createExpiredSubscription,
  createCancelledSubscription,
  createPausedSubscription,
  createMockSubscriptionAccess,
  createSubscriptionAboutToExpire,
  calculateDaysRemaining,
} from './subscription.factory';

export { default as subscriptionFactory } from './subscription.factory';

// ── Order factory ─────────────────────────────────────────────────────
// ── Order factory ─────────────────────────────────────────────────────

// TYPES
export type {
  ShippingAddress,
  MockOrder,
  MockOrderItem,
  CartItem,
  CreateOrderOptions,
  CreateOrderItemOptions,
} from './order.factory';

// VALUES (runtime)
export {
  DEFAULT_SHIPPING_ADDRESS,
  OrderStatus,
  createMockOrder,
  createPendingOrder,
  createPaidOrder,
  createShippedOrder,
  createCancelledOrder,
  createOrderWithBonus,
  createMockOrderItem,
  createOrderItemsFromProducts,
  createOrderWithItems,
  calculateCartTotal,
  createCartData,
  createOrderHistory,
  canCancelOrder,
} from './order.factory';

export { default as orderFactory } from './order.factory';

// ── Transaction factory ───────────────────────────────────────────────
// ── Transaction factory ───────────────────────────────────────────────

// TYPES
export type {
  MockTransaction,
  CreateTransactionOptions,
  TransactionType,
  TransactionStatus,
  PaymentMethodType,
} from './transaction.factory';

// VALUES (runtime)
export {
  createMockTransaction,
  createPendingTransaction,
  createCompletedTransaction,
  createFailedTransaction,
  createRefundedTransaction,
  createSubscriptionTransaction,
  createStoreTransaction,
  createBonusPurchaseTransaction,
  createCardPaymentTransaction,
  createSbpPaymentTransaction,
  createBankTransferTransaction,
  createTransactionWithBonus,
  createFullyBonusCoveredTransaction,
} from './transaction.factory';

export { default as transactionFactory } from './transaction.factory';
