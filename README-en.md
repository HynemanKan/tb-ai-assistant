# TB AI Assistant

Thunderbird email client AI assistant extension. Automatically analyze received emails and process them using AI.

## Features

- **Email Tagging** - Automatically analyze email content and add appropriate tags
- **Calendar Events** - Extract meeting/appointment info from emails and create calendar events
- **Task Management** - Identify to-do items in emails and create tasks
- **Sender Filtering** - Configure filter rules to skip emails from specific senders
- **Chat History** - Save AI processing conversation history

## Supported LLMs

- OpenAI
- Ollama (local deployment)

## Installation

1. Download the latest `.xpi` file
2. Open Thunderbird → Add-ons and Themes
3. Click the gear icon → Install Add-on From File
4. Select the downloaded `.xpi` file

## Configuration

After installation, go to the extension's settings page to configure:

- LLM provider type (OpenAI/Ollama)
- API endpoint URL
- API key
- Model name
- System prompt
- Enabled tool groups (Email Tags/Calendar Events/Task Management)
- Sender filter rules
- Calendar ID and Task List ID

## Development

### Requirements

- Node.js v20+
- pnpm

### Install Dependencies

```sh
pnpm install
```

### Development Build

```sh
# Watch for file changes and auto rebuild
pnpm run watch
```

### Production Build

```sh
pnpm run build
```

### Package

```sh
pnpm run package
```

## Loading Extension for Debugging

1. Run `pnpm run build`
2. Open Thunderbird → Tools → Developer → Debug Add-ons
3. Click "Load Temporary Add-on"
4. Select `dist/manifest.json`

## Tech Stack

- [Vue 3](https://vuejs.org/)
- [Vite](https://vite.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [LangChain](https://github.com/langchain-ai/langchainjs)
- [Thunderbird WebExtension APIs](https://thunderbird.net/en/developers/)

## License

MIT
