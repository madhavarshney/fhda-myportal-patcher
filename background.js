const DEBUG_MODE = false

const cookiesToDelete = [
  { name: 'commonAuthId', url: 'https://eis-prod.ec.fhda.edu/', domain: 'eis-prod.ec.fhda.edu' },
  { name: 'SESSID', url: 'https://ssb-prod.ec.fhda.edu/PROD', domain: 'ssb-prod.ec.fhda.edu' }
]
const eisCookie = cookiesToDelete[0]
const deleteCookiesCmd = 'DELETE_COOKIES'

/**
 * Simple log function that prepends a timestamp
 */
function log(...params) {
  console.log(new Date(Date.now()).toISOString(), ...params)
}

/**
 * Delete cookies that cause SAML validation errors when stale
 */
async function deleteBadCookies() {
  const cookiesDeleted = await Promise.all(
    cookiesToDelete.map(({ name, url }) => chrome.cookies.remove({ name, url }))
  )

  log('Deleted cookies', cookiesDeleted)
}

/**
 * Schedule an alarm to delete cookies that should expire
 */
async function scheduleAlarm() {
  const delayInMinutes = DEBUG_MODE ? 1 : 120 - 5

  await clearAlarms()
  await chrome.alarms.create(deleteCookiesCmd, { delayInMinutes })

  log(`Scheduled alarm to clear cookies in ${delayInMinutes} minute(s).`)
}

/**
 * Clear alarms to delete cookies
 */
async function clearAlarms() {
  const wasCleared = await chrome.alarms.clear(deleteCookiesCmd)

  if (wasCleared) {
    log(`Cleared alarm to delete cookies.`)
  }
}

/**
 * Handle alarm
 */
chrome.alarms.onAlarm.addListener(({ name }) => {
  if (name === deleteCookiesCmd) {
    clearAlarms()
    deleteBadCookies()
  }
})

/**
 * When the cookie `commonAuthId` on eis-prod.ec.fhda.edu is added or removed,
 * schedule or clear the delete cookies alarm (which deletes the cookies after a timeout)
 */
chrome.cookies.onChanged.addListener(({ cause, cookie, removed }) => {
  if (eisCookie.domain !== cookie.domain || eisCookie.name !== cookie.name) {
    return
  }

  if (cause === 'explicit' && !removed) {
    log(`Cookie ${cookie.name} on ${cookie.domain} was added.`, cookie)
    scheduleAlarm()
  }

  if (removed) {
    log(`Cookie ${cookie.name} on ${cookie.domain} was removed.`, cookie)
    clearAlarms()
  }
})

/**
 * In debug mode, delete cookies when the extension icon is clicked
 *
 * TODO: remove to so that action: {} can be removed in manifest.json
 */
if (DEBUG_MODE) {
  chrome.action.onClicked.addListener(() => deleteBadCookies())
}

/**
 * Delete bad cookies on load when not debugging
 */
if (!DEBUG_MODE) {
  chrome.runtime.onInstalled.addListener(() => deleteBadCookies())
}

log(`FHDA MyPortal Patcher booted up, debug mode is ${DEBUG_MODE ? 'on' : 'off'}.`)
