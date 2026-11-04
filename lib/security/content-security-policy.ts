const NONCE_PATTERN = /^[A-Za-z0-9+/_-]+={0,2}$/

export function createContentSecurityPolicyNonce(): string {
  return crypto.randomUUID().replaceAll('-', '')
}

export function buildContentSecurityPolicy(nonce: string, isDevelopment: boolean): string {
  if (!NONCE_PATTERN.test(nonce)) {
    throw new Error('Content Security Policy nonce contains invalid characters')
  }

  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://checkout.razorpay.com https://*.razorpay.com${isDevelopment ? " 'unsafe-eval'" : ''};
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: blob: https:;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' https://*.razorpay.com https://api.razorpay.com https://checkout.razorpay.com https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://router.project-osrm.org https://*.osrm.org https://nominatim.openstreetmap.org ${isDevelopment ? 'http: ws: wss: http://localhost:* ws://localhost:* wss://localhost:*' : ''} https://crave.apexonestudio.com wss://crave.apexonestudio.com;
    frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com;
    child-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com blob:;
    worker-src 'self' blob:;
    manifest-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self' https://*.razorpay.com https://api.razorpay.com https://checkout.razorpay.com;
    frame-ancestors 'self';
    ${isDevelopment ? '' : 'upgrade-insecure-requests;'}
  `
    .replace(/\s{2,}/g, ' ')
    .trim()
}
