#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const testDir = join(rootDir, 'test')

process.env.NODE_ENV = 'test'
if (process.argv.includes('--db')) {
  process.env.ALLOW_DATABASE_TESTS = 'true'
}

// Allow passing specific files, or run all test/*.test.ts
const targetArgs = process.argv.slice(2).filter((arg) => arg !== '--db')
const testFiles =
  targetArgs.length > 0
    ? targetArgs
    : readdirSync(testDir)
        .filter((file) => file.endsWith('.test.ts'))
        .sort()
        .map((file) => join('test', file))

const nodeArgs = ['--import', 'tsx']
if (process.env.ALLOW_DATABASE_TESTS === 'true') {
  nodeArgs.unshift('--env-file-if-exists=.env')
}

const testArgs = [...nodeArgs, '--test', '--test-concurrency=1', ...testFiles]

const child = spawn(process.execPath, testArgs, {
  cwd: rootDir,
  stdio: 'inherit',
  env: process.env,
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
  } else {
    process.exit(code ?? 0)
  }
})
