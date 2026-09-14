/**
 * Retrieve CSRF token from HTML meta tag or XSRF-TOKEN cookie
 */
export function getCsrfToken(): string {
    if (typeof document === 'undefined') {
        return '';
    }

    // 1. Try to read from meta tag
    const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
    if (metaTag && metaTag.content) {
        return metaTag.content;
    }

    // 2. Fallback: Parse XSRF-TOKEN cookie if present
    const match = document.cookie.match(new RegExp('(^|;\\s*)(?:XSRF-TOKEN)=([^;]*)'));
    if (match && match[2]) {
        return decodeURIComponent(match[2]);
    }

    return '';
}
