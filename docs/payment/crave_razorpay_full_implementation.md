# Crave --- Razorpay Gateway + Configurable Split Settlement

**Repository reviewed:** `kanishkkumarsingh2004/crave`, branch `main`,
reviewed commit
[`aaaeb7cf4ef511f0ca9cd8a58a52fd4ea614f232`](https://github.com/kanishkkumarsingh2004/crave/commit/aaaeb7cf4ef511f0ca9cd8a58a52fd4ea614f232).

**Stack:** Next.js App Router, TypeScript, Prisma, PostgreSQL, existing
Crave pricing/finance services.

> This is an implementation blueprint based on the current source
> reviewed, not a claim that changes have already been committed or
> tested against live Razorpay credentials. Enable Test Mode first.
> Razorpay Route and linked-account onboarding must be approved/enabled
> for your merchant account.

## 1. Current code assessment

Crave already has a strong starting point:

-   `POST /api/orders` computes prices server-side and persists
    `Order.financial_snapshot`.
-   `lib/finance/pricing-engine.ts` calculates the customer payable,
    restaurant payout, driver compensation, platform revenue and tax
    components in paise.
-   Existing schema models include `PaymentTransaction`, `Refund`,
    `VendorSettlement`, `DriverPayout`, `PaymentConfig` and
    `LedgerEntry`.
-   `lib/finance/payment-service.ts` centralizes payment verification
    and ledger posting.

Important gaps in the reviewed source:

1.  `app/api/webhooks/payment/route.ts` verifies signatures only when
    both secret and signature exist. Missing configuration must reject
    the request, not bypass verification.
2.  `processPaymentVerificationTx` accepts an amount in rupees and the
    shown validation rejects underpayment but does not require exact
    captured-amount equality.
3.  The schema contains legacy whole-rupee amount fields while the
    canonical snapshot is paise-based. Razorpay amounts are in paise;
    explicit exact paise fields are needed.
4.  `PaymentConfig` does not currently prove Route is enabled or that
    the restaurant/driver has an active Razorpay linked account.
5.  `processRefundTx` in the reviewed source marks a refund completed
    before confirmed provider completion and catches ledger errors. Fix
    this before enabling live refunds.

## 2. Correct payment and split architecture

Use two distinct Razorpay products:

-   **Razorpay Payment Gateway:** collect the complete customer payable
    amount once into Crave's merchant account.
-   **Razorpay Route:** transfer the restaurant's and driver's earned
    amounts to their eligible linked accounts.

The customer does not pay three different parties at checkout. Crave
collects the checkout amount and then uses Route to transfer approved
shares. A database payout record is not a real transfer.

``` text
Customer -> Razorpay Checkout -> Crave merchant account
                                  |
                                  +-> Restaurant linked account
                                  +-> Driver linked account
                                  +-> Platform remainder stays with Crave
```

Use the existing immutable `Order.financial_snapshot` as the source of
truth. Do not recalculate a historical order with today's config.

``` ts
const customerPaidPaise = snapshot.customerPayablePaise;
const restaurantDuePaise = snapshot.vendorPayableNetPaise;
const driverDuePaise = snapshot.riderPayablePaise;
const platformRemainderPaise =
  customerPaidPaise - restaurantDuePaise - driverDuePaise;

if (
  !Number.isSafeInteger(customerPaidPaise) ||
  !Number.isSafeInteger(restaurantDuePaise) ||
  !Number.isSafeInteger(driverDuePaise) ||
  customerPaidPaise <= 0 ||
  restaurantDuePaise < 0 ||
  driverDuePaise < 0 ||
  platformRemainderPaise < 0
) {
  throw new Error("Invalid snapshot; do not transfer funds");
}
```

The remainder is **not automatically profit**. It may include tax
liabilities, platform service amounts, gateway costs, discount funding
and other liabilities.

Example only:

  Allocation                                           Amount
  ------------------------------------------------- ---------
  Customer pays                                       ₹500.00
  Restaurant payable                                  ₹350.00
  Driver payable                                       ₹50.00
  Platform remainder before its liabilities/costs     ₹100.00

### What controls the shares?

Use the existing configuration/pricing pipeline:

-   Restaurant `commercial_model`, `commission_rate`, `markup_rate`,
    fixed commission/markup and `CommercialContract` determine
    restaurant economics.
-   `PaymentConfig.driver_payout_share` and the existing
    distance/surge/rain/night/tip inputs feed driver compensation.
-   Existing platform fees, tax settings, packaging, delivery, and
    discount settings feed the customer total and platform economics.
-   Razorpay code only consumes the final snapshot fields:
    `customerPayablePaise`, `vendorPayableNetPaise`,
    `riderPayablePaise`.

Do not implement a second "percentage of entire order total" formula in
the Razorpay transfer handler. Admin configuration changes apply to
newly created order snapshots; existing orders retain their original
contract and payout values.

## 3. Razorpay dashboard and environment

In the Razorpay Dashboard:

1.  Obtain Test Mode API credentials.
2.  Enable Payment Gateway.
3.  Request/enable Razorpay Route.
4.  Onboard restaurants and drivers as Route linked accounts through
    Razorpay's approved process.
5.  Configure webhook URL `https://YOUR_DOMAIN/api/webhooks/razorpay`.
6.  Subscribe to `payment.captured`, `order.paid`, `payment.failed`,
    refund events, and Route transfer events such as
    `transfer.processed`, `transfer.failed`, and `transfer.reversed`.
7.  Configure a strong webhook secret. During secret rotation, retain
    the old secret for retries of events signed with it.

Add to `.env.local` and the production secret manager:

``` dotenv
RAZORPAY_KEY_ID=rzp_test_REPLACE_ME
RAZORPAY_KEY_SECRET=REPLACE_ME
RAZORPAY_WEBHOOK_SECRET=REPLACE_ME
RAZORPAY_ENABLED=false
RAZORPAY_ROUTE_ENABLED=false
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Never expose `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET` through
`NEXT_PUBLIC_*`, client code, localStorage, logs, or `PaymentConfig`.

The current root `package.json` does not list the Razorpay SDK:

``` bash
pnpm add razorpay
pnpm add -D @types/razorpay
```

Pin the resolved version in `pnpm-lock.yaml`. Validate Route method
signatures against the exact installed SDK and enabled merchant account.

Official references: - [Create an
Order](https://razorpay.com/docs/api/orders/create/) - [Checkout
integration and signature
verification](https://razorpay.com/docs/payments/server-integration/nodejs/payment-gateway/build-integration/) -
[Webhook signature
validation](https://razorpay.com/docs/webhooks/validate-test/) -
[Razorpay Route](https://razorpay.com/route/) - [Route API
reference](https://razorpay.com/docs/api/payments/route/)

## 4. Prisma migration

The existing schema stores legacy values such as `Order.total_amount`,
`PaymentTransaction.amount`, and `Refund.amount` as whole rupees. New
gateway data must use integer paise. Keep old fields temporarily for
compatibility.

Add fields to existing models, checking first that they do not already
exist:

``` prisma
model Order {
  // Existing fields remain.
  total_amount_paise Int?
}

model PaymentTransaction {
  // Existing fields remain.
  amount_paise      Int?
  razorpay_order_id String? @unique
}

model Refund {
  // Existing fields remain.
  amount_paise Int?
}

model PaymentConfig {
  // Existing fields remain.
  razorpay_enabled           Boolean @default(false)
  razorpay_route_enabled     Boolean @default(false)
  razorpay_transfer_release  String  @default("DELIVERY_COMPLETE")
  // Allowed application values: DELIVERY_COMPLETE, ADMIN_APPROVAL.
}
```

Add server-controlled linked-account mapping:

``` prisma
model RazorpayLinkedAccount {
  id                  String   @id @default(cuid())
  entity_type         String   // RESTAURANT | DRIVER
  entity_id           String
  razorpay_account_id String   @unique
  status              String   @default("pending") // pending | active | rejected | disabled
  verified_at         DateTime? @db.Timestamptz(6)
  created_at          DateTime @default(now()) @db.Timestamptz(6)
  updated_at          DateTime @updatedAt @db.Timestamptz(6)

  @@unique([entity_type, entity_id])
  @@index([status, entity_type])
  @@map("razorpay_linked_accounts")
}
```

Add durable transfer state:

``` prisma
model RazorpayTransfer {
  id                   String   @id @default(cuid())
  order_id             String
  recipient_type       String   // RESTAURANT | DRIVER
  recipient_id         String
  linked_account_id    String
  razorpay_payment_id  String
  razorpay_transfer_id String?  @unique
  idempotency_key      String   @unique
  amount_paise         Int
  currency             String   @default("INR")
  status               String   @default("pending")
  // pending | processing | processed | failed | reversed
  failure_reason       String?
  created_at           DateTime @default(now()) @db.Timestamptz(6)
  updated_at           DateTime @updatedAt @db.Timestamptz(6)
  processed_at         DateTime? @db.Timestamptz(6)

  @@index([order_id, status])
  @@index([razorpay_payment_id])
  @@index([recipient_type, recipient_id, status])
  @@map("razorpay_transfers")
}
```

Add durable webhook receipts; do not use an in-memory set for replay
protection:

``` prisma
model WebhookEvent {
  id                String   @id @default(cuid())
  provider          String
  provider_event_id String
  event_type        String
  status            String   @default("processing") // processing | processed | failed
  payload           Json?
  attempts          Int      @default(1)
  last_error        String?
  received_at       DateTime @default(now()) @db.Timestamptz(6)
  processed_at      DateTime? @db.Timestamptz(6)

  @@unique([provider, provider_event_id])
  @@index([provider, status, received_at])
  @@map("webhook_events")
}
```

Generate and review a migration:

``` bash
pnpm exec prisma format
pnpm exec prisma validate
pnpm exec prisma migrate dev --name razorpay_route_split_payments
pnpm exec prisma generate
```

Review the SQL before deployment. Backfill `total_amount_paise` only
from a trustworthy `financial_snapshot.customerPayablePaise`; flag
missing/mismatched snapshots for reconciliation. Do not use
`prisma db push` as a production migration process.

At order creation, where the canonical snapshot is generated, persist:

``` ts
total_amount_paise: canonicalPrice.customerPayablePaise,
financial_snapshot: canonicalPrice as unknown as Prisma.InputJsonValue,
```

Use the actual variable name in `app/api/orders/route.ts`. Update
checkout validation so `payment_method: "RAZORPAY"` does not require a
manual UTR; UTR validation must apply only to the legacy manual-UTR
flow. Preserve all existing server-side ownership, price, coupon, and
inventory checks.

## 5. Server-only Razorpay client

Create `lib/payments/razorpay-client.ts`:

``` ts
import Razorpay from "razorpay";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function assertRazorpayEnabled() {
  if (process.env.RAZORPAY_ENABLED !== "true") {
    throw new Error("Razorpay payments are disabled");
  }
}

export function getRazorpayClient() {
  assertRazorpayEnabled();
  return new Razorpay({
    key_id: requiredEnv("RAZORPAY_KEY_ID"),
    key_secret: requiredEnv("RAZORPAY_KEY_SECRET"),
  });
}

export function isRouteEnabled() {
  return (
    process.env.RAZORPAY_ENABLED === "true" &&
    process.env.RAZORPAY_ROUTE_ENABLED === "true"
  );
}
```

Also check the active database `PaymentConfig` flags on relevant server
operations. Environment flags are operational kill switches; DB flags
are admin business controls. Both must permit the operation.

## 6. Create a Razorpay order

Create `app/api/payments/razorpay/order/route.ts`. This accepts only
Crave's internal order ID. The server calculates the amount from the
persisted snapshot; the client cannot supply the amount or recipient
allocations.

``` ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getRazorpayClient } from "@/lib/payments/razorpay-client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const actor = await requireAuth(request);
    const body = await request.json().catch(() => ({}));
    const orderId = typeof body.orderId === "string" ? body.orderId : "";
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.customer_id !== actor.id && actor.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (["cancelled", "delivered", "completed"].includes(order.status)) {
      return NextResponse.json({ error: "Order is not payable" }, { status: 409 });
    }
    if (order.payment_status === "verified") {
      return NextResponse.json({ error: "Order already paid" }, { status: 409 });
    }

    const snapshot = order.financial_snapshot as {
      customerPayablePaise?: number; snapshotId?: string;
    } | null;
    const amountPaise = order.total_amount_paise ?? snapshot?.customerPayablePaise;

    if (!Number.isSafeInteger(amountPaise) || !amountPaise || amountPaise < 100) {
      return NextResponse.json({ error: "Invalid canonical payable amount" }, { status: 409 });
    }
    if (
      snapshot?.customerPayablePaise != null &&
      amountPaise !== snapshot.customerPayablePaise
    ) {
      return NextResponse.json({ error: "Snapshot amount mismatch" }, { status: 409 });
    }

    // Reuse only a valid existing attempt for this exact order and amount.
    const existing = await prisma.paymentTransaction.findFirst({
      where: {
        order_id: orderId,
        gateway: "RAZORPAY",
        status: { in: ["pending", "processing"] },
        razorpay_order_id: { not: null },
        amount_paise: amountPaise,
      },
      orderBy: { created_at: "desc" },
    });
    if (existing?.razorpay_order_id) {
      return NextResponse.json({
        keyId: process.env.RAZORPAY_KEY_ID,
        razorpayOrderId: existing.razorpay_order_id,
        amount: amountPaise,
        currency: "INR",
        internalOrderId: order.id,
      });
    }

    const client = getRazorpayClient();
    const rzpOrder = await client.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `crave_${order.id}`.slice(0, 40),
      notes: {
        crave_order_id: order.id,
        snapshot_id: String(snapshot?.snapshotId ?? "").slice(0, 200),
      },
    });

    await prisma.paymentTransaction.create({
      data: {
        idempotency_key: `razorpay_order_${rzpOrder.id}`,
        order_id: order.id,
        gateway: "RAZORPAY",
        razorpay_order_id: rzpOrder.id,
        amount: Math.round(amountPaise / 100), // legacy compatibility only
        amount_paise: amountPaise,
        currency: "INR",
        status: "pending",
      } as any,
    });

    return NextResponse.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: rzpOrder.id,
      amount: amountPaise,
      currency: "INR",
      internalOrderId: order.id,
    });
  } catch (error) {
    console.error("[razorpay/order] Failed", error);
    return NextResponse.json({ error: "Unable to start payment" }, { status: 500 });
  }
}
```

Before using the sample, check the current Prisma enum and generated
client types. Add a database idempotency/payload-hash policy for
concurrent create-order requests; never assume a repeated key with a
different order body is a valid replay.

## 7. Client Checkout

Load Razorpay Checkout only after the customer selects Razorpay. The
client first calls the server create-order endpoint. The Checkout
callback only asks the server to verify; it must never set the order to
paid locally.

``` ts
type CheckoutResult = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open(): void };
  }
}

export async function startRazorpayCheckout(orderId: string) {
  const loaded = await new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
  if (!loaded || !window.Razorpay) throw new Error("Razorpay Checkout failed to load");

  const response = await fetch("/api/payments/razorpay/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  });
  const paymentOrder = await response.json();
  if (!response.ok) throw new Error(paymentOrder.error ?? "Unable to start payment");

  const checkout = new window.Razorpay({
    key: paymentOrder.keyId,
    order_id: paymentOrder.razorpayOrderId,
    amount: paymentOrder.amount,
    currency: paymentOrder.currency,
    name: "Crave",
    description: `Order ${orderId}`,
    notes: { crave_order_id: orderId },
    handler: async (result: CheckoutResult) => {
      const verify = await fetch("/api/payments/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, ...result }),
      });
      const body = await verify.json();
      if (!verify.ok) {
        // Display error and refresh server-side order status; do not assume paid.
        throw new Error(body.error ?? "Verification failed");
      }
      window.location.assign(`/user/orders/${encodeURIComponent(orderId)}`);
    },
  });
  checkout.open();
}
```

In production UI, catch callback errors and show a retry/reconciliation
message instead of allowing an unhandled promise rejection. The signed
webhook is an independent path for cases where the browser closes.

## 8. Checkout signature and provider verification

Create `app/api/payments/razorpay/verify/route.ts`. Checkout signature
formula:

`HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET)`

Then fetch the payment from Razorpay. Signature alone is not enough:
verify provider order ID, exact amount in paise, currency, and captured
status.

``` ts
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getRazorpayClient } from "@/lib/payments/razorpay-client";
import { processPaymentVerificationTx } from "@/lib/finance/payment-service";

export const runtime = "nodejs";

function signatureMatches(expectedHex: string, receivedHex: string) {
  if (!/^[a-f0-9]+$/i.test(expectedHex) || !/^[a-f0-9]+$/i.test(receivedHex)) return false;
  const a = Buffer.from(expectedHex, "hex");
  const b = Buffer.from(receivedHex, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuth(request);
    const body = await request.json();
    const orderId = String(body.orderId ?? "");
    const rzpOrderId = String(body.razorpay_order_id ?? "");
    const paymentId = String(body.razorpay_payment_id ?? "");
    const signature = String(body.razorpay_signature ?? "");
    if (!orderId || !rzpOrderId || !paymentId || !signature) {
      return NextResponse.json({ error: "Missing verification fields" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.customer_id !== actor.id && actor.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const attempt = await prisma.paymentTransaction.findFirst({
      where: { order_id: orderId, gateway: "RAZORPAY", razorpay_order_id: rzpOrderId },
    });
    if (!attempt) {
      return NextResponse.json({ error: "Payment attempt/order mismatch" }, { status: 409 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new Error("Razorpay secret missing");
    const expected = crypto.createHmac("sha256", secret)
      .update(`${rzpOrderId}|${paymentId}`).digest("hex");
    if (!signatureMatches(expected, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payment: any = await getRazorpayClient().payments.fetch(paymentId);
    const snapshot = order.financial_snapshot as { customerPayablePaise?: number } | null;
    const expectedPaise = order.total_amount_paise ?? snapshot?.customerPayablePaise;

    if (
      payment.order_id !== rzpOrderId ||
      payment.currency !== "INR" ||
      Number(payment.amount) !== expectedPaise ||
      Number(attempt.amount_paise) !== expectedPaise
    ) {
      return NextResponse.json({ error: "Payment does not match Crave order" }, { status: 409 });
    }
    if (payment.status !== "captured" || payment.captured !== true) {
      return NextResponse.json({ error: "Payment is not captured" }, { status: 409 });
    }

    // Patch payment-service first (Section 10) to enforce exact paise equality
    // inside its transaction. Keep gateway amount in paise, not a lossy rupee conversion.
    const result = await processPaymentVerificationTx({
      orderId,
      gatewayPaymentId: paymentId,
      gateway: "RAZORPAY",
      amountPaise: Number(payment.amount),
      actorId: "RAZORPAY_CHECKOUT_VERIFIED",
      idempotencyKey: `razorpay_verify_${paymentId}`,
      rawPayload: {
        id: payment.id, order_id: payment.order_id, amount: payment.amount,
        currency: payment.currency, status: payment.status, captured: payment.captured,
      },
    } as any);

    return NextResponse.json({
      success: true, orderId, paymentStatus: "verified",
      alreadyVerified: result.alreadyVerified,
    });
  } catch (error) {
    console.error("[razorpay/verify] Failed", error);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
```

**Required patch:** add `amountPaise?: number` to
`PaymentVerificationInput`; in `processPaymentVerificationTx`, load the
order snapshot and require
`input.amountPaise === order.total_amount_paise ?? snapshot.customerPayablePaise`
before any status update. Do not use a `>`/`<` underpayment-only check.
Ensure `gateway_payment_id` cannot be attached to a different order and
repeated calls return the same verified result without duplicate ledger
entries.

## 9. Dedicated Razorpay webhook

Create `app/api/webhooks/razorpay/route.ts`. Do not use the generic
webhook's permissive signature behavior. Razorpay signs the **raw
request body** using HMAC-SHA256 and the configured webhook secret.

``` ts
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processPaymentVerificationTx } from "@/lib/finance/payment-service";

export const runtime = "nodejs";

function verifyRawBody(raw: string, signature: string, secret: string) {
  if (!signature || !secret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw, "utf8").digest();
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";

  // Fail closed if secret or signature is missing.
  if (!verifyRawBody(raw, signature, secret)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(raw); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const eventId = String(event.id ?? "");
  const type = String(event.event ?? "");
  if (!eventId || !type) {
    return NextResponse.json({ error: "Missing event ID/type" }, { status: 400 });
  }

  // Implement WebhookEvent durable idempotency BEFORE production. Use a unique
  // (provider, provider_event_id) key, status transitions, retry state and audit.
  // If already processed, return 200; if in progress, return retryable 409/5xx.
  await beginWebhookEvent("RAZORPAY", eventId, type, event);

  const payment = event.payload?.payment?.entity;
  if (type === "payment.captured" || type === "order.paid") {
    const paymentId = String(payment?.id ?? "");
    const rzpOrderId = String(payment?.order_id ?? "");
    const amountPaise = Number(payment?.amount);

    if (!paymentId || !rzpOrderId || !Number.isSafeInteger(amountPaise)) {
      return NextResponse.json({ error: "Invalid payment payload" }, { status: 400 });
    }

    const attempt = await prisma.paymentTransaction.findFirst({
      where: { gateway: "RAZORPAY", razorpay_order_id: rzpOrderId },
      include: { order: true },
    });
    if (!attempt) return NextResponse.json({ error: "Unknown Razorpay order" }, { status: 500 });

    const snapshot = attempt.order.financial_snapshot as { customerPayablePaise?: number } | null;
    const expectedPaise = attempt.order.total_amount_paise ?? snapshot?.customerPayablePaise;
    if (
      amountPaise !== expectedPaise ||
      amountPaise !== attempt.amount_paise ||
      payment.currency !== "INR" ||
      (payment.status && payment.status !== "captured")
    ) {
      return NextResponse.json({ error: "Payment does not match order" }, { status: 409 });
    }

    await processPaymentVerificationTx({
      orderId: attempt.order_id,
      gatewayPaymentId: paymentId,
      gateway: "RAZORPAY",
      amountPaise,
      actorId: "RAZORPAY_WEBHOOK",
      idempotencyKey: `razorpay_event_${eventId}`,
      rawPayload: event,
    } as any);
  } else if (type === "payment.failed") {
    const rzpOrderId = String(payment?.order_id ?? "");
    if (rzpOrderId) {
      await prisma.paymentTransaction.updateMany({
        where: {
          gateway: "RAZORPAY",
          razorpay_order_id: rzpOrderId,
          status: { in: ["pending", "processing"] },
        },
        data: {
          status: "failed",
          gateway_payment_id: payment?.id ? String(payment.id) : undefined,
          failure_reason: String(payment?.error_description ?? "Payment failed"),
        } as any,
      });
    }
  } else {
    // Refund and Route transfer events need separate handlers that update only
    // their matching refund/transfer record and verify the event payload.
  }

  await markWebhookEventProcessed("RAZORPAY", eventId);
  return NextResponse.json({ received: true });
}

// These must be implemented against the WebhookEvent model in Section 4.
// They must be durable database operations, not an in-memory cache.
async function beginWebhookEvent(_provider: string, _id: string, _type: string, _payload: unknown) {
  throw new Error("Implement durable webhook receipt/idempotency before enabling this endpoint");
}
async function markWebhookEventProcessed(_provider: string, _id: string) {
  throw new Error("Implement durable webhook receipt/idempotency before enabling this endpoint");
}
```

The explicit placeholders are release blockers, not optional code.
Implement `beginWebhookEvent` and `markWebhookEventProcessed` with the
`WebhookEvent` model above, unique provider/event ID, and transactional
status transitions. Do not return 2xx until the durable state change is
complete. Handle `payment.captured` and `order.paid` idempotently
because the same payment may generate both events.

## 10. Harden the existing payment service

`lib/finance/payment-service.ts` is the right central place for the
authoritative transition, but patch it before enabling Razorpay:

1.  Add `amountPaise?: number` to `PaymentVerificationInput`.
2.  Load `Order.financial_snapshot` and validate exact paise equality
    with `total_amount_paise`.
3.  Verify the order is not cancelled and the payment transaction
    belongs to the same order/provider order ID.
4.  Use a conditional update/row lock or equivalent compare-and-set to
    prevent simultaneous webhook and browser verification from racing.
5.  Update the payment transaction, order state, vendor settlement,
    immutable ledger entries, and outbox event in the same DB
    transaction.
6.  Do not swallow ledger errors and still mark payment verified.
7.  Notifications/WebSocket broadcasts happen after commit and should be
    retried from the outbox.
8.  Make Razorpay payment IDs unique and refuse a payment ID already
    attached to another order.

The existing code's amount check is in rupees and only blocks
underpayment. Exact amount equality must be checked inside the
transaction, not only in the route.

## 11. Configurable split/Route transfer service

Create `lib/payments/razorpay-split.ts`. Trigger it from a durable
outbox worker only after the configured release condition is met.
Recommended default is `DELIVERY_COMPLETE`, so the driver and assigned
restaurant are known and Crave can hold the payout liability until
delivery.

Core validation:

``` ts
const snapshot = order.financial_snapshot as {
  customerPayablePaise: number;
  vendorPayableNetPaise: number;
  riderPayablePaise: number;
};

const allocations = [
  { type: "RESTAURANT", recipientId: order.restaurant_id,
    amountPaise: snapshot.vendorPayableNetPaise },
  { type: "DRIVER", recipientId: order.rider_id,
    amountPaise: snapshot.riderPayablePaise },
].filter(x => x.amountPaise > 0);

const totalTransfers = allocations.reduce((sum, x) => sum + x.amountPaise, 0);
if (totalTransfers > snapshot.customerPayablePaise) {
  throw new Error("Transfers exceed captured amount");
}
if (!Number.isSafeInteger(totalTransfers)) {
  throw new Error("Invalid paise amount");
}
```

Before calling Route:

-   Confirm order `payment_status === verified`.
-   Confirm the provider payment is captured and its ID maps to this
    Crave order.
-   Check release condition (`delivered`/`completed`, or an explicit
    audited admin approval).
-   Resolve restaurant and driver linked-account IDs from
    `RazorpayLinkedAccount` using server-side IDs.
-   Require each mapping to be `active`.
-   Refuse split if cancelled/refund-held, snapshot missing, amounts
    mismatch, or a previous transfer exists.
-   Create a durable `RazorpayTransfer` intent with a unique key such as
    `order:{orderId}:recipient:{type}:{recipientId}:v1` **before**
    calling Razorpay.
-   Call the currently supported Route API to create transfers from the
    captured payment. Amounts are paise.
-   Persist the provider transfer ID and actual provider status.
-   If the API times out, treat it as an unknown outcome: fetch
    transfers for the payment/order and reconcile before retrying.
-   Mark `processed` only when provider state confirms it. Do not mark a
    payout paid because the API request merely started.
-   Handle `transfer.processed`, `transfer.failed`, and
    `transfer.reversed` webhooks against the matching transfer ID.
-   Ensure cumulative transfers for one captured payment never exceed
    its captured amount.

**SDK caution:** Route method signatures and transfer response shapes
depend on the installed SDK/product. Validate the exact method against
your pinned SDK and current Route account. If the SDK does not expose
the endpoint, use a small server-only REST client with Basic Auth,
timeout, redacted logging, and documented endpoint schema. Do not ship
an unverified `any` call.

### Who gets what?

The transfer service uses these persisted fields, not new calculations:

-   Restaurant: `snapshot.vendorPayableNetPaise`
-   Driver: `snapshot.riderPayablePaise`
-   Platform remainder:
    `snapshot.customerPayablePaise - vendorPayableNetPaise - riderPayablePaise`

If the driver has not been assigned or lacks an active linked account,
leave that amount as a pending driver liability. Do not transfer it to
the restaurant or treat it as platform revenue.

## 12. Refund lifecycle

Fix `processRefundTx` before enabling real refunds. In the reviewed
source, it marks the refund `completed` and posts the journal inside a
catch block before authoritative provider completion is established.

Correct lifecycle:

1.  Create a `pending` refund intent with a unique idempotency key.
2.  Under a concurrency-safe transaction, verify
    `refund total + requested amount <= captured amount`.
3.  Request refund from Razorpay outside the DB transaction.
4.  Persist the provider refund ID and status.
5.  Mark `completed` only after authoritative provider response/webhook
    confirmation.
6.  Reverse/adjust Route transfers where supported and required.
    Refunding the customer does not automatically recover money already
    transferred to linked accounts.
7.  Post balanced ledger journals atomically with final state
    transition.
8.  On timeout, reconcile provider state before retrying.

Never hold a database transaction open across an external HTTP request.
Refund amounts must be stored in paise for new gateway refunds.

## 13. Admin settings and permissions

Expose only business settings in the admin panel, never API secrets.

  ------------------------------------------------------------------------------
  Setting                       Purpose                  Control
  ----------------------------- ------------------------ -----------------------
  `razorpay_enabled`            Enable Checkout          Admin only, default
                                                         false

  `razorpay_route_enabled`      Enable linked-account    Admin only, default
                                transfers                false

  Existing restaurant contract  Commission/markup        Existing contract
                                                         workflow; applies to
                                                         new snapshots

  Existing                      Driver compensation      Validate allowed range
  `driver_payout_share`         input                    

  `razorpay_transfer_release`   `DELIVERY_COMPLETE` /    Allowlist enum
                                `ADMIN_APPROVAL`         

  Linked-account status         Whether recipient can    Admin/provider workflow
                                receive transfers        

  Refund controls               Amount/reason/approval   Server-side limits and
                                                         audit
  ------------------------------------------------------------------------------

Require admin authorization server-side, validate all values, and record
actor, previous/new value, timestamp, and reason. Vendors/drivers must
not change global percentages or submit arbitrary linked-account IDs. If
only one `PaymentConfig` should be active, enforce that invariant
transactionally.

## 14. Recovery and reconciliation

Build a scheduled worker/admin report for:

-   Captured Razorpay payments without verified Crave transactions.
-   Verified orders missing required ledger/outbox records.
-   Stale transfer intents without provider IDs.
-   Provider/local transfer status mismatches.
-   Pending refunds older than the expected SLA.
-   Duplicate provider IDs, amount mismatches, and cumulative transfers
    greater than captured amount.
-   Orders where `total_amount_paise` and
    `financial_snapshot.customerPayablePaise` disagree.

Unknown provider outcome is not the same as failure. Query Razorpay
first and reconcile by provider IDs, order IDs and notes. Use bounded
retries/backoff, dead-letter states and admin visibility. Never create
another transfer merely because the first response timed out.

## 15. Security checklist

-   [ ] API key secret and webhook secret are server-only.
-   [ ] Webhook rejects missing secret/signature and verifies exact raw
    body.
-   [ ] Checkout signature verified with HMAC-SHA256.
-   [ ] Provider payment fetched and captured status confirmed.
-   [ ] Exact amount in paise, currency, Razorpay order ID and Crave
    order ID match.
-   [ ] Ownership checked on create and verify endpoints.
-   [ ] Client financial values are ignored.
-   [ ] Frontend callback alone cannot mark an order paid.
-   [ ] Webhook event, payment, transfer, refund IDs and idempotency
    keys have unique constraints.
-   [ ] Idempotency key replays compare payload hash/scope.
-   [ ] No fallback to success when DB/provider is unavailable.
-   [ ] Linked-account mapping is admin-controlled and active.
-   [ ] Snapshot allocation reconciles and transfers never exceed
    captured amount.
-   [ ] Ledger errors abort financial state changes.
-   [ ] Refunds are completed only after provider confirmation.
-   [ ] Logs redact sensitive payment data.
-   [ ] Config changes and admin payouts are audited.

## 16. Test Mode acceptance plan

1.  Create a Crave order and persist canonical paise amount.
2.  Attempt to tamper with client amount; server ignores/rejects it.
3.  Confirm Razorpay order amount equals snapshot exactly.
4.  Successful test payment is captured and verified.
5.  Invalid Checkout signature returns 401.
6.  Missing webhook signature/secret returns 401.
7.  Wrong owner, Razorpay order ID, payment ID, currency or amount is
    rejected.
8.  Duplicate verify requests/webhooks do not create duplicate ledger
    entries/settlements.
9.  Webhook arrives before browser callback and vice versa; only one
    financial transition occurs.
10. Failed payment does not dispatch the order and can be retried with a
    new attempt.
11. Inactive/missing restaurant or driver linked account blocks
    transfer.
12. Driver unassigned means no driver transfer is attempted.
13. `restaurant + driver > customer payable` fails closed.
14. Simulated transfer timeout is reconciled before retry; no duplicate
    transfer.
15. Route processed/failed/reversed events update the correct transfer.
16. Partial/full refund follows provider state and handles Route
    reversals.
17. Concurrent release calls create one intent per recipient/order.
18. Ledger totals, payment amount and transfer totals reconcile in
    paise.

Run:

``` bash
pnpm exec prisma format
pnpm exec prisma validate
pnpm exec prisma generate
pnpm typecheck
pnpm test
pnpm build
```

Also run `pnpm verify` after integration and fix failures rather than
skipping them.

## 17. Implementation sequence

### Phase A --- Data integrity

1.  Add paise columns and recipient/transfer/webhook models.
2.  Persist `total_amount_paise` from the canonical snapshot at order
    creation.
3.  Make Razorpay checkout bypass only the manual-UTR requirement, not
    other validation.
4.  Patch payment verification to require exact paise equality.
5.  Review and apply a database migration.

### Phase B --- Payment Gateway

1.  Add server-only Razorpay SDK wrapper.
2.  Implement create-order endpoint.
3.  Add Checkout UI.
4.  Implement server verification with signature and provider fetch.
5.  Implement dedicated webhook with durable idempotency.
6.  Reuse the central payment/ledger transaction only after strict
    checks pass.

### Phase C --- Route split

1.  Get Route activated and onboard linked accounts.
2.  Add admin-controlled linked-account mapping.
3.  Persist transfer intents.
4.  Use the immutable snapshot to calculate amounts.
5.  Trigger transfers from a durable outbox worker after release
    condition.
6.  Handle transfer webhooks and reconciliation.

### Phase D --- Refunds and operations

1.  Make refund intent and provider completion separate states.
2.  Add Route reversals/refund orchestration.
3.  Add reconciliation dashboard/alerts.
4.  Run Test Mode end-to-end, then controlled production rollout.

## 18. Release blockers

Do not enable live payments until all are true:

-   Route is enabled and linked accounts are onboarded.
-   Migration is applied and reviewed.
-   The exact canonical paise amount is persisted.
-   Checkout and webhook signature verification fail closed.
-   The `WebhookEvent` placeholder handlers described above are
    implemented with durable unique IDs.
-   Payment service enforces exact amount equality inside the
    transaction.
-   Required ledger writes cannot be swallowed.
-   Transfer intents are idempotent and unknown outcomes are reconciled.
-   Refunds and transfer reversals are provider-confirmed.
-   Typecheck, tests, Prisma validation, build, and all Test Mode
    scenarios pass.

## 19. Repository-specific cautions

1.  Do not use `app/api/webhooks/payment/route.ts` unchanged as the
    Razorpay security boundary; its signature verification is
    conditional.
2.  Do not trust `Order.total_amount` alone when it may not represent
    exact paise. Persist and verify `total_amount_paise` from the
    canonical snapshot.
3.  Do not recompute restaurant/driver percentages at delivery time;
    consume the immutable snapshot.
4.  Do not assume `VendorSettlement` or `DriverPayout` rows move money.
    Route transfers require provider-side calls and confirmed provider
    state.
5.  Do not enable refunds while the current refund service can mark a
    refund completed before gateway confirmation or swallow ledger
    failures.
6.  Keep existing manual UTR verification as a separate legacy path. A
    customer-entered UTR is not proof of a captured Razorpay payment.

## 20. Documentation

-   [Razorpay Orders API](https://razorpay.com/docs/api/orders/create/)
-   [Razorpay Checkout
    integration](https://razorpay.com/docs/payments/server-integration/nodejs/payment-gateway/build-integration/)
-   [Webhook signature
    validation](https://razorpay.com/docs/webhooks/validate-test/)
-   [Razorpay Route product](https://razorpay.com/route/)
-   [Razorpay Route API](https://razorpay.com/docs/api/payments/route/)

**Bottom line:** This blueprint is tailored to Crave's existing finance
engine. It is not yet production-ready by merely copying the snippets:
the durable webhook helper placeholders must be implemented, the exact
Route SDK/API shape must be verified, the paise migration must be
applied, and the Test Mode checklist must pass. Never enable live money
movement while any of those release blockers remain.
