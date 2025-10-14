import { ChatOpenAI } from '@langchain/openai';
import { appConfig } from '../config/index.js';

type ChatModelOptions = {
  temperature?: number;
  maxTokens?: number;
};

function createChatModel(options: ChatModelOptions = {}): ChatOpenAI {
  const { temperature = 0.2, maxTokens } = options;

  return new ChatOpenAI({
    openAIApiKey: appConfig.openaiApiKey,
    modelName: appConfig.openaiModel,
    temperature,
    maxTokens
  });
}

export const plannerModel = createChatModel({ temperature: 0.2, maxTokens: 512 });
export const presenterModel = createChatModel({ temperature: 0.2, maxTokens: 400 });
