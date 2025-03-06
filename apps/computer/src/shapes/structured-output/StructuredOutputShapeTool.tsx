import { BaseBoxShapeTool } from 'tldraw'

export class StructuredOutputTool extends BaseBoxShapeTool {
  static override id = 'structured-output'
  static override initial = 'idle'
  
  override shapeType = 'structured-output'

  getShapeProps() {
    return {
      w: 300,
      h: 200,
      data: '{}',
      isLoading: false,
    }
  }
} 