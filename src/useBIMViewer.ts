import { useCallback, useEffect, useRef, useState } from "react";
import * as OBC from "@thatopen/components";
import type { RefObject } from "react";
import * as OBCF from "@thatopen/components-front";
import * as OBF from "@thatopen/fragments";
import * as THREE from "three";

export function useBIMViewer(containerRef: RefObject<HTMLDivElement>) {
  const animationTimeoutRef = useRef<number | null>(null);
  const currentColorIndexRef = useRef(0);
  const componentsRef = useRef<OBC.Components | null>(null);
  const highlighterRef = useRef<OBCF.Highlighter | null>(null);
  const worldRef = useRef<OBC.SimpleWorld<
    OBC.SimpleScene,
    OBC.OrthoPerspectiveCamera,
    OBC.SimpleRenderer
  > | null>(null);
  const fragmentsRef = useRef<OBC.FragmentsManager>(null);
  const ifcRef = useRef<OBC.IfcLoader>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const customHighlighterName = "Red";
  const foundMachinesRef = useRef<OBC.ModelIdMap>({});

  const loadIfc = useCallback(async (data: ArrayBuffer, id: string) => {
    if (!ifcRef.current) {
      console.error("IFC Loader not initialized");
      return;
    }

    try {
      const buffer = new Uint8Array(data);
      console.log(data);
      await ifcRef.current.load(buffer, false, id, {
        processData: {
          progressCallback: (progress: number) =>
            console.log(Math.floor(progress * 100)),
        },
      });
    } catch (error) {
      console.error("Error loading IFC:", error);
      throw error;
    }
  }, []);

  const loadFrag = useCallback(async (data: ArrayBuffer, id: string) => {
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
  }, []);

  const downloadFragments = useCallback(async () => {
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
  }, []);

  const machineFinder = async () => {
    if (!componentsRef.current) {
      return;
    }

    const finder = componentsRef.current.get(OBC.ItemsFinder);
    const fragments = componentsRef.current.get(OBC.FragmentsManager);

    finder?.create("Станки", [
      {
        categories: [/BUILDINGELEMENTPROXY/],
        attributes: {
          queries: [{ name: /Name/, value: /_/i }],
        },
      },
    ]);

    const getResult = async (name: string) => {
      const finderQuery = finder?.list.get(name);
      if (!finderQuery) return {};
      const result = await finderQuery.test();
      console.log("Finder result:", result);
      return result;
    };

    try {
      const modelIdMap = await getResult("Станки");
      foundMachinesRef.current = modelIdMap;
      const entries1 = Object.entries(modelIdMap);
      const promises1 = [];
      for (const [modelUUID, elementIdsSet] of entries1) {
        const modelMain = fragments.list.get(modelUUID);
        console.log(modelMain);
        // const entries2 = Object.entries(modelMain);
        console.log(fragments.list.get(modelUUID));
        const a = fragments.list.get(modelUUID);
        if (a) {
          console.log(a.getItemsData([...elementIdsSet]));
          const b = a.getItemsData([...elementIdsSet]);
          b.then(async (result) => {
            console.log(result, typeof result);
            const c = Object.values(result);
            for (let i = 0; i < c.length; i++) {
              const data = c[i];
              console.log(data);
              console.log(data["_guid"].value);
              // const flatData = data.flat();
              // console.log(flatData[0]._guid.value);
            }
          }).catch((err) => {
            console.error("Ошибка:", err);
          });
        }
      }
      // let entries2 = Object.entries(modelMain);
      // for (const [modelId1, localIds1] of entries2) {
      //   console.log(localIds1);
      //   const moel1 = fragments.list.get(modelId1);
      //   if (!moel1) continue;
      //   console.log(moel1);
      //   //    const data = (await Promise.all(moel1.getItemsData([...localIds]))).flat();
      //   // console.log(data[0]._guid.value);
      // }

      const values1 = Object.values(modelIdMap);
      const array1 = [...values1[0]];
      console.log(array1);
      for (let x = 0; x <= array1.length; x++) {
        const promises = [];
        for (const [modelId, localIds] of Object.entries(array1[x])) {
          console.log(array1[x]);
          console.log(Object.entries(array1[x]));
          const model = fragments.list.get(modelId);
          console.log(model);
          if (!model) continue;
          promises.push(model.getItemsData([...localIds]));
        }

        const data = (await Promise.all(promises)).flat();
        console.log(data[0]._guid.value);
      }
      // Запись найденных станков для будущей окраски в applyCustomHighlight
      const entries = Object.entries(modelIdMap);
      console.log("entries:", entries);
      const highlightMaterial: OBF.MaterialDefinition = {
        color: new THREE.Color("gold"),
        renderedFaces: OBF.RenderedFaces.TWO,
        opacity: 1,
        transparent: false,
      };

      for (const [modelUUID, elementIdsSet] of entries) {
        const model = fragments.list.get(modelUUID);
        if (!model) {
          console.warn(`Model ${modelUUID} not found!`);
          continue;
        }

        const elementIds = Array.from(elementIdsSet as Set<number>);

        console.log(
          `Highlighting ${elementIds.length} elements in model ${modelUUID}`
        );
        // fragments.core.models.materials.list.onItemSet.add((item) => {
        //   console.log(item.value);

        //   // item.value.color = new THREE.Color(0, 0, 0);
        // });

        // Подсветка найденных станков в желтый цвет
        await model.highlight(elementIds as number[], highlightMaterial);
      }
      // const hider = componentsRef.current.get(OBC.Hider);
      // await hider?.isolate(modelIdMap);
    } catch (error) {
      console.error("Error in machineFinder:", error);
    }
  };
  const applyCustomHighlight = async () => {
    const highlighter = highlighterRef.current;
    if (!highlighter) return;
    if (!highlighter.styles.has(customHighlighterName)) return;
    const selection1 = foundMachinesRef.current;
    console.log(selection1);
    const selection = highlighter.selection.select;
    if (OBC.ModelIdMapUtils.isEmpty(selection1)) {
      console.warn("No machines found. Run machine finder first.");
      return;
    }

    await highlighter.highlightByID(customHighlighterName, selection1, false);

    // If you want the selection to become empty after it is colorized
    // with the custom highlighter, add the following code:
    // await highlighter.clear("select");
  };
  const resetCustomHighlighter = async (onlySelected = true) => {
    const highlighter = highlighterRef.current;
    if (!highlighter) return;
    if (!highlighter.styles.has(customHighlighterName)) return;
    const modelIdMap = foundMachinesRef.current;
    await highlighter.clear(
      customHighlighterName,
      onlySelected ? modelIdMap : undefined
    );
    // Just for demo purposes, let's also deselect the elements
    await highlighter.clear("select");
  };
  const startColorAnimation = () => {
    if (animationTimeoutRef.current) {
      console.warn("Animation is already running");
      return;
    }

    const colorStyles = ["Red", "Yellow", "Green"];
    const machinesMap = foundMachinesRef.current;

    // Создаем массив всех элементов для анимации
    const allElements: { modelId: string; elementId: number }[] = [];

    for (const [modelId, elementIds] of Object.entries(machinesMap)) {
      for (const elementId of elementIds as Set<number>) {
        allElements.push({ modelId, elementId: Number(elementId) }); // Явно преобразуем в number
      }
    }

    if (allElements.length === 0) {
      console.warn("No machines found for animation");
      return;
    }

    console.log("Total elements for animation:", allElements.length);

    let currentElementIndex = 0;

    const animate = async () => {
      const highlighter = highlighterRef.current;
      if (!highlighter) return;

      // Получаем текущий элемент
      const currentElement = allElements[currentElementIndex];

      // Создаем временный ModelIdMap только для этого элемента
      const tempMap: OBC.ModelIdMap = {
        [currentElement.modelId]: new Set([currentElement.elementId]),
      };

      console.log(
        `Animating element ${currentElementIndex + 1}/${allElements.length}:`,
        currentElement
      );

      // Применяем текущий цвет к этому элементу
      try {
        await highlighter.highlightByID(
          colorStyles[currentColorIndexRef.current],
          tempMap,
          false
        );
      } catch (error) {
        console.error("Error highlighting element:", error, currentElement);
      }

      // Меняем цвет для следующего элемента
      currentColorIndexRef.current =
        (currentColorIndexRef.current + 1) % colorStyles.length;

      // Переходим к следующему элементу
      currentElementIndex = (currentElementIndex + 1) % allElements.length;

      // Устанавливаем следующий вызов
      animationTimeoutRef.current = window.setTimeout(animate, 100);
    };

    // Запускаем анимацию
    animate();
  };

  const stopColorAnimation = () => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
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

        setIsInitialized(true);

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
        world.camera.controls.setTarget(0, 0, 0);
        world.camera.set("Orbit");

        // const aboba = components.get(OBC.Items)
        fragments.list.onItemSet.add(({ value: model }) => {
          model.useCamera(world.camera.three);
          world.scene.three.add(model.object);
          fragments.core.update(true);
        });

        const highlighter = components.get(OBCF.Highlighter);

        highlighter.setup({
          world,
          selectMaterialDefinition: {
            // you can change this to define the color of your highligthing
            color: new THREE.Color("#2484f1"),
            opacity: 1,
            transparent: false,
            renderedFaces: 0,
          },
        });
        // const qwe = type as OBC.ModelIdMap;d
        highlighter.events.select.onHighlight.add(async (modelIdMap) => {
          console.log("Something was selected");
          console.log(modelIdMap);
          const promises = [];
          for (const [modelId, localIds] of Object.entries(modelIdMap)) {
            console.log(modelIdMap);
            console.log(Object.entries(modelIdMap));
            const model = fragments.list.get(modelId);
            console.log(model);
            if (!model) continue;
            console.log(model.getItem());
            promises.push(model.getItemsData([...localIds]));
          }

          const data = (await Promise.all(promises)).flat();
          console.log(data[0]._guid.value);
        });

        highlighter.events.select.onClear.add(() => {
          console.log("Selection was cleared");
        });

        highlighter.styles.set(customHighlighterName, {
          color: new THREE.Color("red"),
          opacity: 1,
          transparent: false,
          renderedFaces: 0,
        });
        highlighter.styles.set("Yellow", {
          color: new THREE.Color("yellow"),
          opacity: 1,
          transparent: false,
          renderedFaces: 0,
        });

        highlighter.styles.set("Green", {
          color: new THREE.Color("green"),
          opacity: 1,
          transparent: false,
          renderedFaces: 0,
        });
        // You can also listen to highligth events
        // with custom styles
        highlighter.events[customHighlighterName].onHighlight.add((map) => {
          console.log("Highligthed with red", map);
        });

        highlighter.events[customHighlighterName].onClear.add((map) => {
          console.log("Red highlighter cleared", map);
        });

        highlighterRef.current = highlighter;
      } catch (error) {
        console.error("Failed to initialize BIM viewer:", error);
      }
    };

    init();

    return () => {
      // Cleanup
      if (componentsRef.current) {
        componentsRef.current.dispose();
        setIsInitialized(false);
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [componentsRef]);
  useEffect(() => {
    console.log(worldRef.current?.camera);
  }, [worldRef.current?.camera.three.position]);
  return {
    components: componentsRef.current,
    world: worldRef.current,
    fragments: fragmentsRef.current,
    isInitialized,
    loadIfc,
    downloadFragments,
    loadFrag,
    machineFinder,
    applyCustomHighlight,
    resetCustomHighlighter,
    startColorAnimation,
    stopColorAnimation,
  };
}
