# TVDB Chatbot

Conversational CLI assistant that searches TheTVDB for series or movies, steered by an OpenAI planner/presenter pipeline. This guide covers the steps required to install, configure, and run the tool locally.

## Prerequisites

- Node.js 20+
- npm 10+
- TVDB API key & PIN
- OpenAI API key (or compatible Responses API provider)

## Setup

```bash
npm install
cp .env.example .env
# edit .env to fill TVDB_* and OPENAI_API_KEY
```

Environment variables read at runtime:

| Variable | Description |
| --- | --- |
| `OPENAI_API_KEY` | Key for the OpenAI Responses API |
| `TVDB_API_KEY` | TheTVDB v4 API key |
| `TVDB_PIN` | TheTVDB v4 user PIN |
| `TVDB_BASE_URL` *(optional)* | Override base URL (defaults to official API) |

## Usage

```bash
npm run start
```

The CLI prints `TVDB Chatbot ready. Type "exit" to quit.` Enter natural-language queries (e.g. `fantasy series like the witcher`) and follow the prompts. Set `DEBUG_TVDB_RESULTS=1` in the environment to echo raw TVDB matches for debugging.

## Development Tasks

- `npm run build` – Type-check with TypeScript (`tsc --noEmit`).
- `npm run start` – Launch interactive chatbot via `ts-node`.
