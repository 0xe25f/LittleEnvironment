/**
 * Deterministic, dependency-free event dispatcher for environment systems.
 */
export class EnvironmentEventBus {
  /**
   * Creates an empty event bus.
   */
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Registers a listener and returns an unsubscribe function.
   *
   * @param {string} event Event name.
   * @param {(payload: unknown) => void} listener Listener to invoke.
   * @returns {() => void} Function that removes the listener.
   */
  on(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('An event listener must be a function.');
    }
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
    return () => this.off(event, listener);
  }

  /**
   * Removes one listener.
   *
   * @param {string} event Event name.
   * @param {(payload: unknown) => void} listener Listener to remove.
   * @returns {boolean} Whether a listener was removed.
   */
  off(event, listener) {
    const listeners = this.listeners.get(event);
    if (!listeners) return false;
    const removed = listeners.delete(listener);
    if (listeners.size === 0) this.listeners.delete(event);
    return removed;
  }

  /**
   * Emits an event to a stable listener snapshot.
   *
   * @param {string} event Event name.
   * @param {unknown} payload Event payload.
   */
  emit(event, payload) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    for (const listener of [...listeners]) listener(payload);
  }

  /**
   * Removes every listener, optionally only for one event.
   *
   * @param {string} [event] Event name to clear.
   */
  clear(event) {
    if (event === undefined) this.listeners.clear();
    else this.listeners.delete(event);
  }
}
