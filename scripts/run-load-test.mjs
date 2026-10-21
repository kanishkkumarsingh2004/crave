#!/usr/bin/env node
// ============================================
// CLI wrapper for the checkout load test
// ============================================
//
//   pnpm load-test -- --url http://localhost:3000
//   pnpm load-test:ci -- --url https://crave.apexonestudio.com --smoke
//   pnpm load-test -- --url http://localhost:3000 --admin-email a@b.c --password secret
//
// Every flag maps onto an environment variable that load-tests/checkout-load-test.js
// reads, so the k6 script itself stays free of argument parsing.

import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { existsSync, readFileSync } from 'node:fs'
import { lookup } from 'node:dns/promises'
import { createInterface } from 'node:readline'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

const SCRIPT = join(repositoryRoot, 'load-tests', 'app-load-test.js')

const APPS = ['customer', 'driver', 'restaurant', 'admin', 'all']

/** The environment variable holding the seed email for each app. */
const APP_CREDENTIALS = {
  customer: 'SEED_CUSTOMER_EMAIL',
  driver: 'SEED_RIDER_EMAIL',
  restaurant: 'SEED_VENDOR_EMAIL',
  admin: 'SEED_ADMIN_EMAIL',
}

const HELP = `
Crave load test runner

Usage:
  pnpm load-test -- --app <app> [options]
  pnpm load-test:ci -- --app <app> [options]

Apps:
  customer      Browse restaurants and menus, place an order, track it.
  driver        Duty status, offers, assigned orders, GPS, trip transitions.
  restaurant    Order queue, menu management, kitchen transitions.
  admin         Stats, users, coupons, settlements, payment reviews.
  all           Every app in a single run.

Options:
  -a, --app <name>         Which app to exercise: ${APPS.join(', ')} (required)
  -u, --url <url>          Base HTTP URL of the target (default http://localhost:3000)
      --ws-url <url>       WebSocket URL (default: derived from --url, e.g. ws://host/api/ws)
  -d, --duration <dur>     Duration of a single stage, e.g. 30s or 2m
  -v, --vus <count>        Virtual users for the single stage
      --stages <spec>      Custom stages, e.g. "30s:10,1m:50,1m:0"
      --smoke              Run the short smoke profile
      --full               Run the full production profile (up to 1000 VUs)
      --out <file>         Write raw k6 JSON output to <file>
      --timeout <dur>      k6 request timeout, e.g. 60s
      --env-file <path>    Load KEY=VALUE settings (seed credentials) from a file
      --admin-email <e>    Admin seed account email
      --customer-email <e> Customer seed account email
      --vendor-email <e>   Vendor seed account email
      --rider-email <e>    Rider seed account email
      --password <pw>      Password shared by the seed accounts
      --no-auth            Skip every authenticated scenario
      --strict-auth        Fail the benchmark when an account is rejected
      --skip-preflight    Do not probe the target before starting
      --app-env <name>     Label shown in the report (default staging)
      --commit-sha <sha>   Commit shown in the report
  -h, --help               Show this help

Any other argument is passed straight through to k6.

Examples:
  pnpm load-test:ci -- --app customer --url http://localhost:3000
  pnpm load-test -- --app driver --url https://crave.apexonestudio.com --smoke
  pnpm load-test -- --app all --url http://localhost:3000 --stages "30s:20,1m:0"
`
function parseArgs(argv) {
  const options = {
    app: null,
    url: null,
    wsUrl: null,
    duration: null,
    vus: null,
    stages: null,
    smoke: false,
    full: false,
    out: null,
    timeout: null,
    envFile: null,
    adminEmail: null,
    customerEmail: null,
    vendorEmail: null,
    riderEmail: null,
    password: null,
    noAuth: false,
    strictAuth: false,
    skipPreflight: false,
    appEnv: null,
    commitSha: null,
    help: false,
    passthrough: [],
  }

  // Normalise `--key=value` into two tokens.
  const tokens = []
  for (const arg of argv) {
    const match = /^(--[a-z-]+)=(.*)$/.exec(arg)
    if (match) tokens.push(match[1], match[2])
    else tokens.push(arg)
  }

  const takeValue = (index, flag) => {
    const value = tokens[index + 1]
    if (value === undefined || value.startsWith('-')) {
      throw new Error(`Missing value for ${flag}`)
    }
    return value
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    switch (token) {
      case '--app':
      case '-a':
        options.app = takeValue(index, token)
        index += 1
        break
      case '--url':
      case '-u':
        options.url = takeValue(index, token)
        index += 1
        break
      case '--ws-url':
        options.wsUrl = takeValue(index, token)
        index += 1
        break
      case '--duration':
      case '-d':
        options.duration = takeValue(index, token)
        index += 1
        break
      case '--vus':
      case '-v':
        options.vus = Number(takeValue(index, token))
        index += 1
        break
      case '--stages':
        options.stages = takeValue(index, token)
        index += 1
        break
      case '--out':
        options.out = takeValue(index, token)
        index += 1
        break
      case '--timeout':
        options.timeout = takeValue(index, token)
        index += 1
        break
      case '--env-file':
        options.envFile = takeValue(index, token)
        index += 1
        break
      case '--admin-email':
        options.adminEmail = takeValue(index, token)
        index += 1
        break
      case '--customer-email':
        options.customerEmail = takeValue(index, token)
        index += 1
        break
      case '--vendor-email':
        options.vendorEmail = takeValue(index, token)
        index += 1
        break
      case '--rider-email':
        options.riderEmail = takeValue(index, token)
        index += 1
        break
      case '--password':
        options.password = takeValue(index, token)
        index += 1
        break
      case '--app-env':
        options.appEnv = takeValue(index, token)
        index += 1
        break
      case '--commit-sha':
        options.commitSha = takeValue(index, token)
        index += 1
        break
      case '--smoke':
        options.smoke = true
        break
      case '--full':
        options.full = true
        break
      case '--no-auth':
        options.noAuth = true
        break
      case '--strict-auth':
        options.strictAuth = true
        break
      case '--skip-preflight':
        options.skipPreflight = true
        break
      case '--help':
      case '-h':
        options.help = true
        break
      default:
        options.passthrough.push(token)
    }
  }

  return options
}

/** Reads a plain KEY=VALUE file. Comments and blank lines are ignored. */
function readEnvFile(path) {
  const absolute = resolve(repositoryRoot, path)
  if (!existsSync(absolute)) {
    throw new Error(`Env file not found: ${absolute}`)
  }
  const values = {}
  for (const line of readFileSync(absolute, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator <= 0) continue
    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    values[key] = value
  }
  return values
}

/**
 * Derives the WebSocket endpoint from the HTTP target.
 *
 * Locally the WebSocket server is a separate process (`pnpm start:ws`) on
 * WS_PORT, so it is never behind the Vite dev server or the Next.js API.
 */
function deriveWsUrl(baseUrl) {
  try {
    const url = new URL(baseUrl)
    const isLocal = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname)
    if (isLocal) {
      const wsPort = process.env.WS_PORT || '8000'
      return `ws://${url.hostname}:${wsPort}/api/ws`
    }
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    if (!url.pathname || url.pathname === '/') url.pathname = '/api/ws'
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

/**
 * Picks a free port for k6's local API/WebSocket server. The default (6565)
 * stays in use when a previous k6 run is still alive, which makes every
 * WebSocket scenario fail with "address already in use".
 */
function findFreePort(preferred = 6565) {
  return new Promise((resolvePort) => {
    const probe = createServer()
    probe.once('error', () => {
      const fallback = createServer()
      fallback.listen(0, '127.0.0.1', () => {
        const { port } = fallback.address()
        fallback.close(() => resolvePort(port))
      })
    })
    probe.listen(preferred, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => resolvePort(port))
    })
  })
}

/** True when we can safely ask the operator a question. */
function isInteractive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY)
}

/**
 * Reads one line from the terminal.
 *
 * Uses raw mode for both the visible and the masked prompt: mixing readline
 * with raw mode makes readline swallow the buffered input, which deadlocks
 * the second question. Input that arrives in the same chunk as the previous
 * answer is buffered, so pasted or piped answers are never lost.
 */
let pendingInput = ''

function prompt(question, { secret = false } = {}) {
  return new Promise((resolveAnswer) => {
    const input = process.stdin
    const output = process.stdout
    output.write(question)

    if (!input.isTTY) {
      // Not a terminal — read plainly, nothing is echoed to a real user anyway.
      const rl = createInterface({ input, output, terminal: false })
      rl.question('', (answer) => {
        rl.close()
        resolveAnswer(answer.trim())
      })
      return
    }

    const wasRaw = input.isRaw
    input.setRawMode(true)
    input.resume()

    let value = ''

    const cleanup = () => {
      input.removeListener('data', onData)
      input.setRawMode(wasRaw)
      input.pause()
    }

    const onData = (chunk) => {
      pendingInput += chunk.toString('utf8')

      while (pendingInput.length > 0) {
        const character = pendingInput[0]
        pendingInput = pendingInput.slice(1)

        if (character === '\n' || character === '\r') {
          output.write('\n')
          cleanup()
          resolveAnswer(value)
          return
        }
        if (character === '\u0003') {
          output.write('\n')
          process.exit(130)
        }
        if (character === '\u007f' || character === '\b') {
          if (value.length > 0) {
            value = value.slice(0, -1)
            if (!secret) output.write('\b \b')
          }
          continue
        }
        value += character
        output.write(secret ? '*' : character)
      }
    }

    input.on('data', onData)

    // Answer left over from a previous prompt (piped or pasted input).
    if (pendingInput.length > 0) onData('')
  })
}

/**
 * Asks for the seed credentials of the selected app(s) when they are missing.
 * A blank answer keeps that role on its public scenarios only.
 */
async function collectCredentials(app, env) {
  const apps = app === 'all' ? Object.keys(APP_CREDENTIALS) : [app]
  const missing = apps.some((key) => !env[APP_CREDENTIALS[key]])
  if (!missing && env.SEED_PASSWORD) return

  console.log(
    `\nTest credentials for ${app === 'all' ? 'the selected apps' : app} (press Enter to skip):`
  )
  console.log('  The account has to exist in the target database.\n')
  let anyEmail = apps.some((key) => Boolean(env[APP_CREDENTIALS[key]]))

  for (const key of apps) {
    const envKey = APP_CREDENTIALS[key]
    if (env[key] === undefined && env[envKey]) anyEmail = true
    if (env[envKey]) continue
    const answer = await prompt(`  ${key} email: `)
    if (answer) {
      env[envKey] = answer
      anyEmail = true
    }
  }

  if (anyEmail && !env.SEED_PASSWORD) {
    const password = await prompt('  password: ', { secret: true })
    if (password) env.SEED_PASSWORD = password
  }
  console.log('')
}

/**
 * Verifies the target actually serves the API before the run starts, so a
 * wrong port fails fast instead of flooding the log with connection errors.
 *
 * k6 resolves `localhost` over IPv4 only, while Node happily falls back to
 * IPv6 — so the probe deliberately uses the IPv4 address to reproduce exactly
 * what k6 will do.
 */
async function preflight(baseUrl) {
  const probe = async (url) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    try {
      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)
      return { reachable: true, status: response.status }
    } catch (error) {
      clearTimeout(timer)
      return { reachable: false, error: error?.message || String(error) }
    }
  }

  const ipv4Url = await toIpv4Url(baseUrl)
  const primary = await probe(ipv4Url ? `${ipv4Url}/api/health` : `${baseUrl}/api/health`)

  if (primary.reachable) {
    if (primary.status >= 200 && primary.status < 400) {
      return { ok: true, baseUrl }
    }
    // 502/503/504 means the target answered, but the server behind it did
    // not — for a Vite dev server that is the API it proxies to.
    if ([502, 503, 504].includes(primary.status)) {
      const upstream = await detectUpstream(baseUrl)
      const upstreamState = upstream ? await probe(upstream) : null
      return {
        ok: false,
        badGateway: true,
        status: primary.status,
        upstream,
        upstreamReachable: upstreamState ? upstreamState.reachable : null,
        error:
          upstreamState && !upstreamState.reachable
            ? 'the server proxying /api is up, but the API behind it is not running'
            : `the server proxying /api returned HTTP ${primary.status}`,
      }
    }
    return { ok: true, baseUrl, warning: `health check returned HTTP ${primary.status}` }
  }

  // The host may only answer on IPv6 — continue with the IPv6 address instead
  // of failing the run.
  if (ipv4Url) {
    const ipv6Base = baseUrl.replace('localhost', '[::1]')
    const ipv6 = await probe(`${ipv6Base}/api/health`)
    if (ipv6.reachable) {
      return {
        ok: true,
        baseUrl: ipv6Base,
        warning:
          'the target only answers on IPv6 (::1) — continuing with the IPv6 address. ' +
          'Start the dev server with `host: true` to make 127.0.0.1 work as well.',
      }
    }
  }

  return { ok: false, error: primary.error }
}

/**
 * The API origin a Vite dev server proxies /api to. The dev servers run on
 * 5173 and forward to the Next.js API on 3000.
 */
async function detectUpstream(baseUrl) {
  try {
    const url = new URL(baseUrl)
    if (url.port === '5173' || url.port === '') return 'http://localhost:3000'
    return null
  } catch {
    return null
  }
}

/**
 * Checks that the WebSocket server is up.
 *
 * The server's /api/ws endpoint authenticates during the handshake, so a
 * plain probe is rejected with 401 in production. Its /health endpoint is
 * open, so that is what the readiness check uses.
 */
async function probeWebSocket(wsUrl) {
  if (!wsUrl) return false
  try {
    const url = new URL(wsUrl)
    url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:'
    url.pathname = '/health'
    url.search = ''
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
    return response.ok
  } catch {
    return false
  }
}

/** Rewrites `localhost` to its IPv4 address so the probe matches k6. */
async function toIpv4Url(baseUrl) {
  try {
    const url = new URL(baseUrl)
    if (url.hostname !== 'localhost') return null
    const { address } = await lookup('localhost', { family: 4 })
    url.hostname = address
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

function printPreflightFailure(baseUrl, detail, options = {}) {
  console.error(`\n\u2716 The API is not reachable at ${baseUrl}`)
  console.error(`  ${detail}\n`)
  if (options.badGateway) {
    if (options.upstream && options.upstreamReachable === false) {
      console.error(`  The API behind it is not running: ${options.upstream}\n`)
      console.error('  Start it with:\n')
      console.error('    pnpm start      → the Next.js API on :3000')
      console.error('    pnpm start:ws   → the WebSocket server on :8000\n')
      return
    }
    console.error('  The target answered, but the server behind it did not.\n')
    console.error('  A Vite dev server proxies /api to VITE_API_BASE_URL — make sure that')
    console.error('  target is running (the Next.js API on :3000 by default).\n')
    return
  }
  if (detail.includes('IPv6')) {
    console.error('  k6 resolves localhost over IPv4 only. Use the IPv6 address instead:\n')
    console.error(`    --url ${baseUrl.replace('localhost', '[::1]')}\n`)
    return
  }
  console.error('  The load test needs a server that answers /api/*. Common targets:\n')
  console.error(
    '    pnpm start                                    → http://localhost:3000  (Next.js API)'
  )
  console.error(
    '    pnpm --dir customer_app dev                   → http://localhost:5173  (Vite, proxies /api)'
  )
  console.error('    --url https://crave.apexonestudio.com         → production')
  console.error('')
  console.error('  A Vite dev server forwards /api to VITE_API_BASE_URL')
  console.error('  (default https://crave.apexonestudio.com), so targeting the dev server')
  console.error('  tests that host. Use --url http://localhost:3000 to test the local backend.\n')
}

function buildStages(options) {
  if (options.stages) return options.stages
  if (options.duration && Number.isFinite(options.vus) && options.vus > 0) {
    return `${options.duration}:${options.vus},5s:0`
  }
  return null
}

async function main() {
  let options
  try {
    options = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(`\n✖ ${error.message}\n`)
    console.error(HELP)
    process.exit(2)
  }

  if (options.help) {
    console.log(HELP)
    return
  }

  const baseUrl = (options.url || process.env.BASE_URL || 'http://localhost:3000').replace(
    /\/$/,
    ''
  )
  let effectiveBaseUrl = baseUrl
  const wsUrl =
    options.wsUrl ||
    process.env.WS_URL ||
    deriveWsUrl(effectiveBaseUrl) ||
    'ws://localhost:8000/api/ws'

  const env = { ...process.env }
  env.BASE_URL = baseUrl
  env.WS_URL = wsUrl

  const app = (options.app || process.env.APP || '').toLowerCase()
  if (!app) {
    console.error('\n✖ --app is required. Choose one of: ' + APPS.join(', ') + '\n')
    console.error('  Example: pnpm load-test -- --app customer --url http://localhost:3000\n')
    process.exit(2)
  }
  if (!APPS.includes(app)) {
    console.error(`\n✖ Unknown --app "${app}". Expected one of: ${APPS.join(', ')}\n`)
    process.exit(2)
  }
  env.APP = app

  // Seed credentials may come from a file, from flags, or from the ambient env.
  if (options.envFile) {
    try {
      Object.assign(env, readEnvFile(options.envFile))
    } catch (error) {
      console.error(`\n✖ ${error.message}\n`)
      process.exit(2)
    }
  }
  const credentialFlags = {
    SEED_ADMIN_EMAIL: options.adminEmail,
    SEED_CUSTOMER_EMAIL: options.customerEmail,
    SEED_VENDOR_EMAIL: options.vendorEmail,
    SEED_RIDER_EMAIL: options.riderEmail,
    SEED_PASSWORD: options.password,
  }
  for (const [key, value] of Object.entries(credentialFlags)) {
    if (value) env[key] = value
  }

  if (options.smoke) env.CI_SMOKE = 'true'
  if (options.full) env.PROFILE = 'full'
  if (options.noAuth) env.SKIP_AUTH = 'true'
  if (options.strictAuth) env.STRICT_AUTH = 'true'
  if (options.appEnv) env.APP_ENV = options.appEnv
  if (options.commitSha) env.COMMIT_SHA = options.commitSha

  const stages = buildStages(options)
  if (stages) env.STAGES = stages

  console.log(`\n[crave-load-test] app         ${app}`)
  console.log(`[crave-load-test] target      ${effectiveBaseUrl}`)
  console.log(`[crave-load-test] websocket   ${env.WS_URL}`)
  const profileLabel = options.smoke ? 'smoke' : options.full ? 'full' : stages || 'moderate'
  console.log(`[crave-load-test] profile     ${profileLabel}`)

  // Ask for the seed credentials of the selected app when they are missing.
  if (!options.noAuth && isInteractive()) {
    await collectCredentials(app, env)
  }

  // Fail fast when the target does not serve the API.
  if (!options.skipPreflight) {
    const probe = await preflight(baseUrl)
    if (!probe.ok) {
      printPreflightFailure(baseUrl, probe.error, {
        badGateway: probe.badGateway,
        upstream: probe.upstream,
        upstreamReachable: probe.upstreamReachable,
      })
      process.exit(1)
    }
    if (probe.baseUrl && probe.baseUrl !== baseUrl) {
      effectiveBaseUrl = probe.baseUrl
      env.BASE_URL = effectiveBaseUrl
      env.WS_URL = options.wsUrl || process.env.WS_URL || deriveWsUrl(effectiveBaseUrl)
    }
    if (probe.warning) {
      console.log(`[crave-load-test] warning      ${probe.warning}`)
    }

    const wsReachable = await probeWebSocket(env.WS_URL)
    if (!wsReachable) {
      console.log(
        `[crave-load-test] warning      the WebSocket server is not reachable at ${env.WS_URL} — ` +
          'start it with `pnpm start:ws` (its socket scenarios will be skipped)'
      )
    }
  }

  const k6Args = ['run']
  k6Args.push('--address', `localhost:${await findFreePort()}`)
  if (options.out) k6Args.push('--out', `json=${options.out}`)
  if (options.timeout) k6Args.push('--timeout', options.timeout)
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined && value !== null) k6Args.push('--env', `${key}=${value}`)
  }
  k6Args.push(SCRIPT, ...options.passthrough)

  const credentialCount = [
    'SEED_ADMIN_EMAIL',
    'SEED_CUSTOMER_EMAIL',
    'SEED_VENDOR_EMAIL',
    'SEED_RIDER_EMAIL',
    'SEED_PASSWORD',
  ].filter((key) => env[key]).length
  console.log(
    `[crave-load-test] credentials  ${
      credentialCount > 0 ? `${credentialCount} setting(s) found` : 'none — public scenarios only'
    }\n`
  )

  const child = spawn('k6', k6Args, { stdio: 'inherit', env })
  child.on('error', (error) => {
    if (error.code === 'ENOENT') {
      console.error('\n✖ k6 is not installed or not on PATH.')
      console.error('  Install it with:  curl -L https://get.k6.io | sh')
      console.error('  Or via Homebrew:  brew install k6\n')
      process.exit(127)
    }
    console.error(`\n✖ Failed to start k6: ${error.message}\n`)
    process.exit(1)
  })
  child.on('exit', (code, signal) => {
    if (signal) {
      process.exit(1)
    }
    process.exit(code === null ? 1 : code)
  })
}

main().catch((error) => {
  console.error(`\n✖ ${error?.message || error}\n`)
  process.exit(1)
})
