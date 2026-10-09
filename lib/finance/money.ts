/**
 * lib/finance/money.ts
 *
 * Immutable integer-paise Money value object for CRAVE.
 *
 * Rules (from docs/payment_audit.md §3.3):
 *  - ₹1 = 100 paise (stored as integer)
 *  - NEVER use binary floating-point as the authoritative monetary representation
 *  - Rounding is explicit and documented at every usage site
 *  - All inputs validated: finite, non-negative where required, within limits
 *
 * Usage:
 *   const price  = Money.fromRupees(149.50)   // => 14950 paise
 *   const tax    = price.percentCeil(5)        // 5% of ₹149.50, ceiling in paise
 *   const total  = price.add(tax)
 *   total.toRupees()   // => 157
 */

export const PAISE_PER_RUPEE = 100

/** Rounding mode when converting fractional paise to integer paise. */
export type RoundingMode = 'CEIL' | 'FLOOR' | 'ROUND'

export class Money {
  /** Integer paise value — the single authoritative representation. */
  readonly paise: number

  private constructor(paise: number) {
    if (!Number.isFinite(paise)) {
      throw new RangeError(`Money: paise must be finite, got ${paise}`)
    }
    if (!Number.isInteger(paise)) {
      throw new TypeError(`Money: paise must be integer, got ${paise}. Use Money.fromRupees() or Money.fromPaise() to round at the boundary.`)
    }
    this.paise = paise
  }

  // ─── Factory helpers ───────────────────────────────────────────────────────

  /** Create from integer paise directly. */
  static fromPaise(paise: number): Money {
    if (!Number.isFinite(paise)) throw new RangeError(`Money.fromPaise: non-finite value ${paise}`)
    return new Money(applyRounding(paise, 'ROUND'))
  }

  /**
   * Create from rupees, applying explicit rounding mode (default ROUND).
   * e.g. Money.fromRupees(149.50) => 14950 paise
   *      Money.fromRupees(149.505, 'CEIL') => 14951 paise
   */
  static fromRupees(rupees: number, mode: RoundingMode = 'ROUND'): Money {
    if (!Number.isFinite(rupees)) throw new RangeError(`Money.fromRupees: non-finite value ${rupees}`)
    const rawPaise = rupees * PAISE_PER_RUPEE
    return new Money(applyRounding(rawPaise, mode))
  }

  /** Zero rupees. */
  static zero(): Money {
    return new Money(0)
  }

  /** Create from a potentially untrusted number with clamping to zero and CEIL rounding. */
  static fromUntrustedRupees(value: unknown): Money {
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0) return new Money(0)
    return new Money(applyRounding(n * PAISE_PER_RUPEE, 'CEIL'))
  }

  // ─── Arithmetic (all return new Money, never mutate) ──────────────────────

  add(other: Money): Money {
    return new Money(this.paise + other.paise)
  }

  subtract(other: Money): Money {
    return new Money(this.paise - other.paise)
  }

  /** Clamp result to zero if subtraction would go negative. */
  subtractClamped(other: Money): Money {
    return new Money(Math.max(0, this.paise - other.paise))
  }

  /** Multiply by a scalar (e.g. quantity), rounding result. */
  multiply(scalar: number, mode: RoundingMode = 'ROUND'): Money {
    if (!Number.isFinite(scalar)) throw new RangeError(`Money.multiply: non-finite scalar ${scalar}`)
    return new Money(applyRounding(this.paise * scalar, mode))
  }

  /**
   * Apply a percentage rate and round using explicit mode.
   * percentCeil(5) => ceiling of (paise * 0.05)
   */
  percentCeil(ratePercent: number): Money {
    return new Money(Math.ceil(this.paise * ratePercent / 100))
  }

  percentFloor(ratePercent: number): Money {
    return new Money(Math.floor(this.paise * ratePercent / 100))
  }

  percentRound(ratePercent: number): Money {
    return new Money(Math.round(this.paise * ratePercent / 100))
  }

  /**
   * Divide into N parts proportionally, distributing any remainder to the first bucket.
   * Ensures sum(parts) === original.
   */
  allocate(ratios: number[]): Money[] {
    if (ratios.length === 0) throw new Error('Money.allocate: ratios must be non-empty')
    const total = ratios.reduce((a, b) => a + b, 0)
    if (total <= 0) throw new Error('Money.allocate: ratios must sum to > 0')

    const parts: number[] = ratios.map(r => Math.floor(this.paise * r / total))
    const distributed = parts.reduce((a, b) => a + b, 0)
    parts[0] += this.paise - distributed // remainder to first bucket

    return parts.map(p => new Money(p))
  }

  // ─── Comparators ──────────────────────────────────────────────────────────

  equals(other: Money): boolean { return this.paise === other.paise }
  greaterThan(other: Money): boolean { return this.paise > other.paise }
  greaterThanOrEqual(other: Money): boolean { return this.paise >= other.paise }
  lessThan(other: Money): boolean { return this.paise < other.paise }
  lessThanOrEqual(other: Money): boolean { return this.paise <= other.paise }
  isZero(): boolean { return this.paise === 0 }
  isPositive(): boolean { return this.paise > 0 }
  isNegative(): boolean { return this.paise < 0 }

  // ─── Clamp helpers ────────────────────────────────────────────────────────

  max(floor: Money): Money {
    return this.paise >= floor.paise ? this : floor
  }

  min(ceiling: Money): Money {
    return this.paise <= ceiling.paise ? this : ceiling
  }

  clamp(floor: Money, ceiling: Money): Money {
    if (this.paise < floor.paise) return floor
    if (this.paise > ceiling.paise) return ceiling
    return this
  }

  // ─── Output helpers ───────────────────────────────────────────────────────

  /** Integer rupees (floors paise). Use only for final display, never for calculations. */
  toRupees(): number {
    return Math.floor(this.paise / PAISE_PER_RUPEE)
  }

  /** Exact rupee decimal string, e.g. "149.50". Never use for arithmetic. */
  toRupeesString(): string {
    const r = this.paise / PAISE_PER_RUPEE
    return r.toFixed(2)
  }

  /** Formatted Indian rupee string "₹149.50". */
  toFormattedString(): string {
    return `₹${this.toRupeesString()}`
  }

  /** Integer paise as a plain number (for Prisma Int fields). */
  toPaise(): number {
    return this.paise
  }

  toString(): string {
    return `Money(${this.paise} paise)`
  }
}

// ─── Internal rounding helper ─────────────────────────────────────────────────

function applyRounding(value: number, mode: RoundingMode): number {
  switch (mode) {
    case 'CEIL':  return Math.ceil(value)
    case 'FLOOR': return Math.floor(value)
    case 'ROUND': return Math.round(value)
  }
}

// ─── Convenience constructors ─────────────────────────────────────────────────

/** Shorthand: Money from rupee integer (no rounding needed). */
export function rupees(n: number): Money {
  return Money.fromRupees(n, 'ROUND')
}

/** Shorthand: Money from integer paise directly. */
export function paise(n: number): Money {
  return Money.fromPaise(n)
}

/** Sum an array of Money values. */
export function sumMoney(amounts: Money[]): Money {
  return amounts.reduce((acc, m) => acc.add(m), Money.zero())
}
