# Real-Time Driver & Order Tracking Architecture Blueprint

This document provides a production-grade, scalable technical architecture for real-time driver tracking in a delivery application. It outlines algorithms, map matching, interpolation, communication layers, and fully open-source, self-hostable technology stacks.

---

## 1. High-Level System Architecture

```
   ┌───────────────────────────┐
   │ Driver Mobile App         │
   │ (Flutter / React Native)  │
   └─────────────┬─────────────┘
                 │ (MQTT / gRPC / WebSocket over TLS)
                 ▼
   ┌───────────────────────────┐
   │ Ingestion Gateway / Proxy │
   │ (Envoy / EMQX / Nginx)    │
   └─────────────┬─────────────┘
                 │
                 ▼
   ┌────────────────────────────────────────────────────────┐
   │ Real-Time Processing Service                           │
   │ - Kalman Filter & Outlier Cleaning                     │
   │ - Map-Matching Engine (OSRM / Valhalla)                │
   │ - Dynamic Geofencing (Restaurant / Drop-off Trigger)   │
   └───────────┬──────────────────────────┬─────────────────┘
               │                          │
    Update Ephemeral State        Publish Location Event
               │                          │
               ▼                          ▼
   ┌───────────────────────────┐  ┌─────────────────────────┐
   │ Redis Cluster             │  │ Redis Pub/Sub / Kafka   │
   │ (GEOADD, GEOSEARCH)       │  └───────────┬─────────────┘
   └───────────────────────────┘              │
                                              ▼
   ┌───────────────────────────┐  ┌─────────────────────────┐
   │ Historical Trace Storage  │  │ WebSocket/SSE Hub       │
   │ (PostgreSQL + PostGIS /   │  │ (Socket.io / Centrifugo)│
   │  TimescaleDB)             │  └───────────┬─────────────┘
   └───────────────────────────┘              │
                                              ▼
                                 ┌──────────────────────────┐
                                 │ Customer Mobile App      │
                                 │ - Bearing Lerp & Splines │
                                 │ - Animated Marker Catchup│
                                 └──────────────────────────┘
```

---

## 2. Core Algorithms & Mathematical Formulations

### A. Extended Kalman Filter (EKF) for Noise Filtering

Raw GPS fixes suffer from multipath interference and dilution of precision. An Extended Kalman Filter combines the driver's reported GPS coordinates with physics-based kinematics (velocity and acceleration).

The dynamic state vector is defined as:
$$x_k = \begin{bmatrix} p_x \\ p_y \\ v_x \\ v_y \end{bmatrix}$$

Where:

- $p_x, p_y$ are projected metric Cartesian coordinates (e.g., UTM projection).
- $v_x, v_y$ are velocity components.

State transition between measurement interval $\Delta t$:
$$x_k = F x_{k-1} + w_{k-1}$$

Where the transition matrix $F$ is:
$$F = \begin{bmatrix} 1 & 0 & \Delta t & 0 \\ 0 & 1 & 0 & \Delta t \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \end{bmatrix}$$

The filter evaluates the measurement residual $y_k$ against measurement covariance $R$ to compute the Kalman Gain $K_k$, discarding sudden teleportation anomalies and bridging small GPS drops.

---

### B. Map Matching via Hidden Markov Models (HMM)

To prevent vehicles from jumping onto sidewalks, parallel alleys, or driving inside buildings, raw trajectories must be snapped to a validated road network.

- **Hidden States ($S_i$):** Candidate candidate road segments near GPS observation $z_i$.
- **Emission Probability ($p(z_i \mid s_i)$):** Distance-based likelihood that observation $z_i$ came from point $x_i$ on road segment $s_i$:
  $$p(z_i \mid s_i) = \frac{1}{\sqrt{2\pi\sigma_z^2}} \exp\left(-\frac{\text{dist}(z_i, x_i)^2}{2\sigma_z^2}\right)$$
- **Transition Probability ($p(s_i \mid s\_{i-1})$):** Likelihood of traversing from road segment $s_{i-1}$ to $s_i$, penalizing transitions where road network routing distance deviates drastically from great-circle distance:
  $$p(s_i \mid s_{i-1}) = \frac{1}{\beta} \exp\left(-\frac{|\text{dist}_{\text{network}}(x_{i-1}, x_i) - \text{dist}_{\text{euclidean}}(z_{i-1}, z_i)|}{\beta}\right)$$
- **Viterbi Algorithm:** Computes the maximum a posteriori (MAP) sequence of road segments across the rolling GPS window.

---

### C. Client-Side Motion Interpolation (Lerp & Slerp)

Never set map marker coordinates instantly to a new packet. The customer UI should lag real-time by an intentional delay equal to the reporting frequency (e.g., 2–3 seconds), smoothly interpolating along the snapped polyline.

#### Position Interpolation

For progress factor $t \in [0, 1]$ across update duration $T$:
$$P(t) = P_{\text{start}} + t \cdot (P_{\text{end}} - P_{\text{start}})$$

#### Bearing (Heading) Angle Smoothing

To avoid erratic marker spinning, interpolate angles using the shortest circular arc:
$$\Delta\theta = ((\theta_{\text{target}} - \theta_{\text{current}} + 540^\circ) \bmod 360^\circ) - 180^\circ$$
$$\theta(t) = \theta_{\text{current}} + t \cdot \Delta\theta$$

---

## 3. Recommended Open-Source Stack

All components listed below are free, open-source, and can be self-hosted on cost-effective infrastructure (e.g., Hetzner, DigitalOcean, AWS EC2).

| Component                     | Open-Source Tool                                           | Why It Fits Delivery Apps                                                                                                    |
| :---------------------------- | :--------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| **Routing & Map Matching**    | **Valhalla** or **OSRM**                                   | Ultra-fast C++ routing engines. Valhalla provides the _Meili_ map-matching module; OSRM provides the `/match` endpoint.      |
| **Map Tiles & Rendering**     | **MapLibre GL** (Client) + **Protomaps / Martin** (Server) | Replaces Mapbox/Google Maps. Native vector tile rendering on iOS, Android, and Web without usage quotas.                     |
| **Map Data**                  | **OpenStreetMap (OSM)**                                    | Free, continuously updated community-driven road geometries and turn restrictions.                                           |
| **Ingestion Protocol**        | **EMQX (Open Source)** or **Eclipse Mosquitto**            | MQTT brokers engineered for battery-efficient, high-concurrency mobile socket streaming over flaky cellular networks.        |
| **Fast Ephemeral Geo Cache**  | **Redis (Standalone / Sentinel)**                          | Built-in geospatial indexing (`GEOADD`, `GEOSEARCH`) executes coordinate updates in sub-millisecond windows.                 |
| **Persistent Spatial DB**     | **PostgreSQL + PostGIS**                                   | Industry-standard spatial SQL for geofencing, merchant boundaries, and historical order analytics.                           |
| **Client Real-Time Delivery** | **Centrifugo**                                             | Self-hosted, scalable real-time messaging server supporting WebSockets, SSE, and automatic channel authentication per order. |

---

## 4. End-to-End Implementation Flow

### Step 1: Driver Client Ingestion & Battery Optimization

1. **Adaptive Sampling Policy:**
   - **In transit ($v > 5\text{ km/h}$):** Transmit payload every 3 seconds.
   - **Stopped / Waiting ($v \le 5\text{ km/h}$ for $> 30\text{s}$):** Reduce transmission to once every 20 seconds.
2. **Payload Structure (MQTT/JSON):**
   ```json
   {
     "driver_id": "drv_8831",
     "order_id": "ord_4402",
     "lat": 12.971598,
     "lng": 77.594566,
     "speed": 6.8,
     "bearing": 142.5,
     "accuracy": 4.2,
     "timestamp": 1790869200
   }
   ```

### Step 2: Ingestion & Spatial Cache Update

Upon packet arrival, the ingestion worker writes directly to Redis:

```bash
# Add location to driver's active geo-set
GEOADD active_drivers:locations 77.594566 12.971598 drv_8831

# Cache instantaneous telemetry for UI rendering
HSET driver:drv_8831 lat 12.971598 lng 77.594566 speed 6.8 bearing 142.5
```

### Step 3: Snap to Road (OSRM Integration)

Forward the recent window of points to the local OSRM instance:

```bash
curl "http://localhost:5000/match/v1/driving/77.5941,12.9712;77.5945,12.9715?geometries=geojson&overview=simplified"
```

The response returns the clean, matched segment on the street graph.

### Step 4: ETA Calculation & Dynamic Geofencing

1. Run a point-to-polygon check in PostGIS or memory to detect arrival zones:
   - **Near Merchant ($< 100\text{m}$):** Send push notification to the kitchen to prep packaging.
   - **Near Customer ($< 200\text{m}$):** Alert the customer that the driver is arriving.
2. **Progressive ETA:**
   - Calculate full path distance remaining using Valhalla/OSRM.
   - Divide by a rolling exponential moving average (EMA) of recent driver velocity.

### Step 5: Broadcast to Customer

Publish the cleaned coordinate and matched path segment through Centrifugo or Redis Pub/Sub:

- **Topic:** `orders:ord_4402`
- **Payload:**
  ```json
  {
    "lat": 12.97161,
    "lng": 77.5946,
    "bearing": 145.0,
    "eta_seconds": 380,
    "status": "IN_TRANSIT"
  }
  ```

---

## 5. Security, Resiliency & Edge Cases

- **Tunnels & Signal Dead Zones:** The driver mobile app maintains a local SQLite FIFO queue. When offline, fixes are saved with hardware timestamps. Once cellular connection restores, the backlog flushes in batch. The backend identifies backfilled timestamps and logs them to storage without triggering outdated customer push notifications.
- **Customer Channel Authorization:** Secure the tracking stream so customers can only subscribe to their active `order_id` channel using short-lived JWT tokens signed by your primary authentication service.
- **Driver Location Privacy:** Mask the exact location of the driver when they are en route to the merchant; only initiate public coordinate streaming to the customer once the order has officially entered the `OUT_FOR_DELIVERY` state.
