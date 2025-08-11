import { useState, useEffect } from 'react'
import { Clock, MessageSquare, File, Server, Trash2, Edit3, Plus } from 'lucide-react'
import { ApiService } from '../services/apiService'
import './SessionList.css'

interface Session {
  sessionId: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
  fileCount: number
  hasServer: boolean
}

interface SessionListProps {
  onSessionSelect: (sessionId: string) => void
  onNewSession: () => void
  currentSessionId: string | null
}

const SessionList: React.FC<SessionListProps> = ({ 
  onSessionSelect, 
  onNewSession, 
  currentSessionId 
}) => {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    setLoading(true)
    try {
      const sessionList = await ApiService.getSessions()
      setSessions(sessionList)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this session? This will permanently delete all conversation history and project files.')) {
      return
    }

    try {
      const success = await ApiService.deleteSession(sessionId)
      if (success) {
        setSessions(prev => prev.filter(s => s.sessionId !== sessionId))
        
        // If we deleted the current session, create a new one
        if (sessionId === currentSessionId) {
          onNewSession()
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  const handleEditTitle = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingSession(session.sessionId)
    setEditTitle(session.title)
  }

  const handleSaveTitle = async (sessionId: string) => {
    if (editTitle.trim() === '') return

    try {
      const success = await ApiService.updateSession(sessionId, { title: editTitle.trim() })
      if (success) {
        setSessions(prev => prev.map(s => 
          s.sessionId === sessionId 
            ? { ...s, title: editTitle.trim(), updatedAt: new Date().toISOString() }
            : s
        ))
      }
    } catch (error) {
      console.error('Failed to update session title:', error)
    }
    
    setEditingSession(null)
    setEditTitle('')
  }

  const handleKeyPress = (e: React.KeyboardEvent, sessionId: string) => {
    if (e.key === 'Enter') {
      handleSaveTitle(sessionId)
    } else if (e.key === 'Escape') {
      setEditingSession(null)
      setEditTitle('')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) {
      return 'Just now'
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (loading) {
    return (
      <div className="session-list">
        <div className="session-list-header">
          <h3>Sessions</h3>
          <button className="new-session-btn" onClick={onNewSession}>
            <Plus size={16} />
          </button>
        </div>
        <div className="loading-sessions">Loading sessions...</div>
      </div>
    )
  }

  return (
    <div className="session-list">
      <div className="session-list-header">
        <h3>Sessions</h3>
      </div>
      
      <div className="sessions-container">
        {sessions.length === 0 ? (
          <div className="no-sessions">
            <p>No sessions yet</p>
            <button className="start-first-session" onClick={onNewSession}>
              Start your first session
            </button>
          </div>
        ) : (
          sessions.map((session) => (
            <div 
              key={session.sessionId}
              className={`session-item ${session.sessionId === currentSessionId ? 'active' : ''}`}
              onClick={() => onSessionSelect(session.sessionId)}
            >
              <div className="session-main">
                <div className="session-title-container">
                  {editingSession === session.sessionId ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleSaveTitle(session.sessionId)}
                      onKeyDown={(e) => handleKeyPress(e, session.sessionId)}
                      className="session-title-input"
                      autoFocus
                    />
                  ) : (
                    <h4 className="session-title">{session.title}</h4>
                  )}
                </div>
                
                <div className="session-meta">
                  <div className="session-stats">
                    <span className="stat">
                      <MessageSquare size={12} />
                      {session.messageCount}
                    </span>
                    <span className="stat">
                      <File size={12} />
                      {session.fileCount}
                    </span>
                    {session.hasServer && (
                      <span className="stat server">
                        <Server size={12} />
                        Live
                      </span>
                    )}
                  </div>
                  
                  <div className="session-time">
                    <Clock size={12} />
                    {formatDate(session.updatedAt)}
                  </div>
                </div>
              </div>
              
              <div className="session-actions">
                <button
                  className="session-action-btn"
                  onClick={(e) => handleEditTitle(session, e)}
                  title="Rename session"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  className="session-action-btn delete"
                  onClick={(e) => handleDeleteSession(session.sessionId, e)}
                  title="Delete session"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default SessionList