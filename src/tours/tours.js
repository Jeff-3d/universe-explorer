/**
 * Built-in guided tours.
 *
 * Each tour has:
 * - name: Display name
 * - description: Brief summary
 * - duration: Estimated time in minutes
 * - waypoints: Array of { name, target: {x,y,z}, narration, duration, speed }
 *
 * Positions are in real LY coordinates (will be log-compressed by the camera system).
 */

export const TOURS = [
  {
    id: 'local-neighborhood',
    name: "Our Stellar Neighborhood",
    description: "Visit the nearest stars to Earth",
    duration: 3,
    waypoints: [
      {
        name: "Earth / Sol",
        target: { x: 0, y: 0, z: 0 },
        narration: "We begin at our Sun — an ordinary yellow dwarf star, one of hundreds of billions in the Milky Way.",
        duration: 8,
        speed: 0,
      },
      {
        name: "Proxima Centauri",
        target: { x: -1.62, y: -1.37, z: -3.77 },
        narration: "Proxima Centauri — the nearest star to Earth at 4.24 light-years. A red dwarf too faint to see with the naked eye, yet it hosts at least two planets.",
        duration: 10,
        speed: 1,
      },
      {
        name: "Sirius",
        target: { x: -1.80, y: -1.87, z: -7.94 },
        narration: "Sirius — the brightest star in our sky. A blazing white star twice the mass of our Sun, just 8.6 light-years away.",
        duration: 10,
        speed: 1,
      },
      {
        name: "Vega",
        target: { x: 0.29, y: 20.8, z: -11.2 },
        narration: "Vega — once our North Star and future North Star again. 25 light-years away, this blue-white star helped define the magnitude system.",
        duration: 10,
        speed: 2,
      },
      {
        name: "Betelgeuse",
        target: { x: -305, y: -98, z: -281 },
        narration: "Betelgeuse — the red supergiant in Orion's shoulder. 700 light-years away and large enough to engulf Jupiter's orbit. It will explode as a supernova within the next 100,000 years.",
        duration: 12,
        speed: 4,
      },
    ],
  },

  {
    id: 'cosmic-distance-ladder',
    name: "The Cosmic Distance Ladder",
    description: "How we measure the universe at every scale",
    duration: 4,
    waypoints: [
      {
        name: "Nearby Stars",
        target: { x: 0, y: 0, z: 0 },
        narration: "Rung 1: Parallax. For nearby stars, we measure the tiny shift in position as Earth orbits the Sun. This works out to about 1,000 light-years.",
        duration: 10,
        speed: 0,
      },
      {
        name: "Galactic Center",
        target: { x: -26000, y: 0, z: 0 },
        narration: "Rung 2: Standard candles. Cepheid variable stars pulsate with a period proportional to their true brightness. By comparing how bright they appear vs. how bright they really are, we get the distance.",
        duration: 12,
        speed: 6,
      },
      {
        name: "Andromeda Galaxy",
        target: { x: 383000, y: 614000, z: -1937000 },
        narration: "Rung 3: It was Cepheids in Andromeda that proved galaxies exist beyond our own. Edwin Hubble used the 100-inch telescope on Mount Wilson to resolve individual stars in this 'nebula' — and changed our understanding of the universe.",
        duration: 12,
        speed: 7,
      },
      {
        name: "Deep Space",
        target: { x: 0, y: 0, z: -100000000 },
        narration: "Rung 4: Type Ia supernovae. These thermonuclear explosions in white dwarf stars always reach the same peak brightness. We can spot them billions of light-years away — and it was these that revealed the universe's expansion is accelerating.",
        duration: 12,
        speed: 9,
      },
    ],
  },

  {
    id: 'humanitys-reach',
    name: "Humanity's Reach",
    description: "How far have we really gone?",
    duration: 3,
    waypoints: [
      {
        name: "Earth",
        target: { x: 0, y: 0, z: 0 },
        narration: "Every human who has ever lived was born on this planet. The farthest any human has traveled is the Moon — about 1.3 light-seconds away.",
        duration: 8,
        speed: 0,
      },
      {
        name: "Voyager 1 Distance",
        target: { x: 0.001, y: 0.001, z: 0.002 },
        narration: "Voyager 1, launched in 1977, is the most distant human-made object. After nearly 50 years of travel, it has reached 0.002 light-years — less than a thousandth of the way to the nearest star.",
        duration: 10,
        speed: 0,
      },
      {
        name: "Radio Bubble Edge",
        target: { x: 0, y: 80, z: 80 },
        narration: "Our radio bubble — every TV broadcast, radar signal, and communication we've ever sent — extends about 120 light-years. In a galaxy 100,000 light-years across, it's a tiny whisper.",
        duration: 10,
        speed: 2,
      },
      {
        name: "Milky Way Overview",
        target: { x: 0, y: 50000, z: 0 },
        narration: "From here, our entire radio bubble is invisible. The Milky Way contains 200-400 billion stars. We've explored one.",
        duration: 10,
        speed: 6,
      },
      {
        name: "Observable Universe",
        target: { x: 0, y: 0, z: -1000000000 },
        narration: "The observable universe contains roughly 2 trillion galaxies. The light from its edge has been traveling for 13.8 billion years. And it's still expanding.",
        duration: 12,
        speed: 9,
      },
    ],
  },
]
