import { BaseBoxShapeTool } from 'tldraw'

export class DataTool extends BaseBoxShapeTool {
  static override id = 'data-block'
  static override initial = 'idle'
  
  override shapeType = 'data-block'

  getShapeProps() {
    return {
      w: 250,
      h: 200,
      text: 'API Request',
      data: {
        url: 'https://api.example.com',
        method: 'GET',
        headers: {},
        body: '',
      },
    }
  }
} 