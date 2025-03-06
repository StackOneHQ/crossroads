import { useEffect } from 'react'
import { useEditor } from 'tldraw'
import { useWebSocket } from '../contexts/WebSocketContext'

// This component initializes the WebSocket service with the editor instance
export const EditorInitializer = (): null => {
  const editor = useEditor()
  const { setEditor } = useWebSocket()

  // Set the editor instance in the WebSocketService when the editor is available
  useEffect(() => {
    if (editor) {
      setEditor(editor)
    }
  }, [editor, setEditor])

  // This component doesn't render anything
  return null
} 