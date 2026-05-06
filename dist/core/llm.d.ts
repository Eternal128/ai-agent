import { LLMMessage, LLMResponse } from './types';
export declare const STRONG_MODEL: string;
export declare const CHEAP_MODEL: string;
export interface CallLLMOptions {
    model: string;
    messages: LLMMessage[];
    temperature?: number;
    seed?: number;
    maxTokens?: number;
    stream?: boolean;
}
export declare function callLLM(options: CallLLMOptions): Promise<LLMResponse>;
export declare function createEmbedding(text: string): Promise<number[]>;
//# sourceMappingURL=llm.d.ts.map