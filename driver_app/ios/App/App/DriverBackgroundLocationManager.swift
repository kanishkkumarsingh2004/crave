import CoreLocation
import Foundation
import UIKit
import UserNotifications

final class DriverBackgroundLocationManager: NSObject, CLLocationManagerDelegate {
    static let shared = DriverBackgroundLocationManager()

    private let locationManager = CLLocationManager()
    private let defaults = UserDefaults.standard
    private let keyPrefix = "CapacitorStorage."
    private var isObservingPreferences = false
    private var uploadInProgress = false
    private var lastUploadAt = Date.distantPast
    private var offerPollInProgress = false
    private var lastOfferPollAt = Date.distantPast
    private var notifiedOfferIds = Set<String>()

    private override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.distanceFilter = 10
        locationManager.activityType = .automotiveNavigation
        locationManager.pausesLocationUpdatesAutomatically = false
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.showsBackgroundLocationIndicator = true
    }

    func startMonitoringPreferences() {
        guard !isObservingPreferences else { return }
        isObservingPreferences = true
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(preferencesDidChange),
            name: UserDefaults.didChangeNotification,
            object: defaults
        )
        refresh()
    }

    @objc private func preferencesDidChange() {
        DispatchQueue.main.async { [weak self] in self?.refresh() }
    }

    func refresh() {
        guard isDutyEnabled, configuration != nil else {
            stop()
            return
        }

        switch locationManager.authorizationStatus {
        case .notDetermined:
            locationManager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse:
            locationManager.requestAlwaysAuthorization()
            locationManager.startUpdatingLocation()
        case .authorizedAlways:
            locationManager.startUpdatingLocation()
        case .denied, .restricted:
            stop()
        @unknown default:
            stop()
        }
    }

    func stop() {
        locationManager.stopUpdatingLocation()
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        refresh()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last,
              Date().timeIntervalSince(location.timestamp) < 60 else { return }
        upload(location)
        pollDeliveryOffers()
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        if let locationError = error as? CLError, locationError.code == .denied {
            stop()
        }
    }

    private var isDutyEnabled: Bool {
        defaults.string(forKey: keyPrefix + "crave_driver_duty_online") == "true"
    }

    private struct Configuration {
        let token: String
        let driverId: String
        let apiOrigin: String
        let orderId: String
        let vehicleType: String
    }

    private var configuration: Configuration? {
        let token = defaults.string(forKey: keyPrefix + "crave_driver_auth_token") ?? ""
        let driverId = defaults.string(forKey: keyPrefix + "crave_driver_background_driver_id") ?? ""
        let apiOrigin = defaults.string(forKey: keyPrefix + "crave_driver_background_api_origin") ?? ""
        guard !token.isEmpty,
              !driverId.isEmpty,
              apiOrigin.hasPrefix("https://") else { return nil }
        return Configuration(
            token: token,
            driverId: driverId,
            apiOrigin: apiOrigin,
            orderId: defaults.string(forKey: keyPrefix + "crave_driver_background_order_id") ?? "",
            vehicleType: defaults.string(forKey: keyPrefix + "crave_driver_background_vehicle_type") ?? "EV_SCOOTER"
        )
    }

    private func upload(_ location: CLLocation) {
        guard !uploadInProgress,
              Date().timeIntervalSince(lastUploadAt) >= 5,
              let configuration,
              let url = URL(string: configuration.apiOrigin.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + "/api/driver/location") else { return }

        uploadInProgress = true
        lastUploadAt = Date()
        var body: [String: Any] = [
            "driverId": configuration.driverId,
            "lat": location.coordinate.latitude,
            "lng": location.coordinate.longitude,
            "accuracy": location.horizontalAccuracy,
            "timestamp": Int(location.timestamp.timeIntervalSince1970 * 1000),
            "status": configuration.orderId.isEmpty ? "ONLINE" : "ON_TRIP",
            "available": configuration.orderId.isEmpty,
            "vehicleType": configuration.vehicleType,
        ]
        if !configuration.orderId.isEmpty { body["orderId"] = configuration.orderId }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(configuration.token)", forHTTPHeaderField: "Authorization")
        request.setValue("driver", forHTTPHeaderField: "X-Crave-Native-App")
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { [weak self] _, response, _ in
            DispatchQueue.main.async {
                guard let self else { return }
                self.uploadInProgress = false
                if let status = (response as? HTTPURLResponse)?.statusCode,
                   status == 401 || status == 403 {
                    self.stop()
                }
            }
        }.resume()
    }

    private func pollDeliveryOffers() {
        guard !offerPollInProgress,
              Date().timeIntervalSince(lastOfferPollAt) >= 15,
              defaults.string(forKey: keyPrefix + "crave_driver_notifications_enabled") == "true",
              let configuration,
              let url = URL(string: configuration.apiOrigin.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + "/api/driver/offers") else { return }

        offerPollInProgress = true
        lastOfferPollAt = Date()
        requestOffers(configuration: configuration, url: url, legacyResponse: false)
    }

    private func requestOffers(configuration: Configuration, url: URL, legacyResponse: Bool) {
        var request = URLRequest(url: url)
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("Bearer \(configuration.token)", forHTTPHeaderField: "Authorization")
        request.setValue("driver", forHTTPHeaderField: "X-Crave-Native-App")

        URLSession.shared.dataTask(with: request) { [weak self] data, response, _ in
            DispatchQueue.main.async {
                guard let self else { return }
                guard let status = (response as? HTTPURLResponse)?.statusCode else {
                    self.offerPollInProgress = false
                    return
                }
                if status == 404, !legacyResponse,
                   let fallbackUrl = URL(string: configuration.apiOrigin.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + "/api/orders?available=true") {
                    self.requestOffers(
                        configuration: configuration,
                        url: fallbackUrl,
                        legacyResponse: true
                    )
                    return
                }
                self.offerPollInProgress = false
                if status == 401 || status == 403 {
                    self.stop()
                    return
                }
                guard status >= 200, status < 300,
                      let data,
                      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let offers = json[legacyResponse ? "orders" : "offers"] as? [[String: Any]] else { return }

                let appIsActive = UIApplication.shared.applicationState == .active
                for offer in offers {
                    if legacyResponse {
                        let availableStatuses = Set([
                            "sent_to_vendor",
                            "preparing",
                            "packing",
                            "ready_for_pickup",
                        ])
                        let status = offer["status"] as? String ?? ""
                        let paymentStatus = offer["payment_status"] as? String ?? ""
                        let hasRider = offer["rider_id"] != nil && !(offer["rider_id"] is NSNull)
                        if !availableStatuses.contains(status) || paymentStatus != "verified" || hasRider {
                            continue
                        }
                    }
                    guard let orderId = offer["id"] as? String,
                          !orderId.isEmpty,
                          !self.notifiedOfferIds.contains(orderId) else { continue }
                    self.notifiedOfferIds.insert(orderId)
                    if !appIsActive { self.showOfferNotification(orderId: orderId, offer: offer) }
                }
            }
        }.resume()
    }

    private func showOfferNotification(orderId: String, offer: [String: Any]) {
        let restaurantName = offer["restaurantName"] as? String
            ?? offer["restaurant_name"] as? String
            ?? "Crave restaurant"
        let snapshot = offer["financial_snapshot"] as? [String: Any]
        let snapshotPayout = (snapshot?["riderPayablePaise"] as? NSNumber)?.doubleValue
        let payout = (offer["driverPayout"] as? NSNumber)?.doubleValue
            ?? snapshotPayout.map { $0 / 100 }
            ?? (offer["driver_payout"] as? NSNumber)?.doubleValue
            ?? (offer["delivery_fee"] as? NSNumber)?.doubleValue
            ?? 0
        let content = UNMutableNotificationContent()
        content.title = payout > 0 ? "New delivery · ₹\(Int(payout.rounded()))" : "New delivery"
        content.body = "\(restaurantName) · Tap to review the trip"
        content.sound = .default
        content.userInfo = ["type": "offer_available", "orderId": orderId, "route": "home"]
        UNUserNotificationCenter.current().add(
            UNNotificationRequest(identifier: orderId, content: content, trigger: nil)
        )
    }
}
