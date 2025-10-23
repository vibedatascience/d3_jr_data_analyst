import { SHARED_BASE_PROMPT } from './shared.js';
import { EDA_MODE_PROMPT } from './eda.js';
import { DASHBOARD_MODE_PROMPT } from './dashboard.js';
import { STORY_MODE_PROMPT } from './story.js';

/**
 * Get the complete system prompt based on the selected mode
 * @param {string} mode - The mode to use ('explore', 'dashboard', or 'story')
 * @returns {string} The complete system prompt
 */
export function getSystemPrompt(mode = 'explore') {
  const modePrompts = {
    explore: EDA_MODE_PROMPT,
    dashboard: DASHBOARD_MODE_PROMPT,
    story: STORY_MODE_PROMPT
  };

  const modePrompt = modePrompts[mode] || EDA_MODE_PROMPT;
  return SHARED_BASE_PROMPT + '\n\n' + modePrompt;
}
