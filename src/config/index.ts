import { config as loadEnv } from 'dotenv';

loadEnv();

export type AppConfig = {
  openaiApiKey: string;
  openaiModel: string;
  tvdbApiKey: string;
  tvdbPin: string;
  tvdbBaseUrl: string;
};

const requiredEnvVars = {
  tvdbApiKey: 'TVDB_API_KEY',
  tvdbPin: 'TVDB_PIN'
} as const;

function readEnvVariable(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function buildConfig(): AppConfig {
  return {
    openaiApiKey: readEnvVariable('OPENAI_API_KEY'),
    openaiModel: process.env.OPENAI_MODEL?.trim() ?? 'gpt-4o-mini-2024-07-18',
    tvdbApiKey: readEnvVariable(requiredEnvVars.tvdbApiKey),
    tvdbPin: readEnvVariable(requiredEnvVars.tvdbPin),
    tvdbBaseUrl: process.env.TVDB_BASE_URL?.trim() ?? 'https://api4.thetvdb.com/v4'
  };
}

export const appConfig = buildConfig();
