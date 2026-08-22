export class Poller {
  constructor(task, intervalMs) {
    this.task = task;
    this.intervalMs = intervalMs;
    this.intervalId = null;
  }

  start() {
    this.stop();
    this.intervalId = setInterval(() => this.task(), this.intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  get isRunning() {
    return this.intervalId !== null;
  }
}
