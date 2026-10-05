/**
 * Database Access Layer — Barrel Export
 *
 * Single import point for all data access functions:
 *   import { findUserByEmail, listOrders, ... } from '@/lib/dal'
 */

export * from './users'
export * from './restaurants'
export * from './orders'
export * from './menu-items'
export * from './payments'
export * from './coupons'
export * from './addresses'
