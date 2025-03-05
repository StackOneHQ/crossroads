import React from 'react'
import {
  BaseBoxShapeTool,
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

// Type definition for the text block shape
export type TextShape = TLBaseShape<
  'text-block',
  {
    w: number
    h: number
    text: string
    isInput: boolean
  }
>

// Props validation for the text block shape
export const textShapeProps: RecordProps<TextShape> = {
  w: T.number,
  h: T.number,
  text: T.string,
  isInput: T.boolean,
}

// Migrations for the text block shape
export const textShapeMigrations = {
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

// Text block shape utility class
export class TextShapeUtil extends ShapeUtil<TextShape> {
  static override type = 'text-block' as const
  static override props = textShapeProps
  static override migrations = textShapeMigrations

  override isAspectRatioLocked = (_shape: TextShape): boolean => {
    return false
  }

  override canResize = (_shape: TextShape): boolean => {
    return true
  }

  override canEdit = (): boolean => {
    return true
  }

  getDefaultProps = (): TextShape['props'] => {
    return {
      w: 200,
      h: 100,
      text: 'Text block',
      isInput: true,
    }
  }

  getGeometry = (shape: TextShape) => {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component = (shape: TextShape) => {
    const { w, h, text, isInput } = shape.props
    const theme = getDefaultColorTheme({ isDarkMode: this.editor.user.getIsDarkMode() })
    const isEditing = this.editor.getEditingShapeId() === shape.id

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const editor = this.editor
      editor.updateShape<TextShape>({
        id: shape.id,
        type: 'text-block',
        props: {
          text: e.target.value,
        },
      })
    }

    const handleToggleType = () => {
      const editor = this.editor
      editor.updateShape<TextShape>({
        id: shape.id,
        type: 'text-block',
        props: {
          isInput: !isInput,
        },
      })
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
          backgroundColor: isInput ? '#f0fff4' : '#fff0f6',
          border: `2px solid ${isInput ? theme.green.solid : theme.red.solid}`,
          borderRadius: '8px',
          padding: '8px',
          fontFamily: 'sans-serif',
          color: '#1e293b',
          overflow: 'hidden',
          pointerEvents: isEditing ? 'all' : 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px',
          }}
        >
          <div
            style={{
              fontWeight: 'bold',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {isInput ? (
                <path d="M21 12H3M3 12L9 6M3 12L9 18" />
              ) : (
                <path d="M3 12H21M21 12L15 6M21 12L15 18" />
              )}
            </svg>
            {isInput ? 'Input' : 'Output'}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#64748b',
            }}
          >
            Text Block
          </div>
          
          {isEditing && (
            <button
              onClick={handleToggleType}
              style={{
                padding: '4px 8px',
                backgroundColor: isInput ? theme.red.solid : theme.green.solid,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Switch to {isInput ? 'Output' : 'Input'}
            </button>
          )}
        </div>
        
        <textarea
          value={text}
          onChange={handleTextChange}
          style={{
            flex: 1,
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '4px',
            padding: '8px',
            fontSize: '12px',
            border: '1px solid #e2e8f0',
            resize: 'none',
            fontFamily: 'inherit',
          }}
          placeholder={isInput ? 'Enter input text...' : 'Output will appear here...'}
          onClick={(e) => e.stopPropagation()}
          readOnly={!isEditing && !isInput}
        />
        
        {!isEditing && (
          <div
            style={{
              fontSize: '12px',
              textAlign: 'center',
              marginTop: '4px',
              opacity: 0.8,
            }}
          >
            Double-click to edit
          </div>
        )}
      </HTMLContainer>
    )
  }

  indicator = (shape: TextShape) => {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />
  }

  override onResize = (shape: TextShape, info: TLResizeInfo<TextShape>) => {
    return resizeBox(shape, info)
  }

  override onEditEnd = (shape: TextShape) => {
    this.editor.animateShape(
      { ...shape, scale: [1.05, 1.05], opacity: 0.5 },
      { animation: { duration: 100, easing: 'easeInOutCubic' } }
    )
    
    setTimeout(() => {
      this.editor.animateShape(
        { ...shape, scale: [1, 1], opacity: 1 },
        { animation: { duration: 150, easing: 'easeOutCubic' } }
      )
    }, 100)
  }
}

// Text block tool class
export class TextTool extends BaseBoxShapeTool {
  static override id = 'text-block'
  static override initial = 'idle'
  
  override shapeType = 'text-block'

  getShapeProps() {
    return {
      w: 200,
      h: 100,
      text: 'Text block',
      isInput: true,
    }
  }
} 