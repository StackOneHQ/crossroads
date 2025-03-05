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
    tools['instruction'] = {
      id: 'instruction',
      icon: 'color',
      label: 'Instruction',
      kbd: 'g',
      onSelect: () => {
        editor.setCurrentTool('instruction')
      },
    }
    tools['button'] = {
      id: 'button',
      icon: 'play',
      label: 'Button',
      kbd: 'b',
      onSelect: () => {
        editor.setCurrentTool('button')
      },
    }
    return tools
  },
}

export const components: TLComponents = {
  Toolbar: (props) => {
    const tools = useTools()
    const isInstructionSelected = useIsToolSelected(tools['instruction'])
    const isButtonSelected = useIsToolSelected(tools['button'])
    return (
      <DefaultToolbar {...props}>
        <TldrawUiMenuItem {...tools['instruction']} isSelected={isInstructionSelected} />
        <TldrawUiMenuItem {...tools['button']} isSelected={isButtonSelected} />
        <DefaultToolbarContent />
      </DefaultToolbar>
    )
  },
  KeyboardShortcutsDialog: (props) => {
    const tools = useTools()
    return (
      <DefaultKeyboardShortcutsDialog {...props}>
        <TldrawUiMenuItem {...tools['instruction']} />
        <TldrawUiMenuItem {...tools['button']} />
        <DefaultKeyboardShortcutsDialogContent />
      </DefaultKeyboardShortcutsDialog>
    )
  },
} 