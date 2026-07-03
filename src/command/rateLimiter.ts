export class RateLimiter {
  private readonly windowCounts = new Map<string, number>();

  constructor(private readonly limitPerWindow: number = 10) {}

  allow(key: string): boolean {
    const currentCount = this.windowCounts.get(key) ?? 0;
    if (currentCount >= this.limitPerWindow) {
      return false;
    }

    this.windowCounts.set(key, currentCount + 1);
    return true;
  }

  reset(key: string): void {
    this.windowCounts.delete(key);
  }
}
