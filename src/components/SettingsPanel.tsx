import { useState, useEffect } from 'react'
import { Settings, X, Check, AlertCircle, Server } from 'lucide-react'
import { ApiService } from '../services/apiService'
import type { Provider } from '../services/apiService'
import './SettingsPanel.css'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  onProviderChange: () => void
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, onProviderChange }) => {
  const [availableProviders, setAvailableProviders] = useState<Provider[]>([])
  const [currentProvider, setCurrentProvider] = useState<Provider | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadProviders()
    }
  }, [isOpen])

  const loadProviders = async () => {
    try {
      setLoading(true)
      const [providers, current] = await Promise.all([
        ApiService.getProviders(),
        ApiService.getCurrentProvider()
      ])
      setAvailableProviders(providers)
      setCurrentProvider(current)
      
      // Set selected values to current values
      setSelectedProvider(current?.id || '')
      setSelectedModel(localStorage.getItem('llm-model') || current?.defaultModel || '')
    } catch (error) {
      console.error('Failed to load providers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId)
    const provider = availableProviders.find(p => p.id === providerId)
    if (provider) {
      setSelectedModel(provider.defaultModel)
    }
  }

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId)
  }

  const handleSave = async () => {
    if (selectedProvider && selectedModel) {
      const success = await ApiService.setCurrentProvider(selectedProvider, selectedModel)
      if (success) {
        onProviderChange()
        onClose()
      } else {
        alert('Failed to save provider settings. Please try again.')
      }
    }
  }

  const handleClose = () => {
    onClose()
  }

  const getProviderStatus = (provider: any) => {
    if (!provider.requiresApiKey) {
      return { status: 'ready', message: 'No API key required' }
    }
    if (provider.configured) {
      return { status: 'configured', message: 'API key configured' }
    }
    return { status: 'missing', message: 'API key required' }
  }

  if (!isOpen) return null

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <div className="settings-header">
          <div className="settings-title">
            <Settings size={24} />
            <h2>LLM Provider Settings</h2>
          </div>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="settings-content">
          {loading ? (
            <div className="loading">Loading providers...</div>
          ) : (
            <>
              <div className="section">
                <h3>Current Provider</h3>
                {currentProvider && (
                  <div className="current-provider">
                    <div className="provider-info">
                      <div className="provider-name">
                        <Server size={18} />
                        {currentProvider.name}
                      </div>
                      <div className="provider-description">
                        {currentProvider.description}
                      </div>
                      <div className="provider-model">
                        Current Model: {localStorage.getItem('llm-model') || currentProvider.defaultModel}
                      </div>
                    </div>
                    <div className={`provider-status ${currentProvider.configured ? 'configured' : 'missing'}`}>
                      {currentProvider.configured ? <Check size={16} /> : <AlertCircle size={16} />}
                      <span>{currentProvider.configured ? 'Configured' : 'Needs Configuration'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="section">
                <h3>Select Provider & Model</h3>
                <div className="provider-list">
                  {availableProviders.map(provider => {
                    const status = getProviderStatus(provider)
                    const isSelected = selectedProvider === provider.id
                    return (
                      <div 
                        key={provider.id} 
                        className={`provider-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleProviderSelect(provider.id)}
                      >
                        <div className="provider-info">
                          <div className="provider-name">
                            <Server size={18} />
                            {provider.name}
                          </div>
                          <div className="provider-description">
                            {provider.description}
                          </div>
                          {isSelected && (
                            <div className="model-selector">
                              <select 
                                className="model-dropdown"
                                value={selectedModel}
                                onChange={(e) => handleModelSelect(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {provider.models.map(model => (
                                  <option key={model.id} value={model.id}>
                                    {model.name} {model.description && `- ${model.description}`}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                        <div className={`provider-status ${status.status}`}>
                          {status.status === 'configured' && <Check size={16} />}
                          {status.status === 'missing' && <AlertCircle size={16} />}
                          {status.status === 'ready' && <Check size={16} />}
                          <span>{status.message}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="settings-footer">
          <button className="cancel-button" onClick={handleClose}>
            Cancel
          </button>
          <button 
            className="save-button" 
            onClick={handleSave}
            disabled={!selectedProvider || !selectedModel}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel