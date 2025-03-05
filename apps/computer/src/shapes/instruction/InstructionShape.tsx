import React from 'react'
import {
  DefaultColorStyle,
  DefaultFontStyle,
  DefaultSizeStyle,
  HTMLContainer,
  RecordProps,
  Rectangle2d,
  ShapeUtil,
  T,
  TLBaseShape,
  TLDefaultColorStyle,
  TLDefaultFontStyle,
  TLDefaultSizeStyle,
  TLRecord,
  TLResizeInfo,
  resizeBox,
  useDefaultColorTheme,
  useValue
} from 'tldraw'

// Font sizes for different text sizes
const FONT_SIZES: Record<TLDefaultSizeStyle, number> = {
  s: 14,
  m: 18,
  l: 24,
  xl: 32,
}

// Type definition for the instruction block shape
export type InstructionShape = TLBaseShape<
  'instruction',
  {
    w: number
    h: number
    prompt: string
    isGenerating: boolean
    size: TLDefaultSizeStyle
    color: TLDefaultColorStyle
    font: TLDefaultFontStyle
  }
>

// Props validation for the instruction block shape
export const instructionShapeProps: RecordProps<InstructionShape> = {
  w: T.number,
  h: T.number,
  prompt: T.string,
  isGenerating: T.boolean,
  size: DefaultSizeStyle,
  color: DefaultColorStyle,
  font: DefaultFontStyle,
}

// Migrations for the instruction block shape
export const instructionShapeMigrations = {
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

// Instruction block shape utility class
export class InstructionShapeUtil extends ShapeUtil<InstructionShape> {
  static override type = 'instruction' as const
  static override props = instructionShapeProps
  static override migrations = instructionShapeMigrations

  override isAspectRatioLocked = (_shape: InstructionShape): boolean => {
    return false
  }

  override canResize = (_shape: InstructionShape): boolean => {
    return true
  }
  
  override canEdit = (): boolean => {
    return true
  }

  getDefaultProps = (): InstructionShape['props'] => {
    return {
      w: 300,
      h: 200,
      prompt: 'a creative story about a robot learning to paint.',
      isGenerating: false,
      size: 'm',
      color: 'black',
      font: 'draw',
    }
  }

  getGeometry = (shape: InstructionShape) => {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component = (shape: InstructionShape) => {
    const { w, h, prompt, isGenerating, size, color, font } = shape.props
    const theme = useDefaultColorTheme()
    const isEditing = this.editor.getEditingShapeId() === shape.id
    const isDarkMode = useValue('isDarkMode', () => this.editor.user.getIsDarkMode(), [])

    // Get font family based on the selected font style
    const getFontFamily = (font: TLDefaultFontStyle) => {
      switch (font) {
        case 'draw':
          return 'var(--tl-font-draw)'
        case 'sans':
          return 'var(--tl-font-sans)'
        case 'serif':
          return 'var(--tl-font-serif)'
        case 'mono':
          return 'var(--tl-font-mono)'
        default:
          return 'var(--tl-font-sans)'
      }
    }

    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const editor = this.editor
      editor.updateShape<InstructionShape>({
        id: shape.id,
        type: 'instruction',
        props: {
          prompt: e.target.value,
        },
      })
    }

    const handleContainerClick = (e: React.MouseEvent) => {
      this.editor.setEditingShape(shape.id)
    }

    return (
      <HTMLContainer
        id={shape.id}
        onClick={handleContainerClick}
        style={{
          width: w,
          height: h,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: theme.background,
          border: `2px solid ${theme[color].solid}`,
          borderRadius: '8px',
          padding: '8px',
          fontFamily: getFontFamily(font),
          color: theme.text,
          overflow: 'hidden',
          pointerEvents: 'all',
          cursor: isEditing ? 'text' : 'pointer',
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
              fontSize: FONT_SIZES[size],
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: theme[color].solid,
              fontFamily: getFontFamily(font),
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={theme[color].solid}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Instruction
          </div>
          <div
            style={{
              fontSize: '12px',
              color: theme[color].solid,
              opacity: 0.7,
              fontFamily: getFontFamily(font),
            }}
          >
            AI Block
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flex: 1,
          }}
        >
          <div style={{ flex: 1 }}>
            <textarea
              value={prompt}
              onChange={handlePromptChange}
              style={{
                width: '100%',
                height: 'calc(100% - 12px)',
                backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'white',
                borderRadius: '4px',
                padding: '8px',
                fontSize: Math.max(12, FONT_SIZES[size] * 0.8),
                border: `1px solid ${theme[color].solid}`,
                resize: 'none',
                fontFamily: getFontFamily(font),
                color: theme[color].solid,
                outline: 'none',
              }}
              placeholder="Enter your prompt here..."
              onFocus={(e) => {
                if (isEditing) {
                  e.currentTarget.select()
                }
              }}
            />
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator = (shape: InstructionShape) => {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />
  }

  override onResize = (shape: InstructionShape, info: TLResizeInfo<InstructionShape>) => {
    return resizeBox(shape, info)
  }
}
