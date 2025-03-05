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
    tools['instruction-block'] = {
      id: 'instruction-block',
      icon: 'color',
      label: 'Instruction Block',
      kbd: 'g',
      onSelect: () => {
        editor.setCurrentTool('instruction-block')
      },
    }
    return tools
  },
}

export const components: TLComponents = {
  Toolbar: (props) => {
    const tools = useTools()
    const isInstructionBlockSelected = useIsToolSelected(tools['instruction-block'])
    
    return (
      <DefaultToolbar {...props}>
        <TldrawUiMenuItem {...tools['instruction-block']} isSelected={isInstructionBlockSelected} />
        <DefaultToolbarContent />
      </DefaultToolbar>
    )
  },
  KeyboardShortcutsDialog: (props) => {
    const tools = useTools()
    return (
      <DefaultKeyboardShortcutsDialog {...props}>
        <TldrawUiMenuItem {...tools['instruction-block']} />
        <DefaultKeyboardShortcutsDialogContent />
      </DefaultKeyboardShortcutsDialog>
    )
  },
} 