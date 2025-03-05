import { BaseBoxShapeTool } from 'tldraw'

export class TextTool extends BaseBoxShapeTool {
  static override id = 'text-block'
  static override initial = 'idle'
  
  override shapeType = 'text-block'

  getShapeProps() {
    return {
      w: 200,
      h: 100,
      text: 'Text block',
      isInput: true,
    }
  }
} 