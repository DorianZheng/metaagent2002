import { useState } from 'react'
import ChatInterface from './components/ChatInterface'
import CodePreview from './components/CodePreview'
import './App.css'

function App() {
  const [generatedCode, setGeneratedCode] = useState<string>('')
  const [serverUrl, setServerUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="app-container">
      <div className="left-column">
        <ChatInterface 
          onCodeGenerated={setGeneratedCode}
          onServerStarted={setServerUrl}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      </div>
      <div className="right-column">
        <CodePreview code={generatedCode} serverUrl={serverUrl} />
      </div>
    </div>
  )
}

export default App
