export class BudgetExceededError extends Error {
  constructor(
    public readonly cap: 'tokens' | 'cost' | 'time' | 'toolCalls',
    message: string
  ) {
    super(message);
    this.name = 'BudgetExceededError';
  }
}

export interface BudgetConfig {
  maxTokens: number;
  maxUSD: number;
  maxSeconds: number;
  maxToolCalls: number;
}

export class BudgetTracker {
  private tokensUsed = 0;
  private costUsd = 0;
  private toolCallsUsed = 0;
  private startTime: number;
  private _isPartial = false;

  constructor(private readonly config: BudgetConfig) {
    this.startTime = Date.now();
  }

  addTokens(n: number): void {
    this.tokensUsed += n;
    try {
      this.checkTokens();
    } catch (e) {
      this._isPartial = true;
      throw e;
    }
  }

  addCost(usd: number): void {
    this.costUsd += usd;
    try {
      this.checkCost();
    } catch (e) {
      this._isPartial = true;
      throw e;
    }
  }

  addToolCall(): void {
    this.toolCallsUsed += 1;
    try {
      this.checkToolCalls();
    } catch (e) {
      this._isPartial = true;
      throw e;
    }
  }

  checkTime(): void {
    const elapsed = (Date.now() - this.startTime) / 1000;
    if (elapsed > this.config.maxSeconds) {
      this._isPartial = true;
      throw new BudgetExceededError('time', `Time budget exceeded: ${elapsed.toFixed(1)}s > ${this.config.maxSeconds}s`);
    }
  }

  check(): void {
    this.checkTokens();
    this.checkCost();
    this.checkToolCalls();
    this.checkTime();
  }

  private checkTokens(): void {
    if (this.tokensUsed > this.config.maxTokens) {
      throw new BudgetExceededError('tokens', `Token budget exceeded: ${this.tokensUsed} > ${this.config.maxTokens}`);
    }
  }

  private checkCost(): void {
    if (this.costUsd > this.config.maxUSD) {
      throw new BudgetExceededError('cost', `Cost budget exceeded: $${this.costUsd.toFixed(4)} > $${this.config.maxUSD}`);
    }
  }

  private checkToolCalls(): void {
    if (this.toolCallsUsed > this.config.maxToolCalls) {
      throw new BudgetExceededError('toolCalls', `Tool call budget exceeded: ${this.toolCallsUsed} > ${this.config.maxToolCalls}`);
    }
  }

  isPartial(): boolean {
    return this._isPartial;
  }

  getSummary(): { tokens: number; costUsd: number; toolCalls: number; elapsedSeconds: number } {
    return {
      tokens: this.tokensUsed,
      costUsd: this.costUsd,
      toolCalls: this.toolCallsUsed,
      elapsedSeconds: (Date.now() - this.startTime) / 1000,
    };
  }
}
