import { Editor, TLShapeId } from 'tldraw'

// Define the message types for WebSocket communication
export type WebSocketMessage = {
  type: 'update' | 'play' | 'stop'
  shapeId?: string
  data?: any
}

// Define the WebSocket service class
export class WebSocketService {
  private socket: WebSocket | null = null
  private editor: Editor | null = null
  private isConnected: boolean = false
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectTimeout: number = 2000 // Start with 2 seconds
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pendingMessages: WebSocketMessage[] = [] // Store messages that couldn't be processed due to missing editor

  // Initialize the WebSocket service with the editor instance
  constructor(editor?: Editor) {
    if (editor) {
      this.setEditor(editor)
    }
  }

  // Set the editor instance
  setEditor = (editor: Editor): void => {
    this.editor = editor
    
    // Process any pending messages now that we have an editor
    if (this.pendingMessages.length > 0) {
      console.log(`Processing ${this.pendingMessages.length} pending messages`)
      this.pendingMessages.forEach(message => {
        if (message.type === 'update' && message.shapeId && message.data) {
          this.updateShape(message.shapeId, message.data)
        }
      })
      this.pendingMessages = []
    }
  }

  // Connect to the WebSocket server
  connect = (url: string): void => {
    if (this.socket) {
      this.disconnect()
    }

    try {
      this.socket = new WebSocket(url)

      this.socket.onopen = this.handleOpen
      this.socket.onmessage = this.handleMessage
      this.socket.onclose = this.handleClose
      this.socket.onerror = this.handleError
    } catch (error) {
      console.error('WebSocket connection error:', error)
      this.attemptReconnect()
    }
  }

  // Disconnect from the WebSocket server
  disconnect = (): void => {
    if (this.socket) {
      this.socket.onopen = null
      this.socket.onmessage = null
      this.socket.onclose = null
      this.socket.onerror = null

      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close()
      }

      this.socket = null
    }

    this.isConnected = false

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  // Handle WebSocket open event
  private handleOpen = (): void => {
    this.isConnected = true
    this.reconnectAttempts = 0
    this.reconnectTimeout = 2000 // Reset timeout
    console.log('WebSocket connection established')
  }

  // Handle WebSocket message event
  private handleMessage = (event: MessageEvent): void => {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage

      if (!this.editor) {
        console.warn('Editor not set, storing message for later processing')
        this.pendingMessages.push(message)
        return
      }

      switch (message.type) {
        case 'update':
          if (message.shapeId && message.data) {
            this.updateShape(message.shapeId, message.data)
          }
          break
        default:
          console.warn('Unknown message type:', message.type)
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error)
    }
  }

  // Handle WebSocket close event
  private handleClose = (event: CloseEvent): void => {
    this.isConnected = false
    console.log(`WebSocket connection closed: ${event.code} ${event.reason}`)
    
    if (event.code !== 1000) { // 1000 is normal closure
      this.attemptReconnect()
    }
  }

  // Handle WebSocket error event
  private handleError = (event: Event): void => {
    console.error('WebSocket error:', event)
    this.isConnected = false
    this.attemptReconnect()
  }

  // Attempt to reconnect to the WebSocket server
  private attemptReconnect = (): void => {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Maximum reconnect attempts reached')
      return
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectAttempts++
    const timeout = this.reconnectTimeout * Math.pow(1.5, this.reconnectAttempts - 1) // Exponential backoff
    console.log(`Attempting to reconnect in ${timeout / 1000} seconds...`)

    this.reconnectTimer = setTimeout(() => {
      if (this.socket?.url) {
        this.connect(this.socket.url)
      }
    }, timeout)
  }

  // Send a message to the WebSocket server
  sendMessage = (message: WebSocketMessage): void => {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send message')
      return
    }

    try {
      this.socket.send(JSON.stringify(message))
    } catch (error) {
      console.error('Error sending WebSocket message:', error)
    }
  }

  // Send a play message to the WebSocket server
  sendPlayMessage = (shapeId: string, data: any): void => {
    this.sendMessage({
      type: 'play',
      shapeId,
      data
    })
  }

  // Send a stop message to the WebSocket server
  sendStopMessage = (shapeId: string): void => {
    this.sendMessage({
      type: 'stop',
      shapeId
    })
  }

  // Update a shape with data received from the WebSocket server
  private updateShape = (shapeId: string, data: any): void => {
    if (!this.editor) {
      console.warn('Editor not set, cannot update shape')
      return
    }

    const shape = this.editor.getShape(shapeId as TLShapeId)
    if (!shape) {
      console.warn(`Shape with ID ${shapeId} not found`)
      return
    }

    // Update the shape based on its type
    switch (shape.type) {
      case 'structured-output':
        this.editor.updateShape({
          id: shape.id,
          type: 'structured-output',
          props: {
            data: JSON.stringify(data),
            isLoading: false
          }
        })
        break
      case 'text-output':
        this.editor.updateShape({
          id: shape.id,
          type: 'text-output',
          props: {
            text: data,
            isLoading: false
          }
        })
        break
      default:
        console.warn(`Unknown shape type: ${shape.type}`)
    }
  }

  // Check if the WebSocket is connected
  isWebSocketConnected = (): boolean => {
    return this.isConnected
  }
} 