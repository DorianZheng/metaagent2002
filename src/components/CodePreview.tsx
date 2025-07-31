import { useEffect, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import './CodePreview.css'

interface CodePreviewProps {
  code: string
  serverUrl?: string
}

const CodePreview: React.FC<CodePreviewProps> = ({ code, serverUrl }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleRefresh = () => {
    if (iframeRef.current) {
      if (serverUrl) {
        // Refresh server URL by reloading
        iframeRef.current.src = serverUrl + '?t=' + Date.now()
      } else if (code) {
        // Refresh static HTML by rewriting
        const iframe = iframeRef.current
        const doc = iframe.contentDocument || iframe.contentWindow?.document
        if (doc) {
          doc.open()
          doc.write(code)
          doc.close()
        }
      }
    }
  }

  useEffect(() => {
    if (serverUrl && iframeRef.current) {
      // If we have a server URL, load it directly in the iframe
      iframeRef.current.src = serverUrl
    } else if (code && iframeRef.current) {
      // Otherwise, write the static HTML code to the iframe
      const iframe = iframeRef.current
      iframe.src = 'about:blank' // Clear any previous server URL
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      
      if (doc) {
        doc.open()
        doc.write(code)
        doc.close()
      }
    }
  }, [code, serverUrl])

  if (!code && !serverUrl) {
    return (
      <div className="code-preview">
        <div className="preview-placeholder">
          <div className="placeholder-content">
            <h2>Live Preview</h2>
            <p>Your generated app will appear here after you describe what you want to build in the chat.</p>
            <div className="placeholder-icon">🚀</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="code-preview">
      <div className="preview-header">
        <div className="header-left">
          <div className="preview-controls">
            <div className="control-dot red"></div>
            <div className="control-dot yellow"></div>
            <div className="control-dot green"></div>
          </div>
          <div className="preview-title">
            {serverUrl ? `Live Server: ${new URL(serverUrl).host}` : 'Live Preview'}
          </div>
        </div>
        <button 
          className="refresh-button" 
          onClick={handleRefresh}
          title="Refresh Preview"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      <iframe
        ref={iframeRef}
        className="preview-iframe"
        title="Code Preview"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  )
}

export default CodePreview