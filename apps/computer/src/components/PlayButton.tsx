import React, { useEffect, useState } from 'react'
import { TLShapeId, useEditor } from 'tldraw'
import { useWebSocket } from '../contexts/WebSocketContext'

// Define the PlayButton props
type PlayButtonProps = {
  shapeId: string
  data: any
  isLoading: boolean
  color: string
}

// Create the PlayButton component
export const PlayButton: React.FC<PlayButtonProps> = ({ shapeId, data, isLoading, color }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const { sendPlayMessage, sendStopMessage } = useWebSocket()
  const editor = useEditor()

  // Handle play/stop button click
  const handleClick = (): void => {
    if (!editor) return

    if (isPlaying) {
      sendStopMessage(shapeId)
      setIsPlaying(false)
    } else {
      // Set loading state
      const shape = editor.getShape(shapeId as TLShapeId)
      if (shape) {
        if (shape.type === 'structured-output') {
          editor.updateShape({
            id: shape.id,
            type: 'structured-output',
            props: {
              isLoading: true
            }
          })
        } else if (shape.type === 'text-output') {
          editor.updateShape({
            id: shape.id,
            type: 'text-output',
            props: {
              isLoading: true
            }
          })
        }
      }

      sendPlayMessage(shapeId, data)
      setIsPlaying(true)
    }
  }

  // Reset isPlaying when isLoading becomes false
  useEffect(() => {
    if (!isLoading && isPlaying) {
      setIsPlaying(false)
    }
  }, [isLoading, isPlaying])

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      style={{
        backgroundColor: 'transparent',
        border: 'none',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        padding: '4px',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isLoading ? 0.5 : 1,
      }}
      title={isPlaying ? 'Stop' : 'Play'}
    >
      {isPlaying || isLoading ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      )}
    </button>
  )
} 