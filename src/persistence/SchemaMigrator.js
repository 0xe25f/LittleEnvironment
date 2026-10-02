/**
 * Ordered forward-only schema migration registry.
 */
export class SchemaMigrator {
  /**
   * @param {number} [currentVersion=1] Latest supported schema version.
   */
  constructor(currentVersion = 1) {
    if (!Number.isInteger(currentVersion) || currentVersion < 1) {
      throw new RangeError('Current schema version must be a positive integer.');
    }
    this.currentVersion = currentVersion;
    this.migrations = new Map();
  }

  /**
   * Registers the migration from one version to its next version.
   *
   * @param {number} fromVersion Source version.
   * @param {(state: object) => object} migrate Forward migration function.
   * @returns {SchemaMigrator} This migrator.
   */
  register(fromVersion, migrate) {
    if (!Number.isInteger(fromVersion) || fromVersion < 1 || fromVersion >= this.currentVersion) {
      throw new RangeError('Migration source version is outside the supported range.');
    }
    if (typeof migrate !== 'function') throw new TypeError('A schema migration must be a function.');
    if (this.migrations.has(fromVersion)) throw new Error(`A migration from version ${fromVersion} already exists.`);
    this.migrations.set(fromVersion, migrate);
    return this;
  }

  /**
   * Migrates a snapshot to the current version without mutating its input.
   *
   * @param {object} input State with a version field.
   * @returns {object} Migrated state.
   */
  migrate(input) {
    if (!input || typeof input !== 'object') throw new TypeError('Serialised state must be an object.');
    let state = structuredClone(input);
    let version = Number(state.version ?? 1);
    if (!Number.isInteger(version) || version < 1) throw new RangeError('Serialised state has an invalid schema version.');
    if (version > this.currentVersion) throw new RangeError('Serialised state uses a newer schema version.');
    while (version < this.currentVersion) {
      const migration = this.migrations.get(version);
      if (!migration) throw new Error(`No forward migration exists from schema version ${version}.`);
      state = migration(structuredClone(state));
      version += 1;
      state.version = version;
    }
    return state;
  }
}
