import axios, { AxiosError, type AxiosInstance } from 'axios';
import { appConfig } from '../config/index.js';

type AuthToken = {
  token: string;
  expiresAt: number;
};

type TvdbLoginResponse = {
  data: {
    token: string;
    expires?: string;
  };
};

const tokenTtlMs = 1000 * 60 * 55; // refresh slightly before the default one-hour expiry.
let cachedToken: AuthToken | null = null;

const tvdbHttpClient: AxiosInstance = axios.create({
  baseURL: appConfig.tvdbBaseUrl,
  timeout: 10000
});

export async function withTvdbClient<T>(
  operation: (client: AxiosInstance, token: string) => Promise<T>
): Promise<T> {
  let token = await resolveToken();

  try {
    return await operation(tvdbHttpClient, token);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      cachedToken = null;
      token = await resolveToken();
      return operation(tvdbHttpClient, token);
    }
    throw error;
  }
}

function isUnauthorizedError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

async function resolveToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const response = await tvdbHttpClient.post<TvdbLoginResponse>('/login', {
    apikey: appConfig.tvdbApiKey,
    pin: appConfig.tvdbPin
  });

  const token = response.data?.data?.token;
  if (!token) {
    throw new Error('Unable to retrieve TVDB token.');
  }

  const expiresAt = computeExpiryTimestamp(response.data.data.expires);
  cachedToken = { token, expiresAt };
  return token;
}

function computeExpiryTimestamp(expires?: string): number {
  if (expires) {
    const parsed = Date.parse(expires);
    if (!Number.isNaN(parsed)) {
      return parsed - 60_000;
    }
  }
  return Date.now() + tokenTtlMs;
}
