export type ModerationDecision = {
  outcome: "AUTO_APPROVE" | "HUMAN_REVIEW";
  reasons: string[];
};

/**
 * Lightweight, deterministic safety screening.
 * This is a first-pass rules engine, not an AI classifier and not a guarantee
 * that content is safe. Keep normal submissions flowing; escalate clear risk signals.
 */
const HIGH_RISK_PATTERNS: Array<{ reason: string; pattern: RegExp }> = [
  { reason: "Possible fraud, scam or guaranteed-return claim", pattern: /\b(scam|utapeli|pyramid scheme|ponzi|double your money|guaranteed profit|guaranteed returns|get rich quick|investment returns guaranteed)\b/i },
  { reason: "Possible payment coercion or advance-fee request", pattern: /\b(send money now|pay first|lipa kwanza|tuma pesa kwanza|registration fee to claim|pay to unlock|otp|one[- ]time password|share your password)\b/i },
  { reason: "Possible threat or encouragement of violence", pattern: /\b(i will kill|nitakuua|kill them|murder|bomb threat|bomu|terrorist attack)\b/i },
  { reason: "Possible sale or promotion of illegal drugs or weapons", pattern: /\b(sell drugs|buy cocaine|heroin for sale|silaha haramu|illegal firearms)\b/i },
  { reason: "Possible sexual exploitation or non-consensual intimate content", pattern: /\b(sexual exploitation|revenge porn|leaked nudes|underage sex)\b/i },
  { reason: "Suspicious shortened link requiring verification", pattern: /https?:\/\/(?:bit\.ly|tinyurl\.com|t\.co|cutt\.ly|rb\.gy)\//i },
];

export function assessSubmissionRisk(parts: Array<string | null | undefined>): ModerationDecision {
  const text = parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const reasons = HIGH_RISK_PATTERNS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ reason }) => reason);

  return {
    outcome: reasons.length ? "HUMAN_REVIEW" : "AUTO_APPROVE",
    reasons: [...new Set(reasons)],
  };
}
