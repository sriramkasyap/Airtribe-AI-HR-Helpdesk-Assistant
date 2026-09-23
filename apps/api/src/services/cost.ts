export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
}

/** Course-starter rates (USD per 1M tokens). Override with env for live OpenRouter prices. */
export const DEFAULT_INPUT_USD_PER_MILLION = 0.002;
export const DEFAULT_OUTPUT_USD_PER_MILLION = 0.004;

export function emptyUsage(): TokenUsage {
  return { promptTokens: 0, completionTokens: 0 };
}

export function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    completionTokens: a.completionTokens + b.completionTokens,
  };
}

export function parseUsage(raw: unknown): TokenUsage {
  if (!raw || typeof raw !== 'object') return emptyUsage();
  const usage = raw as { prompt_tokens?: number; completion_tokens?: number };
  return {
    promptTokens: Number(usage.prompt_tokens) || 0,
    completionTokens: Number(usage.completion_tokens) || 0,
  };
}

export function getRates(): { inputUsdPerMillion: number; outputUsdPerMillion: number } {
  return {
    inputUsdPerMillion: Number(process.env.OPENROUTER_INPUT_USD_PER_MILLION ?? DEFAULT_INPUT_USD_PER_MILLION),
    outputUsdPerMillion: Number(process.env.OPENROUTER_OUTPUT_USD_PER_MILLION ?? DEFAULT_OUTPUT_USD_PER_MILLION),
  };
}

export function calculateCost(usage: TokenUsage): { usd: number; formula: string } {
  const { inputUsdPerMillion, outputUsdPerMillion } = getRates();
  const usd =
    (usage.promptTokens * inputUsdPerMillion + usage.completionTokens * outputUsdPerMillion) / 1_000_000;
  const formula =
    `(${usage.promptTokens} × $${inputUsdPerMillion}/1M + ${usage.completionTokens} × $${outputUsdPerMillion}/1M) / 1e6 = $${usd.toFixed(8)}`;
  return { usd, formula };
}
