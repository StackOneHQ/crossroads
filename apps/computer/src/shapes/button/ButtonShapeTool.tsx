import { BaseBoxShapeTool } from 'tldraw'

export class ButtonTool extends BaseBoxShapeTool {
  static override id = 'button'
  static override initial = 'idle'
  
  override shapeType = 'button'

  getShapeProps() {
    return {
      w: 60,
      h: 60,
    }
  }
}
