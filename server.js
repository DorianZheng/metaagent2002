import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { generateText } from 'ai';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

dotenv.config();

const app = express();
const PORT = process.env.PORT;
const execAsync = promisify(exec);

// AI workspace directory
const AI_WORKSPACE = path.join(process.cwd(), 'ai-workspace');

// In-memory conversation storage (keyed by session ID)
const conversations = new Map();

// Server configuration with file persistence
const CONFIG_FILE = './server-config.json';
let serverConfig = {
  currentProvider: null,
  currentModel: null
};

// Server management for AI projects
const runningServers = new Map(); // projectId -> { process, port, url, status }
const PORT_RANGE_START = 24000;
const PORT_RANGE_END = 24999;
let nextAvailablePort = PORT_RANGE_START;

// Load config from file if it exists
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
    serverConfig = { ...serverConfig, ...JSON.parse(configData) };
    console.log('📄 Loaded server config:', serverConfig);
  }
} catch (error) {
  console.log('📄 No existing config file, using defaults');
}

const SYSTEM_PROMPT = `You are an AI developer who builds working web applications iteratively.

Return ONE command at a time in this JSON format:
{
  "nextCommand": {
    "type": "file|server|message",
    "path": "file path",
    "content": "file content", 
    "cmd": "server command",
    "message": "user message"
  },
  "reasoning": "Why you chose this command",
  "expectation": "What you expect to happen",
  "continueAfter": true,
  "isComplete": false
}

COMMANDS:
- "file": Create/write files (HTML, CSS, JS, etc.)
- "server": Test your code (use "npx serve ." for HTML, "npm run dev" for frameworks)
- "message": Communicate with user (start: explain what you're building, end: success message)

WORKFLOW:
1. Create files → 2. Test with server → 3. Fix issues → 4. Repeat until working

RULES:
- ALWAYS test your code with a server command after creating files
- Fix any errors until the server starts successfully  
- Don't specify ports in server commands (system auto-assigns)
- Set "isComplete": true only when the app works and server is running
- Start with a message explaining what you're building
- End with a success message containing the working URL

Build creative, functional applications!`;

// Save config to file
function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(serverConfig, null, 2));
    console.log('💾 Saved server config:', serverConfig);
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

// Initialize AI workspace
function initializeWorkspace() {
  if (!fs.existsSync(AI_WORKSPACE)) {
    fs.mkdirSync(AI_WORKSPACE, { recursive: true });
    console.log(`📁 Created AI workspace: ${AI_WORKSPACE}`);
  }
}

// Find next available port
function getNextAvailablePort() {
  while (nextAvailablePort <= PORT_RANGE_END) {
    const port = nextAvailablePort++;
    // Check if port is already in use
    const inUse = Array.from(runningServers.values()).some(server => server.port === port);
    if (!inUse) {
      return port;
    }
  }
  throw new Error('No available ports in range 4000-4999');
}

// Start a development server for a project
async function startProjectServer(projectId, command, port = null) {
  const projectDir = path.join(AI_WORKSPACE, projectId);
  
  if (!fs.existsSync(projectDir)) {
    throw new Error(`Project directory not found: ${projectId}`);
  }
  
  // Stop existing server if running
  if (runningServers.has(projectId)) {
    await stopProjectServer(projectId);
  }
  
  const serverPort = port || getNextAvailablePort();
  
  console.log(`🚀 Starting development server for ${projectId} on port ${serverPort}`);
  console.log(`💻 Command: ${command}`);
  
  return new Promise((resolve, reject) => {
    // Modify command to prevent browser opening and use correct port
    let modifiedCommand = command;
    
    // Replace port in command if different from serverPort
    if (port && command.includes('-p ')) {
      modifiedCommand = command.replace(/-p\s+\d+/, `-p ${serverPort}`);
    } else if (port && command.includes('--port')) {
      modifiedCommand = command.replace(/--port[=\s]+\d+/, `--port ${serverPort}`);
    } else if (command.includes('npx serve') && !command.includes('-p') && !command.includes('--port')) {
      // Add port flag for npx serve if not specified
      modifiedCommand = command + ` -p ${serverPort}`;
    }
    
    // For Vite - add --open false flag to prevent browser opening
    if (command.includes('vite') || command.includes('npm run dev')) {
      if (!modifiedCommand.includes('--open')) {
        modifiedCommand = modifiedCommand + ' --open false';
      }
    }
    
    // For React dev server - set BROWSER=none to prevent opening
    const serverProcess = exec(modifiedCommand, {
      cwd: projectDir,
      env: { 
        ...process.env, 
        PORT: serverPort,
        BROWSER: 'none',  // Prevent React dev server from opening browser
        OPEN: 'false'     // Generic flag to prevent browser opening
      }
    });
    
    let serverStarted = false;
    let startupOutput = '';
    
    const timeout = setTimeout(() => {
      if (!serverStarted) {
        serverProcess.kill();
        reject(new Error(`Server startup timeout after 30s. Output: ${startupOutput}`));
      }
    }, 30000);
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      startupOutput += output;
      console.log(`📤 [${projectId}] ${output.trim()}`);
      
      // Check for common server startup indicators
      if (output.includes(`${serverPort}`) || 
          output.includes('Local:') || 
          output.includes('localhost') ||
          output.includes('Server running') ||
          output.includes('Development server')) {
        
        if (!serverStarted) {
          serverStarted = true;
          clearTimeout(timeout);
          
          const serverInfo = {
            process: serverProcess,
            port: serverPort,
            url: `http://localhost:${serverPort}`,
            status: 'running',
            command: command,
            startTime: new Date(),
            projectId: projectId
          };
          
          runningServers.set(projectId, serverInfo);
          const displayUrl = serverInfo?.url || `http://localhost:${serverInfo?.port || '3000'}`;
          console.log(`✅ Server started for ${projectId}: ${displayUrl}`);
          resolve(serverInfo);
        }
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      startupOutput += output;
      console.log(`⚠️ [${projectId}] ${output.trim()}`);
    });
    
    serverProcess.on('error', (error) => {
      clearTimeout(timeout);
      console.log(`❌ Server error for ${projectId}: ${error.message}`);
      runningServers.delete(projectId);
      reject(error);
    });
    
    serverProcess.on('exit', (code) => {
      console.log(`🔴 Server exited for ${projectId} with code ${code}`);
      runningServers.delete(projectId);
      if (!serverStarted) {
        clearTimeout(timeout);
        reject(new Error(`Server exited with code ${code}. Output: ${startupOutput}`));
      }
    });
  });
}

// Stop a development server
async function stopProjectServer(projectId) {
  const serverInfo = runningServers.get(projectId);
  if (!serverInfo) {
    return false;
  }
  
  console.log(`🔴 Stopping server for ${projectId}`);
  
  return new Promise((resolve) => {
    serverInfo.process.kill('SIGTERM');
    
    // Force kill after 5 seconds if not stopped
    const forceKillTimeout = setTimeout(() => {
      if (runningServers.has(projectId)) {
        console.log(`💀 Force killing server for ${projectId}`);
        serverInfo.process.kill('SIGKILL');
        runningServers.delete(projectId);
      }
      resolve(true);
    }, 5000);
    
    serverInfo.process.on('exit', () => {
      clearTimeout(forceKillTimeout);
      runningServers.delete(projectId);
      console.log(`✅ Server stopped for ${projectId}`);
      resolve(true);
    });
  });
}

// Execute command in AI workspace
async function executeCommand(command, projectId = 'default') {
  const projectDir = path.join(AI_WORKSPACE, projectId);
  
  // Ensure project directory exists
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }
  
  try {
    console.log(`💻 Executing: ${command} in ${projectDir}`);
    const { stdout, stderr } = await execAsync(command, { 
      cwd: projectDir,
      timeout: 30000, // 30 second timeout
      maxBuffer: 1024 * 1024 // 1MB buffer
    });
    
    const result = {
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      command,
      directory: projectDir
    };
    
    console.log(`✅ Command completed: ${command}`);
    if (stdout) console.log(`📤 stdout: ${stdout.trim()}`);
    if (stderr) console.log(`⚠️ stderr: ${stderr.trim()}`);
    
    return result;
  } catch (error) {
    console.log(`❌ Command failed: ${command}`);
    console.log(`💥 Error: ${error.message}`);
    
    return {
      success: false,
      error: error.message,
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || '',
      command,
      directory: projectDir
    };
  }
}

// Get project files for preview
function getProjectFiles(projectId = 'default') {
  const projectDir = path.join(AI_WORKSPACE, projectId);
  
  if (!fs.existsSync(projectDir)) {
    return { files: [], error: 'Project not found' };
  }
  
  try {
    const files = [];
    
    function scanDirectory(dir, relativePath = '') {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const itemRelativePath = path.join(relativePath, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          // Skip common directories that shouldn't be served
          if (!['node_modules', '.git', 'dist', 'build', '__pycache__'].includes(item)) {
            scanDirectory(fullPath, itemRelativePath);
          }
        } else {
          // Only include common web files
          const ext = path.extname(item).toLowerCase();
          if (['.html', '.css', '.js', '.json', '.md', '.txt', '.py', '.ts', '.jsx', '.tsx'].includes(ext)) {
            try {
              // Ensure the file path is within the project directory to prevent path traversal
              const resolvedPath = path.resolve(fullPath);
              const projectDirResolved = path.resolve(projectDir);
              if (!resolvedPath.startsWith(projectDirResolved)) {
                continue; // Skip files outside project directory
              }
              const content = fs.readFileSync(fullPath, 'utf8');
              files.push({
                path: itemRelativePath,
                name: item,
                content: content,
                size: stats.size
              });
            } catch (err) {
              // Skip files that can't be read
            }
          }
        }
      }
    }
    
    scanDirectory(projectDir);
    return { files, projectDir };
  } catch (error) {
    return { files: [], error: error.message };
  }
}

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
}));
app.use(express.json());

// LLM Provider configurations
const LLM_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT models from OpenAI',
    apiKeyEnv: 'OPENAI_API_KEY',
    baseUrlEnv: 'OPENAI_BASE_URL',
    defaultBaseUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
    models: [
      { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model', maxTokens: 8192 },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Faster GPT-4', maxTokens: 128000 },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and efficient', maxTokens: 16385 }
    ],
    defaultModel: 'gpt-3.5-turbo'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models from Anthropic',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    baseUrlEnv: 'ANTHROPIC_BASE_URL',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    requiresApiKey: true,
    models: [
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most powerful model', maxTokens: 200000 },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance', maxTokens: 200000 },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fast and efficient', maxTokens: 200000 }
    ],
    defaultModel: 'claude-3-sonnet-20240229'
  },
  {
    id: 'google',
    name: 'Google AI',
    description: 'Gemini models from Google',
    apiKeyEnv: 'GOOGLE_GENERATIVE_AI_API_KEY',
    baseUrlEnv: 'GOOGLE_BASE_URL',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    requiresApiKey: true,
    models: [
      { id: 'gemini-pro', name: 'Gemini Pro', description: 'Google\'s flagship model', maxTokens: 32768 },
      { id: 'gemini-pro-vision', name: 'Gemini Pro Vision', description: 'Multimodal model', maxTokens: 16384 }
    ],
    defaultModel: 'gemini-pro'
  },
  {
    id: 'kimi',
    name: 'Kimi',
    description: 'Kimi AI models from Moonshot AI',
    apiKeyEnv: 'KIMI_API_KEY',
    baseUrlEnv: 'KIMI_BASE_URL',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    requiresApiKey: true,
    models: [
      { id: 'moonshot-v1-8k', name: 'Moonshot v1 8K', description: 'Kimi model with 8K context', maxTokens: 8000 },
      { id: 'moonshot-v1-32k', name: 'Moonshot v1 32K', description: 'Kimi model with 32K context', maxTokens: 32000 },
      { id: 'moonshot-v1-128k', name: 'Moonshot v1 128K', description: 'Kimi model with 128K context', maxTokens: 128000 },
      { id: 'kimi-k2-0711-preview', name: 'Kimi K2 Preview', description: 'Latest Kimi K2 preview model', maxTokens: 200000 }
    ],
    defaultModel: 'moonshot-v1-8k'
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    description: 'Local models via Ollama',
    apiKeyEnv: null,
    baseUrlEnv: 'OLLAMA_BASE_URL',
    defaultBaseUrl: 'http://localhost:11434',
    requiresApiKey: false,
    models: [
      { id: 'llama2', name: 'Llama 2', description: 'Meta\'s Llama 2 model' },
      { id: 'codellama', name: 'Code Llama', description: 'Code-specialized Llama' },
      { id: 'mistral', name: 'Mistral', description: 'Mistral 7B model' }
    ],
    defaultModel: 'llama2'
  }
];

// Get available providers with configuration status
async function getAvailableProviders() {
  return LLM_PROVIDERS.map(provider => {
    const apiKey = provider.apiKeyEnv ? process.env[provider.apiKeyEnv]?.trim().replace(/^"|"$/g, '') : null;
    const baseUrl = provider.baseUrlEnv ? process.env[provider.baseUrlEnv] : provider.defaultBaseUrl;
    
    return {
      ...provider,
      configured: !provider.requiresApiKey || (apiKey && apiKey !== `your-${provider.id}-key-here`),
      hasBaseUrl: !!baseUrl,
      baseUrl
    };
  });
}

// Iterative AI-driven development function
async function generateWithIterativeAI(providerId, model, initialInput, conversationHistory, projectId, sendMessage) {
  const providerConfig = LLM_PROVIDERS.find(p => p.id === providerId);
  if (!providerConfig) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  const apiKey = providerConfig.apiKeyEnv ? process.env[providerConfig.apiKeyEnv]?.trim().replace(/^\"|\"$/g, '') : null;
  const baseUrl = (providerConfig.baseUrlEnv ? process.env[providerConfig.baseUrlEnv] : null) || providerConfig.defaultBaseUrl;

  if (providerConfig.requiresApiKey && !apiKey) {
    throw new Error(`${providerConfig.name} API key not configured`);
  }

  // Create model instance
  let modelInstance;
  switch (providerId) {
    case 'openai':
      modelInstance = openai(model, { apiKey: apiKey, baseURL: baseUrl });
      break;
    case 'anthropic':
      modelInstance = anthropic(model, { apiKey: apiKey, baseURL: baseUrl });
      break;
    case 'google':
      modelInstance = google(model, { apiKey: apiKey, baseURL: baseUrl });
      break;
    case 'kimi':
      const kimiClient = createOpenAI({ apiKey: apiKey, baseURL: baseUrl });
      modelInstance = kimiClient(model);
      break;
    case 'ollama':
      modelInstance = openai(model, { apiKey: 'not-needed', baseURL: baseUrl });
      break;
    default:
      throw new Error(`Provider ${providerId} not supported`);
  }

  let serverInfo = null;
  let input = initialInput;
  let iterationCount = 0;
  const maxIterations = 20; // Safety limit
  const results = [];
  // Build messages array for proper conversation handling
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT }
  ];
  // Add conversation history
  if (conversationHistory.length > 0) {
    messages.push(...conversationHistory);
  }
  // Add current input as user message
  if (input) {
    messages.push({ role: 'user', content: input });
  }

  console.log(`🔄 Starting iterative development with ${providerConfig.name}`);
  const preview = input.substring(0, 100) + (input.length > 100 ? `...${input.slice(-100)}` : '');
  console.log(`📝 Current input preview: ${preview}`);
  
  
  while (iterationCount < maxIterations) {
    iterationCount++;
    console.log(`\n🔄 === ITERATION ${iterationCount} ===`);

    try {
      console.log(`📨 Sending ${messages.length} messages to AI:`);
      messages.forEach((msg, i) => {
        const preview = msg.content.substring(0, 100) + (msg.content.length > 100 ? `...${msg.content.slice(-100)}` : '');
        console.log(`   ${i + 1}. ${msg.role}: ${preview}`);
      });

      // Build context prompt from conversation history
      const contextPrompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n') + '\n\nPlease respond with the next command to execute in JSON format.';
      
      // Use simple prompt to avoid AI SDK _def error
      const result = await generateText({
        model: modelInstance,
        prompt: contextPrompt,
        maxTokens: 2000,
        temperature: 0.7,
        abortSignal: AbortSignal.timeout(300000),
      });

      console.log(`🤖 AI response text: ${result.text || 'No content'}`);

      // Parse AI response and execute commands
      let aiResponse;
      try {
        // Extract JSON from response - handle cases where AI adds extra text
        let jsonText = result.text.trim();
        
        // More robust JSON extraction - find the main JSON object
        const firstBrace = jsonText.indexOf('{');
        if (firstBrace !== -1) {
          let braceCount = 0;
          let endPos = firstBrace;
          let inString = false;
          let escapeNext = false;
          
          for (let i = firstBrace; i < jsonText.length; i++) {
            const char = jsonText[i];
            
            if (escapeNext) {
              escapeNext = false;
              continue;
            }
            
            if (char === '\\') {
              escapeNext = true;
              continue;
            }
            
            if (char === '"' && !escapeNext) {
              inString = !inString;
              continue;
            }
            
            if (!inString) {
              if (char === '{') {
                braceCount++;
              } else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                  endPos = i;
                  break;
                }
              }
            }
          }
          
          if (braceCount === 0) {
            jsonText = jsonText.substring(firstBrace, endPos + 1);
          }
        }
        
        aiResponse = JSON.parse(jsonText);
        console.log(`🤖 AI reasoning: ${aiResponse.reasoning}`);
        console.log(`🎯 AI expectation: ${aiResponse.expectation}`);
      } catch (parseError) {
        console.log(`❌ Failed to parse JSON response from AI`);
        console.log(`📄 Raw response: ${result.text.substring(0, 500)}...`);
        console.log(`🔍 Attempted to parse: ${jsonText ? jsonText.substring(0, 200) + '...' : 'No JSON text extracted'}`);
        throw new Error(`AI response is not valid JSON: ${parseError.message}`);
      }

      if (!aiResponse.nextCommand) {
        throw new Error(`AI response missing nextCommand: ${JSON.stringify(aiResponse)}`);
      }

      // Store AI response in conversation history
      messages.push({
        role: 'assistant',
        content: result.text
      });

      // Send progress update to frontend
      sendMessage({
        type: 'iteration_update',
        iteration: iterationCount,
        reasoning: aiResponse.reasoning,
        expectation: aiResponse.expectation
      });

      // Execute the command
      console.log(`📋 About to execute command with projectId: ${projectId}`);
      console.log(`📋 Command to execute:`, JSON.stringify(aiResponse.nextCommand, null, 2));
      
      let executionResult;
      try {
        executionResult = await executeIterativeCommand(aiResponse.nextCommand, projectId, sendMessage);
        console.log(`✅ Command executed successfully:`, executionResult);
      } catch (cmdError) {
        console.log(`❌ Command execution error: ${cmdError.message}`);
        console.log(`📄 Command error stack: ${cmdError.stack}`);
        throw cmdError;
      }
      results.push(executionResult);
      if (executionResult.type === 'server') {
        serverInfo = executionResult.serverInfo;
      }

      // Add execution result to conversation history as user message
      const toolResultContent = formatExecutionResultForAI(executionResult, aiResponse.nextCommand);
      messages.push({
        role: 'user',
        content: `COMMAND RESULT: ${toolResultContent}`
      });


      // Check if AI says we're complete
      if (aiResponse.isComplete || !aiResponse.continueAfter) {
        console.log(`✅ AI indicates completion after ${iterationCount} iterations`);
        break;
      }
    } catch (error) {
      // Only catch and continue for command execution errors, let other errors bubble up
      if (error.message.includes('command') || error.message.includes('file') || error.message.includes('execution')) {
        console.log(`❌ Command execution failed in iteration ${iterationCount}: ${error.message}`);
        
        // Add error as user message to history
        messages.push({
          role: 'user',
          content: `COMMAND RESULT: ERROR - ${error.message}. The previous command execution failed. Please analyze the error and try a different approach.`
        });
        
        // Continue to next iteration to let AI adapt
        continue;
      } else {
        // Re-throw AI/parsing/system errors
        console.log(`❌ AI/parsing/system error in iteration ${iterationCount}: ${error.message}`);
        throw error;
      }
    }
  }

  if (iterationCount >= maxIterations) {
    console.log(`⚠️ Reached maximum iterations (${maxIterations})`);
  }

  console.log(`🎉 Iterative development completed in ${iterationCount} iterations`);
  
  return {
    results,
    messages,
    iterations: iterationCount,
    history: messages.slice(1),  // Keep all messages instead of system prompt
    serverInfo: serverInfo
  };
}

// Format execution result for AI feedback
function formatExecutionResultForAI(executionResult, command) {
  if (executionResult.type === 'command') {
    return `Command "${command.cmd}" executed. Success: ${executionResult.success}. Output: ${executionResult.output || 'No output'}`;
  } else if (executionResult.type === 'file') {
    return `File "${command.path}" created successfully.`;
  } else if (executionResult.type === 'message') {
    return `Message sent: ${command.message}`;
  }
  return `Command executed: ${JSON.stringify(executionResult)}`;
}

// Execute a single command in iterative mode
async function executeIterativeCommand(command, projectId, sendMessage) {
  const projectDir = path.join(AI_WORKSPACE, projectId);
  
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  try {
    console.log(`💻 Executing: ${command.type} - ${command.cmd || command.path || command.message}`);

    if (command.type === 'command') {
      const result = await executeCommand(command.cmd, projectId);
      
      sendMessage({
        type: 'command_executed',
        command: command.cmd,
        success: result.success,
        output: result.stdout || result.stderr || result.error
      });

      return {
        type: 'command',
        command: command.cmd,
        result: result,
        success: result.success,
        output: result.stdout || result.stderr || result.error
      };

    } else if (command.type === 'file') {
      const filePath = path.join(projectDir, command.path);
      const fileDir = path.dirname(filePath);
      
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, command.content, 'utf8');
      console.log(`📝 Created file: ${command.path}`);
      
      sendMessage({
        type: 'file_created',
        filename: command.path,
        size: command.content.length
      });

      return {
        type: 'file',
        path: command.path,
        success: true,
        message: `File created: ${command.path}`
      };

    } else if (command.type === 'message') {
      const messageData = {
        type: 'ai_message',
        content: command.message,
        timestamp: new Date().toISOString(),
        messageType: command.messageType || 'info',
        title: command.title || 'Update'
      };

      sendMessage(messageData);

      return {
        type: 'message',
        messageData: messageData,
        success: true
      };
    } else if (command.type === 'server') {
      // AI starts server for testing and verification
      try {
        // Stop existing server for this project if running
        if (runningServers.has(projectId)) {
          console.log(`🛑 Stopping existing server for project: ${projectId}`);
          await stopProjectServer(projectId);
        }
        
        const port = command.port || getNextAvailablePort();
        const host = command.host || 'localhost';
        const serverCommand = command.cmd || 'npx serve .';
        
        console.log(`🚀 AI starting server: ${serverCommand} on ${host}:${port}`);
        
        const serverInfo = await startProjectServer(projectId, serverCommand, port);
        const serverUrl = `http://${host}:${port}`;
        
        sendMessage({
          type: 'server_started',
          url: serverUrl,
          port: port,
          host: host,
          command: serverCommand
        });
        
        return {
          type: 'server',
          serverInfo: {
            url: serverUrl,
            port: port,
            host: host,
            command: serverCommand,
            process: serverInfo.process
          },
          success: true,
          message: `Server started successfully at ${serverUrl}. You can now test your application by visiting this URL.`
        };
      } catch (error) {
        console.error(`❌ Failed to start server: ${error.message}`);
        return {
          type: 'server',
          success: false,
          error: error.message,
          message: `Failed to start server: ${error.message}`
        };
      }
    }

  } catch (error) {
    console.log(`❌ Command execution failed: ${error.message}`);
    
    sendMessage({
      type: 'command_error',
      command: command,
      error: error.message
    });

    return {
      type: command.type,
      success: false,
      error: error.message
    };
  }
}

// Streaming version of generation
async function generateWithProviderStreaming(providerId, prompt, requestedModel, conversationHistory = [], sessionId, sendMessage) {
  const providerConfig = LLM_PROVIDERS.find(p => p.id === providerId);
  if (!providerConfig) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  const model = requestedModel || providerConfig.defaultModel;
  
  // Generate project ID if not provided
  const finalProjectId = sessionId;
  console.log(`📁 Using project ID in streaming: ${finalProjectId}`);

  const result = await generateWithIterativeAI(providerId, model, prompt, conversationHistory, finalProjectId, sendMessage);
  
  // Get project files
  const projectFiles = getProjectFiles(finalProjectId);
  
  return {
    provider: providerConfig.name,
    model: model,
    type: 'project',
    projectId: finalProjectId,
    description: `Iterative development completed in ${result.iterations} iterations`,
    entryPoint: 'index.html',
    files: projectFiles.files,
    commandResults: result.results,
    isFollowUp: false,
    messages: result.messages,
    iterations: result.iterations,
    conversationLength: result.history?.length || 0,
    history: result.history
  };
}


// API Routes
app.get('/api/providers', async (req, res) => {
  try {
    const providers = await getAvailableProviders();
    res.json(providers);
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

app.get('/api/providers/current', async (req, res) => {
  try {
    const availableProviders = await getAvailableProviders();
    const configuredProviders = availableProviders.filter(p => p.configured);
    
    // Use saved provider if available and still configured
    let currentProvider = null;
    if (serverConfig.currentProvider) {
      currentProvider = availableProviders.find(p => p.id === serverConfig.currentProvider && p.configured);
    }
    
    // Fallback to first configured provider
    if (!currentProvider) {
      currentProvider = configuredProviders.length > 0 ? configuredProviders[0] : availableProviders[0];
    }
    
    // Add the selected model to the response
    if (currentProvider && serverConfig.currentModel) {
      currentProvider.selectedModel = serverConfig.currentModel;
    }
    
    res.json(currentProvider);
  } catch (error) {
    console.error('Error fetching current provider:', error);
    res.status(500).json({ error: 'Failed to fetch current provider' });
  }
});

app.post('/api/providers/current', async (req, res) => {
  try {
    const { providerId, modelId } = req.body;
    
    const availableProviders = await getAvailableProviders();
    const provider = availableProviders.find(p => p.id === providerId);
    
    if (!provider) {
      return res.status(400).json({ error: `Provider ${providerId} not found` });
    }
    
    // Validate model exists for this provider
    if (modelId && !provider.models.find(m => m.id === modelId)) {
      return res.status(400).json({ error: `Model ${modelId} not found for provider ${providerId}` });
    }
    
    // Save to server config
    serverConfig.currentProvider = providerId;
    serverConfig.currentModel = modelId || provider.defaultModel;
    saveConfig();
    
    console.log(`🔄 Provider changed to: ${providerId} (${serverConfig.currentModel})`);
    
    res.json({ 
      success: true, 
      provider: providerId, 
      model: serverConfig.currentModel 
    });
  } catch (error) {
    console.error('Error setting provider:', error);
    res.status(500).json({ error: 'Failed to set provider' });
  }
});

// Streaming endpoint for real-time AI communication
app.post('/api/generate/stream', async (req, res) => {
  const { prompt, provider: requestedProvider, model: requestedModel, sessionId, conversationHistory, projectId } = req.body;
  
  console.log(`\n🌊 === STREAMING REQUEST START ===`);
  console.log(`📨 Request body:`, { prompt, provider: requestedProvider, model: requestedModel, sessionId, projectId, historyLength: conversationHistory?.length || 0 });
  
  // Set up Server-Sent Events with extended timeout
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
    'X-Accel-Buffering': 'no' // Disable nginx buffering
  });

  // Set connection timeout to 20 minutes
  res.setTimeout(1200000);

  // Keep connection alive with periodic heartbeat
  const heartbeat = setInterval(() => {
    res.write('data: {"type":"heartbeat"}\n\n');
  }, 30000); // Every 30 seconds
  // Clean up heartbeat on connection close
  res.on('close', () => {
    clearInterval(heartbeat);
  });

  const sendSSEMessage = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Generate session ID if not provided
    const finalSessionId = sessionId;
    if (!finalSessionId) {
      throw new Error('No session ID provided');
    }
    console.log(`📝 Using session ID: ${finalSessionId}`);

    // Use requested provider or saved settings or auto-detect
    let provider = requestedProvider || serverConfig.currentProvider;
    let model = requestedModel || serverConfig.currentModel;
    if (!provider) {
      const availableProviders = await getAvailableProviders();
      const configuredProviders = availableProviders.filter(p => p.configured);
      provider = configuredProviders.length > 0 ? configuredProviders[0].id : 'kimi';
      if (!model) {
        const selectedProvider = configuredProviders.find(p => p.id === provider);
        model = selectedProvider?.defaultModel;
      }
    }
    console.log(`⚙️ Final selection - Session: ${finalSessionId}, Provider: ${provider}, Model: ${model}`);
     
    // Get conversation history from memory or use provided history
    let history = conversationHistory || [];
    if (sessionId && conversations.has(sessionId)) {
      history = conversations.get(sessionId);
      console.log("Conversation history found for session ID: " + sessionId + " with length: " + history.length);
    } else {
      console.log("No conversation history found for session ID: " + sessionId);
    }

    const result = await generateWithProviderStreaming(provider, prompt, model, history, sessionId, sendSSEMessage);
    
    // Store conversation history only when result.history exists
    if (result.history) {
      console.log("Storing conversation history for session ID: " + sessionId + " with length: " + result.history.length);
      result.history.forEach((msg, i) => {
        const preview = msg.content.substring(0, 100) + (msg.content.length > 100 ? `...${msg.content.slice(-100)}` : '');
        console.log(`   ${i + 1}. ${msg.role}: ${preview}`);
      });
      conversations.set(finalSessionId, result.history);
    } else {
      console.log("No conversation history stored for session ID: " + sessionId);
    }
    
    // Add session info to result
    result.sessionId = finalSessionId;
    result.conversationLength = result.history?.length || 0;
    
    // Send final result
    sendSSEMessage({
      type: 'complete',
      result: result
    });
    
    console.log(`\n✅ === STREAMING SUCCESS ===`);
    console.log(`📤 Response: ${result.provider} using ${result.model}`);
    console.log(`📏 Project files: ${result.files.length} files generated`);
    console.log(`💬 Session: ${finalSessionId} (${result.conversationLength} messages)`);
    console.log(`🌊 === STREAMING REQUEST END ===\n`);
    
    clearInterval(heartbeat);
    res.end();
  } catch (error) {
    console.log(`\n❌ === STREAMING ERROR ===`);
    console.error(`💥 Generation failed:`, error.message);
    console.log(`🌊 === STREAMING REQUEST END (ERROR) ===\n`);
    
    sendSSEMessage({
      type: 'error',
      error: error.message,
      provider: requestedProvider || 'unknown',
      model: requestedModel || 'unknown'
    });
    
    // Small delay to ensure error message is sent before closing stream
    setTimeout(() => {
      clearInterval(heartbeat);
      res.end();
    }, 100);
  }
});


// Serve AI workspace files
app.use('/workspace', express.static(AI_WORKSPACE));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Cleanup running servers on shutdown
process.on('SIGINT', async () => {
  console.log('\n🔴 Shutting down server...');
  
  // Stop all running development servers
  const serverPromises = Array.from(runningServers.keys()).map(projectId => 
    stopProjectServer(projectId)
  );
  
  if (serverPromises.length > 0) {
    console.log(`🔴 Stopping ${serverPromises.length} development servers...`);
    await Promise.all(serverPromises);
  }
  
  console.log('✅ Cleanup complete');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔴 Received SIGTERM, shutting down gracefully...');
  
  // Stop all running development servers
  const serverPromises = Array.from(runningServers.keys()).map(projectId => 
    stopProjectServer(projectId)
  );
  
  if (serverPromises.length > 0) {
    console.log(`🔴 Stopping ${serverPromises.length} development servers...`);
    await Promise.all(serverPromises);
  }
  
  console.log('✅ Cleanup complete');
  process.exit(0);
});

app.listen(PORT, async () => {
  console.log(`🚀 Iterative AI Code Generator running on http://localhost:${PORT}`);
  
  // Initialize AI workspace
  initializeWorkspace();
  console.log(`📁 AI Workspace: ${AI_WORKSPACE}`);
  
  console.log(`📝 Configured providers:`);
  try {
    const providers = await getAvailableProviders();
    providers.forEach(provider => {
      console.log(`   ${provider.name}: ${provider.configured ? '✅' : '❌'}`);
    });
  } catch (error) {
    console.error('Error loading providers at startup:', error);
  }
});
