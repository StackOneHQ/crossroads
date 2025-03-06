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
import { PlayButton } from '../../components/PlayButton'

// Font sizes for different text sizes
const FONT_SIZES: Record<TLDefaultSizeStyle, number> = {
  s: 14,
  m: 18,
  l: 24,
  xl: 32,
}

// Type definition for the text output block shape
export type TextOutputShape = TLBaseShape<
  'text-output',
  {
    w: number
    h: number
    text: string
    isLoading: boolean
    size: TLDefaultSizeStyle
    color: TLDefaultColorStyle
    font: TLDefaultFontStyle
  }
>

// Props validation for the text output block shape
export const textOutputShapeProps: RecordProps<TextOutputShape> = {
  w: T.number,
  h: T.number,
  text: T.string,
  isLoading: T.boolean,
  size: DefaultSizeStyle,
  color: DefaultColorStyle,
  font: DefaultFontStyle,
}

// Migrations for the text output block shape
export const textOutputShapeMigrations = {
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

// Text output block shape utility class
export class TextOutputShapeUtil extends ShapeUtil<TextOutputShape> {
  static override type = 'text-output' as const
  static override props = textOutputShapeProps
  static override migrations = textOutputShapeMigrations

  override isAspectRatioLocked = (_shape: TextOutputShape): boolean => {
    return false
  }

  override canResize = (_shape: TextOutputShape): boolean => {
    return true
  }
  
  override canEdit = (): boolean => {
    return false
  }

  getDefaultProps = (): TextOutputShape['props'] => {
    return {
      w: 300,
      h: 200,
      text: '',
      isLoading: false,
      size: 'm',
      color: 'green',
      font: 'sans',
    }
  }

  getGeometry = (shape: TextOutputShape) => {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component = (shape: TextOutputShape) => {
    const { w, h, text, isLoading, size, color, font } = shape.props
    const theme = useDefaultColorTheme()
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

    // Set loading state
    const setLoading = (loading: boolean) => {
      this.editor.updateShape<TextOutputShape>({
        id: shape.id,
        type: 'text-output',
        props: {
          isLoading: loading,
        },
      })
    }

    return (
      <HTMLContainer
        id={shape.id}
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
            Text Output
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <PlayButton 
              shapeId={shape.id} 
              data={text} 
              isLoading={isLoading} 
              color={theme[color].solid} 
            />
            <div
              style={{
                fontSize: '12px',
                color: theme[color].solid,
                opacity: 0.7,
                fontFamily: getFontFamily(font),
              }}
            >
              {isLoading ? 'Loading...' : 'Text Data'}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          <div 
            style={{ 
              flex: 1,
              overflow: 'auto',
              backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'white',
              borderRadius: '4px',
              padding: '8px',
              fontSize: Math.max(12, FONT_SIZES[size] * 0.8),
              border: `1px solid ${theme[color].solid}`,
              fontFamily: getFontFamily(font),
              color: theme[color].solid,
              whiteSpace: 'pre-wrap',
            }}
          >
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke={theme[color].solid}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ animation: 'spin 1s linear infinite' }}
                >
                  <style>
                    {`
                      @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                    `}
                  </style>
                  <circle cx="12" cy="12" r="10" strokeWidth="4" stroke={theme[color].solid} strokeOpacity="0.2" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              </div>
            ) : (
              text
            )}
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator = (shape: TextOutputShape) => {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />
  }

  override onResize = (shape: TextOutputShape, info: TLResizeInfo<TextOutputShape>) => {
    return resizeBox(shape, info)
  }
} 