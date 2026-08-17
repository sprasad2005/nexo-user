/**
 * StreamBatcher: High-frequency token stream batcher using requestAnimationFrame.
 * Collects streamed tokens in a lightweight in-memory buffer and dispatches batched
 * updates to React state at optimal 60fps monitor refresh intervals, eliminating
 * hundreds of wasteful intermediate renders.
 */

export class StreamBatcher {
  private buffer: string = "";
  private isScheduled: boolean = false;
  private rafId: number | null = null;
  private onFlush: (bufferedText: string) => void;

  constructor(onFlush: (bufferedText: string) => void) {
    this.onFlush = onFlush;
  }

  public push(token: string) {
    this.buffer += token;

    if (!this.isScheduled) {
      this.isScheduled = true;
      this.rafId = requestAnimationFrame(() => {
        this.flush();
      });
    }
  }

  public flush() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.isScheduled = false;

    if (this.buffer.length > 0) {
      const chunk = this.buffer;
      this.buffer = "";
      this.onFlush(chunk);
    }
  }

  public clear() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.isScheduled = false;
    this.buffer = "";
  }
}
