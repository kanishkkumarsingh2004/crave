export const http = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  del: jest.fn(),
}

export const ws = {
  connect: jest.fn(),
}

export const check = jest.fn((res: any, checks: Record<string, (r: any) => boolean>) => {
  let passed = true
  for (const fn of Object.values(checks)) {
    if (typeof fn === 'function' && !fn(res)) {
      passed = false
    }
  }
  return passed
})

export const sleep = jest.fn()

export default {
  http,
  ws,
  check,
  sleep,
}
