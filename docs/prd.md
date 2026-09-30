# Product Requirements Document (PRD)

# Multi-Role Delivery Platform

**Document:** `PRD.md`
**Version:** `1.0.0`
**Status:** Initial Product Specification
**Platform:** Web + Mobile
**Primary Web Stack:** Next.js
**Mobile Stack:** React Native
**Backend:** Next.js Backend/API
**Database ORM:** Prisma
**Database:** PostgreSQL
**Authentication:** Better Auth

---

# 1. Product Overview

## 1.1 Product Concept

The platform is a multi-role product delivery system connecting:

1. **Admin** — manages the entire platform.
2. **Customer/User** — browses products and places orders.
3. **Vendor** — manages products and fulfills customer orders.
4. **Driver** — collects products from vendors and delivers them to customers.

The system will consist of:

### Web Application

The website will primarily provide the administrative interface and platform management functionality.

### Mobile Applications

There will be three separate React Native applications:

- Customer App
- Vendor App
- Driver App

All applications will communicate with a centralized Next.js backend.

---

# 2. Core Architecture

```text
                         ┌──────────────────────┐
                         │      PostgreSQL      │
                         │      Database        │
                         └──────────┬───────────┘
                                    │
                                    │ Prisma
                                    │
                         ┌──────────▼───────────┐
                         │    Next.js Backend   │
                         │                      │
                         │ API                  │
                         │ Authentication       │
                         │ Business Logic       │
                         │ Authorization        │
                         │ Order Management     │
                         │ Delivery Management  │
                         └──────────┬───────────┘
                                    │
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
             ▼                      ▼                      ▼
     ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
     │ Customer App  │      │  Vendor App   │      │  Driver App   │
     │ React Native  │      │ React Native  │      │ React Native  │
     └───────────────┘      └───────────────┘      └───────────────┘

                         ┌──────────────────┐
                         │   Admin Website  │
                         │     Next.js      │
                         └──────────────────┘
```

---

# 3. User Roles

The platform has exactly four primary roles.

## 3.1 Admin

The administrator controls the complete platform.

Admin responsibilities:

- Manage customers
- Manage vendors
- Manage drivers
- Manage products
- Manage orders
- Manage deliveries
- Manage payments
- Manage platform settings
- Monitor platform activity
- Suspend users
- Approve/reject vendors
- Approve/reject drivers
- Monitor disputes
- View analytics
- Manage delivery configuration

---

# 4. Customer

Customers use the platform to purchase products.

Customer capabilities:

- Create account
- Login
- Google authentication
- Browse products
- Search products
- Filter products
- View vendors
- View product details
- Add products to cart
- Manage addresses
- Place orders
- Select delivery address
- Track orders
- Track delivery
- View order history
- Cancel eligible orders
- Receive notifications
- Rate products/vendors
- Rate delivery
- Manage profile

---

# 5. Vendor

Vendors sell products through the platform.

Vendor capabilities:

- Register
- Login
- Google authentication where applicable
- Submit vendor profile
- Manage business information
- Add products
- Edit products
- Remove products
- Manage inventory
- Receive orders
- Accept/reject orders
- Prepare orders
- Mark order as ready
- View order history
- View earnings
- View sales analytics
- Communicate delivery status
- Manage store availability

Vendor accounts may require Admin approval before becoming active.

---

# 6. Driver

Drivers are responsible for physical delivery.

Driver capabilities:

- Register
- Login
- Google authentication where applicable
- Submit driver information
- Submit required verification documents
- Set availability
- Receive delivery requests
- Accept delivery
- Navigate to vendor
- Confirm pickup
- Navigate to customer
- Confirm delivery
- Update delivery status
- View active delivery
- View delivery history
- View earnings
- View profile
- Receive notifications

Driver activation may require Admin approval.

---

# 7. Application Structure

The project will be divided into four major product sections.

```text
SECTION 1
Admin Website

SECTION 2
Customer Mobile App

SECTION 3
Vendor Mobile App

SECTION 4
Driver Mobile App
```

---

# SECTION 1 — ADMIN WEBSITE

# 8. Admin Website

## 8.1 Purpose

The Admin Website is the central control system for the platform.

The Admin should be able to manage almost every operational aspect of the platform from one interface.

---

# 9. Admin Authentication

The initial application entry should not contain a public marketing landing page.

The Admin should be presented directly with authentication.

```text
Application Start
        │
        ▼
┌─────────────────────┐
│      Login          │
├─────────────────────┤
│ Email               │
│ Password            │
│                     │
│ [ Login ]           │
│                     │
│ Continue with       │
│ Google              │
│                     │
│ Forgot Password     │
└─────────────────────┘
```

Admin authentication will use Better Auth.

---

# 10. Admin Dashboard

The dashboard should provide an operational overview.

### Dashboard Metrics

- Total Customers
- Active Customers
- Total Vendors
- Active Vendors
- Pending Vendors
- Total Drivers
- Active Drivers
- Pending Drivers
- Total Orders
- Pending Orders
- Active Orders
- Completed Orders
- Cancelled Orders
- Total Revenue
- Vendor Revenue
- Driver Payments
- Platform Revenue

### Dashboard Visualizations

- Orders over time
- Revenue over time
- Active deliveries
- Vendor performance
- Driver performance
- Order status distribution
- Customer growth
- Delivery completion rate

---

# 11. Customer Management

Admin can:

- View customers
- Search customers
- Filter customers
- View customer profile
- View customer orders
- View customer addresses where permitted
- Suspend customer
- Activate customer
- Delete/deactivate account
- Review customer activity

---

# 12. Vendor Management

Admin can:

- View vendors
- Search vendors
- Approve vendors
- Reject vendors
- Suspend vendors
- Activate vendors
- View vendor profile
- View vendor products
- View vendor orders
- View vendor revenue
- View vendor performance
- Manage vendor categories
- Review submitted documents

### Vendor Status

```text
PENDING
    ↓
UNDER_REVIEW
    ↓
APPROVED
    ↓
ACTIVE
```

Possible rejection/suspension states:

```text
REJECTED
SUSPENDED
```

---

# 13. Driver Management

Admin can:

- View drivers
- Approve drivers
- Reject drivers
- Suspend drivers
- Activate drivers
- View driver profile
- View verification documents
- View delivery history
- View driver earnings
- View driver performance
- View current delivery
- View driver availability

### Driver Status

```text
PENDING
    ↓
UNDER_REVIEW
    ↓
APPROVED
    ↓
ACTIVE
```

Possible states:

```text
REJECTED
SUSPENDED
OFFLINE
ONLINE
```

---

# 14. Product Management

Admin can:

- View products
- Search products
- Filter products
- Edit products
- Remove products
- Disable products
- Enable products
- Assign categories
- Review vendor products

Product fields:

- Product name
- Description
- Price
- Discount
- Images
- Category
- SKU
- Inventory
- Vendor
- Availability
- Created date
- Updated date

---

# 15. Order Management

Admin can view every order.

Order information:

- Order ID
- Customer
- Vendor
- Products
- Quantity
- Total
- Payment status
- Order status
- Delivery status
- Driver
- Pickup location
- Delivery location
- Timestamps

### Order Status

```text
CREATED
   ↓
CONFIRMED
   ↓
ACCEPTED_BY_VENDOR
   ↓
PREPARING
   ↓
READY_FOR_PICKUP
   ↓
DRIVER_ASSIGNED
   ↓
PICKED_UP
   ↓
OUT_FOR_DELIVERY
   ↓
DELIVERED
```

Alternative states:

```text
CANCELLED
FAILED
REJECTED
```

---

# 16. Delivery Management

Admin can monitor:

- Active deliveries
- Available drivers
- Assigned drivers
- Pickup locations
- Delivery locations
- Delivery status
- Delivery timestamps

Future functionality may include a live map showing:

```text
Driver
   ↓
Vendor
   ↓
Customer
```

---

# 17. Payment Management

Admin can view:

- Customer payments
- Vendor earnings
- Driver payouts
- Platform fees
- Refunds
- Failed transactions
- Payment status

Payment states:

```text
PENDING
PROCESSING
SUCCESS
FAILED
REFUNDED
PARTIALLY_REFUNDED
```

Payment provider integration should be abstracted behind a payment service.

---

# 18. Category Management

Admin can manage:

- Categories
- Subcategories
- Category images
- Category status
- Category ordering

Example:

```text
Food
 ├── Snacks
 ├── Beverages
 └── Desserts

Electronics
 ├── Phones
 ├── Laptops
 └── Accessories
```

---

# 19. Reviews and Ratings

Admin can monitor:

- Product reviews
- Vendor reviews
- Driver reviews
- Customer feedback
- Reported reviews

Admin may remove reviews that violate platform rules.

---

# 20. Notification Management

Admin can manage platform notifications.

Notification types:

- Order notification
- Delivery notification
- Vendor notification
- Driver notification
- Account notification
- Promotional notification
- System notification

---

# 21. Platform Settings

Admin settings should include:

- Platform name
- Currency
- Delivery configuration
- Platform fee
- Vendor commission
- Driver payout configuration
- Order cancellation rules
- Minimum order amount
- Maximum delivery distance
- Notification settings
- Maintenance mode

---

# 22. Admin Audit Logs

Every sensitive administrative action should be recorded.

Example:

```text
Admin
Action
Resource
Resource ID
Timestamp
IP
Metadata
```

Example:

```text
Admin #102
SUSPENDED_VENDOR
Vendor #882
2026-09-29 18:42
```

---

# SECTION 2 — CUSTOMER MOBILE APP

# 23. Customer App

The Customer App will be built using React Native.

The application should be simple, visually friendly, responsive and playful.

---

# 24. Customer Authentication

The application opens directly into authentication.

No public landing page.

```text
┌─────────────────────────┐
│                         │
│        App Logo         │
│                         │
│    Welcome Back         │
│                         │
│ Email                   │
│ Password                │
│                         │
│ [ Login ]               │
│                         │
│ ───── OR ─────          │
│                         │
│ [ Continue with Google ]│
│                         │
│ Don't have an account?  │
│ Sign Up                 │
└─────────────────────────┘
```

---

# 25. Customer Home

After authentication:

- Product discovery
- Categories
- Search
- Recommended products
- Popular products
- Vendors
- Current order
- Delivery status

---

# 26. Product Discovery

Customer can:

- Search products
- Browse categories
- Filter products
- Sort products
- View product details
- View vendor information

Filters may include:

- Price
- Category
- Availability
- Rating
- Distance
- Vendor

---

# 27. Product Details

Product page:

- Product image
- Product name
- Description
- Price
- Discount
- Vendor
- Rating
- Availability
- Quantity selector
- Add to cart

---

# 28. Cart

Customer can:

- View cart
- Change quantity
- Remove product
- View subtotal
- View delivery fee
- View taxes
- View discount
- View total

---

# 29. Checkout

Checkout includes:

- Delivery address
- Order summary
- Payment method
- Delivery fee
- Taxes
- Total amount

Customer confirms order.

---

# 30. Customer Order Tracking

The customer should be able to track the order.

Example:

```text
Order Confirmed       ✓
Vendor Accepted       ✓
Preparing             ✓
Ready for Pickup      ✓
Driver Assigned       ✓
Picked Up             ✓
Out for Delivery      ●
Delivered             ○
```

Where possible, driver location can be displayed on a map.

---

# 31. Customer Profile

Customer profile includes:

- Name
- Email
- Phone
- Profile image
- Addresses
- Order history
- Payment methods
- Notifications
- Preferences
- Account settings

---

# 32. Customer Order History

Each order displays:

- Order ID
- Date
- Vendor
- Products
- Amount
- Payment status
- Delivery status

---

# 33. Customer Ratings

After delivery, customers may rate:

- Vendor
- Product
- Driver

---

# SECTION 3 — VENDOR MOBILE APP

# 34. Vendor App

The Vendor App is designed exclusively for vendors.

It should focus on operational efficiency rather than unnecessary features.

---

# 35. Vendor Authentication

Direct authentication screen.

```text
Login
   │
   ├── Email + Password
   │
   └── Google Authentication
```

Vendor registration should collect:

- Name
- Business name
- Email
- Phone
- Business address
- Business category
- Required verification information

Account remains pending until approved where verification is required.

---

# 36. Vendor Dashboard

Dashboard:

- Today's orders
- Pending orders
- Preparing orders
- Ready orders
- Completed orders
- Revenue
- Products
- Inventory alerts

---

# 37. Vendor Product Management

Vendor can:

- Create product
- Edit product
- Delete product
- Enable product
- Disable product
- Update price
- Update inventory
- Upload product images

---

# 38. Vendor Order Management

Order workflow:

```text
NEW ORDER
    ↓
ACCEPT
    ↓
PREPARING
    ↓
READY FOR PICKUP
    ↓
DRIVER PICKUP
```

Vendor must not mark an order as picked up.

Pickup confirmation belongs to the driver.

---

# 39. Vendor Inventory

Inventory fields:

- Product
- SKU
- Available quantity
- Reserved quantity
- Low-stock threshold
- Availability

Example:

```text
Product A
Available: 24
Reserved: 3
Low Stock: 5
```

---

# 40. Vendor Earnings

Vendor can view:

- Gross sales
- Platform fees
- Refunds
- Net earnings
- Pending payouts
- Completed payouts

---

# 41. Vendor Analytics

Analytics:

- Orders
- Revenue
- Average order value
- Popular products
- Product performance
- Cancellation rate
- Customer ratings

---

# 42. Vendor Store Controls

Vendor can:

- Open store
- Close store
- Set unavailable status
- Configure business hours

---

# SECTION 4 — DRIVER MOBILE APP

# 43. Driver App

The Driver App is focused on delivery execution.

The interface should minimize distractions because drivers may use the application while moving between pickup and delivery locations.

---

# 44. Driver Authentication

Direct authentication.

```text
Login
   │
   ├── Email + Password
   │
   └── Google Authentication
```

Driver registration may require:

- Name
- Phone
- Email
- Vehicle information
- Driving/license information
- Required verification documents
- Profile information

---

# 45. Driver Dashboard

Dashboard:

```text
Online / Offline

Current Delivery

Available Deliveries

Today's Deliveries

Today's Earnings
```

---

# 46. Driver Availability

Driver can toggle:

```text
OFFLINE
   ↕
ONLINE
```

Only online and eligible drivers should be considered for new delivery assignments.

---

# 47. Delivery Assignment

When a delivery becomes available:

```text
NEW DELIVERY

Pickup:
Vendor Location

Drop:
Customer Location

Estimated Distance

Estimated Time

Delivery Earnings

[ Accept ]
[ Reject ]
```

---

# 48. Pickup Workflow

After accepting:

```text
Accepted
   ↓
Navigate to Vendor
   ↓
Arrived at Vendor
   ↓
Verify Order
   ↓
Confirm Pickup
   ↓
Start Delivery
```

Pickup confirmation may use:

- Order ID
- QR code
- OTP
- Vendor confirmation

The final implementation should select one primary mechanism and keep the others as fallback options.

---

# 49. Delivery Workflow

```text
PICKED UP
    ↓
NAVIGATING
    ↓
ARRIVED
    ↓
CUSTOMER VERIFICATION
    ↓
DELIVERED
```

Customer verification can use:

```text
Delivery OTP
```

The driver should only be able to mark the order delivered after successful verification where OTP delivery is enabled.

---

# 50. Driver Earnings

Driver can view:

- Today's earnings
- Weekly earnings
- Completed deliveries
- Pending payouts
- Completed payouts

---

# 51. Driver History

Driver can view:

- Completed deliveries
- Cancelled deliveries
- Failed deliveries
- Earnings
- Delivery duration

---

# 52. Driver Profile

Driver profile:

- Name
- Phone
- Email
- Profile image
- Vehicle
- Verification status
- Rating
- Delivery statistics

---

# 53. Authentication Requirements

Better Auth will be the central authentication system.

## Authentication methods

### Email/password

Supported.

### Google OAuth

Supported.

### Password recovery

Supported.

### Session management

Supported.

### Account verification

Email verification should be supported.

---

# 54. Role-Based Access Control

The backend must enforce role-based authorization.

```text
ADMIN
CUSTOMER
VENDOR
DRIVER
```

Example:

```text
/customer/*
    CUSTOMER

/vendor/*
    VENDOR

/driver/*
    DRIVER

/admin/*
    ADMIN
```

Authorization must never rely only on frontend route protection.

Every protected backend endpoint must independently verify:

1. Session
2. User identity
3. User role
4. Resource ownership
5. Requested operation

---

# 55. Database Requirements

Database:

**PostgreSQL**

ORM:

**Prisma**

Core entities:

```text
User
Session
Account
Verification

CustomerProfile
VendorProfile
DriverProfile

VendorDocument
DriverDocument

Category
Product
ProductImage
Inventory

Cart
CartItem

Address

Order
OrderItem

Payment
Refund

Delivery
DeliveryStatusHistory

DriverLocation

Review

Notification

PlatformSetting

AuditLog
```

---

# 56. User Model

Conceptually:

```text
User
 ├── id
 ├── email
 ├── name
 ├── phone
 ├── role
 ├── status
 ├── image
 ├── createdAt
 └── updatedAt
```

Role:

```text
ADMIN
CUSTOMER
VENDOR
DRIVER
```

A single identity system should be used rather than maintaining completely separate authentication databases for each application.

---

# 57. Vendor Data

Vendor profile:

```text
VendorProfile
 ├── userId
 ├── businessName
 ├── description
 ├── address
 ├── latitude
 ├── longitude
 ├── status
 ├── approvalStatus
 ├── createdAt
 └── updatedAt
```

---

# 58. Driver Data

Driver profile:

```text
DriverProfile
 ├── userId
 ├── vehicleType
 ├── vehicleNumber
 ├── license information
 ├── verificationStatus
 ├── availabilityStatus
 ├── rating
 └── timestamps
```

Sensitive verification information should be stored and protected appropriately.

---

# 59. Product Data

```text
Product
 ├── id
 ├── vendorId
 ├── categoryId
 ├── name
 ├── description
 ├── price
 ├── discount
 ├── sku
 ├── inventory
 ├── status
 ├── createdAt
 └── updatedAt
```

---

# 60. Order Data

```text
Order
 ├── id
 ├── customerId
 ├── vendorId
 ├── deliveryId
 ├── subtotal
 ├── deliveryFee
 ├── tax
 ├── discount
 ├── total
 ├── paymentStatus
 ├── orderStatus
 ├── createdAt
 └── updatedAt
```

---

# 61. Order Items

```text
OrderItem
 ├── id
 ├── orderId
 ├── productId
 ├── quantity
 ├── unitPrice
 └── totalPrice
```

The unit price must be stored at order time.

The system must not calculate historical orders using the current product price.

---

# 62. Delivery Model

```text
Delivery
 ├── id
 ├── orderId
 ├── driverId
 ├── pickupAddress
 ├── deliveryAddress
 ├── pickupLatitude
 ├── pickupLongitude
 ├── deliveryLatitude
 ├── deliveryLongitude
 ├── status
 ├── acceptedAt
 ├── pickedUpAt
 ├── deliveredAt
 └── timestamps
```

---

# 63. Delivery Status

Recommended state machine:

```text
PENDING
   ↓
SEARCHING_DRIVER
   ↓
DRIVER_ASSIGNED
   ↓
DRIVER_ACCEPTED
   ↓
ARRIVED_AT_PICKUP
   ↓
PICKED_UP
   ↓
OUT_FOR_DELIVERY
   ↓
ARRIVED_AT_DESTINATION
   ↓
DELIVERED
```

Failure states:

```text
CANCELLED
FAILED
EXPIRED
```

Invalid state transitions must be rejected by the backend.

---

# 64. API Architecture

The Next.js backend should expose versioned APIs.

Example:

```text
/api/v1/auth/*
/api/v1/users/*
/api/v1/customers/*
/api/v1/vendors/*
/api/v1/drivers/*
/api/v1/products/*
/api/v1/categories/*
/api/v1/cart/*
/api/v1/orders/*
/api/v1/deliveries/*
/api/v1/payments/*
/api/v1/reviews/*
/api/v1/notifications/*
/api/v1/admin/*
```

---

# 65. Backend Layering

The backend should not put all logic directly inside route handlers.

Recommended structure:

```text
API Route
   ↓
Controller / Handler
   ↓
Validation
   ↓
Authorization
   ↓
Service
   ↓
Repository / Prisma
   ↓
PostgreSQL
```

---

# 66. Validation

All external input must be validated.

Recommended validation library:

```text
Zod
```

Validation must occur for:

- Authentication input
- Product input
- Order input
- Address input
- Vendor registration
- Driver registration
- Payment input
- Admin actions

---

# 67. Security Requirements

The platform must implement:

- Secure authentication
- Role-based authorization
- Session protection
- CSRF protection where applicable
- Input validation
- Rate limiting
- Secure password handling through Better Auth
- API request validation
- Audit logging
- Secure file upload
- Sensitive data protection
- Database constraints
- Transactional order creation

---

# 68. Order Transaction Safety

Order creation must be transactional.

For example:

```text
Create Order
      +
Reserve Inventory
      +
Create Order Items
      +
Create Payment Record
      +
Create Delivery
```

These operations should not leave the system in a partially-created state.

Prisma transactions should be used where appropriate.

---

# 69. Inventory Concurrency

Inventory is a major failure point.

The system must prevent:

```text
Stock = 1

Customer A → buys 1
Customer B → buys 1
```

from resulting in:

```text
Stock = -1
```

Inventory updates must use appropriate database transactions and concurrency controls.

---

# 70. Real-Time Features

Real-time communication will be required for:

- Order status
- Delivery status
- Driver assignment
- Driver location
- Vendor order notifications
- Customer delivery updates

Possible implementation:

```text
WebSocket
```

or

```text
Server-Sent Events
```

The architecture should abstract real-time communication so the implementation can evolve without changing the business logic.

---

# 71. Driver Location Tracking

Driver location should not be transmitted continuously at maximum frequency.

The application should use controlled location updates.

Example:

```text
Driver App
    ↓
Location Service
    ↓
Backend
    ↓
Active Delivery
    ↓
Customer App
```

Location tracking should only operate when required by an active delivery or explicitly authorized operational state.

---

# 72. Notifications

Notification channels:

### Push

For mobile applications.

### In-app

For all applications.

### Email

For important account/system events.

Examples:

```text
Order confirmed
Vendor accepted order
Order ready
Driver assigned
Driver picked up order
Driver approaching
Order delivered
Payment failed
Account approved
```

---

# 73. User Experience Requirements

The platform should feel:

- Simple
- Fast
- Friendly
- Playful
- Modern
- Responsive
- Low-friction

Avoid excessive screens.

Primary actions should always be obvious.

---

# 74. Navigation

## Customer

```text
Home
Explore
Orders
Cart
Profile
```

## Vendor

```text
Dashboard
Orders
Products
Inventory
Earnings
Profile
```

## Driver

```text
Dashboard
Deliveries
History
Earnings
Profile
```

## Admin

```text
Dashboard
Customers
Vendors
Drivers
Products
Orders
Deliveries
Payments
Analytics
Reviews
Notifications
Settings
Audit Logs
```

---

# 75. Search

Customer search should support:

- Product name
- Category
- Vendor
- SKU where applicable

Admin search should support:

- User
- Vendor
- Driver
- Product
- Order
- Delivery

---

# 76. Error Handling

Errors should be human-readable.

Bad:

```text
PrismaClientKnownRequestError P2002
```

Good:

```text
This email is already registered.
```

Backend logs should retain technical error details while clients receive safe messages.

---

# 77. Loading States

Every asynchronous operation should provide feedback.

Examples:

```text
Loading products...

Processing order...

Finding a driver...

Updating inventory...

Saving changes...
```

Skeleton loaders should be preferred for major data-heavy screens.

---

# 78. Empty States

Every list must have a meaningful empty state.

Example:

```text
No orders yet

Your completed and active orders
will appear here.
```

Avoid blank screens.

---

# 79. Offline Handling

Mobile applications should gracefully handle temporary connectivity problems.

The app should:

- Detect connectivity loss
- Display offline state
- Preserve safe local UI state
- Retry appropriate requests
- Prevent duplicate orders
- Prevent duplicate delivery confirmations

Critical financial and delivery operations must always be confirmed by the backend.

---

# 80. Idempotency

Important operations should support idempotency.

Especially:

```text
Create Order
Payment
Accept Delivery
Confirm Pickup
Confirm Delivery
Refund
```

This prevents duplicate operations caused by:

- Network retry
- Double tapping
- App restart
- Request timeout

---

# 81. Payments

The payment system should be provider-independent.

Architecture:

```text
PaymentService
      │
      ├── Provider
      │
      ├── Payment Creation
      │
      ├── Verification
      │
      ├── Refund
      │
      └── Webhooks
```

The initial payment provider can be selected during implementation.

---

# 82. Maps and Location

The platform requires location functionality for:

- Vendor locations
- Customer addresses
- Driver navigation
- Delivery distance
- Driver tracking

The map provider should be abstracted so it can be replaced without rewriting delivery logic.

---

# 83. File Storage

Product images, vendor documents and driver documents should not be stored directly inside PostgreSQL as large binary objects.

Use object storage.

Example:

```text
Object Storage
   │
   ├── Product Images
   ├── Vendor Documents
   ├── Driver Documents
   └── Profile Images
```

Database stores metadata and object references.

---

# 84. Admin Audit System

Actions that should be audited include:

- User suspension
- Vendor approval
- Vendor rejection
- Driver approval
- Driver suspension
- Product deletion
- Order modification
- Refund
- Payment adjustment
- Platform setting modification

---

# 85. Analytics

The platform should collect operational metrics.

## Customer metrics

- Customer registrations
- Active customers
- Orders per customer
- Repeat orders

## Vendor metrics

- Orders
- Revenue
- Average order value
- Product performance

## Driver metrics

- Deliveries
- Acceptance rate
- Completion rate
- Average delivery duration

## Platform metrics

- Total orders
- GMV
- Platform revenue
- Delivery success rate
- Cancellation rate

---

# 86. Admin Permissions

The initial version may have a single Admin role.

However, the architecture should allow future roles:

```text
SUPER_ADMIN
ADMIN
OPERATIONS_MANAGER
SUPPORT_AGENT
FINANCE_MANAGER
```

Do not hard-code authorization logic in a way that prevents future permission expansion.

---

# 87. Scalability Requirements

The system should be designed so the following can scale independently:

```text
Web
Mobile Apps
API
Database
Real-Time Services
Location Services
Notifications
File Storage
Payments
```

Do not prematurely split everything into microservices.

The initial system should preferably be a modular monolith.

---

# 88. Recommended Architecture

For version 1:

```text
Next.js
   │
   ├── Web Application
   │
   ├── API
   │
   ├── Authentication
   │
   ├── Services
   │
   └── Prisma
          │
          ▼
      PostgreSQL
```

This is simpler to build and maintain than starting with multiple microservices.

---

# 89. Mobile Architecture

Each React Native app should have its own application boundary.

```text
apps/
├── customer
├── vendor
└── driver
```

All three communicate with the same backend.

They should share common packages where appropriate:

```text
packages/
├── api-client
├── types
├── validation
├── ui
├── constants
└── utilities
```

---

# 90. Suggested Repository Structure

```text
delivery-platform/
│
├── apps/
│   │
│   ├── web/
│   │   └── admin/
│   │
│   ├── customer/
│   │
│   ├── vendor/
│   │
│   └── driver/
│
├── packages/
│   │
│   ├── api-client/
│   ├── types/
│   ├── validation/
│   ├── ui/
│   ├── config/
│   └── utils/
│
├── backend/
│   │
│   ├── auth/
│   ├── services/
│   ├── repositories/
│   ├── validators/
│   └── realtime/
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed/
│
├── docs/
│
├── rules/
│
├── docker/
│
├── .env.example
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

# 91. Technology Stack

## Web

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
```

## Mobile

```text
React Native
TypeScript
```

## Backend

```text
Next.js
TypeScript
REST API
WebSocket / real-time layer
```

## Authentication

```text
Better Auth
```

## Database

```text
PostgreSQL
Prisma
```

## Validation

```text
Zod
```

## Package Manager

```text
pnpm
```

## State Management

Use a lightweight approach.

Potential choices:

```text
TanStack Query
```

for server state.

Local state should remain local unless shared application state is genuinely required.

---

# 92. API Client

The mobile applications should not manually construct API requests everywhere.

Use a shared API client:

```text
packages/api-client
```

Example:

```text
api.auth.login()

api.products.list()

api.orders.create()

api.orders.get()

api.delivery.accept()

api.delivery.confirmPickup()

api.delivery.confirmDelivery()
```

---

# 93. API Contract

The API contract should be strongly typed.

Example:

```text
Request
   ↓
Validation
   ↓
Service
   ↓
Database
   ↓
Typed Response
```

The mobile applications should never depend on internal Prisma models.

---

# 94. Core Business Rules

## Rule 1

A customer can only access their own orders.

## Rule 2

A vendor can only manage products belonging to that vendor.

## Rule 3

A vendor can only manage their own orders.

## Rule 4

A driver can only update deliveries assigned to them.

## Rule 5

Only Admin can approve vendors.

## Rule 6

Only Admin can approve drivers.

## Rule 7

A driver cannot pick up an order that is not ready.

## Rule 8

A driver cannot mark an order delivered before pickup.

## Rule 9

A vendor cannot mark an order delivered.

## Rule 10

A customer cannot modify an order after the defined processing state.

## Rule 11

Order totals must be calculated server-side.

## Rule 12

Client applications cannot be trusted with authorization.

## Rule 13

Every critical financial operation must be idempotent.

## Rule 14

Every delivery state transition must be validated server-side.

---

# 95. Registration Workflow

## Customer

```text
Install App
    ↓
Sign Up
    ↓
Email/Password OR Google
    ↓
Account Created
    ↓
Customer App
```

## Vendor

```text
Sign Up
    ↓
Business Information
    ↓
Verification
    ↓
Admin Review
    ↓
Approved
    ↓
Vendor Dashboard
```

## Driver

```text
Sign Up
    ↓
Personal Information
    ↓
Vehicle Information
    ↓
Verification
    ↓
Admin Review
    ↓
Approved
    ↓
Driver Dashboard
```

---

# 96. Order Lifecycle

Complete order lifecycle:

```text
CUSTOMER
   │
   │ Create Order
   ▼
ORDER CREATED
   │
   ▼
VENDOR
   │
   │ Accept
   ▼
ACCEPTED
   │
   ▼
PREPARING
   │
   ▼
READY FOR PICKUP
   │
   ▼
DELIVERY SYSTEM
   │
   │ Find Driver
   ▼
DRIVER ASSIGNED
   │
   ▼
DRIVER ACCEPTED
   │
   ▼
ARRIVED AT VENDOR
   │
   ▼
PICKED UP
   │
   ▼
OUT FOR DELIVERY
   │
   ▼
CUSTOMER
   │
   ▼
DELIVERED
```

---

# 97. Cancellation Rules

Cancellation must depend on order state.

Example:

```text
CREATED
    ↓
Customer cancellation allowed

ACCEPTED
    ↓
Cancellation may require policy validation

PREPARING
    ↓
Restricted

READY_FOR_PICKUP
    ↓
Highly restricted

PICKED_UP
    ↓
Customer cancellation not allowed
```

Exact financial consequences should be configurable by Admin.

---

# 98. Reliability Requirements

The system should protect against:

- Duplicate orders
- Duplicate payments
- Duplicate delivery confirmations
- Lost network requests
- Concurrent inventory updates
- Driver assignment conflicts
- Invalid order transitions
- Unauthorized resource access

---

# 99. Performance Requirements

Initial targets:

### API

Typical API requests should aim for:

```text
< 300 ms
```

under normal operating conditions, excluding third-party services.

### Mobile

Primary screens should load quickly and avoid unnecessary network requests.

### Admin

Large tables must use:

- Pagination
- Server-side filtering
- Server-side sorting
- Search

Never load thousands of database records into the browser unnecessarily.

---

# 100. Observability

The backend should support:

- Structured logging
- Error tracking
- API latency tracking
- Database query monitoring
- Authentication events
- Order lifecycle tracking
- Delivery lifecycle tracking

Important metrics:

```text
Request latency
Error rate
Throughput
Database latency
Active orders
Active deliveries
Payment failures
Notification failures
```

---

# 101. Backup and Recovery

PostgreSQL must have:

- Automated backups
- Backup retention
- Recovery procedure
- Database migration strategy

Critical business data must never rely solely on mobile local storage.

---

# 102. Environment Configuration

Environments:

```text
development
staging
production
```

Environment variables should contain:

```text
DATABASE_URL
BETTER_AUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

PAYMENT_PROVIDER_KEY
PAYMENT_WEBHOOK_SECRET

STORAGE_ENDPOINT
STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY

MAP_PROVIDER_KEY

PUSH_NOTIFICATION_CONFIG
```

Secrets must never be committed to Git.

---

# 103. Development Phases

## Phase 1 — Foundation

- Monorepo
- Next.js
- React Native applications
- PostgreSQL
- Prisma
- Better Auth
- Basic RBAC
- Shared API client

---

## Phase 2 — Admin

- Admin authentication
- Dashboard
- User management
- Vendor management
- Driver management
- Product management
- Category management

---

## Phase 3 — Customer

- Customer authentication
- Product browsing
- Search
- Cart
- Address
- Checkout
- Orders
- Order history

---

## Phase 4 — Vendor

- Vendor onboarding
- Admin approval
- Product management
- Inventory
- Order management
- Earnings

---

## Phase 5 — Driver

- Driver onboarding
- Verification
- Online/offline
- Delivery assignment
- Pickup
- Delivery
- Earnings

---

## Phase 6 — Delivery Infrastructure

- Delivery state machine
- Driver assignment
- Location tracking
- Maps
- Real-time updates
- Notifications

---

## Phase 7 — Payments

- Payment integration
- Payment verification
- Refunds
- Vendor earnings
- Driver payouts
- Admin financial dashboard

---

## Phase 8 — Analytics

- Customer analytics
- Vendor analytics
- Driver analytics
- Platform analytics
- Operational dashboards

---

## Phase 9 — Hardening

- Security testing
- Load testing
- Database optimization
- Error handling
- Monitoring
- Backup verification
- Disaster recovery testing

---

# 104. MVP Scope

The first usable version should NOT attempt to implement every possible feature.

### MVP Customer

- Authentication
- Browse products
- Product details
- Cart
- Checkout
- Address
- Order creation
- Order tracking
- Order history

### MVP Vendor

- Authentication
- Admin approval
- Product management
- Inventory
- Order acceptance
- Order preparation
- Ready for pickup

### MVP Driver

- Authentication
- Admin approval
- Online/offline
- Delivery assignment
- Accept delivery
- Pickup confirmation
- Delivery confirmation
- Delivery history

### MVP Admin

- Authentication
- Dashboard
- Customer management
- Vendor management
- Driver management
- Product management
- Order management
- Delivery management

---

# 105. Explicitly Out of Initial MVP

The following should not block the first release:

- Complex recommendation engine
- AI customer support
- Multi-vendor cart
- Advanced loyalty system
- Subscription plans
- Advanced promotions
- Microservice architecture
- International logistics
- Complex route optimization
- Driver bidding
- Automated dynamic pricing

These can be added after the core delivery workflow is stable.

---

# 106. Important Product Constraint

The platform should initially use:

```text
ONE ORDER
      ↓
ONE VENDOR
      ↓
ONE DELIVERY
      ↓
ONE DRIVER
```

Do not start with multi-vendor checkout.

Multi-vendor checkout significantly complicates:

- Order splitting
- Payments
- Inventory
- Delivery
- Vendor settlement
- Refunds
- Driver assignment

It should be treated as a future capability.

---

# 107. Definition of Done

The MVP is considered operational when:

### Customer

A customer can:

```text
Register
   ↓
Browse
   ↓
Add to Cart
   ↓
Checkout
   ↓
Create Order
   ↓
Track Order
   ↓
Receive Delivery
```

### Vendor

A vendor can:

```text
Register
   ↓
Get Approved
   ↓
Add Product
   ↓
Receive Order
   ↓
Prepare Order
   ↓
Mark Ready
```

### Driver

A driver can:

```text
Register
   ↓
Get Approved
   ↓
Go Online
   ↓
Receive Delivery
   ↓
Accept
   ↓
Pickup
   ↓
Deliver
   ↓
Complete Delivery
```

### Admin

An admin can:

```text
Manage Customers
Manage Vendors
Manage Drivers
Manage Products
Manage Orders
Manage Deliveries
Monitor Platform
```

---

# 108. Final Product Structure

```text
                  DELIVERY PLATFORM
                         │
             ┌───────────┴───────────┐
             │                       │
        ADMIN WEBSITE            MOBILE SYSTEM
             │                       │
             │          ┌────────────┼────────────┐
             │          │            │            │
             ▼          ▼            ▼            ▼
          ADMIN     CUSTOMER       VENDOR       DRIVER
                     APP            APP           APP
             │          │            │            │
             └──────────┴────────────┴────────────┘
                            │
                            ▼
                     NEXT.JS BACKEND
                            │
                ┌───────────┼───────────┐
                │           │           │
             Better       Prisma      Real-time
              Auth          │           │
                            ▼           │
                       PostgreSQL       │
                                        │
                         ┌──────────────┘
                         │
                 Delivery Services
                         │
              ┌──────────┼──────────┐
              │          │          │
            Maps      Payments   Notifications
```

---

# 109. Product Principle

The platform should be designed around one central concept:

> **Customer orders → Vendor prepares → Driver delivers → Admin controls and monitors the ecosystem.**

Every feature should reinforce this workflow rather than introducing unnecessary complexity.

---

# 110. Success Criteria

The initial platform succeeds when the complete delivery cycle can reliably happen without manual database intervention:

```text
Customer
   ↓
Order
   ↓
Vendor
   ↓
Preparation
   ↓
Driver Assignment
   ↓
Pickup
   ↓
Delivery
   ↓
Customer Confirmation
   ↓
Payment Settlement
   ↓
Admin Visibility
```

The backend is the source of truth for this entire lifecycle.
