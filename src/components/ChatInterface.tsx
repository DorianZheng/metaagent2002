import { useState } from 'react'
import { Send, Loader2, Settings, RefreshCw } from 'lucide-react'
import { ApiService } from '../services/apiService'
import SettingsPanel from './SettingsPanel'
import './ChatInterface.css'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

interface ChatInterfaceProps {
  onCodeGenerated: (code: string) => void
  onServerStarted: (url: string) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onCodeGenerated,
  onServerStarted,
  isLoading,
  setIsLoading
}) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    return [{
      id: 'welcome',
      content: '🚀 Welcome to Yet Another Vibe Coding platform made by Dorian and his intern Calude Code!',
      role: 'assistant',
      timestamp: new Date()
    }]
  })
  const [inputValue, setInputValue] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      role: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const prompt = inputValue.trim()
    setInputValue('')
    setIsLoading(true)

    // Create a streaming assistant message that will be updated
    const streamingMessageId = (Date.now() + 1).toString()
    const initialStreamingMessage: Message = {
      id: streamingMessageId,
      content: '🔄 Starting generation...',
      role: 'assistant',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, initialStreamingMessage])

    try {
      // Use streaming API instead of regular generateCode
      await ApiService.generateCodeStream(prompt, (update) => {
        // Handle different types of streaming updates
        let updateMessage = update.message || 'Processing...';
        
        if (update.type === 'iteration_update') {
          updateMessage = `🔄 Iteration ${update.iteration}: ${update.reasoning}`;
        } else if (update.type === 'command_executed') {
          updateMessage = `💻 Executed command successfully`;
        } else if (update.type === 'file_created') {
          updateMessage = `📝 Created file`;
        } else if (update.type === 'server_started') {
          updateMessage = `🚀 Server started at ${(update as any).url}`;
          // Pass the server URL to the parent component for Live Preview
          if ((update as any).url) {
            onServerStarted((update as any).url);
          }
        } else if (update.type === 'ai_thinking') {
          updateMessage = `🤖 AI is thinking...`;
        }
        
        setMessages(prev => prev.map(msg => 
          msg.id === streamingMessageId 
            ? { ...msg, content: updateMessage, timestamp: new Date() }
            : msg
        ))
      }, (finalResponse) => {
        // Handle final response with generated code
        setMessages(prev => prev.map(msg => 
          msg.id === streamingMessageId 
            ? { 
                ...msg, 
                content: finalResponse.error
                  ? `⚠️ ${finalResponse.error} Generated with template fallback.`
                  : `✅ Generated app using ${finalResponse.provider} ${finalResponse.model}!`,
                timestamp: new Date()
              }
            : msg
        ))
        onCodeGenerated(finalResponse.code)
        setIsLoading(false)
      })
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Check your LLM provider settings.`,
        role: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => prev.filter(msg => msg.id !== streamingMessageId).concat([errorMessage]))
      setIsLoading(false)
    }
  }

  const handleProviderChange = async () => {
    // Refresh welcome message with new provider info
    try {
      const providers = await ApiService.getProviders()
      const hasConfiguredProvider = providers.some(p => p.configured)
      const currentProvider = await ApiService.getCurrentProvider()
      
      const welcomeMessage: Message = {
        id: 'welcome-updated',
        content: hasConfiguredProvider && currentProvider
          ? `🤖 Now using ${currentProvider.name}! Describe any web app you want to build.`
          : '🔧 No LLM providers configured. Click settings to set up your preferred AI provider.',
        role: 'assistant',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, welcomeMessage])
    } catch (error) {
      console.error('Failed to update provider info:', error)
    }
  }

  const handleResetSession = () => {
    // Reset the session and clear messages
    ApiService.resetSession()
    setMessages([{
      id: 'welcome-reset',
      content: '🔄 New session started! Previous conversation history cleared.',
      role: 'assistant',
      timestamp: new Date()
    }])
  }

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h2>Just Chat to Code!</h2>
        <div className="header-buttons">
          <button 
            className="reset-button"
            onClick={handleResetSession}
            title="Start New Session"
            disabled={isLoading}
          >
            <RefreshCw size={18} />
          </button>
          <button 
            className="settings-button"
            onClick={() => setShowSettings(true)}
            title="LLM Provider Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
      
      <div className="messages-container">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-content">
              {message.content}
            </div>
            <div className="message-timestamp">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message assistant loading">
            <div className="message-content">
              <Loader2 className="spinner" />
              Generating code...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <div className="input-container">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Describe the app you want to build..."
            className="message-input"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="send-button"
          >
            <Send size={20} />
          </button>
        </div>
      </form>

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onProviderChange={handleProviderChange}
      />
    </div>
  )
}

export default ChatInterface