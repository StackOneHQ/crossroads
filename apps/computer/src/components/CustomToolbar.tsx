import { useEditor } from 'tldraw'

export const CustomToolbar = () => {
  const editor = useEditor()

  const handleStartBlockClick = () => {
    // Create a start block at the center of the viewport
    const { width, height } = editor.viewport
    const center = editor.viewportPageCenter
    
    editor.createShape({
      type: 'start-block',
      x: center.x - 100,
      y: center.y - 50,
      props: {
        w: 200,
        h: 100,
        text: 'Start',
        isRunning: false,
      },
    })
  }

  const handleDataClick = () => {
    // Create a data block at the center of the viewport
    const { width, height } = editor.viewport
    const center = editor.viewportPageCenter
    
    editor.createShape({
      type: 'data-block',
      x: center.x - 100,
      y: center.y - 75,
      props: {
        w: 200,
        h: 150,
        text: 'Data',
        data: { value: 0 },
      },
    })
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '8px',
        left: '8px',
        zIndex: 1000,
        display: 'flex',
        gap: '8px',
        background: 'white',
        padding: '8px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      }}
    >
      <button
        onClick={handleStartBlockClick}
        style={{
          padding: '8px 12px',
          background: '#1a73e8',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontWeight: 'bold',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 5V19L19 12L8 5Z" fill="currentColor" />
        </svg>
        Start Block
      </button>
      
      <button
        onClick={handleDataClick}
        style={{
          padding: '8px 12px',
          background: '#34a853',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontWeight: 'bold',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" />
          <rect x="7" y="7" width="10" height="2" rx="1" fill="white" />
          <rect x="7" y="11" width="10" height="2" rx="1" fill="white" />
          <rect x="7" y="15" width="10" height="2" rx="1" fill="white" />
        </svg>
        Data Block
      </button>
    </div>
  )
} 