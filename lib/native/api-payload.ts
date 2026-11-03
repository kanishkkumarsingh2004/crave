// Compatibility entry point for server-side and legacy imports. Mobile apps
// consume the same implementation through the named workspace package.
export {
  HTML_PAYLOAD_MESSAGE,
  apiErrorMessage,
  isHtmlPayload,
  normalizeApiPayload,
} from '@crave/mobile-core'
