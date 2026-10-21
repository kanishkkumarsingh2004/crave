# Abuse & concurrency suite

Load tests answer "how does it behave under traffic". This suite answers a
different question: **"if a real user (or someone pretending to be one) hammers
this path, does the system stay correct?"**

Every case is a separate k6 script so it can be run on its own, and the runner
executes them one after another and prints one combined report.

```bash
pnpm abuse-test -- --url http://localhost:3000 --env-file load-tests/.env
pnpm abuse-test -- --case double-click --url http://localhost:3000
pnpm abuse-test -- --help
```

The suite needs a running API and, for the socket case, a running WebSocket
server:

```bash
pnpm start      # API on :3000
pnpm start:ws   # realtime on :8000
```

## The cases

| Case              | What it attacks                                                  | Must stay true                                         |
| ----------------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| `order-lifecycle` | the whole order, across all four roles                           | only the verified payment lets the order continue      |
| `double-click`    | the customer taps "Place order" twice (or the form double fires) | one tap creates exactly one order                      |
| `timeout-retry`   | the request times out on the phone and the app retries it        | the retry never creates a second order                 |
| `capacity-race`   | many users order the last unit of an item at the same moment     | the item is never oversold                             |
| `rate-limit`      | credential stuffing from one address, then with a rotated header | the limiter throttles, and the header cannot defeat it |
| `otp-bruteforce`  | guessing the six-digit delivery code                             | no guess is ever accepted, the code works once         |
| `socket-abuse`    | connection floods, message floods, garbage, wide subscribes      | the server survives and stays healthy                  |

### The order lifecycle

`order-lifecycle` walks one order through every party and asserts the gate in
the middle:

```
customer places the order  →  payment_submitted
                              ├─ the restaurant cannot see it
                              ├─ the driver gets no offer
                              └─ neither can push it forward
admin verifies the payment  →  sent_to_vendor
                              ├─ the restaurant now sees it
                              └─ the driver now gets an offer
restaurant: preparing → packing → ready_for_pickup
driver: accepts → picked_up → out_for_delivery
customer reads the delivery code → driver enters it → delivered
admin reads the finished order
```

It needs one account per role. Every role may have its own password
(`SEED_<ROLE>_PASSWORD` wins over `SEED_PASSWORD`), and the suite knows the
usual addresses:

| Role       | Environment variable  | Known fallback                     |
| ---------- | --------------------- | ---------------------------------- |
| customer   | `SEED_CUSTOMER_EMAIL` | `kanishkkumar2004@gmail.com`       |
| admin      | `SEED_ADMIN_EMAIL`    | `admin@crave.com`                  |
| restaurant | `SEED_VENDOR_EMAIL`   | `momobar@crave.com`                |
| driver     | `SEED_RIDER_EMAIL`    | `test@crave.com`, `test@gmail.com` |

## Two kinds of failure

The report separates the two, because they need different fixes:

- **integrity** — the data is wrong. A duplicate order, an oversold item, a
  crash. These are the ones that cost money and must never happen.
- **usability** — the data is right, but the customer is blocked. A retry that
  gets throttled, a limiter that can be bypassed. Worth fixing, but the ledger
  is still correct.

`--fail-on` controls what makes the runner exit non-zero:

| Value       | Behaviour                                               |
| ----------- | ------------------------------------------------------- |
| `integrity` | (default) only data corruption fails the run            |
| `any`       | any failed expectation fails the run                    |
| `none`      | the run always succeeds — the report is the deliverable |

## The database-backed tests

`test/concurrency.test.ts` proves the invariants the HTTP layer cannot see —
the final value of the stock counter, the number of rows really written, the
locks that only exist inside a transaction:

```bash
pnpm test:db   # ALLOW_DATABASE_TESTS=true, loads .env
```

It covers:

- concurrent claims never oversell a menu item;
- a coupon with a usage limit is only claimed once;
- the same idempotency key can only create one order;
- only one rider can claim an order;
- a delivery OTP can only be consumed once;
- a concurrent status transition lets exactly one writer through.

## Notes

- The login route only returns a token in the response body when the request
  identifies as a native app, so the suite sends `x-crave-native-app`.
- The checkout limiter allows ten orders a minute per address, so each case
  presents its own address (`ABUSE_IP`) and the rate-limit case pins one
  address on purpose.
- Reports land in `load-tests/reports/` (gitignored).
