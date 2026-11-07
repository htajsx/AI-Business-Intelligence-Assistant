import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ConnectionContext = createContext({
  isConnected: true,
  isChecking: false,
  checkConnection: async () => {},
  setConnected: () => {}
})

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export function ConnectionProvider({ children }) {
  const [isConnected, setIsConnected] = useState(true)
  const [isChecking, setIsChecking] = useState(false)

  const checkConnection = useCallback(async () => {
    setIsChecking(true)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)
      const res = await fetch(`${API_BASE}/api/health`, {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        const ok = data.status === 'ok'
        setIsConnected(ok)
        return ok
      } else {
        setIsConnected(false)
        return false
      }
    } catch {
      setIsConnected(false)
      return false
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    checkConnection()
    const timer = setInterval(() => {
      checkConnection()
    }, 15000)
    return () => clearInterval(timer)
  }, [checkConnection])

  return (
    <ConnectionContext.Provider
      value={{
        isConnected,
        isChecking,
        checkConnection,
        setConnected: setIsConnected
      }}
    >
      {children}
    </ConnectionContext.Provider>
  )
}

export function useConnection() {
  return useContext(ConnectionContext)
}
