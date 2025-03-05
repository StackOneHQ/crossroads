import React from 'react'
import {
  DefaultColorStyle,
  HTMLContainer,
  RecordProps,
  Rectangle2d,
  ShapeUtil,
  T,
  TLBaseShape,
  TLDefaultColorStyle,
  TLRecord,
  TLResizeInfo,
  resizeBox,
  useDefaultColorTheme
} from 'tldraw'


// Type definition for the button shape
export type ButtonShape = TLBaseShape<
  'button',
  {
    w: number
    h: number
    color: TLDefaultColorStyle
  }
>

// Props validation for the button shape
export const buttonShapeProps: RecordProps<ButtonShape> = {
  w: T.number,
  h: T.number,
  color: DefaultColorStyle,
}

// Migrations for the button shape
export const buttonShapeMigrations = {
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

// Button shape utility class
export class ButtonShapeUtil extends ShapeUtil<ButtonShape> {
  static override type = 'button' as const
  static override props = buttonShapeProps
  static override migrations = buttonShapeMigrations

  override isAspectRatioLocked = (_shape: ButtonShape): boolean => {
    return true
  }

  override canResize = (_shape: ButtonShape): boolean => {
    return true
  }
  
  override canEdit = (): boolean => {
    return false
  }

  getDefaultProps = (): ButtonShape['props'] => {
    return {
      w: 60,
      h: 60,
      color: 'blue',
    }
  }

  getGeometry = (shape: ButtonShape) => {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component = (shape: ButtonShape) => {
    const { w, h, color } = shape.props
    const theme = useDefaultColorTheme()

    const handleButtonClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      
      // Create a state machine representation of shapes connected by bindings
      const editor = this.editor
      console.log('Building state machine from shape connections...')
      
      // Get all shapes on the current page
      const shapes = editor.getCurrentPageShapesSorted()
      
      // Create a map to store the connections between shapes
      const stateMachine: Record<string, { id: string, type: string, to: Array<{ id: string, type: string }> }> = {}
      
      // Process each shape to find its connections
      shapes.forEach(shape => {
        // Get all bindings involving this shape
        const bindings = editor.getBindingsInvolvingShape(shape.id)
        
        // Initialize the shape in our state machine if not already present
        if (!stateMachine[shape.id]) {
          stateMachine[shape.id] = {
            id: shape.id,
            type: shape.type,
            to: []
          }
        }
        
        // Process each binding to find connections
        bindings.forEach(binding => {
          // A binding connects a 'from' shape to a 'to' shape
          if (binding.fromId === shape.id) {
            // This shape is the source of the binding
            const toShape = editor.getShape(binding.toId)
            if (toShape) {
              stateMachine[shape.id].to.push({
                id: toShape.id,
                type: toShape.type
              })
            }
          }
        })
      })
      
      console.log('State Machine:', stateMachine)
      return stateMachine
    }

    // Calculate icon size based on button dimensions
    const iconSize = Math.min(w, h) * 0.5

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: w,
          height: h,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'all',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme[color].solid,
            color: theme.background,
            borderRadius: '50%',
            cursor: 'pointer',
            boxShadow: `0 2px 4px rgba(0,0,0,0.2)`,
            transition: 'all 0.2s ease',
            userSelect: 'none',
          }}
          onClick={handleButtonClick}
        >
          {/* Play icon SVG */}
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 5.14v14l11-7-11-7z"
              fill={theme.background}
              stroke={theme.background}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </HTMLContainer>
    )
  }

  indicator = (shape: ButtonShape) => {
    return <rect width={shape.props.w} height={shape.props.h} rx={shape.props.w / 2} ry={shape.props.h / 2} />
  }

  override onResize = (shape: ButtonShape, info: TLResizeInfo<ButtonShape>) => {
    // Ensure the button stays circular by using the same value for width and height
    const next = resizeBox(shape, info)
    const size = Math.min(next.props.w, next.props.h)
    return {
      ...next,
      props: {
        ...next.props,
        w: size,
        h: size,
      },
    }
  }
}
