import { trace, Span, SpanStatusCode } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import dotenv from 'dotenv';

dotenv.config();

let sdk: NodeSDK | null = null;

export function initTracing(): void {
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const serviceName = process.env.OTEL_SERVICE_NAME || 'research-agent';

  if (otlpEndpoint) {
    const exporter = new OTLPTraceExporter({ url: otlpEndpoint });
    sdk = new NodeSDK({
      serviceName,
      spanProcessor: new SimpleSpanProcessor(exporter),
    });
    sdk.start();
  }
}

export function shutdownTracing(): Promise<void> {
  if (sdk) {
    return sdk.shutdown();
  }
  return Promise.resolve();
}

export function startSpan(name: string, attributes?: Record<string, string | number | boolean>): Span {
  const tracer = trace.getTracer('research-agent');
  const span = tracer.startSpan(name);
  if (attributes) {
    span.setAttributes(attributes);
  }
  return span;
}

export function endSpan(span: Span, attributes?: Record<string, string | number | boolean>): void {
  if (attributes) {
    span.setAttributes(attributes);
  }
  span.setStatus({ code: SpanStatusCode.OK });
  span.end();
}

export function endSpanWithError(span: Span, error: Error): void {
  span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  span.recordException(error);
  span.end();
}
