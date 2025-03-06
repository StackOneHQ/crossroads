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

// Type definition for the structured output block shape
export type StructuredOutputShape = TLBaseShape<
  'structured-output',
  {
    w: number
    h: number
    data: string
    isLoading: boolean
    size: TLDefaultSizeStyle
    color: TLDefaultColorStyle
    font: TLDefaultFontStyle
  }
>

// Props validation for the structured output block shape
export const structuredOutputShapeProps: RecordProps<StructuredOutputShape> = {
  w: T.number,
  h: T.number,
  data: T.string,
  isLoading: T.boolean,
  size: DefaultSizeStyle,
  color: DefaultColorStyle,
  font: DefaultFontStyle,
}

// Migrations for the structured output block shape
export const structuredOutputShapeMigrations = {
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

// Structured output block shape utility class
export class StructuredOutputShapeUtil extends ShapeUtil<StructuredOutputShape> {
  static override type = 'structured-output' as const
  static override props = structuredOutputShapeProps
  static override migrations = structuredOutputShapeMigrations

  override isAspectRatioLocked = (_shape: StructuredOutputShape): boolean => {
    return false
  }

  override canResize = (_shape: StructuredOutputShape): boolean => {
    return true
  }
  
  override canEdit = (): boolean => {
    return false
  }

  getDefaultProps = (): StructuredOutputShape['props'] => {
    return {
      w: 300,
      h: 200,
      data: '{}',
      isLoading: false,
      size: 'm',
      color: 'blue',
      font: 'mono',
    }
  }

  getGeometry = (shape: StructuredOutputShape) => {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component = (shape: StructuredOutputShape) => {
    const { w, h, data, isLoading, size, color, font } = shape.props
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
          return 'var(--tl-font-mono)'
      }
    }

    // Format JSON data for display
    const formatData = (data: string): string => {
      try {
        const parsed = JSON.parse(data)
        return JSON.stringify(parsed, null, 2)
      } catch (e) {
        return data
      }
    }

    const formattedData = formatData(data)

    // Set loading state
    const setLoading = (loading: boolean) => {
      this.editor.updateShape<StructuredOutputShape>({
        id: shape.id,
        type: 'structured-output',
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
              <path d="M2 20h20M2 4h20M4 12h10M4 8h16M4 16h16" />
            </svg>
            Structured Output
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
              data={data} 
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
              {isLoading ? 'Loading...' : 'JSON Data'}
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
              fontFamily: getFontFamily('mono'),
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
              formattedData
            )}
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator = (shape: StructuredOutputShape) => {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />
  }

  override onResize = (shape: StructuredOutputShape, info: TLResizeInfo<StructuredOutputShape>) => {
    return resizeBox(shape, info)
  }
} 