// Thermal & Performance Stability Guardian for On-Device AI
export interface DeviceHealthStatus {
  fps: number;
  isStuttering: boolean;
  failSafeTriggered: boolean;
  reason?: string;
}

class DevicePerformanceGuardian {
  private frameCount = 0;
  private lastTime = performance.now();
  private currentFps = 60;
  private failSafeTriggered = false;
  private stutterCount = 0;
  private isMonitoring = false;
  private rafId: number | null = null;
  private onFailSafeTriggered?: (reason: string) => void;

  public startMonitoring(onFailSafe: (reason: string) => void) {
    this.onFailSafeTriggered = onFailSafe;
    this.failSafeTriggered = false;
    this.stutterCount = 0;
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.isMonitoring = true;

    const measureLoop = (now: number) => {
      if (!this.isMonitoring) return;

      this.frameCount++;
      const elapsed = now - this.lastTime;

      // Every 500ms, compute effective UI thread FPS
      if (elapsed >= 500) {
        this.currentFps = Math.round((this.frameCount * 1000) / elapsed);
        this.frameCount = 0;
        this.lastTime = now;

        // Thermal / Frame Drop Trigger:
        // If main UI thread drops below 24fps twice during generation, phone is heating or throttling
        if (this.currentFps < 24) {
          this.stutterCount++;
          if (this.stutterCount >= 2 && !this.failSafeTriggered) {
            this.triggerFailSafe('Thermal throttling or low UI frame rate detected (<24 FPS). Activating safety shield to protect device battery and heat.');
            return;
          }
        } else {
          if (this.stutterCount > 0) this.stutterCount--;
        }
      }

      this.rafId = requestAnimationFrame(measureLoop);
    };

    this.rafId = requestAnimationFrame(measureLoop);
  }

  public stopMonitoring() {
    this.isMonitoring = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public triggerFailSafe(reason: string) {
    this.failSafeTriggered = true;
    this.stopMonitoring();
    if (this.onFailSafeTriggered) {
      this.onFailSafeTriggered(reason);
    }
  }

  public isUnderStress(): boolean {
    return this.failSafeTriggered || this.currentFps < 28;
  }

  public getStatus(): DeviceHealthStatus {
    return {
      fps: this.currentFps,
      isStuttering: this.currentFps < 30,
      failSafeTriggered: this.failSafeTriggered,
    };
  }
}

export const deviceGuardian = new DevicePerformanceGuardian();
