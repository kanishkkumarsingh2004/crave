import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

Object.assign(global, { TextEncoder, TextDecoder })

if (typeof global.Request === 'undefined') {
  class Request {
    url: string
    method: string
    headers: Record<string, string>
    body: string | null

    constructor(input: string | Request, init?: any) {
      if (typeof input === 'string') {
        this.url = input
      } else {
        this.url = input.url
        this.method = input.method
        this.headers = input.headers
        this.body = input.body
      }
      if (init) {
        Object.assign(this, init)
      }
    }

    json() {
      return Promise.resolve(JSON.parse(this.body || '{}'))
    }

    text() {
      return Promise.resolve(this.body || '')
    }
  }

  global.Request = Request as any
}

if (typeof global.Response === 'undefined') {
  class Response {
    body: string | null
    status: number
    statusText: string
    headers: Record<string, string>

    constructor(body?: any, init?: any) {
      this.body = typeof body === 'string' ? body : body ? JSON.stringify(body) : null
      this.status = init?.status || 200
      this.statusText = init?.statusText || 'OK'
      this.headers = init?.headers || {}
    }

    json() {
      return Promise.resolve(JSON.parse(this.body || '{}'))
    }

    text() {
      return Promise.resolve(this.body || '')
    }
  }

  global.Response = Response as any
}

jest.mock('next/server', () => ({
  NextRequest: class NextRequest {
    url: string
    method: string
    headers: { get: (key: string) => string | null }
    body: any
    constructor(input: any, init?: any) {
      if (typeof input === 'string') {
        this.url = input
      } else {
        this.url = input?.url || ''
        this.method = input?.method || 'GET'
        this.headers = input?.headers || { get: () => null }
        this.body = input?.body
      }
    }
    async json() {
      return this.body
    }
  },
  NextResponse: {
    json: jest.fn((body: any, init?: any) => {
      const response: any = new Response(typeof body === 'string' ? body : JSON.stringify(body), {
        status: init?.status || 200,
        headers: init?.headers || {},
      })
      const cookieStore: Record<string, { value: string; options: any }> = {}
      response.cookies = {
        set: jest.fn((name: string, value: string, options?: any) => {
          cookieStore[name] = { value, options }
        }),
        get: jest.fn((name: string) => cookieStore[name]),
        getAll: jest.fn(() => Object.values(cookieStore)),
        delete: jest.fn((name: string) => delete cookieStore[name]),
      }
      response.json = () => Promise.resolve(typeof body === 'string' ? JSON.parse(body) : body)
      return response
    }),
  },
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    getAll: jest.fn(() => []),
    delete: jest.fn(),
  })),
}))

global.matchMedia =
  global.matchMedia ||
  function () {
    return {
      matches: false,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false
      },
    }
  }

global.ResizeObserver =
  global.ResizeObserver ||
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

if (typeof window !== 'undefined') {
  window.happyDOM = {
    ...(window.happyDOM || {}),
  }

  Element.prototype.scrollTo = () => {}

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })

  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class IntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    } as any
  }
}
