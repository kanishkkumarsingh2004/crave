/**
 * English (en) translation dictionary
 * ─────────────────────────────────────────────────────────────
 * Structure mirrors kn.ts exactly — every key present here must
 * appear in every other language file with the same shape.
 *
 * To add a new section: add the key block here first, then copy
 * the structure to kn.ts (and any future language files) with
 * translated strings.
 */

const en = {
  // ── Meta ────────────────────────────────────────────────────
  meta: {
    languageName: 'English',
    languageNativeName: 'English',
    languageCode: 'en',
    direction: 'ltr' as const,
  },

  // ── Common / Shared ─────────────────────────────────────────
  common: {
    loading: 'Loading…',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    submit: 'Submit',
    search: 'Search',
    filter: 'Filter',
    refresh: 'Refresh',
    viewAll: 'View All',
    noData: 'No data found',
    error: 'Something went wrong',
    success: 'Success',
    yes: 'Yes',
    no: 'No',
    or: 'or',
    and: 'and',
    required: 'Required',
    optional: 'Optional',
    actions: 'Actions',
    status: 'Status',
    date: 'Date',
    time: 'Time',
    amount: 'Amount',
    total: 'Total',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    role: 'Role',
    id: 'ID',
    type: 'Type',
    description: 'Description',
    createdAt: 'Created At',
    updatedAt: 'Updated At',
  },

  // ── Auth ─────────────────────────────────────────────────────
  auth: {
    login: 'Sign In',
    logout: 'Sign Out',
    signup: 'Create Account',
    email: 'Email Address',
    password: 'Password',
    forgotPassword: 'Forgot Password?',
    rememberMe: 'Remember me',
    loginTitle: 'Welcome back',
    loginSubtitle: 'Sign in to your account',
    signupTitle: 'Get started',
    signupSubtitle: 'Create your account',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    invalidCredentials: 'Invalid email or password',
    emailRequired: 'Email is required',
    passwordRequired: 'Password is required',
    loggingIn: 'Signing in…',
    signingUp: 'Creating account…',
    logoutConfirm: 'Are you sure you want to sign out?',
  },

  // ── Navigation ───────────────────────────────────────────────
  nav: {
    dashboard: 'Dashboard',
    analytics: 'Analytics',
    orders: 'Orders',
    menu: 'Menu',
    payments: 'Payments',
    users: 'Users',
    coupons: 'Coupons',
    settings: 'Settings',
    profile: 'Profile',
    wallet: 'Wallet',
    history: 'History',
    home: 'Home',
    notifications: 'Notifications',
    help: 'Help',
  },

  // ── Admin ────────────────────────────────────────────────────
  admin: {
    console: 'Admin Console',
    commandCenter: 'Admin Command Center',
    platformOverview: 'Platform Overview',
    platformAnalytics: 'Platform Analytics',
    aiAnalytics: 'AI Analytics',
    paymentReviewQueue: 'Payment Review Queue',
    userAccounts: 'User Accounts',
    couponsDiscounts: 'Coupons & Discounts',
    vendorSettlements: 'Vendor Settlements',
    paymentConfigs: 'Payment Configs (UPI)',
    systemHealthLogs: 'System Health Logs',
    adminSettings: 'Admin Settings',
    masterAdminAccess: 'Master Admin Access',
    managementControls: 'Management & Controls',
    minimizeSidebar: 'Minimize Sidebar',
    loadingConsole: 'Loading Admin Console…',
    createVendor: 'Create Vendor',
    deleteVendor: 'Delete Vendor',
    totalRevenue: 'Total Revenue',
    totalOrders: 'Total Orders',
    activeVendors: 'Active Vendors',
    activeDrivers: 'Active Drivers',
  },

  // ── Vendor ───────────────────────────────────────────────────
  vendor: {
    console: 'Kitchen Console',
    dashboard: 'Kitchen Dashboard',
    liveOrders: 'Live Orders',
    menuManagement: 'Menu Management',
    salesReports: 'Sales Reports',
    couponManager: 'Coupon Manager',
    vendorSettings: 'Vendor Settings',
    loadingConsole: 'Loading Kitchen Console…',
    restaurantName: 'Restaurant Name',
    cuisine: 'Cuisine',
    isOpen: 'Open for Orders',
    isClosed: 'Closed',
    addMenuItem: 'Add Menu Item',
    editMenuItem: 'Edit Item',
    itemName: 'Item Name',
    itemPrice: 'Price',
    itemCategory: 'Category',
    inStock: 'In Stock',
    outOfStock: 'Out of Stock',
    isVeg: 'Veg',
    isNonVeg: 'Non-Veg',
    ordersToday: 'Orders Today',
    revenueToday: 'Revenue Today',
    pendingOrders: 'Pending Orders',
    completedOrders: 'Completed Orders',
  },

  // ── Driver ───────────────────────────────────────────────────
  driver: {
    dashboard: 'Driver Dashboard',
    activeDelivery: 'Active Delivery Task',
    tripHistory: 'Trip History Log',
    walletEarnings: 'Wallet & Earnings',
    vehicleProfile: 'Vehicle & Profile',
    upiPayoutSettings: 'UPI Payout Settings',
    incentives: 'Incentives',
    earnings: 'Earnings',
    completedDrops: 'Completed Drops',
    dutyTime: 'Duty Time',
    avgPace: 'Avg Pace',
    goOnline: 'Go Online',
    goOffline: 'Go Offline',
    online: 'Online',
    offline: 'Offline',
    scanNearbyOrders: 'Scan Nearby Orders',
    acceptOrder: 'Accept',
    declineOrder: 'Decline',
    pickupLocation: 'Pickup Location',
    dropLocation: 'Drop Location',
    deliveryOtp: 'Delivery OTP',
    loadingDashboard: 'Loading Driver Dashboard…',
  },

  // ── Customer / User ──────────────────────────────────────────
  customer: {
    dashboard: 'My Dashboard',
    myOrders: 'My Orders',
    favorites: 'Favourites',
    savedAddresses: 'Saved Addresses',
    wallet: 'Wallet',
    profile: 'My Profile',
    trackOrder: 'Track Order',
    reorder: 'Reorder',
    orderPlaced: 'Order Placed',
    orderPreparing: 'Preparing',
    orderReady: 'Ready for Pickup',
    orderPickedUp: 'Picked Up',
    orderDelivered: 'Delivered',
    orderCancelled: 'Cancelled',
    applyCoupon: 'Apply Coupon',
    removeCoupon: 'Remove Coupon',
    couponApplied: 'Coupon applied!',
    invalidCoupon: 'Invalid coupon code',
    subtotal: 'Subtotal',
    deliveryFee: 'Delivery Fee',
    discount: 'Discount',
    grandTotal: 'Grand Total',
    addToCart: 'Add to Cart',
    removeFromCart: 'Remove',
    placeOrder: 'Place Order',
    emptyCart: 'Your cart is empty',
  },

  // ── Orders ───────────────────────────────────────────────────
  orders: {
    new: 'New',
    preparing: 'Preparing',
    packing: 'Packing',
    ready: 'Ready',
    pickedUp: 'Picked Up',
    completed: 'Completed',
    cancelled: 'Cancelled',
    orderNumber: 'Order #',
    orderedAt: 'Ordered at',
    estimatedTime: 'Est. Time',
    specialInstructions: 'Special Instructions',
    orderSummary: 'Order Summary',
    orderDetails: 'Order Details',
  },

  // ── Payments ─────────────────────────────────────────────────
  payments: {
    paymentMethod: 'Payment Method',
    upi: 'UPI',
    cash: 'Cash on Delivery',
    card: 'Card',
    wallet: 'Wallet',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    settlement: 'Settlement',
    payout: 'Payout',
    transactionId: 'Transaction ID',
    paymentStatus: 'Payment Status',
    refund: 'Refund',
    bankDetails: 'Bank Details',
    accountNumber: 'Account Number',
    ifscCode: 'IFSC Code',
    bankName: 'Bank Name',
  },

  // ── Settings ─────────────────────────────────────────────────
  settings: {
    title: 'Settings',
    language: 'Language',
    languageDescription: 'Choose your preferred display language',
    theme: 'Theme',
    notifications: 'Notifications',
    privacy: 'Privacy',
    security: 'Security',
    account: 'Account',
    changePassword: 'Change Password',
    deleteAccount: 'Delete Account',
    saveChanges: 'Save Changes',
    changesSaved: 'Changes saved!',
    languageChanged: 'Language updated successfully',
  },

  // ── Errors ───────────────────────────────────────────────────
  errors: {
    notFound: 'Page not found',
    notFoundDesc: "The page you're looking for doesn't exist.",
    forbidden: 'Access Denied',
    forbiddenDesc: "You don't have permission to view this page.",
    serverError: 'Server Error',
    serverErrorDesc: 'Something went wrong on our end. Please try again.',
    networkError: 'Network Error',
    networkErrorDesc: 'Unable to connect. Please check your internet connection.',
    goHome: 'Go Home',
    tryAgain: 'Try Again',
  },

  // ── Language switcher ────────────────────────────────────────
  language: {
    selectLanguage: 'Select Language',
    currentLanguage: 'Current Language',
    english: 'English',
    kannada: 'ಕನ್ನಡ',
    saving: 'Saving…',
  },
}

export default en

/**
 * Dictionary type — all leaf values are `string` so that other
 * language files (kn.ts, hi.ts, …) can assign different string
 * values without TypeScript complaining about literal mismatches.
 *
 * The shape (keys / nesting) is still fully enforced — only the
 * concrete string values are widened.
 */
export type Dictionary = {
  [Section in keyof typeof en]: {
    [Key in keyof (typeof en)[Section]]: (typeof en)[Section][Key] extends string
      ? string
      : (typeof en)[Section][Key]
  }
}
