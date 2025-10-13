import { OpenAI } from 'openai';
import { appConfig } from '../config/index.js';

export const openaiClient = new OpenAI({
  apiKey: appConfig.openaiApiKey
});
