import type { Preferences } from './preferences.schemas';

/** The user's AI settings as plain instructions for the model. Empty when everything is on default. */
export function aiPreferenceRules(
  ai: Preferences['ai'],
  options: { translation?: boolean } = {},
): string {
  const rules: string[] = [];

  if (!options.translation) {
    if (ai.language !== 'auto')
      rules.push(`- Write the answer in ${ai.language}.`);
    if (ai.length === 'short')
      rules.push('- Keep the answer short and to the point.');
    if (ai.length === 'detailed')
      rules.push('- Give a detailed, thorough answer.');
    if (ai.style === 'simple')
      rules.push('- Explain in simple, plain language.');
    if (ai.style === 'detailed') rules.push('- Explain in depth.');
    if (ai.style === 'technical')
      rules.push('- Use precise, technical language.');
    if (ai.format === 'bullets')
      rules.push(
        '- Prefer bullet points over long paragraphs where it makes sense.',
      );
  }
  if (ai.tone === 'formal') rules.push('- Use a formal tone.');
  if (ai.tone === 'friendly')
    rules.push('- Use a friendly, conversational tone.');

  return rules.join('\n');
}

export const PREFERENCE_HEADER =
  'User preferences (follow them unless the user clearly asks for something else):';
