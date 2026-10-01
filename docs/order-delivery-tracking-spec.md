# Order & Delivery Tracking Specification

## Multi-Role Delivery Platform

**Version:** `v1`
**Status:** Architecture Specification
**Primary Clients:** Customer Mobile, Vendor Mobile, Driver Mobile, Admin Web
**Backend:** Next.js
**Database:** PostgreSQL + Prisma
**Realtime:** WebSocket / SSE
**Geospatial Indexing:** H3
**GPS Source:** Driver/Rider Mobile Device
**Routing:** External or self-hosted road-routing engine
**Maps:** Map provider selected independently from routing/indexing

---

# 1. Purpose

This document defines the complete architecture for:

- Order lifecycle management
- Delivery lifecycle management
- Rider/driver assignment
- GPS tracking
- Live rider location
- Customer delivery tracking
- Driver location updates
- H3 geospatial indexing
- Driver proximity search
- Delivery zones
- Geofencing
- Pickup and delivery verification
- ETA calculation
- Route tracking
- Location history
- GPS quality validation
- Offline GPS handling
- Realtime delivery events
- Tracking privacy
- Location retention
- Dispatch optimization

The system must support the complete lifecycle:

```text
Customer places order
        |
        v
Order confirmed
        |
        v
Vendor prepares parcel
        |
        v
Parcel ready for pickup
        |
        v
Driver assigned
        |
        v
Driver accepts
        |
        v
Driver reaches pickup
        |
        v
Driver collects parcel
        |
        v
Driver travels to customer
        |
        v
Customer tracks driver
        |
        v
Driver reaches delivery area
        |
        v
Delivery verification
        |
        v
Parcel delivered
        |
        v
Delivery completed
```

---

# 2. Core Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT APPLICATIONS                   │
│                                                             │
│ Customer App │ Vendor App │ Driver App │ Admin Web         │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ HTTPS / WebSocket
               ▼
┌─────────────────────────────────────────────────────────────┐
│                       NEXT.JS BACKEND                       │
│                                                             │
│ Authentication                                               │
│ Authorization                                                │
│ Order Service                                                │
│ Delivery Service                                             │
│ Driver Assignment                                            │
│ Tracking Service                                             │
│ Geospatial Service                                           │
│ Notification Service                                         │
└──────────────┬──────────────────────────────────────────────┘
               │
       ┌───────┼──────────────────────────┐
       │       │                          │
       ▼       ▼                          ▼
 PostgreSQL   Redis/Realtime        Routing Engine
 + Prisma     Infrastructure        / ETA Service
       │
       ▼
      H3
 Geospatial Index
```

---

# 3. Critical Design Principle

The system must distinguish between:

```text
GPS
H3
Routing
Realtime
Database
```

They have different responsibilities.

### GPS

Provides:

```text
latitude
longitude
accuracy
speed
heading
timestamp
```

### H3

Provides:

```text
geospatial indexing
spatial bucketing
neighbor discovery
proximity candidate search
service areas
geospatial aggregation
```

### Routing Engine

Provides:

```text
road route
road distance
road duration
turn-by-turn route
ETA
```

### Realtime Layer

Provides:

```text
live location delivery
order state updates
driver status
tracking events
```

### PostgreSQL

Provides:

```text
authoritative order state
authoritative delivery state
driver assignment
location persistence
historical records
```

---

# 4. H3 Is Not a Routing Algorithm

This is a critical rule.

H3 does **not** replace a road routing engine.

For example:

```text
Driver
  |
  | GPS
  v
lat/lng
  |
  v
H3 cell
```

H3 can tell us that the driver and destination are in nearby cells.

It cannot reliably tell us:

```text
"Take this road for 3.4 km and arrive in 8 minutes."
```

That requires road-network routing.

Therefore:

```text
H3
+
GPS
+
Road Routing
```

must be used together.

H3 is officially a hierarchical geospatial indexing system that partitions the world into hexagonal cells. It supports coordinate-to-cell conversion, cell boundaries, neighboring cells, and grid traversal.

---

# 5. Order Lifecycle

Order lifecycle:

```text
PENDING
   |
   v
CONFIRMED
   |
   v
PREPARING
   |
   v
READY_FOR_PICKUP
   |
   v
PICKED_UP
   |
   v
OUT_FOR_DELIVERY
   |
   v
DELIVERED
```

Cancellation:

```text
PENDING --------> CANCELLED
CONFIRMED -------> CANCELLED
```

Failure:

```text
active delivery
      |
      v
   FAILED
```

The backend owns all transitions.

---

# 6. Delivery Lifecycle

Delivery has its own state machine.

```text
PENDING
   |
   v
ASSIGNING
   |
   v
ASSIGNED
   |
   v
DRIVER_ACCEPTED
   |
   v
PICKUP_READY
   |
   v
PICKED_UP
   |
   v
IN_TRANSIT
   |
   v
ARRIVING
   |
   v
DELIVERED
```

Exceptional states:

```text
FAILED
CANCELLED
```

---

# 7. Order vs Delivery

An order represents:

```text
What the customer purchased.
```

A delivery represents:

```text
How the parcel moves from vendor to customer.
```

Therefore:

```text
Order
  |
  +-- OrderItems
  |
  +-- Payment
  |
  +-- Customer
  |
  +-- Vendor
  |
  +-- Delivery
           |
           +-- DriverAssignment
           |
           +-- DriverLocation
           |
           +-- Verification
```

---

# 8. Delivery Ownership

A delivery contains:

```text
orderId
driverId
pickup location
delivery location
status
assignment
tracking
verification
timestamps
```

The driver is associated with the delivery, not directly with the order's commercial state.

---

# 9. Driver/Rider Terminology

The system should use one canonical database role:

```text
DRIVER
```

The UI may call the person:

```text
Rider
Driver
Delivery Partner
```

but the backend must consistently use:

```text
Driver
```

---

# 10. Driver Assignment

Assignment begins when:

```text
Order.status = READY_FOR_PICKUP
```

and:

```text
Delivery.status = ASSIGNING
```

The dispatch service searches for eligible drivers.

---

# 11. Driver Eligibility

A driver is eligible when:

```text
User.status = ACTIVE

AND

Driver.status = APPROVED/ACTIVE

AND

Driver.availability = AVAILABLE

AND

Driver has no conflicting active delivery

AND

Driver is within supported delivery area
```

Additional filters may include:

```text
vehicle type
parcel size
service zone
shift
capacity
distance
current workload
```

---

# 12. Driver Assignment Architecture

```text
Delivery Ready
      |
      v
Dispatch Service
      |
      v
Find Candidate H3 Cells
      |
      v
Find Drivers in Cells
      |
      v
Filter Driver Eligibility
      |
      v
Calculate Actual Distance
      |
      v
Calculate ETA
      |
      v
Rank Candidates
      |
      v
Offer Delivery
      |
      v
Driver Accepts
      |
      v
Atomic Assignment
```

---

# 13. H3 Driver Index

Every active driver location should be converted into H3 cells.

Example:

```text
GPS:

lat = 12.971600
lng = 77.594600
```

H3:

```text
latLngToCell(
    12.971600,
    77.594600,
    resolution
)
```

Example conceptual result:

```text
8a...
```

H3 provides the cell identifier representing the geographic cell containing the coordinate.

---

# 14. Multiple H3 Resolutions

Do not use one resolution for every purpose.

Recommended architecture:

```text
Resolution
     |
     +-- coarse -> city / region
     |
     +-- medium -> dispatch / nearby drivers
     |
     +-- fine -> live tracking indexing
```

The exact resolution must be selected through production testing because cell dimensions and operating density vary by geography.

Recommended starting strategy:

```text
H3 R7/R8
    |
    +-- city/service-area aggregation

H3 R9/R10
    |
    +-- driver dispatch candidate search

H3 R11
    |
    +-- fine-grained location analysis
```

These are starting points, not hard-coded universal values.

---

# 15. Why Multiple Resolutions

A city-level query should not need thousands of tiny cells.

For example:

```text
"How many drivers are active in Bengaluru?"
```

should use a coarse aggregation.

Whereas:

```text
"Find drivers near this pickup location."
```

requires a finer resolution.

H3 is hierarchical, allowing geographic data to be indexed at different levels of precision.

---

# 16. GPS Data Model

Each accepted driver location update should conceptually contain:

```text
driverId
deliveryId
latitude
longitude
accuracy
altitude
speed
heading
recordedAt
receivedAt
h3Resolution
h3Cell
batteryLevel (optional)
source
```

Example:

```json
{
  "driverId": "drv_123",
  "deliveryId": "del_123",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "accuracy": 8.5,
  "speed": 11.2,
  "heading": 182,
  "recordedAt": "2026-10-01T12:00:00Z",
  "h3Cell": "8a283082a677fff"
}
```

---

# 17. GPS Coordinate Validation

The server must validate:

```text
latitude >= -90
latitude <= 90

longitude >= -180
longitude <= 180
```

Reject invalid coordinates.

---

# 18. GPS Accuracy

GPS accuracy must be stored.

Example:

```text
accuracy = 7.5 meters
```

Potential quality levels:

```text
EXCELLENT
GOOD
FAIR
POOR
INVALID
```

Example policy:

```text
accuracy <= 20m
    -> good

20m - 50m
    -> acceptable

50m - 100m
    -> poor

>100m
    -> potentially unreliable
```

These thresholds should be configurable.

---

# 19. GPS Update Frequency

Do not send GPS updates continuously at maximum device frequency.

Recommended adaptive strategy:

### Driver stationary

```text
10-30 seconds
```

### Driver moving

```text
2-5 seconds
```

### High-speed movement

```text
1-3 seconds
```

### Poor network

```text
buffer locally
batch updates
```

Actual values must be tuned against:

```text
battery
network usage
tracking accuracy
backend load
```

---

# 20. Driver Location Pipeline

```text
Driver Phone
     |
     v
GPS Sensor
     |
     v
Location Manager
     |
     v
Accuracy Filter
     |
     v
Movement Filter
     |
     v
Local Queue
     |
     v
HTTPS/WebSocket
     |
     v
Tracking API
     |
     +----> Validation
     |
     +----> H3 Conversion
     |
     +----> Current Location
     |
     +----> History
     |
     +----> Realtime Event
     |
     +----> ETA Update
```

---

# 21. Location Filtering

The mobile client should not blindly transmit every GPS sample.

Filter based on:

```text
accuracy
distance moved
time elapsed
speed
timestamp
```

Example:

```text
Previous location
       |
       v
New GPS sample
       |
       +-- accuracy too poor --> discard
       |
       +-- no meaningful movement --> reduce frequency
       |
       v
Send update
```

---

# 22. Server-Side GPS Filtering

The server must perform a second validation layer.

Reject or flag:

```text
impossible coordinates
impossible timestamps
extreme jumps
unreasonable speed
stale samples
duplicate samples
```

Example:

```text
Driver moved:

1 km

in:

0.2 seconds
```

This should be flagged as anomalous.

---

# 23. GPS Spoofing Detection

The platform should detect suspicious tracking patterns.

Signals:

```text
impossible speed
large location jumps
GPS timestamp mismatch
mock-location indicators where available
repeated identical coordinates
teleportation between distant cells
```

Do not automatically ban a driver solely from one anomaly.

Use:

```text
anomaly score
+
multiple signals
+
administrative review
```

---

# 24. Location Timestamp

Each location should contain:

```text
recordedAt
receivedAt
```

Difference:

```text
networkDelay =
receivedAt - recordedAt
```

This helps distinguish:

```text
fresh GPS
delayed GPS
offline-buffered GPS
```

---

# 25. Current Driver Location

Maintain a fast-access current location record.

Conceptually:

```text
DriverCurrentLocation
├── driverId
├── deliveryId
├── latitude
├── longitude
├── h3Cell
├── accuracy
├── speed
├── heading
├── recordedAt
└── updatedAt
```

This is optimized for:

```text
live tracking
driver dispatch
customer map
```

---

# 26. Historical Driver Location

Historical tracking should be stored separately.

```text
DriverLocationHistory
├── id
├── driverId
├── deliveryId
├── latitude
├── longitude
├── accuracy
├── speed
├── heading
├── h3Cell
├── recordedAt
└── receivedAt
```

Do not query millions of historical points when the customer only needs the current driver location.

---

# 27. Location Storage Strategy

Use two layers:

```text
CURRENT LOCATION
        |
        +--> fast mutable record

LOCATION HISTORY
        |
        +--> append-oriented history
```

Example:

```text
DriverCurrentLocation
```

is continuously updated.

While:

```text
DriverLocationHistory
```

is append-only.

---

# 28. Location Retention

Location data is sensitive.

Retention must be limited.

Recommended approach:

```text
Active delivery
    |
    v
high-resolution location
```

After delivery:

```text
completed delivery
    |
    v
retain required operational history
    |
    v
delete/downsample older raw points
```

Retention duration must be configurable according to business, legal, and privacy requirements.

---

# 29. Customer Live Tracking

Customer sees:

```text
Driver position
Driver movement
Delivery status
Pickup status
Approximate ETA
```

Customer should not receive unrestricted historical driver location.

---

# 30. Customer Tracking Flow

```text
Customer
   |
   v
Open Order
   |
   v
GET /customer/orders/{id}/tracking
   |
   v
Initial delivery state
   |
   v
WebSocket subscription
   |
   v
driver.location.updated
   |
   v
Update map
```

If realtime disconnects:

```text
WebSocket
   |
   X
   |
   v
Polling / REST fallback
```

---

# 31. Realtime Location Event

Example:

```json
{
  "event": "delivery.location.updated",
  "data": {
    "deliveryId": "del_123",
    "driverId": "drv_123",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "heading": 180,
    "speed": 12.3,
    "accuracy": 8.4,
    "recordedAt": "2026-10-01T12:00:00Z"
  }
}
```

The client should interpolate marker movement for visual smoothness.

The interpolated location is not authoritative.

---

# 32. Map Marker Interpolation

Suppose:

```text
Location A
lat/lng at T0

Location B
lat/lng at T1
```

The customer UI may animate:

```text
A ---> B
```

between updates.

This is purely visual.

The actual latest server location remains authoritative.

---

# 33. Location Update Endpoint

```http
POST /api/v1/driver/deliveries/{deliveryId}/location
```

Request:

```json
{
  "latitude": 12.9716,
  "longitude": 77.5946,
  "accuracy": 8.4,
  "speed": 12.3,
  "heading": 180,
  "recordedAt": "2026-10-01T12:00:00Z"
}
```

Backend:

```text
authenticate
      |
      v
role = DRIVER
      |
      v
driver owns delivery
      |
      v
delivery active
      |
      v
validate GPS
      |
      v
H3 conversion
      |
      v
store current location
      |
      v
store history
      |
      v
publish realtime event
```

---

# 34. Driver Must Only Track Active Delivery

Location tracking should normally be active only when:

```text
Delivery.status IN (
    DRIVER_ACCEPTED,
    PICKUP_READY,
    PICKED_UP,
    IN_TRANSIT,
    ARRIVING
)
```

Tracking should stop after:

```text
DELIVERED
FAILED
CANCELLED
```

subject to operational cleanup.

---

# 35. Privacy Rule

The platform must not continuously track a driver for customer delivery purposes when the driver has no active delivery.

Normal state:

```text
Driver OFFLINE
    |
    X
No continuous customer tracking
```

Active delivery:

```text
Driver
   |
   v
Tracking enabled
```

---

# 36. Driver Status

Driver availability:

```text
OFFLINE
AVAILABLE
BUSY
```

Delivery state and availability are related but not identical.

Example:

```text
Driver availability = BUSY
Delivery status = IN_TRANSIT
```

---

# 37. Automatic Driver Busy State

When a driver accepts an active delivery:

```text
Driver.availability
       |
       v
BUSY
```

When all active deliveries are completed:

```text
BUSY
 |
 v
AVAILABLE
```

The backend should control these transitions.

---

# 38. H3 Indexing Pipeline

Every accepted GPS update:

```text
latitude
longitude
   |
   v
H3 latLngToCell()
   |
   v
H3 cell
   |
   +----> Current location
   |
   +----> Dispatch index
   |
   +----> Analytics
   |
   +----> Service zone
```

H3's `latLngToCell` maps a coordinate to the containing cell at a chosen resolution.

---

# 39. Driver Proximity Search

Suppose:

```text
Pickup H3 Cell = H
```

Find nearby cells:

```text
gridDisk(H, k)
```

This generates cells within a specified H3 grid distance.

Conceptually:

```text
             [C] [C] [C]
          [C] [C] [C] [C]
          [C] [H] [C] [C]
          [C] [C] [C] [C]
             [C] [C]
```

Search drivers in:

```text
H
+
neighbor cells
```

---

# 40. H3 Candidate Search

```text
Pickup GPS
    |
    v
Pickup H3 cell
    |
    v
gridDisk(pickupCell, k)
    |
    v
Candidate cells
    |
    v
Query active drivers
    |
    v
Candidate drivers
```

This is much more efficient than calculating the distance between the pickup point and every active driver.

---

# 41. H3 Distance Is Not Road Distance

Important:

```text
H3 grid distance
```

means the number of hexagonal grid hops between cells.

It does not mean:

```text
driving distance
```

or:

```text
travel time
```

H3's official documentation defines `gridDistance` as the minimum number of adjacent-cell hops and notes limitations such as incompatible resolutions and pentagonal distortion.

Therefore:

```text
H3 distance
```

is only used for:

```text
candidate selection
```

Then use:

```text
road distance
+
road ETA
```

for final dispatch ranking.

---

# 42. Driver Dispatch Algorithm

Recommended:

```text
STEP 1
Pickup coordinates
```

↓

```text
STEP 2
Convert pickup to H3
```

↓

```text
STEP 3
Search current driver H3 cell
```

↓

```text
STEP 4
Search neighboring H3 cells
```

↓

```text
STEP 5
Filter:
- active
- approved
- available
- correct vehicle
- no conflicting delivery
```

↓

```text
STEP 6
Calculate actual geographic distance
```

↓

```text
STEP 7
Calculate road ETA
```

↓

```text
STEP 8
Rank candidates
```

↓

```text
STEP 9
Offer to driver
```

---

# 43. Candidate Ranking

Do not rank solely by straight-line distance.

Possible scoring:

```text
score =
    etaWeight * ETA
  + distanceWeight * distance
  + workloadWeight * workload
  + acceptanceWeight * historicalAcceptance
  + zoneWeight * zonePenalty
```

The exact weights must be configurable and validated against real delivery data.

---

# 44. Nearest Driver

Correct approach:

```text
H3
   |
   v
candidate reduction
   |
   v
road distance / ETA
   |
   v
final candidate
```

Incorrect:

```text
H3 gridDistance
   |
   v
declare nearest driver
```

---

# 45. Adaptive H3 Search Radius

Start small:

```text
k = 1
```

If insufficient candidates:

```text
k = 2
```

Then:

```text
k = 3
```

Continue until:

```text
candidate count >= required threshold
```

or:

```text
maximum dispatch radius reached
```

Example:

```text
k=1 -> 3 drivers
```

Enough:

```text
select candidates
```

If:

```text
k=1 -> 0
k=2 -> 0
k=3 -> 2
```

use the k=3 candidates.

---

# 46. H3 Dispatch Pseudocode

```text
function findCandidateDrivers(pickup):

    pickupCell = h3.latLngToCell(
        pickup.lat,
        pickup.lng,
        DISPATCH_RESOLUTION
    )

    for k in SEARCH_RADII:

        cells = h3.gridDisk(
            pickupCell,
            k
        )

        drivers = queryAvailableDrivers(cells)

        drivers = filterEligibleDrivers(drivers)

        if drivers.length >= MIN_CANDIDATES:
            return drivers

    return []
```

---

# 47. Final Driver Ranking

After H3 filtering:

```text
for driver in candidates:

    straightDistance =
        calculateGeographicDistance(
            driver.location,
            pickup
        )

    eta =
        routingEngine.getETA(
            driver.location,
            pickup
        )
```

Then rank using:

```text
ETA
+
distance
+
availability
+
workload
+
vehicle compatibility
```

---

# 48. H3 Service Zones

H3 can represent delivery/service zones.

Example:

```text
Zone A
    |
    +-- H3 Cell 1
    +-- H3 Cell 2
    +-- H3 Cell 3
    +-- H3 Cell 4
```

This allows:

```text
vendor coverage
driver coverage
delivery fee zones
restricted areas
service availability
```

---

# 49. Delivery Zone Validation

When customer selects an address:

```text
customer coordinates
       |
       v
H3 cell
       |
       v
service zone lookup
       |
       +---- supported
       |
       +---- unsupported
```

The backend determines whether delivery is available.

---

# 50. Geofencing

H3 can be used for coarse geographic zone detection.

Example:

```text
Pickup zone
Delivery zone
Restricted zone
```

However, precise boundary enforcement should use actual polygon geometry when exact borders matter.

H3 cell membership is a spatial index, not a substitute for arbitrary polygon boundary logic.

---

# 51. Pickup Geofence

When driver approaches vendor:

```text
Driver GPS
   |
   v
H3 / geofence check
   |
   v
Near pickup?
```

If sufficiently close:

```text
Driver may perform pickup verification
```

Do not rely solely on H3 cell equality because a cell can contain a substantial geographic area.

---

# 52. Pickup Verification

Recommended:

```text
Driver reaches pickup
        |
        v
Location validation
        |
        v
Vendor/parcel verification
        |
        v
OTP / QR / barcode
        |
        v
Pickup confirmed
```

Then:

```text
Delivery.status = PICKED_UP
Order.status = PICKED_UP
```

---

# 53. Delivery Geofence

When driver approaches destination:

```text
Driver GPS
   |
   v
Destination geofence
   |
   v
ARRIVING
```

The system may automatically suggest:

```text
"Driver is arriving"
```

But delivery must not be marked complete solely because the driver entered a geofence.

---

# 54. Delivery Completion

Recommended:

```text
Driver arrives
    |
    v
Delivery verification
    |
    +-- OTP
    +-- QR
    +-- Signature
    +-- Photo
    +-- Manual
    |
    v
Verification successful
    |
    v
DELIVERED
```

---

# 55. Delivery Verification Security

Delivery completion should require an appropriate verification mechanism.

Example OTP:

```text
Customer receives OTP
       |
       v
Driver enters OTP
       |
       v
Backend validates
       |
       v
Delivery completed
```

The OTP must never be validated purely on the mobile device.

---

# 56. ETA Architecture

ETA should be calculated using:

```text
Current GPS
+
Destination
+
Road network
+
Traffic where available
+
Routing engine
```

Not:

```text
H3 distance
```

---

# 57. ETA Pipeline

```text
Driver GPS
     |
     v
Current position
     |
     v
Routing Engine
     |
     +--> road distance
     |
     +--> duration
     |
     +--> route geometry
     |
     v
ETA Service
     |
     v
Customer
```

---

# 58. ETA Refresh

ETA does not need to be recalculated for every GPS update.

Recommended:

```text
location updates
      |
      v
tracking stream
```

while:

```text
ETA
```

is recalculated:

```text
periodically
```

or when:

```text
significant route deviation
large movement
traffic change
destination change
delivery state change
```

---

# 59. Route Deviation

The system should detect:

```text
actual GPS path
       |
       v
expected route
```

If deviation exceeds a configurable threshold:

```text
route deviation detected
```

Then:

```text
request route recalculation
```

---

# 60. Route Representation

A delivery tracking response may contain:

```json
{
  "deliveryId": "del_123",
  "status": "IN_TRANSIT",
  "driverLocation": {
    "latitude": 12.9716,
    "longitude": 77.5946,
    "heading": 180
  },
  "destination": {
    "latitude": 12.98,
    "longitude": 77.6
  },
  "eta": {
    "seconds": 540,
    "updatedAt": "2026-10-01T12:00:00Z"
  },
  "route": {
    "geometry": "encoded-or-provider-specific"
  }
}
```

---

# 61. Customer Tracking API

```http
GET /api/v1/customer/orders/{orderId}/tracking
```

Response:

```json
{
  "success": true,
  "data": {
    "orderId": "ord_123",
    "deliveryId": "del_123",
    "status": "IN_TRANSIT",
    "driver": {
      "displayName": "Rider"
    },
    "location": {
      "latitude": 12.9716,
      "longitude": 77.5946,
      "accuracy": 8.5,
      "heading": 180,
      "updatedAt": "2026-10-01T12:00:00Z"
    },
    "eta": {
      "seconds": 540
    }
  }
}
```

---

# 62. Driver Tracking API

```http
POST /api/v1/driver/deliveries/{deliveryId}/location
```

Driver may also request:

```http
GET /api/v1/driver/deliveries/{deliveryId}
```

The response should contain:

```text
pickup
destination
delivery state
assignment
route
ETA
verification requirements
```

---

# 63. Admin Tracking

Admin can inspect:

```http
GET /api/v1/admin/deliveries/{deliveryId}/tracking
```

Admin may receive:

```text
current driver location
location history
route
ETA
assignment history
state history
GPS anomalies
pickup location
delivery location
```

Administrative access must be audited.

---

# 64. Vendor Tracking

Vendor should see operational information relevant to its orders.

Example:

```text
parcel ready
driver assigned
driver approaching pickup
parcel picked up
delivery in progress
delivery completed
```

Vendor should not receive unnecessary customer location or driver personal information.

---

# 65. Driver Assignment Offers

A driver may receive:

```text
delivery.assignment.offered
```

Example:

```json
{
  "event": "delivery.assignment.offered",
  "data": {
    "deliveryId": "del_123",
    "pickup": {
      "latitude": 12.9716,
      "longitude": 77.5946
    },
    "estimatedDistance": 2.4,
    "estimatedPickupEta": 420,
    "expiresAt": "2026-10-01T12:05:00Z"
  }
}
```

---

# 66. Assignment Timeout

Driver offers should expire.

Example:

```text
OFFERED
   |
   +---- ACCEPTED
   |
   +---- REJECTED
   |
   +---- EXPIRED
```

If expired:

```text
return to dispatch queue
```

and find another candidate.

---

# 67. Atomic Assignment

Two dispatch workers must not assign the same delivery simultaneously.

Use:

```text
database transaction
+
row locking/concurrency control
+
unique active assignment constraints
```

Conceptually:

```text
Worker A
   |
   +--> assign driver
          |
          v
       success

Worker B
   |
   +--> assign same delivery
          |
          v
       conflict
```

---

# 68. Multiple Drivers

MVP:

```text
One active driver per delivery.
```

Historical assignments may contain multiple drivers:

```text
Driver A -> REJECTED
Driver B -> EXPIRED
Driver C -> ACCEPTED
```

Only one active assignment should exist.

---

# 69. Reassignment

If driver becomes unavailable:

```text
Driver C
   |
   v
UNAVAILABLE
```

then:

```text
Delivery
   |
   v
ASSIGNING
   |
   v
new candidate
```

The previous assignment must remain in history.

---

# 70. Driver Location During Reassignment

If no driver is assigned:

```text
delivery.status = ASSIGNING
```

customer should see:

```text
Finding a rider...
```

No driver's location should be shown.

---

# 71. Location Privacy

Customer should receive only:

```text
current assigned driver
```

for:

```text
their active delivery
```

Customer must not receive:

```text
all nearby drivers
driver fleet map
driver historical routes
other customers' drivers
```

---

# 72. Driver Privacy

Driver should not receive:

```text
other drivers' locations
```

unless explicitly required by an operational feature.

Driver receives:

```text
own location
own assignment
pickup location
delivery location
required customer delivery information
```

---

# 73. Customer PII

Driver receives only information necessary to complete the delivery.

Possible:

```text
recipient name
delivery address
contact method
delivery instructions
verification information
```

Do not expose unnecessary customer data.

---

# 74. Location Event Architecture

```text
Driver GPS
    |
    v
Tracking Service
    |
    +------------------+
    |                  |
    v                  v
PostgreSQL         Realtime Bus
    |                  |
    |                  +----> Customer App
    |                  |
    |                  +----> Admin Web
    |                  |
    |                  +----> Vendor App
    |
    +----> H3 Index
    |
    +----> Analytics
```

---

# 75. Realtime Source of Truth

Realtime events are not authoritative.

Example:

```text
WebSocket says:

IN_TRANSIT
```

but the customer reconnects.

The client must call:

```text
GET /tracking
```

and recover the current authoritative state.

---

# 76. Realtime Event Types

Recommended:

```text
delivery.assignment.offered
delivery.assignment.accepted
delivery.assignment.rejected

delivery.status.updated

delivery.location.updated

delivery.eta.updated

delivery.route.updated

delivery.pickup.completed

delivery.arriving

delivery.verification.required

delivery.completed

delivery.failed
```

---

# 77. H3 Events

Internal geospatial events may include:

```text
driver.h3.updated
driver.zone.entered
driver.zone.exited
delivery.zone.entered
delivery.zone.exited
```

These do not necessarily need to be exposed to clients.

---

# 78. H3-Based Driver Availability Index

Maintain an index conceptually:

```text
H3 Cell
   |
   +-- Driver A
   +-- Driver B
   +-- Driver C
```

When Driver A moves:

```text
Old H3 Cell
    |
    X
    |
New H3 Cell
    |
    +--> update index
```

This allows fast candidate lookup.

---

# 79. Redis + H3

If Redis is introduced:

```text
Redis
 |
 +-- driver:{id}:location
 |
 +-- h3:{resolution}:{cell}:drivers
```

Example:

```text
h3:9:8928308280fffff
```

contains:

```text
drv_123
drv_456
drv_789
```

Redis is an optimization.

PostgreSQL remains the authoritative persistent source of truth.

---

# 80. H3 Database Storage

Store H3 cell IDs with location records.

Example:

```text
driver_locations
----------------
driver_id
delivery_id
latitude
longitude
h3_resolution
h3_cell
recorded_at
```

This allows queries such as:

```text
find all drivers in H3 cells X/Y/Z
```

without calculating geographic distance against every driver.

---

# 81. H3 Cell Updates

Only update the dispatch H3 index when:

```text
driver's H3 cell changes
```

This avoids unnecessary index writes.

For example:

```text
GPS update every 3 seconds
```

but:

```text
H3 cell update
```

may occur only when crossing a cell boundary.

---

# 82. Fine Location vs H3 Location

Store both.

```text
Raw GPS:
12.971600
77.594600
```

and:

```text
H3:
8a...
```

H3 must not replace the raw coordinate.

Raw GPS is needed for:

```text
map
ETA
route
navigation
precise geofence
historical replay
```

H3 is needed for:

```text
indexing
aggregation
candidate search
zones
analytics
```

---

# 83. Driver Tracking State Machine

```text
OFFLINE
   |
   v
AVAILABLE
   |
   v
ASSIGNED
   |
   v
DRIVER_ACCEPTED
   |
   v
TRACKING_ACTIVE
   |
   v
PICKED_UP
   |
   v
IN_TRANSIT
   |
   v
ARRIVING
   |
   v
DELIVERED
   |
   v
TRACKING_STOPPED
   |
   v
AVAILABLE
```

---

# 84. GPS Failure

If GPS becomes unavailable:

```text
Driver App
   |
   v
GPS unavailable
   |
   v
attempt recovery
   |
   +--> recovered
   |
   +--> offline queue
```

The driver must not automatically be marked as having stopped moving.

---

# 85. Network Failure

If network fails:

```text
GPS
 |
 v
Local queue
 |
 v
Network restored
 |
 v
Upload buffered locations
```

Each sample must retain:

```text
recordedAt
```

so the backend knows when the position was actually recorded.

---

# 86. Stale Location

The tracking service must identify stale locations.

Example:

```text
last update:
5 seconds ago
```

fresh.

```text
last update:
2 minutes ago
```

stale.

Customer UI may show:

```text
Location updating...
```

instead of pretending the rider is currently at the old coordinate.

---

# 87. Tracking Health

Delivery tracking should have:

```text
trackingStatus
```

Possible:

```text
LIVE
DELAYED
STALE
OFFLINE
UNKNOWN
```

Example:

```text
LIVE:
last update < threshold

DELAYED:
update slower than expected

STALE:
no recent update

OFFLINE:
driver/network unavailable
```

---

# 88. Customer UI States

Customer tracking screen:

```text
SEARCHING_FOR_DRIVER
DRIVER_ASSIGNED
DRIVER_GOING_TO_PICKUP
PARCEL_PICKED_UP
OUT_FOR_DELIVERY
DRIVER_NEARBY
DELIVERED
TRACKING_UNAVAILABLE
```

---

# 89. Driver UI

Driver application should display:

```text
Current assignment
Pickup location
Pickup navigation
Customer destination
Navigation
Delivery status
Current GPS status
Network status
Battery warning
Delivery verification
```

---

# 90. Driver Navigation

The driver application should not attempt to implement a full road-routing engine itself unless there is a specific reason.

Recommended:

```text
Driver GPS
    |
    v
Routing provider
    |
    v
Navigation
```

The platform backend should still maintain:

```text
delivery state
destination
tracking
ETA
```

---

# 91. Navigation vs Tracking

These are separate systems.

### Navigation

Answers:

```text
"How should the driver get there?"
```

### Tracking

Answers:

```text
"Where is the driver now?"
```

### H3

Answers:

```text
"Which geographic cell contains this driver?"
```

### Delivery Service

Answers:

```text
"What delivery state is the parcel in?"
```

---

# 92. Route Provider Abstraction

Do not hard-code the entire platform around one routing provider.

Use:

```text
RoutingService
```

Interface:

```ts
interface RoutingService {
  getRoute(input: RouteRequest): Promise<RouteResult>;

  getEta(input: EtaRequest): Promise<EtaResult>;

  getDistance(input: DistanceRequest): Promise<DistanceResult>;
}
```

Possible future providers:

```text
Google Maps
Mapbox
HERE
OpenRouteService
OSRM
GraphHopper
Valhalla
```

---

# 93. Geospatial Service

Create a dedicated:

```text
GeoService
```

Responsibilities:

```text
H3 conversion
H3 neighbor search
H3 distance
geofence checks
coordinate validation
distance calculations
zone resolution
```

---

# 94. Recommended Backend Modules

```text
src/modules/
├── orders/
├── deliveries/
├── dispatch/
├── drivers/
├── tracking/
├── geospatial/
├── routing/
├── notifications/
└── maps/
```

---

# 95. Tracking Module

Recommended:

```text
tracking/
├── tracking.service.ts
├── location.service.ts
├── location.validator.ts
├── location-filter.service.ts
├── tracking-repository.ts
├── tracking-events.ts
├── tracking.types.ts
└── tracking.constants.ts
```

---

# 96. Geospatial Module

```text
geospatial/
├── h3.service.ts
├── distance.service.ts
├── geofence.service.ts
├── zone.service.ts
├── dispatch-search.service.ts
├── geo.types.ts
└── geo.constants.ts
```

---

# 97. Dispatch Module

```text
dispatch/
├── dispatch.service.ts
├── candidate.service.ts
├── ranking.service.ts
├── assignment.service.ts
├── retry.service.ts
├── dispatch-policy.ts
└── dispatch.types.ts
```

---

# 98. Delivery Tracking Database

Recommended conceptual schema:

```text
Delivery
├── id
├── orderId
├── status
├── driverId
├── pickupAddressId
├── deliveryAddressId
├── assignedAt
├── pickedUpAt
├── deliveredAt
├── createdAt
└── updatedAt

DriverAssignment
├── id
├── deliveryId
├── driverId
├── status
├── offeredAt
├── acceptedAt
├── rejectedAt
└── completedAt

DriverCurrentLocation
├── driverId
├── deliveryId
├── latitude
├── longitude
├── accuracy
├── speed
├── heading
├── h3Resolution
├── h3Cell
├── recordedAt
└── updatedAt

DriverLocationHistory
├── id
├── driverId
├── deliveryId
├── latitude
├── longitude
├── accuracy
├── speed
├── heading
├── h3Resolution
├── h3Cell
├── recordedAt
└── receivedAt

DeliveryVerification
├── id
├── deliveryId
├── type
├── status
├── verifiedAt
└── metadata
```

---

# 99. Database Indexes

Important indexes:

```text
DriverCurrentLocation.driverId
DriverCurrentLocation.deliveryId
DriverCurrentLocation.h3Cell
DriverCurrentLocation.updatedAt

DriverLocationHistory.driverId
DriverLocationHistory.deliveryId
DriverLocationHistory.h3Cell
DriverLocationHistory.recordedAt

Delivery.driverId
Delivery.status
Delivery.createdAt

DriverAssignment.deliveryId
DriverAssignment.driverId
DriverAssignment.status
```

---

# 100. H3 Index Strategy

Recommended composite indexes:

```text
(h3Resolution, h3Cell)
```

and:

```text
(h3Cell, updatedAt)
```

depending on query patterns.

For active driver lookup:

```text
WHERE h3_resolution = ?
AND h3_cell IN (...)
AND availability = AVAILABLE
```

---

# 101. H3 Cell Validation

The backend must validate that:

```text
h3Cell
```

was derived from the submitted GPS coordinates.

Do not trust:

```json
{
  "latitude": 12.9716,
  "longitude": 77.5946,
  "h3Cell": "some-other-cell"
}
```

The server should calculate H3 itself.

---

# 102. H3 Resolution Validation

Clients should not choose arbitrary H3 resolution for business operations.

For example, do not accept:

```json
{
  "resolution": 15
}
```

and blindly use it.

The server determines the appropriate resolution based on operation:

```text
dispatch
tracking
analytics
service-zone
```

---

# 103. H3 Neighbor Search

For nearby drivers:

```text
pickupCell = latLngToCell(pickup)

nearbyCells =
    gridDisk(pickupCell, k)
```

Then:

```text
query drivers
WHERE h3Cell IN nearbyCells
```

H3's `gridDisk` returns cells at or within a specified grid distance from an origin cell.

---

# 104. H3 Grid Distance

Can be used for:

```text
candidate ranking
cell proximity
service-area analysis
```

Example:

```text
driverCell = A
pickupCell = B

gridDistance(A, B) = 3
```

This means:

```text
3 H3 grid hops
```

not:

```text
3 km
```

---

# 105. Geographic Distance

For actual coordinate distance:

```text
GPS A
GPS B
   |
   v
Haversine / geodesic distance
```

This provides approximate straight-line distance.

Use it for:

```text
candidate filtering
sanity checks
```

not final driving ETA.

---

# 106. Road Distance

For final dispatch:

```text
Driver GPS
    |
    v
Routing Engine
    |
    +--> driving distance
    |
    +--> driving duration
```

This accounts for:

```text
roads
turns
one-way streets
bridges
route restrictions
traffic
```

depending on provider.

---

# 107. Complete Driver Selection Algorithm

```text
INPUT:

pickup latitude
pickup longitude
delivery requirements
```

### Step 1

Convert pickup to H3:

```text
pickupCell = H3(pickup)
```

### Step 2

Find neighboring cells:

```text
cells = gridDisk(pickupCell, k)
```

### Step 3

Query drivers:

```text
AVAILABLE
ACTIVE
APPROVED
```

inside those cells.

### Step 4

Remove invalid candidates:

```text
wrong vehicle
active conflicting delivery
outside operating area
poor tracking
```

### Step 5

Calculate straight-line distance.

### Step 6

Request road ETA for the remaining candidates.

### Step 7

Rank.

### Step 8

Offer to best candidate(s).

### Step 9

Wait for acceptance.

### Step 10

If rejected/expired:

```text
retry dispatch
```

---

# 108. Dispatch Optimization

Do not request routing ETA for hundreds of drivers.

Bad:

```text
500 drivers
   |
   v
500 routing API calls
```

Better:

```text
H3
 |
 v
20 candidates
 |
 v
filter
 |
 v
5 candidates
 |
 v
routing
 |
 v
best candidate
```

H3 is valuable here because it reduces the candidate set before expensive routing operations.

---

# 109. Driver Clustering

H3 can also be used for driver distribution:

```text
Cell A -> 15 drivers
Cell B -> 3 drivers
Cell C -> 0 drivers
```

Admin dashboard can show:

```text
high driver density
low driver density
no driver coverage
```

This helps with:

```text
fleet balancing
shift planning
service coverage
```

---

# 110. Delivery Heatmaps

Historical delivery locations can be aggregated by H3:

```text
H3 Cell
    |
    +-- order count
    +-- delivery count
    +-- average ETA
    +-- cancellation rate
    +-- driver demand
```

Example:

```text
Cell A
orders = 1,250

Cell B
orders = 740

Cell C
orders = 120
```

This is much more efficient than drawing millions of individual GPS points.

---

# 111. Demand Forecasting

Future system may use H3 cells as ML features:

```text
H3 Cell
+
hour
+
weekday
+
historical orders
+
driver availability
```

to predict:

```text
delivery demand
```

and:

```text
driver requirements
```

H3 is well suited to spatial aggregation and geospatial analysis, including ML-oriented geographic features.

---

# 112. Service Area Management

Admin may configure:

```text
service area
delivery zone
restricted zone
high-demand zone
```

These can be represented using:

```text
H3 cell sets
```

Example:

```text
Zone Bengaluru-Central

Resolution 8:
    cell A
    cell B
    cell C
```

---

# 113. Delivery Fee Zones

Delivery fees can optionally depend on:

```text
pickup H3 zone
+
destination H3 zone
+
road distance
```

Example:

```text
Zone A -> Zone A
₹30

Zone A -> Zone B
₹50

Zone A -> Zone C
₹80
```

Actual pricing must be calculated by backend rules.

---

# 114. Order Tracking Timeline

Customer should see:

```text
Order placed
     |
     ✓
Order confirmed
     |
     ✓
Vendor preparing
     |
     ✓
Ready for pickup
     |
     ✓
Rider assigned
     |
     ✓
Rider picked up parcel
     |
     ✓
Out for delivery
     |
     ✓
Rider arriving
     |
     ✓
Delivered
```

Each event should have:

```text
status
timestamp
actor/system
metadata
```

---

# 115. Order Status History

Every order transition must create:

```text
OrderStatusHistory
```

Example:

```text
PENDING
 ->
CONFIRMED

actor:
VENDOR

timestamp:
2026-10-01T12:00:00Z
```

---

# 116. Delivery Status History

Delivery should similarly maintain state history.

```text
DeliveryStatusHistory
```

Recommended fields:

```text
id
deliveryId
fromStatus
toStatus
actorType
actorId
reason
metadata
createdAt
```

This makes delivery incidents traceable.

---

# 117. Driver Tracking Timeline

Example:

```text
12:00:00
Driver accepted

12:03:00
Driver moving to pickup

12:08:00
Driver reached pickup

12:09:00
Parcel collected

12:09:30
Tracking active

12:20:00
Driver approaching customer

12:25:00
Delivery verified

12:25:10
Delivered
```

---

# 118. Tracking Accuracy Indicator

Customer UI may show:

```text
Live
Updated 5 sec ago
```

or:

```text
Location updating...
```

Avoid showing false precision.

Do not imply:

```text
"Driver is exactly here"
```

when GPS accuracy is 100 meters.

---

# 119. GPS Accuracy on Customer Map

If:

```text
accuracy = 100m
```

the UI may display a location uncertainty circle.

Conceptually:

```text
       _________
    .-'         '-.
   /      🚴       \
  |                 |
   \               /
    '-._________.-'
```

The actual map marker remains the reported coordinate.

---

# 120. Battery Awareness

Tracking can consume significant battery.

Driver application should adapt:

```text
navigation active
    |
    v
high-frequency GPS

driver stationary
    |
    v
lower-frequency GPS
```

The app should warn the driver when:

```text
battery is critically low
```

and continue tracking according to operational requirements.

---

# 121. Background Tracking

Driver app must support background location tracking where the operating system permits it.

The implementation must comply with:

```text
Android background location policies
iOS background location policies
```

The driver must be clearly informed that location is being used for active delivery tracking.

---

# 122. Tracking Consent

The platform must clearly communicate:

```text
why location is collected
when location is collected
who can see it
how long it is retained
```

Customer:

```text
sees assigned rider during active delivery
```

Admin:

```text
operational access
```

Vendor:

```text
limited order-related tracking
```

Driver:

```text
own tracking status
```

---

# 123. Location Data Security

Location data must be treated as sensitive operational data.

Protect:

```text
driver GPS
customer delivery coordinates
historical routes
```

with:

```text
authentication
authorization
encrypted transport
restricted database access
retention policies
audit controls
```

---

# 124. Failure: Driver Goes Offline

```text
Driver
   |
   X
network unavailable
```

System:

```text
last known location
+
last update timestamp
```

Customer:

```text
"Location temporarily unavailable"
```

Do not continuously move the driver marker after the data becomes stale.

---

# 125. Failure: GPS Disabled

Driver app should display:

```text
Location permission required
```

The backend should mark tracking as:

```text
STALE
```

after the configured threshold.

---

# 126. Failure: Driver Rejects

```text
Driver A
   |
   v
REJECTED
```

Delivery:

```text
ASSIGNING
```

Then:

```text
H3 candidate search
```

restarts.

---

# 127. Failure: Driver Cancels After Pickup

This is a critical operational state.

```text
Driver
   |
   v
active delivery
   |
   v
unable to continue
```

System must:

```text
1. stop normal completion flow
2. create incident
3. notify operations
4. preserve current location
5. select reassignment workflow
6. maintain parcel custody information
```

Do not simply set:

```text
delivery.status = CANCELLED
```

without handling parcel custody.

---

# 128. Parcel Custody

Once a driver picks up the parcel:

```text
Vendor
  |
  v
Driver
  |
  v
Customer
```

The system should track custody state.

Example:

```text
AT_VENDOR
WITH_DRIVER
DELIVERED
```

If a reassignment happens:

```text
Driver A
    |
    v
WITH_DRIVER
    |
    v
TRANSFER_REQUIRED
    |
    v
Driver B
```

This should be treated as a controlled operational process.

---

# 129. Parcel Custody Events

Possible events:

```text
parcel.pickup.confirmed
parcel.custody.transferred
parcel.delivery.attempted
parcel.delivery.completed
parcel.delivery.failed
```

---

# 130. Tracking + Parcel State

Never infer parcel custody solely from GPS.

Example:

```text
Driver is near vendor
```

does not mean:

```text
parcel picked up
```

Pickup must be explicitly verified.

---

# 131. Order Tracking Source of Truth

Customer tracking state is derived from:

```text
Order
+
Delivery
+
Driver Assignment
+
Current Driver Location
+
ETA
```

not from a single client-side tracking object.

---

# 132. Tracking API Endpoints

## Customer

```text
GET /api/v1/customer/orders/{orderId}/tracking
```

## Driver

```text
POST /api/v1/driver/deliveries/{deliveryId}/location
GET  /api/v1/driver/deliveries/{deliveryId}
```

## Vendor

```text
GET /api/v1/vendor/orders/{orderId}/tracking
```

## Admin

```text
GET /api/v1/admin/deliveries/{deliveryId}/tracking
GET /api/v1/admin/deliveries/{deliveryId}/locations
```

---

# 133. H3 Internal APIs

The backend geospatial service may expose internal operations:

```text
geo.latLngToCell()
geo.cellToLatLng()
geo.gridDisk()
geo.gridDistance()
geo.getNearbyDrivers()
geo.getServiceZone()
geo.isInsideDeliveryZone()
```

These should not necessarily be public HTTP endpoints.

---

# 134. H3 Versioning

H3 library version must be pinned in the project.

Do not allow:

```text
development -> H3 version A
production  -> H3 version B
```

without testing.

The H3 project currently documents the 4.x API family and resolution range 0–15.

---

# 135. H3 Edge Cases

H3 contains pentagonal cells and has special traversal considerations.

Operations such as grid traversal can encounter pentagonal distortion. H3 provides safe traversal functions for these situations.

Therefore:

```text
Do not assume every grid traversal behaves like an infinite perfect hexagonal plane.
```

Use the library's supported safe operations.

---

# 136. H3 Cell Center Warning

Do not replace the driver's GPS coordinate with:

```text
cellToLatLng(h3Cell)
```

for customer tracking.

That returns the H3 cell center, not the original GPS coordinate.

Correct:

```text
Customer map:
actual GPS

Dispatch:
H3 cell
```

---

# 137. H3 Data Flow

```text
                 GPS
                  |
                  v
           12.9716, 77.5946
                  |
          +-------+-------+
          |               |
          v               v
      Raw GPS           H3 Cell
          |               |
          |               +----> Driver Index
          |               |
          |               +----> Dispatch
          |               |
          |               +----> Zones
          |               |
          |               +----> Analytics
          |
          +----> Customer Map
          |
          +----> Routing
          |
          +----> ETA
```

---

# 138. Complete Dispatch + Tracking Architecture

```text
                 CUSTOMER
                    |
                    v
                 ORDER
                    |
                    v
              VENDOR PREPARES
                    |
                    v
             READY_FOR_PICKUP
                    |
                    v
                DISPATCH
                    |
                    v
             PICKUP COORDINATES
                    |
                    v
               H3 CELL
                    |
                    v
            NEIGHBORING CELLS
                    |
                    v
            ACTIVE DRIVER INDEX
                    |
                    v
          ELIGIBLE DRIVER LIST
                    |
                    v
             ROUTING / ETA
                    |
                    v
             DRIVER ASSIGNED
                    |
                    v
             DRIVER ACCEPTS
                    |
                    v
              DRIVER GPS
                    |
        +-----------+-----------+
        |           |           |
        v           v           v
      H3 Index   Tracking    Routing
        |           |           |
        |           |           +--> ETA
        |           |
        |           +--> Customer
        |           +--> Vendor
        |           +--> Admin
        |
        +--> Dispatch
        +--> Analytics
                    |
                    v
               PICKUP
                    |
                    v
               IN_TRANSIT
                    |
                    v
               ARRIVING
                    |
                    v
             DELIVERY VERIFY
                    |
                    v
                DELIVERED
```

---

# 139. Recommended Technology Responsibilities

| Component            | Responsibility                            |
| -------------------- | ----------------------------------------- |
| React Native         | Driver GPS acquisition                    |
| React Native         | Background tracking                       |
| Next.js API          | Tracking ingestion                        |
| PostgreSQL           | Persistent delivery state                 |
| Prisma               | Database access                           |
| H3                   | Spatial indexing                          |
| Redis                | Fast active-driver index/realtime support |
| WebSocket/SSE        | Live event delivery                       |
| Routing Engine       | Road routes and ETA                       |
| Object Storage       | Delivery photos                           |
| Notification Service | Push notifications                        |
| Admin Web            | Operations and monitoring                 |

---

# 140. What H3 Should Be Used For

Use H3 for:

```text
✓ Nearby driver candidate search
✓ Driver distribution
✓ Delivery zones
✓ Service areas
✓ Geographic aggregation
✓ Heatmaps
✓ Demand analysis
✓ Driver supply analysis
✓ Spatial analytics
✓ Dispatch optimization
✓ Geospatial caching/indexing
```

---

# 141. What H3 Should NOT Be Used For

Do not use H3 alone for:

```text
✗ Turn-by-turn navigation
✗ Final driving ETA
✗ Exact driver position
✗ Exact delivery completion
✗ Replacing GPS
✗ Replacing a road graph
✗ Determining road distance
```

---

# 142. Performance Strategy

The system should avoid:

```text
every GPS update
    |
    v
expensive routing request
```

Instead:

```text
GPS
 |
 +--> cheap validation
 |
 +--> H3 conversion
 |
 +--> current location update
 |
 +--> realtime event
 |
 +--> occasional ETA calculation
```

---

# 143. Scaling Strategy

For 100 drivers:

```text
PostgreSQL alone
```

may be sufficient.

For thousands of active drivers:

```text
PostgreSQL
+
Redis
+
H3 index
+
WebSocket infrastructure
```

may become appropriate.

For very large fleets:

```text
GPS ingestion service
+
message broker
+
stream processing
+
geospatial index
+
PostgreSQL
```

can be introduced.

Do not start with a distributed architecture unless actual load requires it.

---

# 144. Recommended MVP Architecture

For the first production version:

```text
React Native Driver
        |
        v
Next.js API
        |
        +--> PostgreSQL
        |
        +--> H3
        |
        +--> WebSocket/SSE
        |
        +--> Routing Provider
```

Add Redis when:

```text
driver lookup
realtime fanout
location throughput
```

actually requires it.

---

# 145. Recommended Production Architecture

```text
Driver Apps
    |
    v
API Gateway / Next.js
    |
    +--------------------+
    |                    |
    v                    v
Tracking Service      Order Service
    |                    |
    v                    v
Redis/H3 Index        PostgreSQL
    |
    +--> Realtime
    |
    +--> Dispatch
    |
    +--> ETA
```

---

# 146. Observability

Tracking metrics:

```text
gps_updates_received
gps_updates_rejected
gps_updates_stale
gps_accuracy_distribution
location_processing_latency
h3_lookup_latency
dispatch_candidate_count
dispatch_assignment_time
eta_calculation_latency
realtime_delivery_latency
tracking_disconnects
```

---

# 147. Delivery Metrics

Monitor:

```text
order_to_assignment_time
assignment_to_acceptance_time
pickup_wait_time
pickup_to_delivery_time
total_delivery_time
eta_error
route_deviation_count
driver_reassignment_rate
delivery_failure_rate
```

---

# 148. GPS Metrics

Monitor:

```text
average GPS accuracy
median GPS accuracy
GPS update interval
stale location percentage
offline buffer size
GPS anomaly count
location ingestion rate
```

---

# 149. H3 Metrics

Monitor:

```text
H3 conversion latency
candidate cells searched
candidate driver count
dispatch search radius
H3 cache hit rate
drivers per H3 cell
deliveries per H3 cell
```

---

# 150. Security Monitoring

Monitor suspicious behavior:

```text
GPS teleportation
impossible speed
repeated spoofed coordinates
location injection
unauthorized delivery tracking
cross-driver access attempts
cross-customer tracking attempts
```

---

# 151. Testing Strategy

## Unit Tests

Test:

```text
GPS validation
H3 conversion
H3 neighbor generation
distance calculation
geofence logic
ETA logic
state transitions
```

## Integration Tests

Test:

```text
driver location ingestion
H3 index update
driver assignment
delivery state transition
tracking authorization
```

## E2E Tests

Test:

```text
customer orders
vendor prepares
driver assigned
driver accepts
driver moves
customer sees location
driver picks up
driver arrives
OTP verified
delivery completed
```

---

# 152. H3 Tests

Required tests:

```text
[ ] latLngToCell
[ ] cellToLatLng
[ ] gridDisk
[ ] gridDistance
[ ] different resolutions
[ ] invalid coordinates
[ ] cell boundary cases
[ ] pentagon traversal handling
[ ] driver candidate search
[ ] empty candidate search
[ ] expanding search radius
```

---

# 153. Tracking Test Scenario

Example:

```text
Driver:
12.9716, 77.5946

Pickup:
12.9750, 77.6000

Customer:
12.9800, 77.6100
```

Expected:

```text
Driver GPS
   |
   v
H3 driver cell
   |
   v
candidate dispatch
   |
   v
driver assigned
   |
   v
GPS updates
   |
   v
customer receives realtime updates
   |
   v
driver reaches pickup
   |
   v
pickup verification
   |
   v
customer tracking continues
   |
   v
delivery verification
   |
   v
DELIVERED
```

---

# 154. Failure Testing

Test:

```text
[ ] Driver loses network
[ ] Driver loses GPS
[ ] Driver rejects assignment
[ ] Driver becomes unavailable
[ ] Driver app crashes
[ ] Customer loses network
[ ] WebSocket disconnects
[ ] Routing provider unavailable
[ ] GPS is inaccurate
[ ] Driver sends duplicate location
[ ] Driver sends future timestamp
[ ] Driver sends impossible speed
[ ] Driver attempts unauthorized delivery
```

---

# 155. Recovery Rules

If realtime fails:

```text
REST fallback
```

If routing provider fails:

```text
retain last known ETA
+
mark ETA stale
```

If GPS fails:

```text
retain last known position
+
mark tracking stale
```

If driver rejects:

```text
dispatch next candidate
```

If driver disconnects:

```text
wait configured threshold
+
attempt recovery
+
reassign if required
```

---

# 156. Final Source of Truth

For delivery:

```text
PostgreSQL
```

For current driver location:

```text
PostgreSQL current-location record
```

or a transactional fast-location layer whose data is persisted/reconciled into PostgreSQL.

For realtime:

```text
WebSocket/SSE
```

For dispatch optimization:

```text
H3 + fast active-driver index
```

For road routing:

```text
Routing Engine
```

No single component should be incorrectly treated as responsible for all of these concerns.

---

# 157. Complete System Rule

The final system should operate like this:

```text
                    ORDER
                      |
                      v
              DELIVERY CREATED
                      |
                      v
                  DISPATCH
                      |
                      v
              H3 CANDIDATE SEARCH
                      |
                      v
              DRIVER ASSIGNMENT
                      |
                      v
                DRIVER ACCEPTS
                      |
                      v
                   GPS
                      |
             +--------+--------+
             |        |        |
             v        v        v
            H3      ROUTING  REALTIME
             |        |        |
             v        v        v
          DISPATCH   ETA    CUSTOMER
             |
             v
           PICKUP
             |
             v
         IN_TRANSIT
             |
             v
          ARRIVING
             |
             v
        VERIFICATION
             |
             v
          DELIVERED
```

---

# 158. Final Architectural Rules

1. GPS provides the actual driver location.
2. H3 indexes the location spatially.
3. H3 does not replace GPS.
4. H3 does not replace road routing.
5. Routing provides road distance and ETA.
6. PostgreSQL stores authoritative delivery state.
7. Realtime transports state but does not own state.
8. Driver location must be validated server-side.
9. H3 cells must be calculated server-side.
10. Clients must not submit trusted H3 values.
11. H3 resolution must be controlled by the backend.
12. Multiple H3 resolutions should be used for different workloads.
13. H3 should reduce the candidate set before expensive routing calls.
14. Final driver selection should consider road ETA, not only H3 distance.
15. Customer tracking must expose only the assigned driver's relevant location.
16. Drivers must not see other drivers' private locations.
17. Continuous driver tracking should normally occur only during active delivery operations.
18. Raw GPS and H3 indexes should both be retained where operationally necessary.
19. GPS history must have a defined retention policy.
20. GPS anomalies must be detected and handled without relying on one signal.
21. Pickup must be explicitly verified.
22. Delivery must be explicitly verified.
23. GPS proximity alone must not mark an order delivered.
24. Parcel custody must be tracked independently from GPS.
25. Driver reassignment must preserve assignment history.
26. Location updates must be rate controlled.
27. Offline GPS samples must retain their original recording timestamps.
28. WebSocket failures must have REST fallback.
29. ETA must be treated as an estimate, not an authoritative delivery state.
30. H3 is primarily a spatial indexing and optimization layer.
31. Routing is responsible for road-aware movement.
32. PostgreSQL remains the persistent business source of truth.
33. Privacy and access control apply to every location query.
34. Administrative location access must be auditable.
35. The architecture should start simple and introduce Redis/stream processing only when scale requires it.

---

# 159. Definition of Done

The tracking system is complete when:

```text
[ ] Driver can receive assignment
[ ] Driver can accept assignment
[ ] Driver GPS can be collected
[ ] Driver GPS can be uploaded
[ ] GPS coordinates are validated
[ ] H3 cell is calculated server-side
[ ] Current driver location is maintained
[ ] Location history is stored
[ ] Driver can be found using H3
[ ] H3 neighbor search works
[ ] Driver assignment is atomic
[ ] Customer can see assigned driver
[ ] Customer can receive realtime location
[ ] REST fallback works
[ ] ETA is calculated through routing
[ ] Route deviation can be detected
[ ] Pickup geofence works
[ ] Pickup verification works
[ ] Delivery geofence works
[ ] Delivery verification works
[ ] Delivery completion updates order
[ ] Driver tracking stops after delivery
[ ] GPS stale state works
[ ] Network failure recovery works
[ ] Driver reassignment works
[ ] Parcel custody is tracked
[ ] Location access is authorized
[ ] Location retention is implemented
[ ] GPS anomalies are detected
[ ] H3 edge cases are tested
[ ] Load testing is completed
[ ] Tracking metrics are monitored
```

---

# 160. Final Principle

The platform should **not** be designed as:

```text
GPS → H3 → Map
```

It should be designed as:

```text
                    GPS
                     |
        +------------+------------+
        |            |            |
        v            v            v
     RAW GPS        H3         ROUTING
        |            |            |
        |            |            +--> ETA
        |            |
        |            +--> Dispatch
        |            +--> Proximity
        |            +--> Zones
        |            +--> Analytics
        |
        +--> Customer Map
        +--> Tracking History

                     |
                     v
              DELIVERY SERVICE
                     |
                     v
              PostgreSQL
                     |
                     v
                REALTIME
                     |
          +----------+----------+
          |          |          |
       Customer   Vendor      Admin
```

**The core rule is:**

> **GPS tells you where the rider actually is. H3 tells you which geographic cell that rider belongs to. The routing engine tells you how the rider can travel through the road network. The delivery service tells you what is happening to the parcel. PostgreSQL tells you what the authoritative state of the delivery is.**
