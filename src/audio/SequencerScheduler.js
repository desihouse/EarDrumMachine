// High-precision Web Audio lookahead sequencer scheduler

export class SequencerScheduler {
  constructor(onStepTrigger) {
    this.onStepTrigger = onStepTrigger;
    this.bpm = 120;
    this.swing = 0; // 0% to 50%
    this.isPlaying = false;

    this.currentStep = 0;
    this.nextStepTime = 0;

    this.lookaheadMs = 25.0; // Interval for scheduler tick
    this.scheduleAheadTime = 0.1; // Seconds of audio to schedule ahead

    this.timerId = null;
  }

  setBpm(bpm) {
    this.bpm = Math.max(30, Math.min(300, bpm));
  }

  setSwing(swing) {
    this.swing = Math.max(0, Math.min(60, swing));
  }

  start(ctx) {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentStep = 0;
    this.nextStepTime = ctx.currentTime + 0.05;

    this.runScheduler(ctx);
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  runScheduler(ctx) {
    if (!this.isPlaying) return;

    while (this.nextStepTime < ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.advanceStep(ctx);
    }

    this.timerId = setTimeout(() => {
      this.runScheduler(ctx);
    }, this.lookaheadMs);
  }

  scheduleStep(stepIndex, time) {
    // Calculate swing offset for odd steps (16th notes)
    let finalTime = time;
    if (stepIndex % 2 === 1 && this.swing > 0) {
      const stepDuration = 60.0 / (this.bpm * 4);
      const swingOffset = stepDuration * (this.swing / 100);
      finalTime += swingOffset;
    }

    this.onStepTrigger(stepIndex, finalTime);
  }

  advanceStep() {
    const secondsPer16th = 60.0 / (this.bpm * 4);
    this.nextStepTime += secondsPer16th;

    this.currentStep = (this.currentStep + 1) % 16;
  }
}
