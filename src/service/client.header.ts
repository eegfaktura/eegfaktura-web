/**
 * Identifies requests made by this browser app, as opposed to direct API users
 * with their own token. The backends only read it for monitoring (Dynatrace
 * request attribute), never for authorization.
 */
export const X_CLIENT_HEADER = "X-Client";
export const X_CLIENT_VALUE = `vfeeg-app/${__APP_VERSION__}`;
