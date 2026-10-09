# CRAVE Billing Engine 2.0 — Pricing & Fee Specification

---

## 1. Customer Pricing Breakdown Formula

Customer payable is calculated using component-based integer paise arithmetic:

$$\text{CustomerPayable} = \text{NetMerchandiseValue} + \text{PackagingFee} + \text{DeliveryFee} + \text{PlatformFee} + \text{HandlingFee} + \text{Taxes} + \text{Tip}$$

### Line Item Definitions

| Fee Component             | Formula / Source                                                                    | Tax Category                          | Beneficiary               |
| :------------------------ | :---------------------------------------------------------------------------------- | :------------------------------------ | :------------------------ |
| **Net Merchandise Value** | $\sum (\text{UnitPricePaise} \times \text{Quantity}) - \text{Discounts}$            | 5% Restaurant Service GST / HSN Goods | Restaurant / Dark Store   |
| **Packaging Fee**         | Server-controlled cap ($\text{Max } ₹20$)                                           | Included in item GST                  | Restaurant                |
| **Delivery Fee**          | $\text{BaseFee} + \max(0, \text{Distance} - \text{BaseKm}) \times \text{PerKmRate}$ | 5% / 18% GST                          | Rider / Platform          |
| **Platform Fee**          | Server-configured convenience charge ($₹6$)                                         | 18% Platform GST                      | CRAVE Platform            |
| **Handling Fee**          | Server-configured operational charge ($₹5$)                                         | 18% Platform GST                      | CRAVE Platform            |
| **Rider Tip**             | 100% Customer voluntary pass-through                                                | Exempt from GST & Commission          | Rider (100% Pass-through) |

---

## 2. Dynamic Surcharge & Stacking Rules

1. **Demand Surge**: Computed as $\text{DemandRatio} = \frac{\text{ActiveOrders}}{\max(\text{AvailableRiders}, 1)}$. Multipliers applied to delivery base only (e.g., $1.25\times, 1.5\times, 2.0\times$).
2. **Rain Surcharge**: Flat operational surcharge ($₹15$) applied during active rain mode.
3. **Late Night Surcharge**: Applied between 23:00 and 06:00 IST ($₹15$).
4. **Stacking Restrictions**:
   - Distance per-km fee and surge multipliers apply to delivery base.
   - Duplicate distance charges on the same order are strictly prohibited.
   - Surcharges are computed at checkout and saved on `Order.financial_snapshot`.
