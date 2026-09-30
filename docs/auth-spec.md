# Authentication & Authorization Specification

## Multi-Role Delivery Platform

**Version:** `v1`
**Authentication Provider:** Better Auth
**Authorization Model:** RBAC + Resource Ownership
**Primary Database:** PostgreSQL
**ORM:** Prisma
**Web Client:** Next.js
**Mobile Clients:** React Native
**API:** Next.js API
**Authentication Provider:** Better Auth
**Supported Social Provider:** Google

---

# 1. Purpose

This document defines the authentication, session management, authorization, account lifecycle, role management, security, and authentication-related API behavior for the Multi-Role Delivery Platform.

The platform contains four roles:

```text
ADMIN
CUSTOMER
VENDOR
DRIVER
```

And four application clients:

```text
Admin Web
Customer Mobile
Vendor Mobile
Driver Mobile
```

Authentication establishes:

> **Who is the user?**

Authorization establishes:

> **What is this user allowed to do?**

These two responsibilities must remain separate.

---

# 2. Authentication Architecture

```text
                    ┌─────────────────────┐
                    │      CLIENTS        │
                    │                     │
                    │ Admin Web           │
                    │ Customer Mobile     │
                    │ Vendor Mobile       │
                    │ Driver Mobile       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Better Auth       │
                    │                     │
                    │ Sign Up             │
                    │ Sign In             │
                    │ Google OAuth        │
                    │ Sessions            │
                    │ Sign Out            │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Authentication      │
                    │ Middleware/Service  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Authorization       │
                    │                     │
                    │ Role                │
                    │ Ownership           │
                    │ Resource Access     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Domain Services     │
                    └─────────────────────┘
```

---

# 3. Authentication Provider

Better Auth is the centralized authentication system.

It is responsible for:

```text
User authentication
Credential authentication
Google authentication
Session management
Account linking
Session expiration
Sign out
Authentication verification
```

The application must not implement a second authentication system alongside Better Auth.

Do not create separate custom authentication tables for:

```text
password login
Google login
mobile login
admin login
vendor login
driver login
```

All identities must ultimately resolve to the same application `User`.

---

# 4. Identity Model

The authentication system distinguishes between:

```text
Authentication Identity
        +
Application User
        +
Application Role
        +
Role-specific Profile
```

Example:

```text
Google Account
      |
      v
Better Auth Account
      |
      v
User
      |
      +---- role = CUSTOMER
      |
      v
CustomerProfile
```

Vendor:

```text
User
 |
 +---- role = VENDOR
 |
 v
Vendor
```

Driver:

```text
User
 |
 +---- role = DRIVER
 |
 v
Driver
```

Admin:

```text
User
 |
 +---- role = ADMIN
```

---

# 5. User Roles

The system supports exactly four primary roles:

```text
ADMIN
CUSTOMER
VENDOR
DRIVER
```

Role values must be represented as a strict enum.

```ts
enum UserRole {
  ADMIN
  CUSTOMER
  VENDOR
  DRIVER
}
```

Do not create arbitrary roles through the UI.

---

# 6. Role Meaning

## ADMIN

Platform operator.

Can manage:

```text
Users
Vendors
Drivers
Products
Categories
Orders
Deliveries
Payments
Refunds
Reviews
Settings
Audit logs
```

Admin permissions are platform-wide.

---

## CUSTOMER

Platform buyer.

Can:

```text
Browse products
Manage addresses
Manage cart
Checkout
Pay
View own orders
Track own deliveries
Cancel eligible orders
Request refunds
Create eligible reviews
Manage own profile
```

---

## VENDOR

Product seller.

Can:

```text
Manage own products
Manage own inventory
View own orders
Process own orders
Update product availability
Manage vendor profile
```

Vendor access is restricted to the vendor's own resources.

---

## DRIVER

Delivery operator.

Can:

```text
Manage own profile
Manage availability
View assigned deliveries
Accept/reject assignments
Pickup orders
Update delivery state
Send active delivery location
Complete delivery
Submit delivery verification
```

Driver access is restricted to assigned/owned delivery resources.

---

# 7. Role Is Not Authentication

Authentication:

```text
User is authenticated
```

does not imply:

```text
User can access everything.
```

Example:

```text
Authenticated CUSTOMER
        |
        X
        |
        +--> /api/v1/admin/users
```

must return:

```text
403 AUTH_FORBIDDEN
```

---

# 8. Role Assignment

Role assignment is server-controlled.

Clients must never submit:

```json
{
  "role": "ADMIN"
}
```

during ordinary signup.

The backend determines the appropriate initial role.

---

# 9. Customer Registration

Default public registration creates:

```text
User
role = CUSTOMER
status = ACTIVE
CustomerProfile
```

Example flow:

```text
Signup
   |
   v
Validate input
   |
   v
Create Better Auth identity
   |
   v
Create application User
   |
   v
Assign CUSTOMER
   |
   v
Create CustomerProfile
   |
   v
Create session
   |
   v
Authenticated Customer
```

Customers must not self-register as:

```text
ADMIN
VENDOR
DRIVER
```

---

# 10. Vendor Registration

Vendor onboarding should not allow a user to simply select:

```text
role = VENDOR
```

Instead:

```text
Customer/User account
       |
       v
Vendor application/onboarding
       |
       v
Admin review
       |
       +--> APPROVED
       |
       +--> REJECTED
```

The exact product onboarding flow may create the vendor profile before approval while keeping it inactive.

Recommended:

```text
User.role = VENDOR
Vendor.status = PENDING
```

until admin approval.

Vendor APIs remain restricted while:

```text
Vendor.status != APPROVED
```

---

# 11. Driver Registration

Driver onboarding follows the same principle.

```text
User
 |
 v
Driver application
 |
 v
Admin review
 |
 +----> APPROVED
 |
 +----> REJECTED
```

Recommended states:

```text
PENDING
APPROVED
ACTIVE
SUSPENDED
DEACTIVATED
```

A driver with:

```text
Driver.status = PENDING
```

cannot accept deliveries.

---

# 12. Admin Creation

Admin accounts must not be created through normal public signup.

Admin creation must be controlled by:

```text
Initial deployment/seed
Secure administrative process
Existing authorized administrator
```

The public API must never expose:

```text
POST /signup
{
  "role": "ADMIN"
}
```

---

# 13. Google Authentication

Google authentication is supported through Better Auth.

Flow:

```text
Client
   |
   v
Better Auth
   |
   v
Google OAuth
   |
   v
Google
   |
   v
OAuth Callback
   |
   v
Better Auth
   |
   v
Account Linking / User Resolution
   |
   v
Application User
   |
   v
Session
```

The Google identity must resolve to the existing application user where account linking rules permit it.

---

# 14. Google Account Linking

A user may have multiple authentication methods associated with the same application account.

Example:

```text
User
 |
 +-- Email/password
 |
 +-- Google
```

The application must avoid accidentally creating duplicate users when the same verified identity is used.

Account linking must be performed through Better Auth's supported mechanisms.

Do not implement unsafe manual account merging based solely on an unverified email string.

---

# 15. Email Identity

Email addresses must be normalized consistently.

Recommended normalization:

```text
trim
lowercase
```

The canonical identity must be stored consistently.

Example:

```text
User@Example.com
```

becomes:

```text
user@example.com
```

before identity comparison where appropriate.

---

# 16. Email Verification

If email/password authentication is enabled, email verification should be required before sensitive account operations.

Recommended:

```text
Signup
  |
  v
Email verification
  |
  v
Account activation
```

Google accounts with a verified provider identity may follow the provider verification semantics.

---

# 17. Password Authentication

If email/password login is enabled:

```text
Password
   |
   v
Better Auth
   |
   v
Password hashing
```

The application must never store plaintext passwords.

The application must not implement custom password hashing outside Better Auth unless explicitly required by the authentication library architecture.

---

# 18. Password Rules

Minimum requirements should include:

```text
Minimum length
Password confirmation
Common-password rejection
Rate limiting
Authentication attempt protection
```

Recommended minimum:

```text
12 characters
```

Do not impose arbitrary complexity requirements that encourage predictable passwords.

---

# 19. Password Reset

Password reset must be handled through Better Auth's supported flow.

Conceptual flow:

```text
Forgot password
      |
      v
Email verification
      |
      v
Reset token
      |
      v
New password
      |
      v
Invalidate relevant old sessions
```

Reset tokens must:

```text
expire
be single-use
be securely generated
never appear in application logs
```

---

# 20. Session Architecture

Sessions are the application's primary authenticated state.

```text
Client
  |
  v
Session
  |
  v
Authenticated User
```

A session must resolve to:

```text
userId
```

The backend then loads authoritative application data:

```text
User
Role
Status
Vendor/Driver/Customer profile
```

---

# 21. Web Session

The Admin Web application should use secure browser session handling.

Recommended properties:

```text
HttpOnly
Secure in production
SameSite appropriate to deployment
Short/controlled lifetime
```

The browser should not have direct JavaScript access to sensitive authentication cookies.

---

# 22. Mobile Session

React Native clients require an explicit mobile-compatible session transport.

Do not assume browser cookies work identically in native applications.

The mobile authentication layer must support:

```text
Login
Session persistence
Session restoration
Authenticated API requests
Logout
Session expiration
Session refresh
```

If Better Auth's native integration uses a token/session mechanism, the implementation must follow the supported Better Auth transport rather than inventing a parallel JWT authentication system.

---

# 23. Mobile Secure Storage

Authentication credentials/session material stored on mobile must use platform secure storage.

Conceptually:

```text
iOS
    -> Keychain

Android
    -> Android Keystore / secure credential storage
```

Do not store authentication secrets in:

```text
AsyncStorage
Plain SQLite
Plain files
Redux persistence
Normal local storage
```

unless the value is explicitly non-sensitive.

---

# 24. Session Restoration

When the mobile application starts:

```text
App launch
   |
   v
Load secure session material
   |
   v
Validate/restore session
   |
   +---- valid ----> authenticated application
   |
   +---- expired --> refresh/re-authentication
   |
   +---- invalid --> login
```

The UI must show an authentication-loading state during restoration.

It must not flash the login screen before session restoration completes.

---

# 25. Session Expiration

When a session expires:

```text
API
 |
 v
401 AUTH_SESSION_EXPIRED
 |
 v
Client attempts supported session renewal
 |
 +---- success --> retry safe request
 |
 +---- failure --> clear session
                    |
                    v
                  Login
```

Do not endlessly retry expired sessions.

---

# 26. Logout

Logout must invalidate the authenticated session.

Web:

```text
POST /api/auth/sign-out
```

Mobile:

```text
Better Auth sign-out flow
       |
       v
Clear server session
       |
       v
Clear secure local session material
```

Logout must clear local authentication state.

---

# 27. Authentication Context

Every authenticated API request should produce an internal context similar to:

```ts
type AuthContext = {
  userId: string;
  role: UserRole;
  userStatus: UserStatus;
  sessionId: string;
};
```

Additional profile information may be loaded when required.

---

# 28. Authentication Middleware

Protected APIs should follow:

```text
Request
  |
  v
Authentication Middleware
  |
  +---- unauthenticated --> 401
  |
  v
Authenticated User
  |
  v
Authorization
  |
  +---- forbidden --> 403
  |
  v
Route Handler
```

---

# 29. Authentication Errors

Unauthenticated:

```json
{
  "success": false,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication is required"
  }
}
```

Invalid session:

```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_SESSION",
    "message": "The current session is invalid"
  }
}
```

Expired session:

```json
{
  "success": false,
  "error": {
    "code": "AUTH_SESSION_EXPIRED",
    "message": "The current session has expired"
  }
}
```

Forbidden:

```json
{
  "success": false,
  "error": {
    "code": "AUTH_FORBIDDEN",
    "message": "You do not have permission to perform this action"
  }
}
```

Do not expose internal authorization reasoning that could assist an attacker.

---

# 30. User Status

User status is separate from role.

Recommended values:

```text
PENDING
ACTIVE
SUSPENDED
DEACTIVATED
```

---

# 31. User Status Rules

## PENDING

Account exists but has not completed required activation.

```text
Authentication: limited
Business access: denied
```

---

## ACTIVE

Normal account.

```text
Authentication: allowed
Business access: role-dependent
```

---

## SUSPENDED

Temporarily blocked.

```text
Authentication: restricted
Business access: denied
```

Existing sessions should be invalidated when appropriate.

---

## DEACTIVATED

Account permanently/inactively disabled.

```text
Authentication: denied
Business access: denied
```

---

# 32. Role + Status

Authorization must evaluate both role and status.

Example:

```text
User.role = DRIVER
User.status = ACTIVE
Driver.status = SUSPENDED
```

Result:

```text
Driver business operations = DENIED
```

Similarly:

```text
User.role = VENDOR
User.status = ACTIVE
Vendor.status = PENDING
```

Vendor business operations remain restricted until approval.

---

# 33. Vendor Authorization

Vendor access requires:

```text
authenticated user
+
role = VENDOR
+
user status = ACTIVE
+
vendor status = APPROVED/ACTIVE
```

A vendor may only access:

```text
own products
own inventory
own orders
own vendor profile
```

---

# 34. Driver Authorization

Driver access requires:

```text
authenticated user
+
role = DRIVER
+
user status = ACTIVE
+
driver status = APPROVED/ACTIVE
```

A driver may only access:

```text
own driver profile
own availability
assigned deliveries
own active delivery location
```

---

# 35. Customer Authorization

Customer access requires:

```text
authenticated user
+
role = CUSTOMER
+
user status = ACTIVE
```

A customer may access:

```text
own profile
own addresses
own cart
own orders
own payments
own refunds
own reviews
own notifications
```

---

# 36. Admin Authorization

Admin access requires:

```text
authenticated user
+
role = ADMIN
+
user status = ACTIVE
```

Admin APIs must still use explicit permission checks.

Do not assume:

```text
role = ADMIN
```

means every internal operation should automatically be allowed.

---

# 37. Role Permission Matrix

| Resource          |    Admin |         Customer |                    Vendor |           Driver |
| ----------------- | -------: | ---------------: | ------------------------: | ---------------: |
| Own profile       |      Yes |              Yes |                       Yes |              Yes |
| All users         |      Yes |               No |                        No |               No |
| Categories        |   Manage |             Read |                      Read |             Read |
| All products      |   Manage |             Read |                        No |               No |
| Own products      |      Yes |               No |                    Manage |               No |
| Own inventory     |      Yes |               No |                    Manage |               No |
| Cart              |     Yes* |           Manage |                        No |               No |
| Own orders        |      Yes |     Read/limited | Read/manage vendor orders | Delivery-related |
| All orders        |      Yes |               No |                        No |               No |
| Deliveries        |   Manage |        Track own |             Read relevant |  Manage assigned |
| Driver assignment |      Yes |               No |                        No |               No |
| Payments          |   Manage |              Own |             Relevant data |               No |
| Refunds           |   Manage | Request/view own |                   Limited |               No |
| Reviews           | Moderate |       Create own |             Read relevant |               No |
| Notifications     |   Manage |              Own |                       Own |              Own |
| Audit logs        |     Read |               No |                        No |               No |
| Platform settings |   Manage |               No |                        No |               No |

`*` Admin cart access is optional and should only exist if explicitly required.

---

# 38. Resource Ownership

Role checks alone are insufficient.

Example:

```text
Vendor A
   |
   +--> Product A
```

Vendor A:

```text
PATCH /vendor/products/product-a
```

allowed.

Vendor B:

```text
PATCH /vendor/products/product-a
```

must receive:

```text
403 AUTH_FORBIDDEN
```

even though Vendor B has the correct role.

---

# 39. Ownership Query Pattern

Authorization should be enforced as close to the database query as practical.

Conceptually:

```ts
const product = await prisma.product.findFirst({
  where: {
    id: productId,
    vendorId: currentVendorId,
  },
});
```

Do not:

```ts
find product by ID
then trust client ownership
```

---

# 40. Object-Level Authorization

Every resource endpoint must answer:

```text
Who owns this resource?
Who is allowed to access it?
Does the current user have access?
```

Resources requiring ownership checks include:

```text
Address
Cart
CartItem
Order
Payment
Refund
Review
Notification
Product
Inventory
Delivery
DriverAssignment
DriverLocation
```

---

# 41. Order Authorization

Customer:

```text
order.customerId == currentUser.customerId
```

Vendor:

```text
order.vendorId == currentVendor.id
```

Driver:

```text
delivery.driverId == currentDriver.id
```

Admin:

```text
platform-level access
```

---

# 42. Delivery Authorization

A driver may access a delivery only when:

```text
delivery.driverId == currentDriver.id
```

or the driver has a valid active assignment.

A driver must not be able to query arbitrary delivery IDs and discover customer information.

---

# 43. Sensitive Data Isolation

The API must return only fields required by the requesting client.

Example:

A customer tracking response should not expose:

```text
driver internal ID
driver private phone number
internal assignment metadata
administrative notes
```

unless explicitly required.

---

# 44. Admin Data Access

Admin responses may contain additional operational data, but sensitive authentication data remains inaccessible.

Admin APIs must never return:

```text
password hashes
OAuth tokens
session secrets
provider access tokens
payment secrets
```

---

# 45. Session Revocation

Sessions should be revocable.

Required scenarios:

```text
Account suspension
Account deactivation
Security incident
Password reset where appropriate
Manual admin logout-all
```

Recommended internal operation:

```text
revokeAllUserSessions(userId)
```

---

# 46. Logout All Sessions

For sensitive account events:

```text
User
 |
 v
Invalidate active sessions
 |
 v
Require re-authentication
```

This is especially important for:

```text
Password reset
Account compromise
Admin suspension
Credential security events
```

---

# 47. Admin Security

Admin authentication requires stronger protection than normal customer access.

Recommended:

```text
Strong password policy
Google authentication where appropriate
MFA capability
Shorter administrative session lifetime
Rate limiting
Audit logging
```

MFA should be treated as an important production requirement for administrative accounts.

---

# 48. MFA

The architecture should allow MFA without redesigning authorization.

Conceptually:

```text
Primary authentication
        |
        v
MFA verification
        |
        v
Authenticated session
```

MFA status should not become a replacement for role authorization.

A user can be:

```text
ADMIN + MFA verified
```

but still needs normal role and resource authorization.

---

# 49. Device Management

The architecture may support future device/session management:

```text
User
 |
 +--> Session A
 |
 +--> Session B
 |
 +--> Session C
```

Future admin/user functionality may include:

```text
View active sessions
Revoke session
Revoke all sessions
```

This is optional for MVP but should not conflict with the session architecture.

---

# 50. Authentication Rate Limiting

Strict rate limits should apply to:

```text
Sign in
Signup
Password reset
OTP verification
MFA verification
Google OAuth initiation
```

Limits should be based on combinations of:

```text
IP
Account identity
Device/session context
```

where appropriate.

Do not rely only on IP-based rate limiting.

---

# 51. Brute-Force Protection

Repeated failed authentication attempts should trigger appropriate protection.

Possible controls:

```text
Rate limiting
Temporary delays
Account protection
Security notifications
Progressive restrictions
```

Do not reveal whether an email address exists during password-reset/account-recovery flows.

---

# 52. Session Security

Sessions must:

```text
expire
be revocable
be protected against theft
use secure transport
avoid unnecessary client exposure
```

Production authentication traffic must use HTTPS.

---

# 53. CSRF Protection

Browser-based state-changing requests must be protected against CSRF according to Better Auth's supported mechanisms and the application's cookie/session configuration.

Do not disable CSRF protections merely to make API calls easier.

---

# 54. CORS

CORS must be explicitly configured.

Allowed origins should include only known application origins.

Example:

```text
Admin Web:
https://admin.example.com

Mobile:
native application origins / supported authentication transport
```

Never use unrestricted production:

```text
Access-Control-Allow-Origin: *
```

for authenticated APIs unless there is a documented reason and the authentication architecture makes it safe.

---

# 55. Token Handling

If the mobile authentication implementation uses tokens:

```text
Access token
Refresh/session mechanism
```

must be handled by the authentication system.

Never:

```text
hardcode tokens
store tokens in source control
log tokens
place tokens in URLs
send tokens to analytics systems
```

---

# 56. URL Security

Never place sensitive authentication credentials in URLs.

Forbidden:

```text
GET /login?token=SECRET
GET /reset?password=SECRET
```

Sensitive values should be transmitted through secure mechanisms.

---

# 57. Authentication Logging

Authentication events should be logged in a security-conscious way.

Recommended events:

```text
LOGIN_SUCCESS
LOGIN_FAILURE
LOGOUT
SESSION_CREATED
SESSION_REVOKED
PASSWORD_RESET_REQUESTED
PASSWORD_RESET_COMPLETED
ACCOUNT_SUSPENDED
ACCOUNT_REACTIVATED
GOOGLE_ACCOUNT_LINKED
MFA_SUCCESS
MFA_FAILURE
```

Do not log passwords or authentication tokens.

---

# 58. Audit Events

Security-sensitive administrative operations must create audit logs.

Example:

```json
{
  "action": "USER_SUSPENDED",
  "actorId": "usr_admin",
  "entityType": "USER",
  "entityId": "usr_123",
  "requestId": "req_123",
  "metadata": {
    "reason": "Policy violation"
  }
}
```

---

# 59. Authentication Database Model

Authentication-related storage should follow the Better Auth schema requirements.

Application-level identity:

```text
User
```

Application role:

```text
User.role
```

Application status:

```text
User.status
```

Authentication account:

```text
Account
```

Authentication session:

```text
Session
```

Verification:

```text
Verification
```

Role-specific profiles:

```text
CustomerProfile
Vendor
Driver
```

---

# 60. User Model

Conceptual model:

```text
User
├── id
├── name
├── email
├── emailVerified
├── image
├── role
├── status
├── createdAt
└── updatedAt
```

The exact Better Auth-managed fields must follow the installed Better Auth schema.

Application-specific fields should be added carefully without conflicting with Better Auth's schema.

---

# 61. Account Model

Conceptually:

```text
Account
├── id
├── userId
├── providerId
├── accountId
├── accessToken
├── refreshToken
├── accessTokenExpiresAt
├── refreshTokenExpiresAt
└── ...
```

Sensitive provider credentials must never be exposed through application APIs.

---

# 62. Session Model

Conceptually:

```text
Session
├── id
├── userId
├── token
├── expiresAt
├── ipAddress
├── userAgent
├── createdAt
└── updatedAt
```

Exact schema must follow the Better Auth version used by the project.

---

# 63. Authentication Database Ownership

Better Auth owns authentication-specific persistence behavior.

Application domain logic owns:

```text
User.role
User.status
CustomerProfile
Vendor
Driver
```

Do not mix domain authorization logic into Better Auth internals.

---

# 64. Role Changes

Role changes are sensitive operations.

Example:

```text
CUSTOMER
   |
   v
VENDOR
```

must not happen through a normal profile update.

Role changes require:

```text
authorization
validation
audit log
profile creation/validation
```

Recommended role-change flow:

```text
Admin
 |
 v
Approve vendor/driver
 |
 v
Update role/profile
 |
 v
Audit
 |
 v
Invalidate/re-evaluate sessions if necessary
```

---

# 65. Role Escalation Prevention

Never trust client-provided:

```text
role
permissions
vendorId
driverId
admin=true
```

Examples of forbidden patterns:

```json
{
  "role": "ADMIN"
}
```

or:

```json
{
  "isAdmin": true
}
```

or:

```json
{
  "vendorId": "another-vendor"
}
```

The server derives these values from authenticated identity and authorized relationships.

---

# 66. Authentication State in Client Applications

Clients should maintain a small authentication state model:

```text
UNKNOWN
AUTHENTICATING
AUTHENTICATED
UNAUTHENTICATED
```

Example:

```text
App launch
   |
   v
UNKNOWN
   |
   v
AUTHENTICATING
   |
   +---- valid ----> AUTHENTICATED
   |
   +---- invalid --> UNAUTHENTICATED
```

Do not treat `UNKNOWN` as `UNAUTHENTICATED`.

---

# 67. Role-Based Routing

After authentication:

```text
ADMIN
   -> Admin Web

CUSTOMER
   -> Customer App

VENDOR
   -> Vendor App

DRIVER
   -> Driver App
```

The backend remains the authority.

Client-side routing is only a UX layer.

---

# 68. Wrong-Client Access

If a customer somehow opens a vendor application:

```text
Authenticated user
role = CUSTOMER
```

the application should not expose vendor functionality.

Similarly:

```text
DRIVER -> Customer checkout
VENDOR -> Admin dashboard
CUSTOMER -> Admin API
```

must be rejected by server authorization.

---

# 69. Role-Specific Session Bootstrap

After successful authentication, the client may request:

```http
GET /api/v1/me
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "usr_123",
    "role": "VENDOR",
    "status": "ACTIVE",
    "profile": {
      "vendorId": "ven_123",
      "vendorStatus": "APPROVED"
    }
  }
}
```

This allows the client to determine the appropriate application state.

---

# 70. Authentication Bootstrap

Recommended sequence:

```text
Application Start
       |
       v
Restore Authentication Session
       |
       v
GET /me
       |
       v
Resolve Role + Status
       |
       v
Load Role-Specific Application
```

---

# 71. Customer Bootstrap

```text
Session
  |
  v
User
  |
  v
CUSTOMER
  |
  v
CustomerProfile
  |
  v
Customer Mobile
```

---

# 72. Vendor Bootstrap

```text
Session
  |
  v
User
  |
  v
VENDOR
  |
  v
Vendor Profile
  |
  +---- PENDING ----> Approval Screen
  |
  +---- APPROVED ---> Vendor App
  |
  +---- SUSPENDED --> Restricted Screen
```

---

# 73. Driver Bootstrap

```text
Session
  |
  v
User
  |
  v
DRIVER
  |
  v
Driver Profile
  |
  +---- PENDING ----> Approval Screen
  |
  +---- APPROVED ---> Driver App
  |
  +---- SUSPENDED --> Restricted Screen
```

---

# 74. Admin Bootstrap

```text
Session
  |
  v
User
  |
  v
ADMIN
  |
  v
ACTIVE
  |
  v
Admin Dashboard
```

---

# 75. Authentication API Boundary

Authentication APIs:

```text
/api/auth/*
```

Application APIs:

```text
/api/v1/*
```

Example:

```text
/api/auth/sign-in
/api/auth/sign-out
/api/auth/session

/api/v1/me
/api/v1/products
/api/v1/customer/orders
/api/v1/vendor/orders
/api/v1/driver/deliveries
/api/v1/admin/users
```

Do not mix authentication implementation routes with domain APIs.

---

# 76. Authorization Service

Recommended internal service:

```text
src/modules/auth/
├── auth.service.ts
├── authorization.service.ts
├── session.service.ts
├── role.service.ts
├── policies/
│   ├── customer.policy.ts
│   ├── vendor.policy.ts
│   ├── driver.policy.ts
│   └── admin.policy.ts
└── schemas/
    └── auth.schemas.ts
```

---

# 77. Policy-Based Authorization

Authorization should support reusable policies.

Example:

```ts
canUpdateProduct(user, product);
canViewOrder(user, order);
canManageDelivery(user, delivery);
canIssueRefund(user, order);
```

Policies should return explicit authorization decisions.

---

# 78. Authorization Layers

Use multiple layers:

```text
Layer 1:
Authentication

Layer 2:
Role

Layer 3:
Resource ownership

Layer 4:
Resource status

Layer 5:
Business state
```

Example:

```text
Driver
  |
  +-- authenticated?
  |
  +-- role DRIVER?
  |
  +-- driver active?
  |
  +-- assigned to delivery?
  |
  +-- delivery state allows action?
  |
  v
ALLOW
```

---

# 79. Example: Driver Pickup

Request:

```http
POST /api/v1/driver/deliveries/del_123/pickup
```

Authorization flow:

```text
1. Authenticate session
2. Confirm role = DRIVER
3. Load Driver
4. Confirm Driver is active
5. Load Delivery
6. Confirm driver owns assignment
7. Confirm delivery state = PICKUP_READY
8. Perform pickup transaction
9. Update delivery
10. Update order
11. Create state history
12. Audit if required
13. Return response
```

---

# 80. Example: Vendor Product Update

```text
PATCH /api/v1/vendor/products/prd_123
```

Flow:

```text
Authenticate
    |
    v
Role = VENDOR
    |
    v
Vendor ACTIVE/APPROVED
    |
    v
Product belongs to vendor
    |
    v
Validate request
    |
    v
Update product
```

---

# 81. Example: Customer Order Access

```text
GET /api/v1/customer/orders/ord_123
```

Flow:

```text
Authenticate
    |
    v
Role = CUSTOMER
    |
    v
Customer active
    |
    v
Order.customerId == currentCustomer.id
    |
    v
Return order
```

---

# 82. Example: Admin User Suspension

```text
POST /api/v1/admin/users/usr_123/suspend
```

Flow:

```text
Authenticate
    |
    v
Role = ADMIN
    |
    v
Admin active
    |
    v
Validate target
    |
    v
Suspend user
    |
    v
Invalidate sessions
    |
    v
Create audit log
    |
    v
Return result
```

---

# 83. Authentication Events

Recommended domain/security events:

```text
auth.user.created
auth.user.verified
auth.login.success
auth.login.failed
auth.logout
auth.session.created
auth.session.revoked
auth.password.reset
auth.google.linked
auth.user.suspended
auth.user.deactivated
auth.role.changed
```

These may feed:

```text
Notifications
Audit logs
Security monitoring
Analytics
```

---

# 84. Security Notifications

Potential security notifications:

```text
New login
Password changed
Password reset
New authentication provider linked
Account suspended
Session revoked
```

Security notifications must not reveal secrets.

---

# 85. Account Deactivation

When a user is deactivated:

```text
User.status = DEACTIVATED
```

Then:

```text
Invalidate sessions
Disable business operations
Preserve historical records
```

Do not delete historical orders merely because the user account is deactivated.

---

# 86. Account Suspension

Suspension should:

```text
block business operations
invalidate active sessions where appropriate
record audit event
preserve historical data
```

Reactivation requires appropriate authorization.

---

# 87. Authentication and Orders

Historical orders must remain associated with the original user identity even after:

```text
suspension
deactivation
role changes
```

Do not destroy business history as part of authentication lifecycle operations.

---

# 88. Authentication and Vendor Data

Vendor deactivation must not delete:

```text
historical orders
order items
payment records
audit logs
delivery records
```

The vendor should be disabled rather than destructively deleted.

---

# 89. Authentication and Driver Data

Driver deactivation must preserve:

```text
completed deliveries
assignment history
audit records
historical location references where retained
```

Active deliveries must be handled through a controlled reassignment/failure workflow.

---

# 90. Security Boundaries

The following are trusted only when generated server-side:

```text
userId
role
vendorId
driverId
customerId
order ownership
payment amount
inventory quantity
delivery assignment
permission
```

The client may provide identifiers as requests, but the backend must verify them.

---

# 91. No Client-Side Authorization

This is insufficient:

```ts
if (user.role === "ADMIN") {
  showAdminButton();
}
```

This is only UX.

The API must still perform:

```text
requireRole("ADMIN")
```

on every protected operation.

---

# 92. Mobile Offline Behavior

Authentication state may be cached locally for UX, but offline state must never be treated as authoritative authorization.

For example:

```text
Driver app says:
AVAILABLE
```

does not guarantee the backend still considers the driver available.

The next server request determines the authoritative state.

---

# 93. Authentication Failure UX

Clients should distinguish:

```text
401
```

from:

```text
403
```

### 401

User needs authentication.

Example:

```text
Session expired
Please sign in again.
```

### 403

User is authenticated but lacks permission.

Example:

```text
You don't have permission to perform this action.
```

Do not redirect every `403` to login.

---

# 94. Account Status UX

### Suspended

```text
Your account has been temporarily suspended.
```

### Deactivated

```text
Your account is no longer active.
```

### Pending Vendor/Driver

```text
Your application is awaiting approval.
```

The UI should not expose internal administrative notes.

---

# 95. Authentication Testing

Minimum tests:

```text
[ ] Customer signup
[ ] Customer login
[ ] Google login
[ ] Logout
[ ] Session restoration
[ ] Session expiration
[ ] Password reset
[ ] Invalid credentials
[ ] Rate limiting
[ ] Suspended account
[ ] Deactivated account
[ ] Vendor authorization
[ ] Driver authorization
[ ] Admin authorization
[ ] Resource ownership
[ ] Cross-user access prevention
[ ] Cross-vendor access prevention
[ ] Cross-driver delivery access prevention
[ ] Role escalation prevention
[ ] Session revocation
```

---

# 96. Authorization Test Matrix

Every protected resource should test:

```text
Unauthenticated
Wrong role
Correct role + wrong owner
Correct role + correct owner
Inactive account
Suspended account
Invalid resource state
```

Example:

```text
Vendor Product Update

Unauthenticated       -> 401
Customer              -> 403
Driver                -> 403
Vendor A -> Product B -> 403
Vendor A -> Product A -> 200
Suspended Vendor      -> 403
```

---

# 97. Security Testing

The authentication implementation should be tested against:

```text
Session fixation
Session theft
CSRF
CORS misconfiguration
Brute force
Credential stuffing
Privilege escalation
IDOR
OAuth account linking abuse
Token leakage
Sensitive data exposure
Rate-limit bypass
```

---

# 98. Authentication Environment Variables

Example:

```env
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

DATABASE_URL=
```

Additional provider-specific variables may be added later.

Rules:

```text
Never commit secrets.
Never expose server secrets to mobile clients.
Never expose server secrets through NEXT_PUBLIC_* variables.
```

---

# 99. Environment Separation

Maintain separate credentials for:

```text
Development
Staging
Production
```

Never reuse production OAuth credentials in local development unless explicitly intended.

---

# 100. Production Security Checklist

Before production:

```text
[ ] HTTPS enabled
[ ] Better Auth secret configured
[ ] Google OAuth production credentials configured
[ ] Secure cookies configured
[ ] Mobile secure storage implemented
[ ] Session expiration configured
[ ] Session revocation tested
[ ] Password reset tested
[ ] Rate limiting enabled
[ ] CSRF protection verified
[ ] CORS restricted
[ ] Admin MFA strategy implemented
[ ] Authorization tests passing
[ ] Ownership tests passing
[ ] Audit logging enabled
[ ] Authentication logs redacted
[ ] Secrets excluded from logs
[ ] Secrets excluded from Git
```

---

# 101. Recommended Authentication Directory

```text
src/
├── modules/
│   └── auth/
│       ├── auth.config.ts
│       ├── auth.service.ts
│       ├── authorization.service.ts
│       ├── session.service.ts
│       ├── account.service.ts
│       ├── role.service.ts
│       ├── policies/
│       │   ├── admin.policy.ts
│       │   ├── customer.policy.ts
│       │   ├── vendor.policy.ts
│       │   └── driver.policy.ts
│       ├── guards/
│       │   ├── require-auth.ts
│       │   ├── require-role.ts
│       │   └── require-owner.ts
│       ├── schemas/
│       │   ├── auth.schema.ts
│       │   └── session.schema.ts
│       └── types/
│           └── auth.types.ts
│
├── app/
│   └── api/
│       └── auth/
│
└── middleware.ts
```

---

# 102. Mobile Authentication Structure

Recommended shared package:

```text
packages/auth/
├── src/
│   ├── client.ts
│   ├── session.ts
│   ├── storage.ts
│   ├── guards.ts
│   ├── types.ts
│   └── errors.ts
└── package.json
```

Applications:

```text
apps/customer-mobile
apps/vendor-mobile
apps/driver-mobile
```

should consume the shared authentication infrastructure rather than implementing three independent authentication systems.

---

# 103. Admin Web Authentication Structure

```text
apps/admin-web/
├── app/
│   ├── login/
│   ├── dashboard/
│   └── ...
├── components/
│   └── auth/
└── lib/
    └── auth/
```

Admin authentication must use the same underlying identity system as the rest of the platform.

---

# 104. Authentication Rules

The following rules are mandatory:

1. Better Auth is the authentication authority.
2. PostgreSQL is the application identity source of truth.
3. Roles are server-controlled.
4. Clients cannot assign themselves roles.
5. Authentication and authorization remain separate.
6. Every protected API verifies authentication.
7. Every protected API verifies authorization.
8. Resource ownership must be checked server-side.
9. Suspended users cannot perform normal business operations.
10. Deactivated users cannot authenticate.
11. Vendor approval is required for vendor business operations.
12. Driver approval is required for driver business operations.
13. Admin creation is not public.
14. Authentication secrets must never be logged.
15. Mobile session material must use secure storage.
16. Browser authentication must use secure session handling.
17. Passwords must never be stored in plaintext.
18. Google OAuth must use the supported Better Auth integration.
19. Account linking must be secure.
20. Authentication operations must be rate limited.
21. Sensitive account changes must be auditable.
22. Historical business records must not be destroyed by account deactivation.
23. Client-side authorization is never a security boundary.
24. Realtime authentication must use the same authenticated identity model.
25. API authorization must remain valid even if client UI is compromised.

---

# 105. Authentication Request Flow

```text
┌──────────────────────────┐
│         Client           │
│                          │
│ Web / Customer / Vendor  │
│ / Driver                 │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│       Better Auth        │
│                          │
│ Login / Google / Session │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│    Authenticated User    │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│       Role Check         │
│                          │
│ ADMIN / CUSTOMER /       │
│ VENDOR / DRIVER          │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│    Ownership / Policy    │
│                          │
│ Resource + Status        │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│     Domain Service       │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│       PostgreSQL         │
└──────────────────────────┘
```

---

# 106. Final Authentication Principle

The platform must follow this security model:

```text
AUTHENTICATION
       ↓
"Who are you?"
       ↓
USER ID
       ↓
ROLE
       ↓
"Are you allowed?"
       ↓
OWNERSHIP
       ↓
"Can you access this resource?"
       ↓
RESOURCE STATE
       ↓
"Can you perform this action now?"
       ↓
DOMAIN SERVICE
       ↓
DATABASE
```

The client is responsible for presenting a good user experience.

The server is responsible for deciding whether an operation is actually allowed.

**Never trust the client for identity, role, ownership, permission, price, inventory, payment state, or business state.**
