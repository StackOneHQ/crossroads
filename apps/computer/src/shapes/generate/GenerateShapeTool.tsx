import { BaseBoxShapeTool } from 'tldraw'

export class GenerateTool extends BaseBoxShapeTool {
  static override id = 'generate-block'
  static override initial = 'idle'
  
  override shapeType = 'generate-block'

  getShapeProps() {
    return {
      w: 300,
      h: 200,
      prompt: 'Enter your prompt here...',
      outputSchema: '',
      isGenerating: false,
    }
  }
} 