/**
 * Version — single source of truth for app version.
 * __APP_VERSION__ and __BUILD_TIME__ are injected by vite.config.js at build time.
 * Falls back gracefully when running in dev or test.
 */

// eslint-disable-next-line no-undef
const ver = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.1.0'
// eslint-disable-next-line no-undef
const bt  = typeof __BUILD_TIME__  !== 'undefined' ? __BUILD_TIME__  : new Date().toISOString()

export const APP_VERSION   = ver
export const BUILD_TIME    = bt
export const VERSION_LABEL = `v${ver}`

/** Short human-readable build stamp, e.g. "20260810-1430" */
export const BUILD_STAMP = (() => {
  try {
    const d = new Date(bt)
    const date = d.toISOString().slice(0, 10).replace(/-/g, '')
    const time = d.toTimeString().slice(0, 5).replace(':', '')
    return `${date}-${time}`
  } catch {
    return 'dev'
  }
})()

export const FULL_VERSION = `${VERSION_LABEL} (${BUILD_STAMP})`
