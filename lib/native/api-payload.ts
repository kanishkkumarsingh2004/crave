/**
 * Shared response handling for the four Capacitor apps.
 *
 * A route that is missing on the deployed backend answers with the Next.js HTML
 * shell instead of JSON. That body is the whole marketing page, so it must never
 * reach the screen: it is detected here and replaced with a short message that
 * names the real cause.
 */

const HTML_PAYLOAD_PATTERN = /^\s*(<!doctype\s+html|<html[\s>]|<\?xml)/i
const MAX_ERROR_LENGTH = 240

/** Shown when the backend answered with a web page rather than API data. */
export const HTML_PAYLOAD_MESSAGE = 'The server returned a web page instead of data.'

/** Whether a raw response body is an HTML document rather than API data. */
export function isHtmlPayload(value: string): boolean {
  return HTML_PAYLOAD_PATTERN.test(value.replace(/^\uFEFF/, ''))
}

/**
 * Turns a raw response body into a payload object.
 *
 * Valid JSON is parsed, an HTML document becomes a short error message, and any
 * other text is kept as the message so the caller can still show it.
 */
export function normalizeApiPayload(value: unknown): any {
  if (typeof value !== 'string') return value ?? {}
  try {
    return JSON.parse(value)
  } catch {
    if (isHtmlPayload(value)) return { error: HTML_PAYLOAD_MESSAGE }
    return { message: value }
  }
}

/**
 * The message shown for a failed request.
 *
 * A missing endpoint on the deployed backend is called out explicitly, and the
 * message is capped so a large body can never flood the layout.
 */
export function apiErrorMessage(data: any, status: number, path: string): string {
  const raw = data?.error || data?.message
  const text =
    typeof raw === 'string' && raw.trim() ? raw.trim() : 'Unable to complete the request.'
  const message =
    status === 404 && text === HTML_PAYLOAD_MESSAGE
      ? `${text} The endpoint ${path} is missing on the deployed backend — deploy the latest server build and try again.`
      : text
  return message.length > MAX_ERROR_LENGTH
    ? `${message.slice(0, MAX_ERROR_LENGTH - 1).trimEnd()}…`
    : message
}
