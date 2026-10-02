# LittleEnvironment

LittleEnvironment is a deterministic, headless-first environmental simulation toolkit for 2D games. It combines continuous celestial time, climate, viewport-bounded weather particles, thermal survival, layered attributes, combat, status effects, progression, and versioned persistence without requiring a rendering engine.

## Installation

The package is native ESM and has no runtime dependencies.

```js
import {
  Attribute,
  CelestialClock,
  SurvivalVitalManager,
  WeatherSystem,
} from './src/index.js';
```

Run the checks and generate browser artefacts with:

```sh
npm test
npm run build
```

## Headless update loop

```js
const clock = new CelestialClock({ dayDurationSeconds: 900 });
const weather = new WeatherSystem({ initialWeather: 'clear' });

function update(deltaSeconds, cameraBounds) {
  clock.update(deltaSeconds);
  const climate = weather.update(deltaSeconds, cameraBounds).climate;
  player.vitals.update(deltaSeconds, {
    ambientTemperature: 18,
    weatherTempOffset: climate.temperatureOffset,
    staminaDrainMultiplier: climate.staminaDrainMultiplier,
  });
}
```

Rendering is optional and separated from simulation. `LightingCompositor` can turn a headless lighting frame into a Canvas 2D pass, while weather particles are exposed as plain data for any renderer.

## Systems

- `CelestialClock` and `CalendarEngine`: continuous time, celestial vectors, seasons, and day rollovers.
- `ClimateMatrix` and `WeatherSystem`: smooth climate transitions, weighted biome weather, and camera-bounded particles.
- `ThermodynamicModel` and `SurvivalVitalManager`: smooth conduction, radiant heat, hunger, thirst, stamina, oxygen, and drowning.
- `Attribute`, `CombatResolver`, and `DamagePayload`: dirty-cached modifier graphs and deterministic five-stage combat receipts.
- `StatusEffectManager`: drift-free ticking with refresh, intensity, duration, and independent stacking.
- `CharacterProgression`, `EnvironmentSerialiser`, and `SchemaMigrator`: multi-level experience rollover and forward-compatible saves.

## Documentation and demos

The GitHub Pages-ready documentation begins at [docs/index.html](docs/index.html). The four local interactive demos are in `docs/demos/`; developer examples are in `examples/`.

## Design guarantees

- Pure ESM source modules with no DOM, Canvas, or WebGL dependency in core simulation.
- Continuous time stays within the half-open interval `[0, 1)`.
- Body heat uses the specified insulation and thermal-exchange formula.
- Attribute evaluation follows flat, additive percentage, multiplicative percentage, then clamp precedence.
- Status-effect tick accumulators retain sub-interval fractions.
- Persistence payloads have explicit schema versions and forward migration support.
