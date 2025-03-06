import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';
import { EditorInitializer } from './components/EditorInitializer';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { customShapeUtils, customTools } from './shapes';
import { components, uiOverrides } from './ui-overrides';

const App = (): JSX.Element => {
  return (
    <WebSocketProvider>
      <div style={{ position: 'fixed', inset: 0 }}>
        <Tldraw
          shapeUtils={customShapeUtils}
          tools={customTools}
          overrides={uiOverrides}
          components={components}
          autoFocus
          assetUrls={{
            icons: {
              'play': '/play-icon.svg',
              'instruction': '/instruction-icon.svg',
              'button': '/button-icon.svg',
              'structured-output': '/structured-output-icon.svg',
              'text-output': '/text-output-icon.svg',
            },
          }}
        >
          <EditorInitializer />
        </Tldraw>
      </div>
    </WebSocketProvider>
  );
};

export default App; 