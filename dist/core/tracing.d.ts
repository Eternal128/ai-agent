import { Span } from '@opentelemetry/api';
export declare function initTracing(): void;
export declare function shutdownTracing(): Promise<void>;
export declare function startSpan(name: string, attributes?: Record<string, string | number | boolean>): Span;
export declare function endSpan(span: Span, attributes?: Record<string, string | number | boolean>): void;
export declare function endSpanWithError(span: Span, error: Error): void;
//# sourceMappingURL=tracing.d.ts.map