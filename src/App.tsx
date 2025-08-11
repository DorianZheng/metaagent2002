import { useState, useRef } from 'react'
import ChatInterface from './components/ChatInterface'
import CodePreview from './components/CodePreview'
import SessionList from './components/SessionList'
import { ApiService } from './services/apiService'
import './App.css'

function App() {
  const [generatedCode, setGeneratedCode] = useState<string>('')
  const [serverUrl, setServerUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [showSessionList, setShowSessionList] = useState(false)
  const chatInterfaceRef = useRef<any>(null)

  const handleSessionSelect = async (sessionId: string) => {
    if (sessionId === currentSessionId) return
    
    try {
      const sessionData = await ApiService.loadSession(sessionId)
      if (sessionData) {
        // Set the current session
        ApiService.setCurrentSession(sessionId)
        setCurrentSessionId(sessionId)
        
        // Load session data into the chat interface
        if (chatInterfaceRef.current) {
          chatInterfaceRef.current.loadSession(sessionData)
        }
        
        // Update server URL if session has a running server
        if (sessionData.serverInfo?.url) {
          setServerUrl(sessionData.serverInfo.url)
        } else {
          setServerUrl('')
        }
        
        // Clear generated code until new content is generated
        setGeneratedCode('')
        
        // Hide session list after selection
        setShowSessionList(false)
      }
    } catch (error) {
      console.error('Failed to load session:', error)
    }
  }

  const handleNewSession = () => {
    // Reset everything for a new session
    ApiService.resetSession()
    const newSessionId = ApiService.getCurrentSessionId()
    setCurrentSessionId(newSessionId)
    setGeneratedCode('')
    setServerUrl('')
    
    // Reset chat interface
    if (chatInterfaceRef.current) {
      chatInterfaceRef.current.resetToNewSession()
    }
    
    // Hide session list after creating new session
    setShowSessionList(false)
  }

  return (
    <div className="app-container">
      {showSessionList && (
        <div className="session-overlay">
          <div className="session-sidebar">
            <SessionList 
              onSessionSelect={handleSessionSelect}
              onNewSession={handleNewSession}
              currentSessionId={currentSessionId}
            />
          </div>
          <div className="session-backdrop" onClick={() => setShowSessionList(false)} />
        </div>
      )}
      <div className="chat-column">
        <ChatInterface 
          ref={chatInterfaceRef}
          onCodeGenerated={setGeneratedCode}
          onServerStarted={setServerUrl}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
          onToggleSessionList={() => setShowSessionList(!showSessionList)}
          currentSessionId={currentSessionId}
        />
      </div>
      <div className="preview-column">
        <CodePreview code={generatedCode} serverUrl={serverUrl} />
      </div>
    </div>
  )
}

export default App
