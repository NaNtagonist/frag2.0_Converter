import { useEffect, useRef, useState } from "react";
import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import type { RefObject } from "react";
import * as OBCF from "@thatopen/components-front";
import * as BUIC from "@thatopen/ui-obc";
import * as OBF from "@thatopen/fragments";

export function useBIMViewer(containerRef: RefObject<HTMLDivElement>) {
  const componentsRef = useRef<OBC.Components | null>(null);
  const worldRef = useRef<any>(null);
  const fragmentsRef = useRef<any>(null);
  const ifcRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const loadIfc = async (data: ArrayBuffer, id: string) => {
    if (!ifcRef.current) {
      console.error("IFC Loader not initialized");
      return;
    }

    try {
      const buffer = new Uint8Array(data);
      console.log(data);
      await ifcRef.current.load(buffer, false, id, {
        processData: {
          progressCallback: (progress: any) =>
            console.log(Math.floor(progress * 100)),
        },
      });
    } catch (error) {
      console.error("Error loading IFC:", error);
      throw error;
    }
  };

  const loadFrag = async (data: ArrayBuffer, id: string) => {
    if (!fragmentsRef.current) {
      console.error("Fragments manager not initialized");
      return;
    }

    try {
      await fragmentsRef.current.core.load(data, { modelId: id });
      console.log(`Fragments model ${id} loaded successfully`);
    } catch (error) {
      console.error("Error loading fragments:", error);
      throw error;
    }
  };

  const downloadFragments = async () => {
    if (!fragmentsRef.current) {
      console.error("Fragments manager not initialized");
      return;
    }

    const [model] = fragmentsRef.current.list.values();
    if (!model) {
      console.error("No fragments model to download");
      return;
    }

    try {
      console.log(model);
      const fragsBuffer = await model.getBuffer(false);
      const file = new File([fragsBuffer], `${model.modelId}.frag`);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(file);
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Error downloading fragments:", error);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const init = async () => {
      try {
        const components = new OBC.Components();
        componentsRef.current = components;

        const worlds = components.get(OBC.Worlds);
        const world = worlds.create<
          OBC.SimpleScene,
          OBC.OrthoPerspectiveCamera,
          OBC.SimpleRenderer
        >();

        world.name = "main";

        world.scene = new OBC.SimpleScene(components);
        world.scene.setup();
        world.scene.three.background = null;
        worldRef.current = world;

        world.renderer = new OBC.SimpleRenderer(
          components,
          containerRef.current!
        );
        world.camera = new OBC.OrthoPerspectiveCamera(components);
        await world.camera.controls.setLookAt(78, 20, -2.2, 26, -4, 25);

        components.init();
        components.get(OBC.Grids).create(world);

        const ifcLoader = components.get(OBC.IfcLoader);
        await ifcLoader.setup({
          autoSetWasm: false,
          wasm: {
            path: "https://unpkg.com/web-ifc@0.0.70/",
            absolute: true,
          },
        });
        ifcRef.current = ifcLoader;

        const fragments = components.get(OBC.FragmentsManager);

        const githubUrl =
          "/node_modules/@thatopen/fragments/dist/Worker/worker.mjs";
        const fetchedUrl = await fetch(githubUrl);
        const workerBlob = await fetchedUrl.blob();
        const workerFile = new File([workerBlob], "worker.mjs", {
          type: "text/javascript",
        });
        const workerUrl = URL.createObjectURL(workerFile);
        fragments.init(workerUrl);
        fragmentsRef.current = fragments;
        console.log(fragments.core);
        world.camera.controls.addEventListener("rest", () =>
          fragments.core.update(true)
        );
        // const aboba = components.get(OBC.Items)
        fragments.list.onItemSet.add(({ value: model }) => {
          model.useCamera(world.camera.three);
          world.scene.three.add(model.object);
          fragments.core.update(true);
        });

        setIsInitialized(true);

        const [propertiesTable, updatePropertiesTable] = BUIC.tables.itemsData({
          components,
          modelIdMap: {},
        });

        propertiesTable.preserveStructureOnFilter = true;
        propertiesTable.indentationInText = false;

        const highlighter = components.get(OBCF.Highlighter);
        highlighter.setup({ world });

        highlighter.events.select.onHighlight.add((fragmentIdMap) => {
          const entries = Object.entries(fragmentIdMap);

          for (const [model, fragmentIds] of entries) {
            console.log("Выбрана модель:", model);
            console.log("ID фрагментов:", fragmentIds);

            // Получение свойств модели
            const properties = model.properties;
            if (properties) {
              console.log("Свойства модели:", properties);
            }

            // Получение информации о геометрии
            const geometry = model.geometry;
            console.log("Геометрическая информация:", geometry);
          }
        });

        highlighter.events.select.onClear.add(() =>
          updatePropertiesTable({ modelIdMap: {} })
        );
      } catch (error) {
        console.error("Failed to initialize BIM viewer:", error);
      }
    };

    init();

    return () => {
      // Cleanup
      if (componentsRef.current) {
        componentsRef.current.dispose();
      }
    };
  }, [containerRef]);

  return {
    components: componentsRef.current,
    world: worldRef.current,
    fragments: fragmentsRef.current,
    isInitialized,
    loadIfc,
    downloadFragments,
    loadFrag,
  };
}
