import { SchemaMigrator } from './SchemaMigrator.js';

/**
 * Versioned JSON serialiser for environment and character state.
 */
export class EnvironmentSerialiser {
  /**
   * @param {object} [options] Serialisation configuration.
   * @param {number} [options.version=1] Current schema version.
   * @param {SchemaMigrator} [options.migrator] Forward migration registry.
   */
  constructor({ version = 1, migrator } = {}) {
    this.version = version;
    this.migrator = migrator ?? new SchemaMigrator(version);
  }

  /**
   * Creates a lossless schema-versioned snapshot.
   *
   * @param {object} state Environment state containing optional world and character values.
   * @returns {object} Plain snapshot.
   */
  snapshot({ world = {}, character = {}, metadata = {} } = {}) {
    return {
      version: this.version,
      world: EnvironmentSerialiser.toPlain(world),
      character: EnvironmentSerialiser.toPlain(character),
      metadata: EnvironmentSerialiser.toPlain(metadata),
    };
  }

  /**
   * Serialises a snapshot to compact JSON.
   *
   * @param {object} state Environment state.
   * @returns {string} JSON payload.
   */
  serialise(state) { return JSON.stringify(EnvironmentSerialiser.encodeForJson(this.snapshot(state))); }

  /**
   * Parses and migrates state to the current schema.
   *
   * @param {string|object} input JSON string or plain snapshot.
   * @returns {object} Migrated snapshot.
   */
  deserialise(input) {
    const parsed = typeof input === 'string' ? EnvironmentSerialiser.decodeFromJson(JSON.parse(input)) : input;
    return this.migrator.migrate(parsed);
  }

  /**
   * Converts nested serialisable objects to JSON-safe data.
   *
   * @param {unknown} value Value to copy.
   * @returns {unknown} Plain value.
   */
  static toPlain(value) {
    if (value && typeof value.serialise === 'function') return EnvironmentSerialiser.toPlain(value.serialise());
    if (Array.isArray(value)) return value.map((entry) => EnvironmentSerialiser.toPlain(entry));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, EnvironmentSerialiser.toPlain(entry)]));
    }
    return value;
  }

  /**
   * Replaces JavaScript values that JSON cannot represent with tagged objects.
   *
   * @param {unknown} value Plain state value.
   * @returns {unknown} JSON-safe value.
   */
  static encodeForJson(value) {
    if (value === Infinity) return { $littleEnvironmentType: 'positive-infinity' };
    if (value === -Infinity) return { $littleEnvironmentType: 'negative-infinity' };
    if (Number.isNaN(value)) return { $littleEnvironmentType: 'not-a-number' };
    if (value === undefined) return { $littleEnvironmentType: 'undefined' };
    if (Array.isArray(value)) return value.map((entry) => EnvironmentSerialiser.encodeForJson(entry));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, EnvironmentSerialiser.encodeForJson(entry)]));
    }
    return value;
  }

  /**
   * Restores JavaScript values tagged by `encodeForJson`.
   *
   * @param {unknown} value Parsed JSON value.
   * @returns {unknown} Restored plain value.
   */
  static decodeFromJson(value) {
    if (Array.isArray(value)) return value.map((entry) => EnvironmentSerialiser.decodeFromJson(entry));
    if (value && typeof value === 'object') {
      const type = value.$littleEnvironmentType;
      if (type === 'positive-infinity') return Infinity;
      if (type === 'negative-infinity') return -Infinity;
      if (type === 'not-a-number') return Number.NaN;
      if (type === 'undefined') return undefined;
      return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, EnvironmentSerialiser.decodeFromJson(entry)]));
    }
    return value;
  }
}
