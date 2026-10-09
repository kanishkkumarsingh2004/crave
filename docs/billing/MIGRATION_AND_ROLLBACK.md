# CRAVE Billing Engine 2.0 — Migration & Rollback Guide

---

## 1. Database Schema Migration

The double-entry ledger requires the `LedgerEntry` table and `PaymentReview` table with `@@unique([utr_ref])`:

```bash
# Push schema changes to PostgreSQL database
pnpm db:push

# Seed single ID per role demo accounts into local/Docker database
pnpm db:seed
```

---

## 2. Backward Compatibility & Rollback Procedure

- **Schema Rollback**: Historical orders preserve their `financial_snapshot` JSON column. Reverting to legacy pricing does not mutate historical order breakdowns.
- **Ledger Entries**: `LedgerEntry` table records are immutable and append-only. To roll back an erroneous entry, post a `REVERSAL` journal entry with equal and opposite debit/credit lines.
