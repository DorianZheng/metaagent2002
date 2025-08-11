# Deployment Guide

## Railway Deployment (Recommended)

### Quick Deploy
1. **Push your code to GitHub** (if not already done):
   ```bash
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy to Railway**:
   - Visit [railway.app](https://railway.app)
   - Click "Start a New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will automatically detect the configuration from `railway.toml`

3. **Set Environment Variables**:
   In Railway dashboard, go to your project → Variables → Add:
   ```
   PORT=3000
   OPENAI_API_KEY=your-openai-key-here
   ANTHROPIC_API_KEY=your-anthropic-key-here
   GOOGLE_GENERATIVE_AI_API_KEY=your-google-key-here
   ```
   (Add at least one AI provider API key)

4. **Your app will be live at**: `https://your-project-name.up.railway.app`

### Alternative: One-Click Deploy
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/metaagent2002)

## Manual Deployment Steps

### 1. Build the Application
```bash
npm run build:prod
```

### 2. Start Production Server
```bash
npm run start:prod
```

## Environment Variables Required

Copy `.env.example` to `.env` and configure:

- `PORT` - Server port (default: 3000)
- `OPENAI_API_KEY` - OpenAI API key (optional)
- `ANTHROPIC_API_KEY` - Anthropic/Claude API key (optional)  
- `GOOGLE_GENERATIVE_AI_API_KEY` - Google AI API key (optional)

At least one AI provider API key is required for full functionality.

## Other Deployment Options

### Render
1. Connect GitHub repo to Render
2. Use build command: `npm run build:prod`
3. Use start command: `node server.js`
4. Set environment variables in Render dashboard

### Heroku
1. Create Heroku app: `heroku create your-app-name`
2. Set environment variables: `heroku config:set OPENAI_API_KEY=your-key`
3. Deploy: `git push heroku main`

### DigitalOcean App Platform
1. Create new app from GitHub
2. Set build command: `npm run build:prod`
3. Set run command: `node server.js`
4. Configure environment variables

### Vercel (Frontend only)
For frontend-only deployment without backend features:
```bash
npx vercel --prod
```

## Troubleshooting

- **Build fails**: Check TypeScript errors with `npm run build`
- **Server doesn't start**: Verify environment variables are set
- **API errors**: Ensure at least one AI provider API key is configured
- **CORS errors**: The server is configured for common deployment platforms

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **AI Integration**: Multiple providers (OpenAI, Anthropic, Google, etc.)
- **Production**: Single server serves both frontend and API