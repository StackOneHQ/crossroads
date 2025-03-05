import { useCallback } from 'react'
import {
  BaseBoxShapeUtil,
  HTMLContainer,
  TLBaseShape,
  TLOnResizeHandler,
  TLRecord,
  getDefaultColorTheme,
  toDomPrecision,
  useIsEditing,
  useValue,
} from 'tldraw'

import { RecordProps, T } from 'tldraw'


// Migrations for the custom data block shape
export const dataShapeMigrations = {
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

// A type for our custom data block shape
export type DataShape = TLBaseShape<
  'data-block',
  {
    w: number
    h: number
    text: string
    data: Record<string, unknown>
  }
> 

// Validation for our custom data block shape's props
export const dataShapeProps: RecordProps<DataShape> = {
  w: T.number,
  h: T.number,
  text: T.string,
  data: T.dict(T.string, T.unknown),
} 

// Create a util class for the shape
export class DataShapeUtil extends BaseBoxShapeUtil<DataShape> {
  static override type = 'data-block' as const

  // Default props for the shape
  getDefaultProps(): DataShape['props'] {
    return {
      w: 200,
      h: 150,
      text: 'Data',
      data: { value: 0 },
    }
  }

  // Handle resizing
  onResize: TLOnResizeHandler<DataShape> = (shape, info) => {
    return {
      props: {
        w: Math.max(50, info.newPoint.x - shape.x),
        h: Math.max(50, info.newPoint.y - shape.y),
      }
    }
  }

  // Component for the shape
  component(shape: DataShape) {
    const theme = getDefaultColorTheme({
      isDarkMode: false,
    })

    const isEditing = useIsEditing(shape.id)
    const data = useValue('data', () => shape.props.data, [shape.id, shape.props.data])

    const handlePointerDown = useCallback(() => {
      if (!isEditing) {
        // Log the data when the block is clicked
        console.log('Data Block data:', data)
      }
    }, [isEditing, data])

    const { w, h } = shape.props

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: toDomPrecision(w),
          height: toDomPrecision(h),
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: theme.background,
            borderRadius: 8,
            border: `2px solid ${theme.green.solid}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            pointerEvents: 'all',
            fontFamily: 'sans-serif',
            color: theme.text,
            cursor: isEditing ? 'text' : 'pointer',
            position: 'relative',
          }}
          onPointerDown={handlePointerDown}
        >
          <div
            style={{
              fontWeight: 'bold',
              fontSize: '1.2em',
              marginBottom: 8,
            }}
          >
            {shape.props.text}
          </div>
          <div
            style={{
              fontSize: '0.9em',
              backgroundColor: theme.background,
              padding: 8,
              borderRadius: 4,
              border: `1px solid ${theme.green.solid}`,
              width: '100%',
              overflow: 'auto',
              maxHeight: h - 80,
            }}
          >
            <pre style={{ margin: 0 }}>{JSON.stringify(data, null, 2)}</pre>
          </div>
        </div>
      </HTMLContainer>
    )
  }

  // Indicator for the shape
  indicator(shape: DataShape) {
    return (
      <rect
        width={toDomPrecision(shape.props.w)}
        height={toDomPrecision(shape.props.h)}
        rx={8}
        ry={8}
      />
    )
  }
} 