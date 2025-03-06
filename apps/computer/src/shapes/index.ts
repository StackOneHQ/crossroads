import { ButtonShape, ButtonShapeUtil } from './button/ButtonShape';
import { ButtonTool } from './button/ButtonShapeTool';
import { InstructionShape, InstructionShapeUtil } from './instruction/InstructionShape';
import { InstructionTool } from './instruction/InstructionShapeTool';
import { StructuredOutputShape, StructuredOutputShapeUtil } from './structured-output/StructuredOutputShape';
import { StructuredOutputTool } from './structured-output/StructuredOutputShapeTool';
import { TextOutputShape, TextOutputShapeUtil } from './text-output/TextOutputShape';
import { TextOutputTool } from './text-output/TextOutputShapeTool';

// Export all shape types
export type CustomShapeTypes = InstructionShape | ButtonShape | StructuredOutputShape | TextOutputShape

// Export all shape utils
export const customShapeUtils = [
  InstructionShapeUtil, 
  ButtonShapeUtil,
  StructuredOutputShapeUtil,
  TextOutputShapeUtil,
];

// Export all tools
export const customTools = [
  InstructionTool,
  ButtonTool,
  StructuredOutputTool,
  TextOutputTool,
];

// Export individual components
export { ButtonShapeUtil } from './button/ButtonShape';
export { ButtonTool } from './button/ButtonShapeTool';
export { InstructionShapeUtil } from './instruction/InstructionShape';
export { InstructionTool } from './instruction/InstructionShapeTool';
export { StructuredOutputShapeUtil } from './structured-output/StructuredOutputShape';
export { StructuredOutputTool } from './structured-output/StructuredOutputShapeTool';
export { TextOutputShapeUtil } from './text-output/TextOutputShape';
export { TextOutputTool } from './text-output/TextOutputShapeTool';


