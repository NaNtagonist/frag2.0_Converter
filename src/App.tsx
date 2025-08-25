import { useRef, useState } from 'react'
import type { RefObject } from 'react';
import { Button, Flex, message } from 'antd'
import { useBIMViewer } from './useBIMViewer';

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { 
    loadIfc, 
    downloadFragments,
    loadFrag,
    isInitialized
  } = useBIMViewer(containerRef as RefObject<HTMLDivElement>)
  const [loading, setLoading] = useState(false);

  const loadFile = async (file: File, loader: (data: ArrayBuffer, id: string) => Promise<void>, type: 'ifc' | 'frag') => {
    if (!isInitialized) {
      message.error('3D Viewer не готов');
      return;
    }

    setLoading(true);
    try {
      const id = file.name.replace(`.${type}`, '');
      const buffer = await file.arrayBuffer();
      await loader(buffer, id);
      message.success(`Файл ${file.name} успешно загружен`);
    } catch (error) {
      console.error(`Error loading ${type} file:`, error);
      message.error('Ошибка при загрузке файла');
    } finally {
      setLoading(false);
    }
  };

  const requestFile = (accept: string, loader: (data: ArrayBuffer, id: string) => Promise<void>, type: 'ifc' | 'frag') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = async (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (!files?.length) return;
      await loadFile(files[0], loader, type);
    };
    input.click();
  };

  return (
    <div style={{ 
                width: '100%', 
                height: '100vh',
                position: 'relative',
                display:'flex',
                flexDirection: 'column'
            }}>
      {/* Контейнер для 3D просмотра */}
      <div 
        ref={containerRef} 
        style={{ 
                flex:1,
                width: '100%', 
                minHeight: 0,
                position: 'relative',
                overflow: 'hidden'
            }}
      />
      
      <Flex 
        gap="middle" 
        vertical
        style={{ 
                  width: '100%', 
                  height: '10rem',
                  position: 'relative',
                  overflow: 'hidden'
              }}
      >
        <Button 
          onClick={() => requestFile('.ifc', loadIfc, 'ifc')} 
          loading={loading}
          disabled={!isInitialized}
        >
          Загрузить IFC
        </Button>
        <Button 
          onClick={() => requestFile('.frag', loadFrag, 'frag')}
          loading={loading}
          disabled={!isInitialized}
        >
          Загрузить FRAG
        </Button>
        <Button 
          onClick={downloadFragments} 
          disabled={!isInitialized}
        >
          Скачать FRAG
        </Button>
      </Flex>
      
      {!isInitialized && <div style={{ marginTop: '10px' }}>Инициализация 3D Viewer...</div>}
    </div>
  )
}

export default App