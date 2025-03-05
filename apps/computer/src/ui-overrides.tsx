import {
  DefaultKeyboardShortcutsDialog,
  DefaultKeyboardShortcutsDialogContent,
  DefaultToolbar,
  DefaultToolbarContent,
  TLComponents,
  TLUiOverrides,
  TldrawUiMenuItem,
  useIsToolSelected,
  useTools,
} from 'tldraw'

export const uiOverrides: TLUiOverrides = {
  tools(editor, tools) {
    // Create tool items in the ui's context
    tools.startBlock = {
      id: 'start-block',
      icon: 'play',
      label: 'Start Block',
      kbd: 's',
      onSelect: () => {
        editor.setCurrentTool('start-block')
      },
    }
    
    tools.data = {
      id: 'data-block',
      icon: 'database',
      label: 'Data Block',
      kbd: 'd',
      onSelect: () => {
        editor.setCurrentTool('data-block')
      },
    }
    
    tools.generateBlock = {
      id: 'generate-block',
      icon: 'sparkles',
      label: 'Generate Block',
      kbd: 'g',
      onSelect: () => {
        editor.setCurrentTool('generate-block')
      },
    }
    
    tools.textBlock = {
      id: 'text-block',
      icon: 'text',
      label: 'Text Block',
      kbd: 't',
      onSelect: () => {
        editor.setCurrentTool('text-block')
      },
    }
    
    return tools
  },
}

export const components: TLComponents = {
  Toolbar: (props) => {
    const tools = useTools()
    const isStartBlockSelected = useIsToolSelected(tools['startBlock'])
    const isDataSelected = useIsToolSelected(tools['data'])
    const isGenerateBlockSelected = useIsToolSelected(tools['generateBlock'])
    const isTextBlockSelected = useIsToolSelected(tools['textBlock'])
    
    return (
      <DefaultToolbar {...props}>
        <TldrawUiMenuItem {...tools['startBlock']} isSelected={isStartBlockSelected} />
        <TldrawUiMenuItem {...tools['data']} isSelected={isDataSelected} />
        <TldrawUiMenuItem {...tools['generateBlock']} isSelected={isGenerateBlockSelected} />
        <TldrawUiMenuItem {...tools['textBlock']} isSelected={isTextBlockSelected} />
        <DefaultToolbarContent />
      </DefaultToolbar>
    )
  },
  KeyboardShortcutsDialog: (props) => {
    const tools = useTools()
    return (
      <DefaultKeyboardShortcutsDialog {...props}>
        <TldrawUiMenuItem {...tools['startBlock']} />
        <TldrawUiMenuItem {...tools['data']} />
        <TldrawUiMenuItem {...tools['generateBlock']} />
        <TldrawUiMenuItem {...tools['textBlock']} />
        <DefaultKeyboardShortcutsDialogContent />
      </DefaultKeyboardShortcutsDialog>
    )
  },
} 