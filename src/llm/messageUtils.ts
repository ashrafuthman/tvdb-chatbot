import type { BaseMessage } from '@langchain/core/messages';

/**
 * Extract plain text content from a LangChain message response, regardless of
 * whether the content is a string or structured message parts.
 */
export function extractMessageText(message: BaseMessage | { content?: unknown } | null | undefined): string {
  if (!message || typeof message !== 'object') {
    return '';
  }

  const content = 'content' in message ? (message as { content?: unknown }).content : undefined;
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }
        if (part && typeof part === 'object' && 'text' in part && typeof (part as { text?: unknown }).text === 'string') {
          return (part as { text: string }).text;
        }
        return '';
      })
      .join('');
  }

  return '';
}
