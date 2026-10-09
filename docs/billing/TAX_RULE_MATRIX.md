# CRAVE Billing Engine 2.0 — Tax Rule & Regulatory Compliance Matrix

---

## 1. Indian GST Regulatory Classification

| Transaction / Service Type | Applicable Rate | Section / Reference | Tax Split (Intra-State) | Tax Split (Inter-State) | Liability Owner |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Restaurant Food Services** | **5%** (No ITC) | Section 9(5) CGST Act | 2.5% CGST + 2.5% SGST | 5.0% IGST | E-Commerce Operator (CRAVE) |
| **Platform Convenience Fee** | **18%** | SAC 998313 / SAC 998599 | 9.0% CGST + 9.0% SGST | 18.0% IGST | CRAVE Platform |
| **Handling Fee** | **18%** | SAC 998599 | 9.0% CGST + 9.0% SGST | 18.0% IGST | CRAVE Platform |
| **CraveXP Grocery Staples** | **0% / 5%** | HSN Chapter 10 / 11 | 0% / 2.5% CGST + 2.5% SGST | 0% / 5.0% IGST | Dark Store / Seller |
| **CraveXP Packaged Snacks** | **12% / 18%** | HSN Chapter 19 / 21 | 6%/9% CGST + 6%/9% SGST | 12%/18% IGST | Dark Store / Seller |
| **Rider Tip Pass-Through** | **Exempt (0%)** | Voluntary Gratuity | Exempt | Exempt | N/A (100% Rider Entitlement) |

---

## 2. Tax-Inclusive vs Tax-Exclusive Formulas

### Tax-Inclusive Calculation (Used for Menu Items)
$$\text{TaxableBasePaise} = \text{Math.round}\left(\frac{\text{InclusivePricePaise} \times 100}{100 + \text{RatePercent}}\right)$$
$$\text{GstAmountPaise} = \text{InclusivePricePaise} - \text{TaxableBasePaise}$$

*Example:* ₹105 menu item at 5% GST $\rightarrow$ Taxable Base = ₹100.00, GST = ₹5.00.

### Tax-Exclusive Calculation
$$\text{GstAmountPaise} = \text{Math.round}\left(\frac{\text{TaxableBasePaise} \times \text{RatePercent}}{100}\right)$$
