import React from 'react'
import {
  HTMLContainer,
  RecordProps,
  Rectangle2d,
  ShapeUtil,
  T,
  TLBaseShape,
  TLRecord,
  TLResizeInfo,
  getDefaultColorTheme,
  resizeBox,
  stopEventPropagation
} from 'tldraw'

// Type definition for the start block shape
export type StartShape = TLBaseShape<
  'start-block',
  {
    w: number
    h: number
    isRunning: boolean
  }
>

// Props validation for the start block shape
export const startShapeProps: RecordProps<StartShape> = {
  w: T.number,
  h: T.number,
  isRunning: T.boolean,
}

// Migrations for the start block shape
export const startShapeMigrations = {
  firstVersion: 1,
  currentVersion: 1,
  migrators: {
    1: {
      up: (record: TLRecord) => {
        return record
      },
      down: (record: TLRecord) => {
        return record
      },
    },
  },
}

// Start block shape utility class
export class StartShapeUtil extends ShapeUtil<StartShape> {
  static override type = 'start-block' as const
  static override props = startShapeProps
  static override migrations = startShapeMigrations

  override isAspectRatioLocked = (_shape: StartShape): boolean => {
    return false
  }

  override canResize = (_shape: StartShape): boolean => {
    return true
  }

  override canEdit = (): boolean => {
    return true
  }

  getDefaultProps = (): StartShape['props'] => {
    return {
      w: 180,
      h: 80,
      isRunning: false,
    }
  }

  getGeometry = (shape: StartShape) => {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component = (shape: StartShape) => {
    const { w, h, isRunning } = shape.props
    const theme = getDefaultColorTheme({ isDarkMode: this.editor.user.getIsDarkMode() })
    const isEditing = this.editor.getEditingShapeId() === shape.id

    const handleRun = (e: React.MouseEvent) => {
      e.stopPropagation()
      const editor = this.editor
      editor.updateShape<StartShape>({
        id: shape.id,
        type: 'start-block',
        props: {
          isRunning: !isRunning,
        },
      })
      
      // Execute the workflow
      console.log('Starting workflow execution!')
      
      // Find all text blocks and generate blocks
      const allShapes = editor.getCurrentPageShapes()
      const textBlocks = allShapes.filter((s) => s.type === 'text-block')
      const generateBlocks = allShapes.filter((s) => s.type === 'generate-block')
      
      console.log('Text blocks:', textBlocks)
      console.log('Generate blocks:', generateBlocks)
      
      // Simulate workflow execution
      setTimeout(() => {
        editor.updateShape<StartShape>({
          id: shape.id,
          type: 'start-block',
          props: {
            isRunning: false,
          },
        })
      }, 2000)
    }

    return (
      <HTMLContainer
        id={shape.id}
        onPointerDown={isEditing ? stopEventPropagation : undefined}
        style={{
          width: w,
          height: h,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: isRunning ? theme.green.solid : theme.blue.solid,
          color: 'white',
          border: `2px solid ${isRunning ? theme.green.solid : theme.blue.solid}`,
          borderRadius: '8px',
          padding: '8px',
          fontFamily: 'sans-serif',
          overflow: 'hidden',
          pointerEvents: isEditing ? 'all' : 'none',
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            fontWeight: 'bold',
            fontSize: '16px',
          }}
        >
          {isEditing ? (
            <button
              onClick={handleRun}
              style={{
                padding: '8px 16px',
                backgroundColor: theme.green.solid,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              {isRunning ? 'Stop' : 'Start'}
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {isRunning ? (
                  <rect x="6" y="6" width="12" height="12" />
                ) : (
                  <polygon points="5 3 19 12 5 21 5 3" />
                )}
              </svg>
              {isRunning ? 'Running...' : 'Start'}
            </div>
          )}
        </div>
        {!isEditing && (
          <div
            style={{
              fontSize: '12px',
              textAlign: 'center',
              marginTop: '4px',
              opacity: 0.8,
            }}
          >
            Double-click to interact
          </div>
        )}
      </HTMLContainer>
    )
  }

  indicator = (shape: StartShape) => {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />
  }

  override onResize = (shape: StartShape, info: TLResizeInfo<StartShape>) => {
    return resizeBox(shape, info)
  }
  
  override onEditEnd = (shape: StartShape) => {
    // Flash effect when editing ends
    this.editor.updateShape({
      id: shape.id,
      type: 'start-block',
      opacity: 0.5,
    })
    
    setTimeout(() => {
      this.editor.updateShape({
        id: shape.id,
        type: 'start-block',
        opacity: 1,
      })
    }, 100)
  }
}