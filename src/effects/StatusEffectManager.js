import { EnvironmentEvents } from '../events/EnvironmentEvents.js';
import { StatModifier } from '../combat/StatModifier.js';
import { StackPolicy } from './StackPolicy.js';
import { StatusEffect } from './StatusEffect.js';

/**
 * Frame-rate independent active status-effect manager.
 */
export class StatusEffectManager {
  /**
   * @param {object} target Target entity that owns attributes and optional events.
   */
  constructor(target) {
    this.target = target ?? null;
    this.effects = new Map();
    this.nextInstanceNumber = 1;
  }

  /**
   * Applies an effect definition, observing its chosen stack policy.
   *
   * @param {StatusEffect|object} definition Effect definition.
   * @returns {object} Active effect instance.
   */
  apply(definition) {
    const effect = definition instanceof StatusEffect ? definition : new StatusEffect(definition);
    const existing = this.findByLogicalId(effect.id);
    if (effect.stackPolicy !== StackPolicy.INDEPENDENT && existing) {
      this.reapply(existing, effect);
      return existing;
    }
    const instanceId = effect.stackPolicy === StackPolicy.INDEPENDENT
      ? `${effect.id}#${this.nextInstanceNumber++}`
      : effect.id;
    const instance = effect.createInstance(instanceId);
    this.effects.set(instanceId, instance);
    this.applyModifiers(instance);
    this.emit(EnvironmentEvents.EFFECT_APPLIED, instance);
    return instance;
  }

  /**
   * Removes an effect by instance or logical identifier.
   *
   * @param {string} id Effect identifier.
   * @returns {boolean} Whether an effect was removed.
   */
  remove(id) {
    const entries = [...this.effects.entries()].filter(([instanceId, effect]) => instanceId === id || effect.id === id);
    for (const [instanceId, effect] of entries) {
      this.removeModifiers(effect);
      this.effects.delete(instanceId);
      this.emit(EnvironmentEvents.EFFECT_REMOVED, effect);
    }
    return entries.length > 0;
  }

  /**
   * Removes all effects tagged with a value.
   *
   * @param {string} tag Tag to dispel.
   * @returns {number} Number of removed effects.
   */
  dispelByTag(tag) {
    const ids = [...this.effects.values()].filter((effect) => effect.tags.includes(tag)).map((effect) => effect.instanceId);
    for (const id of ids) this.remove(id);
    return ids.length;
  }

  /**
   * Removes every active debuff.
   *
   * @returns {number} Number of removed effects.
   */
  dispelAllDebuffs() {
    const ids = [...this.effects.values()].filter((effect) => effect.isDebuff).map((effect) => effect.instanceId);
    for (const id of ids) this.remove(id);
    return ids.length;
  }

  /**
   * Advances durations and processes every elapsed tick interval without drift.
   *
   * @param {number} deltaSeconds Simulation delta.
   */
  update(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError('Effect delta seconds must be finite and non-negative.');
    }
    for (const [instanceId, effect] of [...this.effects]) {
      const activeDelta = Math.min(deltaSeconds, Math.max(0, effect.remaining));
      effect.remaining -= deltaSeconds;
      effect.accumulator += activeDelta;
      if (effect.tickInterval > 0) {
        while (effect.accumulator + Number.EPSILON >= effect.tickInterval) {
          effect.accumulator -= effect.tickInterval;
          effect.onTick?.(this.target, effect.stacks, effect);
        }
      }
      if (effect.remaining <= 0) this.remove(instanceId);
    }
  }

  /** @returns {Array<object>} Persistable active effect state. */
  serialise() {
    return [...this.effects.values()].map((effect) => ({
      ...effect,
      tags: [...effect.tags],
      modifiers: effect.modifiers.map((modifier) => ({ ...modifier })),
      onTick: undefined,
    }));
  }

  /**
   * Finds the non-independent active effect for a logical identifier.
   *
   * @param {string} id Logical effect identifier.
   * @returns {object|undefined} Active instance.
   */
  findByLogicalId(id) {
    return [...this.effects.values()].find((effect) => effect.id === id && effect.stackPolicy !== StackPolicy.INDEPENDENT);
  }

  /**
   * Applies the correct reapplication behaviour.
   *
   * @param {object} instance Existing effect instance.
   * @param {StatusEffect} definition Incoming definition.
   */
  reapply(instance, definition) {
    if (instance.stackPolicy === StackPolicy.REFRESH) instance.remaining = definition.duration;
    if (instance.stackPolicy === StackPolicy.INTENSITY) {
      instance.stacks = Math.min(instance.maxStacks, instance.stacks + 1);
      instance.remaining = definition.duration;
      this.applyModifiers(instance);
    }
    if (instance.stackPolicy === StackPolicy.DURATION) {
      instance.remaining += definition.duration;
    }
  }

  /**
   * Attaches stack-scaled attribute modifiers.
   *
   * @param {object} effect Effect instance.
   */
  applyModifiers(effect) {
    this.removeModifiers(effect);
    effect.modifiers.forEach((modifier, index) => {
      const attribute = this.target?.getAttribute?.(modifier.attribute);
      if (!attribute) return;
      attribute.addModifier(new StatModifier({
        id: `${effect.instanceId}:${index}`,
        type: modifier.type,
        value: Number(modifier.value) * effect.stacks,
        source: `effect:${effect.instanceId}`,
      }));
    });
  }

  /**
   * Detaches every modifier installed by an effect.
   *
   * @param {object} effect Effect instance.
   */
  removeModifiers(effect) {
    effect.modifiers.forEach((modifier, index) => {
      this.target?.getAttribute?.(modifier.attribute)?.removeModifier(`${effect.instanceId}:${index}`);
    });
  }

  /**
   * Emits using either the conventional target emitter or an event bus shape.
   *
   * @param {string} event Event name.
   * @param {object} effect Effect state.
   */
  emit(event, effect) {
    this.target?.emit?.(event, effect);
    if (event === EnvironmentEvents.EFFECT_APPLIED) this.target?.emit?.('onEffectApplied', effect);
    if (event === EnvironmentEvents.EFFECT_REMOVED) this.target?.emit?.('onEffectRemoved', effect);
  }
}
