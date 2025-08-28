import { useRef, useState } from "react";
import type { RefObject } from "react";
import { Button, Grid, message } from "antd";
import { useBIMViewer } from "./useBIMViewer";

const { useBreakpoint } = Grid;

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    loadIfc,
    downloadFragments,
    loadFrag,
    isInitialized,
    machineFinder,
    resetCustomHighlighter,
    applyCustomHighlight,
    startColorAnimation,
    stopColorAnimation,
  } = useBIMViewer(containerRef as RefObject<HTMLDivElement>);
  const [loading, setLoading] = useState(false);
  const screens = useBreakpoint();

  const loadFile = async (
    file: File,
    loader: (data: ArrayBuffer, id: string) => Promise<void>,
    type: "ifc" | "frag"
  ) => {
    if (!isInitialized) {
      message.error("3D Viewer не готов");
      return;
    }

    setLoading(true);
    try {
      const id = file.name.replace(`.${type}`, "");
      const buffer = await file.arrayBuffer();
      console.log(id);
      await loader(buffer, id);
      message.success(`Файл ${file.name} успешно загружен`);
    } catch (error) {
      console.error(`Error loading ${type} file:`, error);
      message.error("Ошибка при загрузке файла");
    } finally {
      setLoading(false);
    }
  };

  const requestFile = (
    accept: string,
    loader: (data: ArrayBuffer, id: string) => Promise<void>,
    type: "ifc" | "frag"
  ) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = async (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (!files?.length) return;
      await loadFile(files[0], loader, type);
    };
    input.click();
  };

  // Определяем количество колонок в зависимости от размера экрана
  const gridColumns = screens.xl ? 4 : screens.lg ? 3 : screens.md ? 2 : 1;

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Контейнер для 3D просмотра */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          width: "100%",
          minHeight: 0,
          position: "relative",
          overflow: "hidden",
        }}
      />

      {/* Сетка для кнопок */}
      <div
        style={{
          padding: "1rem",
          backgroundColor: "#f5f5f5",
          borderTop: "1px solid #d9d9d9",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
            gap: "12px",
          }}
        >
          <Button
            onClick={() => requestFile(".ifc", loadIfc, "ifc")}
            loading={loading}
            disabled={!isInitialized}
            block
          >
            Загрузить IFC
          </Button>
          <Button
            onClick={() => requestFile(".frag", loadFrag, "frag")}
            loading={loading}
            disabled={!isInitialized}
            block
          >
            Загрузить FRAG
          </Button>
          <Button onClick={downloadFragments} disabled={!isInitialized} block>
            Скачать FRAG
          </Button>
          <Button onClick={machineFinder} disabled={!isInitialized} block>
            Станки
          </Button>
          <Button
            onClick={applyCustomHighlight}
            disabled={!isInitialized}
            block
          >
            Красный
          </Button>
          <Button
            onClick={() => {
              resetCustomHighlighter(false);
            }}
            disabled={!isInitialized}
            block
          >
            Снять красный
          </Button>
          <Button onClick={startColorAnimation} disabled={!isInitialized} block>
            Светофор
          </Button>
          <Button onClick={stopColorAnimation} disabled={!isInitialized} block>
            Отключить светофор
          </Button>
        </div>
      </div>

      {!isInitialized && (
        <div style={{ marginTop: "10px", padding: "0 1rem" }}>
          Инициализация 3D Viewer...
        </div>
      )}
    </div>
  );
}

export default App;
