import { BaseBoxShapeTool } from "tldraw"

// Start block tool class
export class StartTool extends BaseBoxShapeTool {
  static override id = 'start-block'
  static override initial = 'idle'
  
  override shapeType = 'start-block'

  getShapeProps() {
    return {
      w: 180,
      h: 80,
      isRunning: false,
    }
  }
} 