/**
 * ID for the Firefox disconnect canary element
 */
export const FIREFOX_CANARY_ID = "neckarfreundeWebextMessengerFirefoxCanary";

/**
 * Check if the current browser is Firefox
 */
export function isFirefox(): boolean {
    return navigator.userAgent.includes("Firefox");
}
