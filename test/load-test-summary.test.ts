import { handleSummary, calculateConfiguredPeakVUs, CONFIG } from '@/load-tests/checkout-load-test'

describe('Load Test Reporting & Credential Sanitization (checkout-load-test.js)', () => {
  const sampleMetrics = {
    http_reqs: { values: { count: 1000, rate: 50.0 } },
    http_req_failed: { values: { passes: 2, rate: 0.002 } },
    http_req_duration: {
      values: {
        avg: 120.5,
        'p(95)': 340.2,
        max: 890.0,
      },
    },
    checks: { values: { passes: 980, fails: 20 } },
    ws_connecting: { values: { avg: 45.0 } },
    vus: { values: { max: 150 } },
  }

  describe('Credential Hygiene & Allowlist Sanitization', () => {
    it('strictly excludes setup_data and token-shaped sentinel values from summary.json', () => {
      const dataWithSensitiveCredentials = {
        metrics: sampleMetrics,
        setup_data: {
          adminToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sentinel_admin_token_do_not_leak',
          userToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sentinel_user_token_do_not_leak',
          vendorToken: 'sentinel_vendor_secret_token_12345',
          riderToken: 'sentinel_rider_secret_token_67890',
          internalApiKey: 'crave_live_sec_abcdef1234567890',
        },
        state: { testRunDurationMs: 60000 },
      }

      const result = handleSummary(dataWithSensitiveCredentials)

      expect(result).toHaveProperty(['summary.json'])
      const jsonString = result['summary.json']

      // Verify serialized JSON string does not contain any sentinel tokens
      expect(jsonString).not.toContain('sentinel_admin_token_do_not_leak')
      expect(jsonString).not.toContain('sentinel_user_token_do_not_leak')
      expect(jsonString).not.toContain('sentinel_vendor_secret_token_12345')
      expect(jsonString).not.toContain('sentinel_rider_secret_token_67890')
      expect(jsonString).not.toContain('crave_live_sec_abcdef1234567890')

      // Verify parseable allowlisted object structure
      const parsed = JSON.parse(jsonString)
      expect(parsed).not.toHaveProperty('setup_data')
      expect(parsed).not.toHaveProperty('adminToken')
      expect(parsed).not.toHaveProperty('userToken')
      expect(parsed).not.toHaveProperty('vendorToken')
      expect(parsed).not.toHaveProperty('riderToken')

      // Verify presence of safe metadata
      expect(parsed).toHaveProperty('benchmark', 'crave-checkout-load-test')
      expect(parsed).toHaveProperty('timestamp')
      expect(parsed).toHaveProperty('concurrency')
      expect(parsed).toHaveProperty('execution')
      expect(parsed).toHaveProperty('metrics')
      expect(parsed).toHaveProperty('thresholds')
    })

    it('console output (stdout) does not expose credentials or authorization headers', () => {
      const dataWithSensitiveCredentials = {
        metrics: sampleMetrics,
        setup_data: {
          userToken: 'eyJhbGciOiJIUzI1NiJ9.user_token_sentinel',
          adminToken: 'admin_secret_token_sentinel',
        },
      }

      const result = handleSummary(dataWithSensitiveCredentials)
      expect(result.stdout).not.toContain('user_token_sentinel')
      expect(result.stdout).not.toContain('admin_secret_token_sentinel')
      expect(result.stdout).not.toContain('Bearer')
    })
  })

  describe('Dynamic Peak VU Calculation & Concurrency', () => {
    it('dynamically computes maximum configured VU target across all stages', () => {
      const testStages = [
        { duration: '30s', target: 25 },
        { duration: '1m', target: 100 },
        { duration: '2m', target: 1000 },
        { duration: '1m', target: 500 },
        { duration: '30s', target: 0 },
      ]

      const peak = calculateConfiguredPeakVUs(testStages)
      expect(peak).toBe(1000)
    })

    it('handles empty or irregular stage arrays gracefully', () => {
      expect(calculateConfiguredPeakVUs([])).toBe(0)
      expect(calculateConfiguredPeakVUs(null as any)).toBe(0)
      expect(calculateConfiguredPeakVUs([{ duration: '10s', target: -10 }])).toBe(0)
    })

    it('distinguishes configured peak from observed peak concurrency', () => {
      const configuredPeak = calculateConfiguredPeakVUs(CONFIG.stages)
      const data = {
        metrics: {
          ...sampleMetrics,
          vus: { values: { max: 75 } }, // Observed: 75 VUs
        },
        setup_data: {},
      }

      const result = handleSummary(data)
      const parsed = JSON.parse(result['summary.json'])

      expect(parsed.concurrency.configuredPeakVUs).toBe(configuredPeak)
      expect(parsed.concurrency.observedPeakVUs).toBe(75)
      expect(parsed.concurrency.configuredPeakVUs).not.toBe(parsed.concurrency.observedPeakVUs)
    })
  })

  describe('Threshold Gates & Metric Accuracy', () => {
    it('correctly reports overallPassed = true when all thresholds pass', () => {
      const data = {
        metrics: {
          http_reqs: { values: { count: 500, rate: 25 } },
          http_req_failed: { values: { passes: 5 } }, // 1% fails (threshold < 10%)
          http_req_duration: {
            values: { avg: 200, 'p(95)': 1200, max: 2500 }, // p95 < 5000ms
          },
          checks: { values: { passes: 950, fails: 50 } }, // 95% passes (threshold > 90%)
        },
      }

      const result = handleSummary(data)
      const parsed = JSON.parse(result['summary.json'])

      expect(parsed.thresholds['http_req_duration:p(95)<5000'].pass).toBe(true)
      expect(parsed.thresholds['http_req_failed:rate<0.10'].pass).toBe(true)
      expect(parsed.thresholds['checks:rate>0.90'].pass).toBe(true)
      expect(parsed.overallPassed).toBe(true)
      expect(result.stdout).toContain('BENCHMARK PASSED')
    })

    it('correctly reports overallPassed = false when checks pass rate drops below 90%', () => {
      const data = {
        metrics: {
          http_reqs: { values: { count: 500, rate: 25 } },
          http_req_failed: { values: { passes: 5 } },
          http_req_duration: {
            values: { avg: 200, 'p(95)': 1200, max: 2500 },
          },
          checks: { values: { passes: 700, fails: 300 } }, // 70% passes (< 90% threshold)
        },
      }

      const result = handleSummary(data)
      const parsed = JSON.parse(result['summary.json'])

      expect(parsed.thresholds['checks:rate>0.90'].pass).toBe(false)
      expect(parsed.overallPassed).toBe(false)
      expect(result.stdout).toContain('BENCHMARK FAILED')
    })

    it('correctly reports overallPassed = false when p(95) response time exceeds 5000ms', () => {
      const data = {
        metrics: {
          http_reqs: { values: { count: 500, rate: 25 } },
          http_req_failed: { values: { passes: 5 } },
          http_req_duration: {
            values: { avg: 3000, 'p(95)': 6200, max: 8000 }, // p95 = 6200ms (> 5000ms)
          },
          checks: { values: { passes: 980, fails: 20 } },
        },
      }

      const result = handleSummary(data)
      const parsed = JSON.parse(result['summary.json'])

      expect(parsed.thresholds['http_req_duration:p(95)<5000'].pass).toBe(false)
      expect(parsed.overallPassed).toBe(false)
    })
  })
})
