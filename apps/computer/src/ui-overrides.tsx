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
      icon: 'instruction',
      label: 'Instruction',
      kbd: 'g',
      onSelect: () => {
        editor.setCurrentTool('instruction')
      },
    }
    tools['button'] = {
      id: 'button',
      icon: 'button',
      label: 'Button',
      kbd: 'b',
      onSelect: () => {
        editor.setCurrentTool('button')
      },
    }
    tools['structured-output'] = {
      id: 'structured-output',
      icon: 'structured-output',
      label: 'Structured Output',
      kbd: 's',
      onSelect: () => {
        editor.setCurrentTool('structured-output')
      },
    }
    tools['text-output'] = {
      id: 'text-output',
      icon: 'text-output',
      label: 'Text Output',
      kbd: 't',
      onSelect: () => {
        editor.setCurrentTool('text-output')
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
    const isStructuredOutputSelected = useIsToolSelected(tools['structured-output'])
    const isTextOutputSelected = useIsToolSelected(tools['text-output'])
    
    return (
      <DefaultToolbar {...props}>
        <TldrawUiMenuItem {...tools['instruction']} isSelected={isInstructionSelected} />
        <TldrawUiMenuItem {...tools['button']} isSelected={isButtonSelected} />
        <TldrawUiMenuItem {...tools['structured-output']} isSelected={isStructuredOutputSelected} />
        <TldrawUiMenuItem {...tools['text-output']} isSelected={isTextOutputSelected} />
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
        <TldrawUiMenuItem {...tools['structured-output']} />
        <TldrawUiMenuItem {...tools['text-output']} />
        <DefaultKeyboardShortcutsDialogContent />
      </DefaultKeyboardShortcutsDialog>
    )
  },
} 