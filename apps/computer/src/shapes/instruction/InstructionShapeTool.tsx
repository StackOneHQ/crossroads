import { BaseBoxShapeTool } from 'tldraw'

export class InstructionTool extends BaseBoxShapeTool {
  static override id = 'instruction'
  static override initial = 'idle'
  
  override shapeType = 'instruction'

  getShapeProps() {
    return {
      w: 300,
      h: 200,
      prompt: 'Enter your prompt here...',
      isGenerating: false,
    }
  }
} 