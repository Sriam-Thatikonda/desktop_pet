/**
 * DogConfig - Central configuration for 3D Desktop Pet
 */
export const DogConfig = {
  // Visual scale
  visualScale: 1.0,
  targetHeightPixels: 115, // Screen height in pixels (user requested ~100-130px on 1080p)

  // Speeds and physics (in screen pixels/second)
  walkSpeed: 140,
  runSpeed: 300,
  acceleration: 400,
  deceleration: 550,
  turnSpeed: 8.0, // Radians/second

  // Cursor reaction & deadzone
  cursorReactionDelayMs: 250, // Human-like reaction time
  cursorDeadzoneRadius: 75,   // Small cursor shifts near the dog don't trigger chase
  cursorTriggerDistance: 110,  // Distance required to transition from sitting to following
  cursorFollowOffset: 70,     // Sitting offset from cursor (px)

  // Autonomous behavior & sleep
  idleSleepTimeoutMs: 50000,  // 50s idle -> dog walks to kettle to sleep
  sleepBreathingRate: 0.8,

  // Playful interaction
  playfulClickThreshold: 3,   // 3 rapid clicks triggers playful excitement
  playfulClickWindowMs: 2000, // Within 2 seconds
  playfulDurationMs: 4500,    // Excitement duration

  // Home / Kettle
  kettleOffset: {
    x: 80, // Distance from left edge of screen
    y: 75  // Distance from bottom edge of work area
  },

  // Mouse interaction hit detection
  dogHitRadius: 85,     // Generous interaction radius covering full body, head & tail (px)
  kettleHitRadius: 75,  // Generous interaction radius around kettle (px)

  // Debugging
  debugMode: false,
};
