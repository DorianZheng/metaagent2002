# AI Code Generator App

A two-column web application that uses LLM to generate and deploy code in real-time based on user text input.

## Features

- **Left Column**: Chat interface for user input and conversation history
- **Right Column**: Live preview of generated and deployed apps
- **Multi-LLM Support**: Works with OpenAI, Anthropic, Google AI, Ollama, and custom APIs
- **Fallback Templates**: Works with built-in templates when API is not configured
- **Real-time**: Instant generation and deployment in the preview pane

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure LLM Provider (optional but recommended):**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your preferred LLM provider's API key:
   ```
   # Choose one or more providers (using standard AI SDK variable names)
   OPENAI_API_KEY=sk-your-openai-key-here
   ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
   GOOGLE_GENERATIVE_AI_API_KEY=your-google-ai-key-here
   ```

3. **Start both servers:**
   ```bash
   npm start
   ```
   This starts both the proxy server (port 3001) and frontend (port 5173/5174)

   **Alternative - Start servers separately:**
   ```bash
   # Terminal 1: Start proxy server
   npm run server
   
   # Terminal 2: Start frontend
   npm run dev
   ```

4. **Open browser:**
   Navigate to the URL shown in the terminal (usually `http://localhost:5173/` or `http://localhost:5174/`)

## Usage

### With LLM Provider Configured:
- Click the settings ⚙️ button to select your preferred provider
- Type any app description in the chat
- AI will generate custom HTML/CSS/JavaScript code
- See your app instantly in the right column

Examples:
- "Build a memory card matching game"
- "Create a weather dashboard"
- "Make a drawing app with canvas"
- "Build an expense tracker"

### Without LLM Provider:
- Uses built-in templates for common apps
- Works for: todo lists, calculators, timers
- Click settings to configure your preferred AI provider

### ⚠️ Important Notes:
- **Two servers required**: The app needs both a proxy server (for API calls) and frontend
- **Use `npm start`** to run both servers automatically
- **Frontend only** (`npm run dev`) will work but LLM APIs will fail due to CORS

## Supported LLM Providers

### 🤖 OpenAI
- **Models**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Setup**: Get API key from [platform.openai.com](https://platform.openai.com)

### 🧠 Anthropic
- **Models**: Claude 3 Opus, Sonnet, Haiku  
- **Setup**: Get API key from [console.anthropic.com](https://console.anthropic.com)

### 🔍 Google AI
- **Models**: Gemini Pro, Gemini Pro Vision
- **Setup**: Get API key from [Google AI Studio](https://makersuite.google.com)

### 🏠 Ollama (Local)
- **Models**: Llama 2, Code Llama, Mistral, StarCoder
- **Setup**: Install from [ollama.ai](https://ollama.ai), then `ollama pull llama2`

### 🔧 Custom OpenAI-Compatible
- **Any provider** that supports OpenAI's API format
- **Examples**: LocalAI, FastChat, vLLM, etc.

## How It Works

1. **User Input**: User describes desired app in chat
2. **AI Generation**: LLM generates complete HTML/CSS/JS code
3. **Live Deployment**: Code is immediately rendered in iframe
4. **Interactive Preview**: User can interact with generated app

## Built With

- React + TypeScript
- Vite  
- Multi-LLM Integration (OpenAI, Anthropic, Google AI, Ollama)
- Lucide Icons

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```
