import { StackPolicy } from './StackPolicy.js';

/**
 * Validated status-effect definition and mutable applied instance factory.
 */
export class StatusEffect {
  /**
   * @param {object} options Effect definition.
   */
  constructor({
    id,
    duration = 5,
    tickInterval = 1,
    maxStacks = 1,
    stackPolicy = StackPolicy.REFRESH,
    isDebuff = true,
    tags = [],
    modifiers = [],
    onTick = null,
    metadata = {},
  } = {}) {
    if (!id) throw new TypeError('A status effect requires an identifier.');
    if (!Number.isFinite(duration) || duration < 0) throw new RangeError('Effect duration must be non-negative.');
    if (!Number.isFinite(tickInterval) || tickInterval < 0) throw new RangeError('Effect tick interval must be non-negative.');
    if (!Number.isInteger(maxStacks) || maxStacks < 1) throw new RangeError('Maximum effect stacks must be a positive integer.');
    if (!Object.values(StackPolicy).includes(stackPolicy)) throw new RangeError(`Unknown stack policy: ${stackPolicy}.`);
    if (onTick !== null && typeof onTick !== 'function') throw new TypeError('An effect tick handler must be a function.');
    this.id = String(id);
    this.duration = duration;
    this.tickInterval = tickInterval;
    this.maxStacks = maxStacks;
    this.stackPolicy = stackPolicy;
    this.isDebuff = Boolean(isDebuff);
    this.tags = [...tags];
    this.modifiers = modifiers.map((modifier) => ({ ...modifier }));
    this.onTick = onTick;
    this.metadata = { ...metadata };
  }

  /**
   * Creates an independent mutable application instance.
   *
   * @param {string} [instanceId=this.id] Unique application identifier.
   * @returns {object} Effect instance.
   */
  createInstance(instanceId = this.id) {
    return {
      instanceId,
      id: this.id,
      duration: this.duration,
      remaining: this.duration,
      tickInterval: this.tickInterval,
      accumulator: 0,
      stacks: 1,
      maxStacks: this.maxStacks,
      stackPolicy: this.stackPolicy,
      isDebuff: this.isDebuff,
      tags: [...this.tags],
      modifiers: this.modifiers.map((modifier) => ({ ...modifier })),
      onTick: this.onTick,
      metadata: { ...this.metadata },
    };
  }
}
