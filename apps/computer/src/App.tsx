import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';
import { customShapeUtils, customTools } from './shapes';
import { components, uiOverrides } from './ui-overrides';

const App = (): JSX.Element => {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw
        shapeUtils={customShapeUtils}
        tools={customTools}
        overrides={uiOverrides}
        components={components}
        autoFocus
      />
    </div>
  );
};

export default App; 