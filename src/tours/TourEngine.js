/**
 * Tour playback engine.
 *
 * Manages guided tour sequences: camera waypoints, narration text,
 * speed transitions, and timing. Tours are defined as JSON data
 * with waypoint arrays.
 */

export class TourEngine {
  constructor() {
    this.tour = null
    this.currentStep = 0
    this.isPlaying = false
    this.isPaused = false
    this.onStepChange = null
    this.onComplete = null
    this.onNarration = null
    this.stepTimer = null
  }

  /**
   * Load and start a tour.
   * @param {Object} tour - Tour definition with waypoints array
   * @param {Function} setCameraTarget - Store action to fly camera
   * @param {Function} setSpeedLevel - Store action to set speed
   */
  start(tour, setCameraTarget, setSpeedLevel) {
    this.tour = tour
    this.currentStep = 0
    this.isPlaying = true
    this.isPaused = false
    this.setCameraTarget = setCameraTarget
    this.setSpeedLevel = setSpeedLevel

    this.playStep(0)
  }

  playStep(index) {
    if (!this.tour || index >= this.tour.waypoints.length) {
      this.complete()
      return
    }

    this.currentStep = index
    const waypoint = this.tour.waypoints[index]

    // Update narration
    if (this.onNarration) {
      this.onNarration(waypoint.narration || '')
    }

    // Set speed if specified
    if (waypoint.speed !== undefined && this.setSpeedLevel) {
      this.setSpeedLevel(waypoint.speed)
    }

    // Fly to target position
    if (waypoint.target && this.setCameraTarget) {
      this.setCameraTarget({
        x: waypoint.target.x,
        y: waypoint.target.y,
        z: waypoint.target.z,
        name: waypoint.name,
      })
    }

    // Notify step change
    if (this.onStepChange) {
      this.onStepChange(index, this.tour.waypoints.length)
    }

    // Auto-advance after duration
    if (waypoint.duration && !this.isPaused) {
      this.stepTimer = setTimeout(() => {
        if (this.isPlaying && !this.isPaused) {
          this.playStep(index + 1)
        }
      }, waypoint.duration * 1000)
    }
  }

  pause() {
    this.isPaused = true
    if (this.stepTimer) {
      clearTimeout(this.stepTimer)
      this.stepTimer = null
    }
  }

  resume() {
    if (!this.isPlaying) return
    this.isPaused = false
    // Replay current step to restart its timer
    this.playStep(this.currentStep)
  }

  next() {
    if (this.stepTimer) clearTimeout(this.stepTimer)
    this.playStep(this.currentStep + 1)
  }

  previous() {
    if (this.stepTimer) clearTimeout(this.stepTimer)
    this.playStep(Math.max(0, this.currentStep - 1))
  }

  complete() {
    this.isPlaying = false
    this.isPaused = false
    if (this.stepTimer) clearTimeout(this.stepTimer)
    if (this.onComplete) this.onComplete()
    if (this.onNarration) this.onNarration('')
  }

  stop() {
    this.isPlaying = false
    this.isPaused = false
    if (this.stepTimer) clearTimeout(this.stepTimer)
    if (this.onNarration) this.onNarration('')
  }

  get progress() {
    if (!this.tour) return 0
    return (this.currentStep + 1) / this.tour.waypoints.length
  }

  get stepCount() {
    return this.tour ? this.tour.waypoints.length : 0
  }
}

// Singleton instance
export const tourEngine = new TourEngine()
