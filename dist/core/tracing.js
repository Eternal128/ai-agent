"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTracing = initTracing;
exports.shutdownTracing = shutdownTracing;
exports.startSpan = startSpan;
exports.endSpan = endSpan;
exports.endSpanWithError = endSpanWithError;
const api_1 = require("@opentelemetry/api");
const sdk_node_1 = require("@opentelemetry/sdk-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let sdk = null;
function initTracing() {
    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    const serviceName = process.env.OTEL_SERVICE_NAME || 'research-agent';
    if (otlpEndpoint) {
        const exporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({ url: otlpEndpoint });
        sdk = new sdk_node_1.NodeSDK({
            serviceName,
            spanProcessor: new sdk_trace_node_1.SimpleSpanProcessor(exporter),
        });
        sdk.start();
    }
}
function shutdownTracing() {
    if (sdk) {
        return sdk.shutdown();
    }
    return Promise.resolve();
}
function startSpan(name, attributes) {
    const tracer = api_1.trace.getTracer('research-agent');
    const span = tracer.startSpan(name);
    if (attributes) {
        span.setAttributes(attributes);
    }
    return span;
}
function endSpan(span, attributes) {
    if (attributes) {
        span.setAttributes(attributes);
    }
    span.setStatus({ code: api_1.SpanStatusCode.OK });
    span.end();
}
function endSpanWithError(span, error) {
    span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: error.message });
    span.recordException(error);
    span.end();
}
//# sourceMappingURL=tracing.js.map