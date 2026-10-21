#!/usr/bin/env node
// ============================================
// Runs the abuse / concurrency suite
// ============================================
//
//   pnpm abuse-test -- --url http://localhost:3000
//   pnpm abuse-test -- --case double-click --url http://localhost:3000
//   pnpm abuse-test -- --case all --url http://localhost:3000 --env-file load-tests/.env
//
// Each case is a separate k6 script in load-tests/abuse/. The runner executes
// them one after another, collects the per-case reports and prints one
// combined summary. A case that fails its expectations does not stop the run —
// the whole point is to see everything that is exploitable at once.

import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const abuseDirectory = join(repositoryRoot, 'load-tests', 'abuse')
const reportDirectory = join(repositoryRoot, 'load-tests', 'reports')

const CASES = [
  { name: 'order-lifecycle', file: 'order-lifecycle.js', title: 'end-to-end order lifecycle' },
  { name: 'double-click', file: 'double-click.js', title: 'double click / double submit' },
  { name: 'timeout-retry', file: 'timeout-retry.js', title: 'timeout and retry' },
  { name: 'capacity-race', file: 'capacity-race.js', title: 'concurrent users, limited capacity' },
  { name: 'rate-limit', file: 'rate-limit.js', title: 'rate limiting and credential stuffing' },
  { name: 'otp-bruteforce', file: 'otp-bruteforce.js', title: 'delivery OTP brute force' },
  { name: 'socket-abuse', file: 'socket-abuse.js', title: 'websocket abuse' },
]

const HELP = `
Crave abuse / concurrency suite

Usage:
  pnpm abuse-test -- [options]

Options:
  -c, --case <name>   Run a single case (${CASES.map((c) => c.name).join(', ')}). Default: all
  -u, --url <url>      Base HTTP URL of the target (default http://localhost:3000)
      --ws-url <url>   WebSocket URL (default ws://localhost:8000/api/ws)
      --env-file <p>   Load KEY=VALUE settings (seed credentials) from a file
      --concurrency <n> Parallel copies of a request (default 8)
      --retries <n>     Retries after a timeout (default 2)
      --timeout <dur>   k6 request timeout (default 60s)
      --fail-on <mode>  When to fail: integrity (default), any or none
  -h, --help           Show this help

The suite needs a running API and, for the socket case, a running WebSocket
server. Seed credentials (SEED_CUSTOMER_EMAIL, SEED_RIDER_EMAIL, SEED_PASSWORD)
enable the authenticated cases; without them those cases report as skipped.
`

function parseArgs(argv) {
  const options = {
    case: 'all',
    url: null,
    wsUrl: null,
    envFile: null,
    concurrency: null,
    retries: null,
    timeout: '60s',
    failOn: 'integrity',
    help: false,
  }
  const tokens = []
  // pnpm passes the `--` separator through, drop it.
  for (const arg of argv.filter((a, index) => !(a === '--' && index === 0))) {
    const match = /^(--[a-z-]+)=(.*)$/.exec(arg)
    if (match) tokens.push(match[1], match[2])
    else tokens.push(arg)
  }
  const take = (index, flag) => {
    const value = tokens[index + 1]
    if (value === undefined || value.startsWith('-')) {
      throw new Error(`Missing value for ${flag}`)
    }
    return value
  }
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    switch (token) {
      case '--case':
      case '-c':
        options.case = take(index, token)
        index += 1
        break
      case '--url':
      case '-u':
        options.url = take(index, token)
        index += 1
        break
      case '--ws-url':
        options.wsUrl = take(index, token)
        index += 1
        break
      case '--env-file':
        options.envFile = take(index, token)
        index += 1
        break
      case '--concurrency':
        options.concurrency = take(index, token)
        index += 1
        break
      case '--retries':
        options.retries = take(index, token)
        index += 1
        break
      case '--timeout':
        options.timeout = take(index, token)
        index += 1
        break
      case '--fail-on':
        options.failOn = take(index, token)
        index += 1
        break
      case '--help':
      case '-h':
        options.help = true
        break
      default:
        throw new Error(`Unknown option ${token}`)
    }
  }
  return options
}

function readEnvFile(path) {
  const absolute = path.startsWith('/') ? path : join(repositoryRoot, path)
  if (!existsSync(absolute)) throw new Error(`Env file not found: ${absolute}`)
  const values = {}
  for (const line of readFileSync(absolute, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator <= 0) continue
    let value = trimmed.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    values[trimmed.slice(0, separator).trim()] = value
  }
  return values
}

function runK6(args, env, cwd) {
  return new Promise((resolve) => {
    const child = spawn('k6', args, { stdio: ['ignore', 'pipe', 'pipe'], env, cwd })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        console.error('\n✖ k6 is not installed or not on PATH.')
        console.error('  Install it with:  curl -L https://get.k6.io | sh\n')
        process.exit(127)
      }
      resolve({ code: 1, stdout, stderr: String(error.message) })
    })
    child.on('exit', (code) => resolve({ code: code === null ? 1 : code, stdout, stderr }))
  })
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

  if (!['integrity', 'any', 'none'].includes(options.failOn)) {
    console.error(`\n✖ Unknown --fail-on "${options.failOn}". Expected integrity, any or none.\n`)
    process.exit(2)
  }

  const selected = options.case === 'all' ? CASES : CASES.filter((c) => c.name === options.case)
  if (selected.length === 0) {
    console.error(
      `\n✖ Unknown case "${options.case}". Expected one of: ${CASES.map((c) => c.name).join(', ')}\n`
    )
    process.exit(2)
  }

  const env = { ...process.env }
  const baseUrl = (options.url || process.env.BASE_URL || 'http://localhost:3000').replace(
    /\/$/,
    ''
  )
  const wsUrl = options.wsUrl || process.env.WS_URL || 'ws://localhost:8000/api/ws'
  env.BASE_URL = baseUrl
  env.WS_URL = wsUrl
  if (options.envFile) {
    try {
      Object.assign(env, readEnvFile(options.envFile))
    } catch (error) {
      console.error(`\n✖ ${error.message}\n`)
      process.exit(2)
    }
  }
  if (options.concurrency) env.ABUSE_CONCURRENCY = options.concurrency
  if (options.retries) env.ABUSE_RETRIES = options.retries
  env.ABUSE_TIMEOUT = options.timeout

  rmSync(reportDirectory, { recursive: true, force: true })
  mkdirSync(reportDirectory, { recursive: true })

  console.log(`\n[crave-abuse] target      ${baseUrl}`)
  console.log(`[crave-abuse] websocket   ${wsUrl}`)
  console.log(`[crave-abuse] cases      ${selected.map((c) => c.name).join(', ')}`)
  console.log(
    `[crave-abuse] credentials ${
      env.SEED_CUSTOMER_EMAIL
        ? 'seed credentials found'
        : 'none — the authenticated cases will be skipped'
    }\n`
  )

  const results = []
  for (const testCase of selected) {
    const script = join(abuseDirectory, testCase.file)
    if (!existsSync(script)) {
      console.error(`✖ missing script ${script}`)
      process.exit(1)
    }
    console.log(`\n──────── ${testCase.name} ────────`)

    const args = [
      'run',
      '--quiet',
      '--address',
      `localhost:${await freePort()}`,
      '--env',
      `BASE_URL=${baseUrl}`,
      '--env',
      `WS_URL=${wsUrl}`,
      '--env',
      `ABUSE_CASE=${testCase.name}`,
      '--env',
      `ABUSE_IP=198.51.100.${10 + selected.indexOf(testCase)}`,
    ]
    for (const [key, value] of Object.entries(env)) {
      if (key === 'BASE_URL' || key === 'WS_URL') continue
      if (value === undefined || value === null) continue
      args.push('--env', `${key}=${value}`)
    }
    args.push(script)

    const outcome = await runK6(args, env, reportDirectory)
    const reportPath = join(reportDirectory, `${testCase.name}.json`)
    let report = null
    if (existsSync(reportPath)) {
      try {
        report = JSON.parse(readFileSync(reportPath, 'utf8'))
      } catch (e) {
        report = null
      }
    }
    results.push({ case: testCase.name, title: testCase.title, code: outcome.code, report })
    if (outcome.stdout.trim()) console.log(outcome.stdout.trim())
    if (outcome.stderr.trim()) console.log(outcome.stderr.trim().split('\n').slice(-6).join('\n'))
  }

  // ── Combined report ──────────────────────────────────────────────────────
  const failed = results.filter((r) => !r.report || r.report.allPassed !== true)
  const lines = []
  lines.push('')
  lines.push('='.repeat(62))
  lines.push('CRAVE ABUSE SUITE — SUMMARY')
  lines.push('='.repeat(62))
  lines.push(`Target: ${baseUrl}`)
  lines.push(`When:   ${new Date().toISOString()}`)
  lines.push('')
  lines.push('  CASE                       EXPECTATIONS  INTEGRITY  USABILITY  RESULT')
  lines.push('  ' + '-'.repeat(74))
  for (const result of results) {
    const ran = result.report?.expectationsRun ?? 0
    const bad = result.report?.expectationsFailed ?? 0
    const integrity = result.report?.metrics?.abuse_integrity_failures?.values?.count ?? 0
    const usability = result.report?.metrics?.abuse_usability_failures?.values?.count ?? 0
    const verdict = !result.report
      ? 'ERROR'
      : integrity > 0
        ? 'EXPLOITABLE'
        : usability > 0
          ? 'DEGRADED'
          : 'HELD'
    lines.push(
      `  ${result.case.padEnd(26)} ${String(`${ran - bad}/${ran}`).padEnd(13)} ${String(
        integrity
      ).padEnd(10)} ${String(usability).padEnd(10)} ${verdict}`
    )
  }
  lines.push('')
  const integrityTotal = results.reduce(
    (sum, r) => sum + (r.report?.metrics?.abuse_integrity_failures?.values?.count ?? 0),
    0
  )
  const usabilityTotal = results.reduce(
    (sum, r) => sum + (r.report?.metrics?.abuse_usability_failures?.values?.count ?? 0),
    0
  )
  if (failed.length === 0) {
    lines.push('RESULT: every case held — the system survived the abuse.')
  } else {
    lines.push(
      `RESULT: ${failed.length} case(s) did not hold: ${failed.map((f) => f.case).join(', ')}.`
    )
    lines.push(
      `        ${integrityTotal} integrity failure(s) — data is inconsistent (duplicate orders, oversell).`
    )
    lines.push(
      `        ${usabilityTotal} usability failure(s) — the data is safe but the customer is blocked.`
    )
  }
  lines.push('='.repeat(62))
  lines.push('')
  console.log(lines.join('\n'))

  writeFileSync(
    join(reportDirectory, 'summary.json'),
    JSON.stringify(
      {
        suite: 'crave-abuse-suite',
        target: baseUrl,
        timestamp: new Date().toISOString(),
        cases: results.map((r) => ({
          case: r.case,
          title: r.title,
          exitCode: r.code,
          expectationsRun: r.report?.expectationsRun ?? 0,
          expectationsFailed: r.report?.expectationsFailed ?? 0,
          integrityFailures: r.report?.metrics?.abuse_integrity_failures?.values?.count ?? 0,
          usabilityFailures: r.report?.metrics?.abuse_usability_failures?.values?.count ?? 0,
          allPassed: r.report?.allPassed === true,
        })),
        allPassed: failed.length === 0,
      },
      null,
      2
    )
  )

  if (options.failOn === 'none') {
    process.exit(0)
  }
  const failing =
    options.failOn === 'any'
      ? results.reduce((sum, r) => sum + (r.report?.expectationsFailed ?? 0), 0)
      : results.reduce(
          (sum, r) => sum + (r.report?.metrics?.abuse_integrity_failures?.values?.count ?? 0),
          0
        )
  process.exit(failing > 0 ? 1 : 0)
}

/** k6's local API server needs a free port, otherwise a stale process breaks the run. */
function freePort(preferred = 6565) {
  return new Promise((resolve) => {
    const probe = createServer()
    probe.once('error', () => {
      const fallback = createServer()
      fallback.listen(0, '127.0.0.1', () => {
        const { port } = fallback.address()
        fallback.close(() => resolve(port))
      })
    })
    probe.listen(preferred, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })
}

main().catch((error) => {
  console.error(`\n✖ ${error?.message || error}\n`)
  process.exit(1)
})
