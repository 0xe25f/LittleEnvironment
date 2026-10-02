import { AmbientColorGradient, CelestialClock } from '../../release/littleenvironment.min.js';

const canvas = document.querySelector('#sky');
const context = canvas.getContext('2d');
const readout = document.querySelector('#readout');
const clock = new CelestialClock({ dayDurationSeconds: 20 });
const gradient = new AmbientColorGradient(undefined, 'hermite');
let previous = performance.now();

function render(now) {
  const frameTime = Number.isFinite(now) ? now : performance.now();
  const delta = (frameTime - previous) / 1000;
  previous = frameTime;
  clock.update(delta);
  const colour = gradient.evaluate(clock.time);
  context.fillStyle = `rgb(${colour.r} ${colour.g} ${colour.b})`;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const sun = clock.getSunPosition();
  context.beginPath();
  context.arc(320 + sun.x * 220, 150 - sun.y * 105, 18, 0, Math.PI * 2);
  context.fillStyle = '#fff4ae';
  context.fill();
  const time = clock.getClockTime();
  readout.textContent = `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')} · ${clock.currentSeason}`;
  requestAnimationFrame(render);
}

requestAnimationFrame(render);
