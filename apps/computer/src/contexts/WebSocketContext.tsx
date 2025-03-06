import React, { createContext, useContext, useEffect, useState } from 'react'
import { Editor } from 'tldraw'
import { WebSocketService } from '../services/WebSocketService'

// Define the WebSocketContext type
type WebSocketContextType = {
  webSocketService: WebSocketService | null
  isConnected: boolean
  connect: (url: string) => void
  disconnect: () => void
  sendPlayMessage: (shapeId: string, data: any) => void
  sendStopMessage: (shapeId: string) => void
  setEditor: (editor: Editor) => void
}

// Create the WebSocketContext
const WebSocketContext = createContext<WebSocketContextType>({
  webSocketService: null,
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
  sendPlayMessage: () => {},
  sendStopMessage: () => {},
  setEditor: () => {},
})

// Define the WebSocketProvider props
type WebSocketProviderProps = {
  children: React.ReactNode
}

// Create the WebSocketProvider component
export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [webSocketService] = useState<WebSocketService>(new WebSocketService())
  const [isConnected, setIsConnected] = useState<boolean>(false)

  // Check connection status periodically
  useEffect(() => {
    const intervalId = setInterval(() => {
      setIsConnected(webSocketService.isWebSocketConnected())
    }, 1000)

    return () => {
      clearInterval(intervalId)
      webSocketService.disconnect()
    }
  }, [webSocketService])

  // Set the editor instance in the WebSocketService
  const setEditor = (editor: Editor): void => {
    webSocketService.setEditor(editor)
  }

  // Connect to the WebSocket server
  const connect = (url: string): void => {
    webSocketService.connect(url)
  }

  // Disconnect from the WebSocket server
  const disconnect = (): void => {
    webSocketService.disconnect()
  }

  // Send a play message to the WebSocket server
  const sendPlayMessage = (shapeId: string, data: any): void => {
    webSocketService.sendPlayMessage(shapeId, data)
  }

  // Send a stop message to the WebSocket server
  const sendStopMessage = (shapeId: string): void => {
    webSocketService.sendStopMessage(shapeId)
  }

  // Provide the WebSocketContext to the application
  return (
    <WebSocketContext.Provider
      value={{
        webSocketService,
        isConnected,
        connect,
        disconnect,
        sendPlayMessage,
        sendStopMessage,
        setEditor,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

// Create a hook to use the WebSocketContext
export const useWebSocket = (): WebSocketContextType => {
  return useContext(WebSocketContext)
}