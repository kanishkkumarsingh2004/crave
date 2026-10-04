/**
 * ಕನ್ನಡ (kn) — Kannada translation dictionary
 * ─────────────────────────────────────────────────────────────
 * Sorted following the Kannada Varnamale (ವರ್ಣಮಾಲೆ) phonetic order:
 *   Vowels (ಸ್ವರಗಳು): ಅ ಆ ಇ ಈ ಉ ಊ ಋ ಎ ಏ ಐ ಒ ಓ ಔ
 *   Yogavahagalu: ಅಂ (anusvara) ಅಃ (visarga)
 *   Consonants row by row (ವ್ಯಂಜನಗಳು):
 *     Velars  → ಕ ಖ ಗ ಘ ಙ
 *     Palatals → ಚ ಛ ಜ ಝ ಞ
 *     Retroflex → ಟ ಠ ಡ ಢ ಣ
 *     Dentals  → ತ ಥ ದ ಧ ನ
 *     Labials  → ಪ ಫ ಬ ಭ ಮ
 *     Misc     → ಯ ರ ಲ ವ ಶ ಷ ಸ ಹ ಳ
 *
 * Key structure must be identical to en.ts — only the string values differ.
 */

import type { Dictionary } from './en'

const kn: Dictionary = {
  // ── Meta ────────────────────────────────────────────────────
  meta: {
    languageName: 'Kannada',
    languageNativeName: 'ಕನ್ನಡ',
    languageCode: 'kn',
    direction: 'ltr',
  },

  // ── Common / Shared ─────────────────────────────────────────
  common: {
    loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ…',
    save: 'ಉಳಿಸಿ',
    cancel: 'ರದ್ದುಮಾಡಿ',
    confirm: 'ಖಚಿತಪಡಿಸಿ',
    delete: 'ಅಳಿಸಿ',
    edit: 'ತಿದ್ದಿ',
    close: 'ಮುಚ್ಚಿ',
    back: 'ಹಿಂದೆ',
    next: 'ಮುಂದೆ',
    submit: 'ಸಲ್ಲಿಸಿ',
    search: 'ಹುಡುಕಿ',
    filter: 'ಫಿಲ್ಟರ್',
    refresh: 'ರಿಫ್ರೆಶ್ ಮಾಡಿ',
    viewAll: 'ಎಲ್ಲವನ್ನೂ ನೋಡಿ',
    noData: 'ಮಾಹಿತಿ ಇಲ್ಲ',
    error: 'ತಪ್ಪಾಗಿದೆ',
    success: 'ಯಶಸ್ಸಾಯಿತು',
    yes: 'ಹೌದು',
    no: 'ಇಲ್ಲ',
    or: 'ಅಥವಾ',
    and: 'ಮತ್ತು',
    required: 'ಕಡ್ಡಾಯ',
    optional: 'ಐಚ್ಛಿಕ',
    actions: 'ಕ್ರಿಯೆಗಳು',
    status: 'ಸ್ಥಿತಿ',
    date: 'ದಿನಾಂಕ',
    time: 'ಸಮಯ',
    amount: 'ಮೊತ್ತ',
    total: 'ಒಟ್ಟು',
    name: 'ಹೆಸರು',
    email: 'ಇಮೇಲ್',
    phone: 'ಫೋನ್',
    address: 'ವಿಳಾಸ',
    role: 'ಪಾತ್ರ',
    id: 'ಐಡಿ',
    type: 'ವಿಧ',
    description: 'ವಿವರಣೆ',
    createdAt: 'ರಚಿಸಲಾದ ದಿನಾಂಕ',
    updatedAt: 'ನವೀಕರಿಸಿದ ದಿನಾಂಕ',
  },

  // ── Auth ─────────────────────────────────────────────────────
  auth: {
    login: 'ಲಾಗಿನ್ ಮಾಡಿ',
    logout: 'ಹೊರಗೆ ಹೋಗಿ',
    signup: 'ಖಾತೆ ರಚಿಸಿ',
    email: 'ಇಮೇಲ್ ವಿಳಾಸ',
    password: 'ಪಾಸ್‌ವರ್ಡ್',
    forgotPassword: 'ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?',
    rememberMe: 'ನನ್ನನ್ನು ನೆನಪಿಡಿ',
    loginTitle: 'ಮತ್ತೆ ಸ್ವಾಗತ',
    loginSubtitle: 'ನಿಮ್ಮ ಖಾತೆಗೆ ಲಾಗಿನ್ ಮಾಡಿ',
    signupTitle: 'ಪ್ರಾರಂಭಿಸಿ',
    signupSubtitle: 'ನಿಮ್ಮ ಖಾತೆ ರಚಿಸಿ',
    noAccount: 'ಖಾತೆ ಇಲ್ಲವೇ?',
    hasAccount: 'ಈಗಾಗಲೇ ಖಾತೆ ಇದೆಯೇ?',
    invalidCredentials: 'ಇಮೇಲ್ ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್ ತಪ್ಪಾಗಿದೆ',
    emailRequired: 'ಇಮೇಲ್ ಅಗತ್ಯ',
    passwordRequired: 'ಪಾಸ್‌ವರ್ಡ್ ಅಗತ್ಯ',
    loggingIn: 'ಲಾಗಿನ್ ಆಗುತ್ತಿದೆ…',
    signingUp: 'ಖಾತೆ ರಚಿಸುತ್ತಿದೆ…',
    logoutConfirm: 'ನೀವು ಹೊರಗೆ ಹೋಗಲು ಬಯಸುವಿರಾ?',
  },

  // ── Navigation ───────────────────────────────────────────────
  nav: {
    dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    analytics: 'ವಿಶ್ಲೇಷಣೆ',
    orders: 'ಆದೇಶಗಳು',
    menu: 'ಮೆನು',
    payments: 'ಪಾವತಿಗಳು',
    users: 'ಬಳಕೆದಾರರು',
    coupons: 'ಕೂಪನ್‌ಗಳು',
    settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    profile: 'ಪ್ರೊಫೈಲ್',
    wallet: 'ವ್ಯಾಲೆಟ್',
    history: 'ಇತಿಹಾಸ',
    home: 'ಮನೆ',
    notifications: 'ಅಧಿಸೂಚನೆಗಳು',
    help: 'ಸಹಾಯ',
  },

  // ── Admin ────────────────────────────────────────────────────
  admin: {
    console: 'ಅಡ್ಮಿನ್ ಕನ್ಸೋಲ್',
    commandCenter: 'ಅಡ್ಮಿನ್ ಕಮಾಂಡ್ ಸೆಂಟರ್',
    platformOverview: 'ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ ಅವಲೋಕನ',
    platformAnalytics: 'ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ ವಿಶ್ಲೇಷಣೆ',
    paymentReviewQueue: 'ಪಾವತಿ ಪರಿಶೀಲನಾ ಸಾಲು',
    userAccounts: 'ಬಳಕೆದಾರ ಖಾತೆಗಳು',
    couponsDiscounts: 'ಕೂಪನ್ ಮತ್ತು ರಿಯಾಯಿತಿ',
    vendorSettlements: 'ವೆಂಡರ್ ಸೆಟ್ಲ್‌ಮೆಂಟ್‌ಗಳು',
    paymentConfigs: 'ಪಾವತಿ ಕಾನ್ಫಿಗ್ (UPI)',
    systemHealthLogs: 'ಸಿಸ್ಟಮ್ ಆರೋಗ್ಯ ಲಾಗ್‌ಗಳು',
    adminSettings: 'ಅಡ್ಮಿನ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    masterAdminAccess: 'ಮಾಸ್ಟರ್ ಅಡ್ಮಿನ್ ಪ್ರವೇಶ',
    managementControls: 'ನಿರ್ವಹಣೆ ಮತ್ತು ನಿಯಂತ್ರಣ',
    minimizeSidebar: 'ಸೈಡ್‌ಬಾರ್ ಕಡಿಮೆ ಮಾಡಿ',
    loadingConsole: 'ಅಡ್ಮಿನ್ ಕನ್ಸೋಲ್ ಲೋಡ್ ಆಗುತ್ತಿದೆ…',
    createVendor: 'ವೆಂಡರ್ ರಚಿಸಿ',
    deleteVendor: 'ವೆಂಡರ್ ಅಳಿಸಿ',
    totalRevenue: 'ಒಟ್ಟು ಆದಾಯ',
    totalOrders: 'ಒಟ್ಟು ಆದೇಶಗಳು',
    activeVendors: 'ಸಕ್ರಿಯ ವೆಂಡರ್‌ಗಳು',
    activeDrivers: 'ಸಕ್ರಿಯ ಚಾಲಕರು',
  },

  // ── Vendor ───────────────────────────────────────────────────
  vendor: {
    console: 'ಕಿಚನ್ ಕನ್ಸೋಲ್',
    dashboard: 'ಕಿಚನ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    liveOrders: 'ನೇರ ಆದೇಶಗಳು',
    menuManagement: 'ಮೆನು ನಿರ್ವಹಣೆ',
    salesReports: 'ಮಾರಾಟ ವರದಿಗಳು',
    couponManager: 'ಕೂಪನ್ ನಿರ್ವಾಹಕ',
    vendorSettings: 'ವೆಂಡರ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    loadingConsole: 'ಕಿಚನ್ ಕನ್ಸೋಲ್ ಲೋಡ್ ಆಗುತ್ತಿದೆ…',
    restaurantName: 'ರೆಸ್ಟೋರೆಂಟ್ ಹೆಸರು',
    cuisine: 'ಅಡಿಗೆ ವಿಧ',
    isOpen: 'ಆದೇಶಕ್ಕೆ ತೆರೆದಿದೆ',
    isClosed: 'ಮುಚ್ಚಲಾಗಿದೆ',
    addMenuItem: 'ಮೆನು ಐಟಂ ಸೇರಿಸಿ',
    editMenuItem: 'ಐಟಂ ತಿದ್ದಿ',
    itemName: 'ಐಟಂ ಹೆಸರು',
    itemPrice: 'ಬೆಲೆ',
    itemCategory: 'ವರ್ಗ',
    inStock: 'ದಾಸ್ತಾನಿನಲ್ಲಿ ಇದೆ',
    outOfStock: 'ದಾಸ್ತಾನಿನಲ್ಲಿ ಇಲ್ಲ',
    isVeg: 'ಸಸ್ಯಾಹಾರ',
    isNonVeg: 'ಮಾಂಸಾಹಾರ',
    ordersToday: 'ಇಂದಿನ ಆದೇಶಗಳು',
    revenueToday: 'ಇಂದಿನ ಆದಾಯ',
    pendingOrders: 'ಬಾಕಿ ಆದೇಶಗಳು',
    completedOrders: 'ಪೂರ್ಣಗೊಂಡ ಆದೇಶಗಳು',
  },

  // ── Driver ───────────────────────────────────────────────────
  driver: {
    dashboard: 'ಚಾಲಕ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    activeDelivery: 'ಸಕ್ರಿಯ ಡೆಲಿವರಿ ಕಾರ್ಯ',
    tripHistory: 'ಪ್ರಯಾಣ ಇತಿಹಾಸ',
    walletEarnings: 'ವ್ಯಾಲೆಟ್ ಮತ್ತು ಗಳಿಕೆ',
    vehicleProfile: 'ವಾಹನ ಮತ್ತು ಪ್ರೊಫೈಲ್',
    upiPayoutSettings: 'UPI ಪೇಔಟ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    incentives: 'ಪ್ರೋತ್ಸಾಹಗಳು',
    earnings: 'ಗಳಿಕೆ',
    completedDrops: 'ಮುಗಿದ ಡ್ರಾಪ್‌ಗಳು',
    dutyTime: 'ಡ್ಯೂಟಿ ಸಮಯ',
    avgPace: 'ಸರಾಸರಿ ವೇಗ',
    goOnline: 'ಆನ್‌ಲೈನ್ ಆಗಿ',
    goOffline: 'ಆಫ್‌ಲೈನ್ ಆಗಿ',
    online: 'ಆನ್‌ಲೈನ್',
    offline: 'ಆಫ್‌ಲೈನ್',
    scanNearbyOrders: 'ಹತ್ತಿರದ ಆದೇಶಗಳನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ',
    acceptOrder: 'ಒಪ್ಪಿಕೊಳ್ಳಿ',
    declineOrder: 'ನಿರಾಕರಿಸಿ',
    pickupLocation: 'ಪಿಕಪ್ ಸ್ಥಳ',
    dropLocation: 'ಡ್ರಾಪ್ ಸ್ಥಳ',
    deliveryOtp: 'ಡೆಲಿವರಿ OTP',
    loadingDashboard: 'ಚಾಲಕ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಲೋಡ್ ಆಗುತ್ತಿದೆ…',
  },

  // ── Customer / User ──────────────────────────────────────────
  customer: {
    dashboard: 'ನನ್ನ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    myOrders: 'ನನ್ನ ಆದೇಶಗಳು',
    favorites: 'ಮೆಚ್ಚಿನವುಗಳು',
    savedAddresses: 'ಉಳಿಸಿದ ವಿಳಾಸಗಳು',
    wallet: 'ವ್ಯಾಲೆಟ್',
    profile: 'ನನ್ನ ಪ್ರೊಫೈಲ್',
    trackOrder: 'ಆದೇಶ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ',
    reorder: 'ಮರುಆದೇಶಿಸಿ',
    orderPlaced: 'ಆದೇಶ ಸ್ವೀಕರಿಸಲಾಗಿದೆ',
    orderPreparing: 'ತಯಾರಿಸಲಾಗುತ್ತಿದೆ',
    orderReady: 'ಪಿಕಪ್‌ಗೆ ಸಿದ್ಧ',
    orderPickedUp: 'ಪಿಕಪ್ ಆಗಿದೆ',
    orderDelivered: 'ತಲುಪಿಸಲಾಗಿದೆ',
    orderCancelled: 'ರದ್ದುಮಾಡಲಾಗಿದೆ',
    applyCoupon: 'ಕೂಪನ್ ಅನ್ವಯಿಸಿ',
    removeCoupon: 'ಕೂಪನ್ ತೆಗೆದುಹಾಕಿ',
    couponApplied: 'ಕೂಪನ್ ಅನ್ವಯಿಸಲಾಗಿದೆ!',
    invalidCoupon: 'ಅಮಾನ್ಯ ಕೂಪನ್ ಕೋಡ್',
    subtotal: 'ಉಪ ಮೊತ್ತ',
    deliveryFee: 'ಡೆಲಿವರಿ ಶುಲ್ಕ',
    discount: 'ರಿಯಾಯಿತಿ',
    grandTotal: 'ಒಟ್ಟು ಮೊತ್ತ',
    addToCart: 'ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಿ',
    removeFromCart: 'ತೆಗೆದುಹಾಕಿ',
    placeOrder: 'ಆದೇಶ ಮಾಡಿ',
    emptyCart: 'ನಿಮ್ಮ ಕಾರ್ಟ್ ಖಾಲಿಯಾಗಿದೆ',
  },

  // ── Orders ───────────────────────────────────────────────────
  orders: {
    new: 'ಹೊಸ',
    preparing: 'ತಯಾರಿಸಲಾಗುತ್ತಿದೆ',
    packing: 'ಪ್ಯಾಕ್ ಮಾಡಲಾಗುತ್ತಿದೆ',
    ready: 'ಸಿದ್ಧ',
    pickedUp: 'ಪಿಕಪ್ ಆಗಿದೆ',
    completed: 'ಪೂರ್ಣಗೊಂಡಿದೆ',
    cancelled: 'ರದ್ದಾಗಿದೆ',
    orderNumber: 'ಆದೇಶ #',
    orderedAt: 'ಆದೇಶಿಸಿದ ಸಮಯ',
    estimatedTime: 'ಅಂದಾಜು ಸಮಯ',
    specialInstructions: 'ವಿಶೇಷ ಸೂಚನೆಗಳು',
    orderSummary: 'ಆದೇಶ ಸಾರಾಂಶ',
    orderDetails: 'ಆದೇಶ ವಿವರಗಳು',
  },

  // ── Payments ─────────────────────────────────────────────────
  payments: {
    paymentMethod: 'ಪಾವತಿ ವಿಧಾನ',
    upi: 'UPI',
    cash: 'ನಗದು ಪಾವತಿ',
    card: 'ಕಾರ್ಡ್',
    wallet: 'ವ್ಯಾಲೆಟ್',
    pending: 'ಬಾಕಿ ಇದೆ',
    approved: 'ಅನುಮೋದಿಸಲಾಗಿದೆ',
    rejected: 'ತಿರಸ್ಕರಿಸಲಾಗಿದೆ',
    settlement: 'ಸೆಟ್ಲ್‌ಮೆಂಟ್',
    payout: 'ಪೇಔಟ್',
    transactionId: 'ವಹಿವಾಟು ಐಡಿ',
    paymentStatus: 'ಪಾವತಿ ಸ್ಥಿತಿ',
    refund: 'ಮರುಪಾವತಿ',
    bankDetails: 'ಬ್ಯಾಂಕ್ ವಿವರಗಳು',
    accountNumber: 'ಖಾತೆ ಸಂಖ್ಯೆ',
    ifscCode: 'IFSC ಕೋಡ್',
    bankName: 'ಬ್ಯಾಂಕ್ ಹೆಸರು',
  },

  // ── Settings ─────────────────────────────────────────────────
  settings: {
    title: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    language: 'ಭಾಷೆ',
    languageDescription: 'ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆ ಆರಿಸಿ',
    theme: 'ಥೀಮ್',
    notifications: 'ಅಧಿಸೂಚನೆಗಳು',
    privacy: 'ಗೌಪ್ಯತೆ',
    security: 'ಭದ್ರತೆ',
    account: 'ಖಾತೆ',
    changePassword: 'ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಿ',
    deleteAccount: 'ಖಾತೆ ಅಳಿಸಿ',
    saveChanges: 'ಬದಲಾವಣೆಗಳನ್ನು ಉಳಿಸಿ',
    changesSaved: 'ಬದಲಾವಣೆಗಳು ಉಳಿಸಲಾಗಿವೆ!',
    languageChanged: 'ಭಾಷೆ ಯಶಸ್ವಿಯಾಗಿ ನವೀಕರಿಸಲಾಗಿದೆ',
  },

  // ── Errors ───────────────────────────────────────────────────
  errors: {
    notFound: 'ಪುಟ ಕಂಡುಬಂದಿಲ್ಲ',
    notFoundDesc: 'ನೀವು ಹುಡುಕುತ್ತಿರುವ ಪುಟ ಅಸ್ತಿತ್ವದಲ್ಲಿಲ್ಲ.',
    forbidden: 'ಪ್ರವೇಶ ನಿರಾಕರಿಸಲಾಗಿದೆ',
    forbiddenDesc: 'ಈ ಪುಟವನ್ನು ವೀಕ್ಷಿಸಲು ನಿಮಗೆ ಅನುಮತಿ ಇಲ್ಲ.',
    serverError: 'ಸರ್ವರ್ ದೋಷ',
    serverErrorDesc: 'ನಮ್ಮ ಕಡೆಯಿಂದ ಏನೋ ತಪ್ಪಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    networkError: 'ನೆಟ್‌ವರ್ಕ್ ದೋಷ',
    networkErrorDesc: 'ಸಂಪರ್ಕಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ನಿಮ್ಮ ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ.',
    goHome: 'ಮನೆಗೆ ಹೋಗಿ',
    tryAgain: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
  },

  // ── Language switcher ────────────────────────────────────────
  language: {
    selectLanguage: 'ಭಾಷೆ ಆರಿಸಿ',
    currentLanguage: 'ಪ್ರಸ್ತುತ ಭಾಷೆ',
    english: 'English',
    kannada: 'ಕನ್ನಡ',
    saving: 'ಉಳಿಸಲಾಗುತ್ತಿದೆ…',
  },
}

export default kn
