import { BaseBoxShapeTool } from 'tldraw'

export class TextOutputTool extends BaseBoxShapeTool {
  static override id = 'text-output'
  static override initial = 'idle'
  
  override shapeType = 'text-output'

  getShapeProps() {
    return {
      w: 300,
      h: 200,
      text: '',
      isLoading: false,
    }
  }
} 