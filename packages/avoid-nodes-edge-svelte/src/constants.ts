/** Log web worker / routing messages in development. */
export const DEV_LOG_WEB_WORKER_MESSAGES = false;

/**
 * Debounce (ms) before routing runs after diagram changes.
 * 10 ms merges drag events into a single update.
 * For larger diagrams (500+ nodes) use ~50-100 ms.
 */
export const DEBOUNCE_ROUTING_MS = 0;

/** Whether edges start at handle border (true) or center (false). */
export const SHOULD_START_EDGE_AT_HANDLE_BORDER = true;

/** Default border radius (px) for routed path corners. */
export const EDGE_BORDER_RADIUS = 0;
