import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Loader2, Settings, Plane, Menu } from 'lucide-react'
import { ApiService } from '../services/apiService'
import SettingsPanel from './SettingsPanel'
import './ChatInterface.css'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant' | 'iteration' | 'command' | 'file' | 'server' | 'thinking' | 'ai_response' | 'system' | 'success'
  timestamp: Date
}

interface ChatInterfaceProps {
  onCodeGenerated: (code: string) => void
  onServerStarted: (url: string) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  onSessionSelect?: (sessionId: string) => void
  onNewSession?: () => void
  onToggleSessionList: () => void
  currentSessionId?: string | null
}

const ChatInterface = forwardRef<any, ChatInterfaceProps>(({
  onCodeGenerated,
  onServerStarted,
  isLoading,
  setIsLoading,
  onToggleSessionList
}, ref) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    return [{
      id: 'welcome',
      content: 'Welcome to Yet Another Vibe Coding platform built by Dorian and his intern Claude Code! Let me help to build anything.',
      role: 'assistant',
      timestamp: new Date()
    }]
  })
  const [inputValue, setInputValue] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

    // Add a starting message
    const startMessage: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      content: 'Starting code generation...',
      role: 'system',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, startMessage])

    try {
      // Use streaming API instead of regular generateCode
      await ApiService.generateCodeStream(prompt, (update) => {
        // Debug: Log all updates to see what we're receiving
        console.log('Stream update received:', update);
        console.log('Update type:', update.type);
        console.log('Update message:', update.message || update.content);
        console.log('Update nextCommand:', update.nextCommand);
        console.log('Full update object:', JSON.stringify(update, null, 2));
        
        // Create individual message bubbles for different types of updates
        let messageContent = '';
        let messageType = 'assistant';
        
        if (update.type === 'iteration_update') {
          messageContent = `🔄 Iteration ${update.iteration}: ${update.reasoning}`;
          messageType = 'iteration';
        } else if (update.type === 'command_executed') {
          messageContent = `💻 Executed command successfully`;
          messageType = 'command';
        } else if (update.type === 'file_created') {
          const filename = update.filename || update.filepath || 'unknown file';
          messageContent = `📝 Created file: ${filename}`;
          messageType = 'file';
        } else if (update.type === 'server_started') {
          messageContent = `🚀 Server started at ${(update as any).url}`;
          messageType = 'server';
          // Pass the server URL to the parent component for Live Preview
          if ((update as any).url) {
            onServerStarted((update as any).url);
          }
        } else if (update.type === 'ai_thinking') {
          messageContent = `🤖 AI is thinking...`;
          messageType = 'thinking';
        } else if (update.type === 'ai_response') {
          messageContent = update.content || update.message;
          messageType = 'ai_response';
        } else if (update.nextCommand && update.nextCommand.type === 'message') {
          messageContent = update.nextCommand.message;
          messageType = 'ai_response';
        } else if (update.message && update.message.trim()) {
          // Check if this might be a JSON string containing AI response
          try {
            const parsedMessage = JSON.parse(update.message);
            if (parsedMessage.nextCommand && parsedMessage.nextCommand.message) {
              messageContent = parsedMessage.nextCommand.message;
              messageType = 'ai_response';
            } else if (parsedMessage.message) {
              messageContent = parsedMessage.message;
              messageType = 'ai_response';
            } else {
              messageContent = update.message;
              messageType = 'system';
            }
          } catch (e) {
            // Not JSON, treat as regular message
            messageContent = update.message;
            messageType = 'system';
          }
        }
        
        // Catch-all for any other updates that might contain AI responses
        if (!messageContent && update.nextCommand) {
          messageContent = update.nextCommand.message || 'AI response received';
          messageType = 'ai_response';
        }
        
        // Final fallback: if we still don't have content but there's a message, show it
        if (!messageContent && update.message) {
          messageContent = update.message;
          messageType = 'system';
        }
        
        if (messageContent) {
          const newMessage: Message = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: messageContent,
            role: messageType as any,
            timestamp: new Date()
          }
          
          setMessages(prev => [...prev, newMessage])
        }
      }, (finalResponse) => {
        // Handle final response with generated code
        const finalMessage: Message = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          content: finalResponse.error
            ? `⚠️ ${finalResponse.error} Generated with template fallback.`
            : `✅ Congratulations! Your app is ready!`,
          role: 'success',
          timestamp: new Date()
        }
        
        setMessages(prev => [...prev, finalMessage])
        onCodeGenerated(finalResponse.code)
        setIsLoading(false)
      })
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Check your LLM provider settings.`,
        role: 'system',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
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
          ? `Now using LLM model "${(currentProvider as any).selectedModel || 'default'}" from service provider "${currentProvider.name}"!`
          : 'No LLM providers configured. Click settings to set up your preferred AI provider.',
        role: 'assistant',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, welcomeMessage])
    } catch (error) {
      console.error('Failed to update provider info:', error)
    }
  }


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    loadSession: (sessionData: any) => {
      console.log('Loading session data:', sessionData)
      
      // Convert session messages to our Message format
      const sessionMessages: Message[] = []
      
      if (sessionData.messages) {
        sessionData.messages.forEach((msg: any) => {
          const messageType = msg.role === 'user' ? 'user' : 
                            msg.role === 'assistant' ? 'assistant' : 'system'
          
          sessionMessages.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: msg.content,
            role: messageType as any,
            timestamp: new Date(sessionData.updatedAt || Date.now())
          })
        })
      }
      
      // Add welcome message if no messages exist
      if (sessionMessages.length === 0) {
        sessionMessages.push({
          id: 'welcome-loaded',
          content: `Welcome back! Continuing session: ${sessionData.title}`,
          role: 'assistant',
          timestamp: new Date()
        })
      }
      
      setMessages(sessionMessages)
    },
    
    resetToNewSession: () => {
      setMessages([{
        id: 'welcome-new',
        content: 'Welcome to Yet Another Vibe Coding platform built by Dorian and his intern Claude Code! Let me help to build anything.',
        role: 'assistant',
        timestamp: new Date()
      }])
    }
  }))

  const getAvatarText = (role: string) => {
    switch (role) {
      case 'user': return 'U'
      case 'assistant': return 'A'
      case 'ai_response': return 'AI'
      case 'iteration': return 'I'
      case 'command': return 'C'
      case 'file': return 'F'
      case 'server': return 'S'
      case 'thinking': return 'T'
      case 'system': return 'S'
      case 'success': return '✓'
      default: return '?'
    }
  }

  return (
    <div className="chat-interface">
        <div className="chat-header">
          <div className="header-left">
            <button 
              className="header-button"
              onClick={onToggleSessionList}
            >
              <Menu size={14} />
              Sessions
            </button>
          </div>
          <h2>Chat to Code</h2>
          <div className="header-actions">
            <button 
              className="header-button"
              onClick={() => setShowSettings(true)}
            >
              <Settings size={14} />
              Settings
            </button>
          </div>
        </div>
        
        <div className="messages-container">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.role}`}>
              <div className="message-avatar">
                {getAvatarText(message.role)}
              </div>
              <div className="message-content">
                {message.content}
                <div className="message-timestamp">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message assistant loading">
              <div className="message-avatar">A</div>
              <div className="message-content">
                <Loader2 className="spinner" />
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

                  <div className="input-section">
            <form onSubmit={handleSubmit} className="input-container">
            <textarea
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                // Auto-resize the textarea
                const textarea = e.target;
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              placeholder="What's on your mind today?"
              className="message-input"
              disabled={isLoading}
              rows={1}
              style={{ minHeight: '52px', maxHeight: '200px', overflowY: 'auto' }}
            />
            <div className="input-actions">
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="send-button"
              >
                <Plane size={16} />
              </button>
            </div>
          </form>
        </div>

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onProviderChange={handleProviderChange}
      />
    </div>
  )
})

export default ChatInterface