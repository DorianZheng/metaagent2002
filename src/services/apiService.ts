const API_BASE_URL = 'http://localhost:3001/api'

export interface GenerationResponse {
  code: string
  provider: string
  model: string
  error?: string
}

export interface Provider {
  id: string
  name: string
  description: string
  configured: boolean
  models: Array<{
    id: string
    name: string
    description?: string
    maxTokens?: number
  }>
  defaultModel: string
  baseUrl?: string
}

export interface StreamUpdate {
  message: string
  content?: string
  type: 'progress' | 'command' | 'file' | 'error' | 'iteration_update' | 'command_executed' | 'file_created' | 'server_started' | 'ai_thinking' | 'ai_response' | 'message'
  iteration?: number
  reasoning?: string
  expectation?: string
  filename?: string
  filepath?: string
  nextCommand?: {
    type: string
    message: string
  }
}

export class ApiService {
  private static currentSessionId: string | null = null
  
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private static ensureSessionId(): string {
    if (!this.currentSessionId) {
      this.currentSessionId = this.generateSessionId()
    }
    return this.currentSessionId
  }
  
  static async generateCodeStream(
    prompt: string,
    onUpdate: (update: StreamUpdate) => void,
    onComplete: (response: GenerationResponse) => void,
    provider?: string,
    model?: string
  ): Promise<void> {
    try {
      const sessionId = this.ensureSessionId()
      
      const response = await fetch(`${API_BASE_URL}/generate/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          provider,
          model,
          sessionId
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream available')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.trim() === '') continue
            if (!line.startsWith('data: ')) continue

            const data = line.slice(6) // Remove 'data: ' prefix
            if (data === '[DONE]') {
              return // Stream complete
            }

            try {
              const parsed = JSON.parse(data)
              
              if (parsed.type === 'final') {
                // Final response with generated code
                onComplete(parsed.data)
                return
              } else if (parsed.type === 'error') {
                // Error response - convert to final response format
                onComplete({
                  error: parsed.error,
                  provider: parsed.provider || 'Unknown',
                  model: parsed.model || 'Unknown',
                  code: await this.getFallbackCode(`Error: ${parsed.error}`)
                })
                return
              } else if (parsed.type === 'complete') {
                // Complete response with result
                // Store session ID from the response
                if (parsed.result.sessionId) {
                  this.currentSessionId = parsed.result.sessionId
                }
                onComplete(parsed.result)
                return
              } else if (parsed.type === 'status' && parsed.sessionId) {
                // Capture session ID from status message
                this.currentSessionId = parsed.sessionId
                onUpdate(parsed)
              } else if (parsed.type === 'heartbeat') {
                // Heartbeat to keep connection alive - ignore
                continue
              } else {
                // Progress update
                onUpdate(parsed)
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming data:', data)
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    } catch (error) {
      // Fallback to regular API if streaming fails
      console.warn('Streaming failed, falling back to regular API:', error)
      const response = await this.generateCode(prompt, provider, model)
      onComplete(response)
    }
  }

  static async generateCode(prompt: string, provider?: string, model?: string): Promise<GenerationResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          provider,
          model
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      // Return error in the expected format with fallback for complete server failure
      return {
        code: await this.getFallbackCode(prompt),
        provider: 'Client Fallback',
        model: 'Error Page',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  static async getProviders(): Promise<Provider[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/providers`)
      if (!response.ok) {
        throw new Error(`Failed to fetch providers: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Failed to fetch providers:', error)
      return []
    }
  }

  static async getCurrentProvider(): Promise<Provider | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/providers/current`)
      if (!response.ok) {
        throw new Error(`Failed to fetch current provider: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Failed to fetch current provider:', error)
      return null
    }
  }

  static async setCurrentProvider(providerId: string, modelId?: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/providers/current`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          providerId,
          modelId
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to set provider: ${response.status}`)
      }
      
      const result = await response.json()
      
      // Also save to localStorage for client-side persistence
      localStorage.setItem('llm-provider', providerId)
      if (modelId) {
        localStorage.setItem('llm-model', modelId)
      }
      
      return result.success
    } catch (error) {
      console.error('Failed to set current provider:', error)
      return false
    }
  }

  static resetSession(): void {
    this.currentSessionId = this.generateSessionId()
  }

  static getCurrentSessionId(): string | null {
    return this.currentSessionId
  }

  // Session management methods
  static async getSessions(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions`)
      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      return []
    }
  }

  static async loadSession(sessionId: string): Promise<any | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`)
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed to load session: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Failed to load session:', error)
      return null
    }
  }

  static async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        throw new Error(`Failed to delete session: ${response.status}`)
      }
      return true
    } catch (error) {
      console.error('Failed to delete session:', error)
      return false
    }
  }

  static async updateSession(sessionId: string, updates: { title?: string }): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })
      if (!response.ok) {
        throw new Error(`Failed to update session: ${response.status}`)
      }
      return true
    } catch (error) {
      console.error('Failed to update session:', error)
      return false
    }
  }

  static setCurrentSession(sessionId: string) {
    this.currentSessionId = sessionId
  }

  private static async getFallbackCode(prompt: string): Promise<string> {
    // Fallback template generation is now handled by the server
    // This function is kept for edge cases where the server is completely unreachable
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - Service Unavailable</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 600px;
        }
        h1 { color: #333; margin-bottom: 20px; }
        p { color: #666; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>⚠️ Service Unavailable</h1>
        <p><strong>Request:</strong> "${prompt}"</p>
        <p>Unable to connect to the code generation server. Please check if the server is running on port 3001.</p>
    </div>
</body>
</html>`
  }
}