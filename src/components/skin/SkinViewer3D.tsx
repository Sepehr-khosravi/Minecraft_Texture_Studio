import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createSkinViewer, use } from '@daidr/minecraft-skin-renderer';
import { WebGLRendererPlugin } from '@daidr/minecraft-skin-renderer/webgl';
import '../../styles/skin-viewer3d.css';

use(WebGLRendererPlugin);

type PartName =
  | 'head'
  | 'body'
  | 'leftArm'
  | 'rightArm'
  | 'leftLeg'
  | 'rightLeg';

type LayerName = 'inner' | 'outer';

type PartVisibility = Record<
  PartName,
  {
    inner: boolean;
    outer: boolean;
  }
>;

interface SkinViewer3DProps {
  skinUrl: string | null;
  model: 'steve' | 'alex';
  activeLayer: LayerName;
  showGrid: boolean;
  onPaint?(x: number, y: number, strokeStart?: boolean): void;
}

interface PickMesh extends THREE.Mesh {
  userData: {
    part: PartName;
    layer: LayerName;
  };
}

interface UvRect {
  u1: number;
  v1: number;
  u2: number;
  v2: number;
}

const PART_NAMES: PartName[] = [
  'head',
  'body',
  'rightArm',
  'leftArm',
  'rightLeg',
  'leftLeg',
];

const DEFAULT_VISIBILITY: PartVisibility = {
  head: { inner: true, outer: true },
  body: { inner: true, outer: true },
  rightArm: { inner: true, outer: true },
  leftArm: { inner: true, outer: true },
  rightLeg: { inner: true, outer: true },
  leftLeg: { inner: true, outer: true },
};

/**
 * Creates the same Minecraft box UV layout used by the renderer.
 * Coordinates are expressed in 64x64 skin pixels.
 */
function createBoxUV(
  x: number,
  y: number,
  width: number,
  height: number,
  depth: number,
) {
  const rightU1 = x;
  const rightU2 = x + depth;

  const frontU1 = x + depth;
  const frontU2 = x + depth + width;

  const leftU1 = x + depth + width;
  const leftU2 = x + depth + width + depth;

  const backU1 = x + depth + width + depth;
  const backU2 = x + depth + width + depth + width;

  const sideV1 = y + depth;
  const sideV2 = y + depth + height;

  const topV1 = y;
  const topV2 = y + depth;

  return {
    right: {
      u1: rightU1,
      v1: sideV1,
      u2: rightU2,
      v2: sideV2,
    },
    front: {
      u1: frontU1,
      v1: sideV1,
      u2: frontU2,
      v2: sideV2,
    },
    left: {
      u1: leftU1,
      v1: sideV1,
      u2: leftU2,
      v2: sideV2,
    },
    back: {
      u1: backU1,
      v1: sideV1,
      u2: backU2,
      v2: sideV2,
    },
    top: {
      u1: frontU1,
      v1: topV1,
      u2: frontU2,
      v2: topV2,
    },
    bottom: {
      u1: leftU1,
      v1: topV1,
      u2: leftU1 + width,
      v2: topV2,
    },
  };
}

/**
 * Builds a Three.js box geometry with the same face order and UV orientation
 * as @daidr/minecraft-skin-renderer.
 *
 * This geometry is used only for raycasting. It is never rendered.
 */
function createPickBoxGeometry(
  size: [number, number, number],
  uv: Record<string, UvRect>,
  inflate: number,
  offset: [number, number, number],
): THREE.BufferGeometry {
  const [width, height, depth] = size;

  const hw = width / 2 + inflate;
  const hh = height / 2 + inflate;
  const hd = depth / 2 + inflate;

  const [ox, oy, oz] = offset;

  const faces: Array<{
    uvKey: string;
    vertices: Array<[number, number, number]>;
  }> = [
    {
      // Front (+Z)
      uvKey: 'front',
      vertices: [
        [-hw, -hh, hd],
        [hw, -hh, hd],
        [hw, hh, hd],
        [-hw, hh, hd],
      ],
    },
    {
      // Back (-Z)
      uvKey: 'back',
      vertices: [
        [hw, -hh, -hd],
        [-hw, -hh, -hd],
        [-hw, hh, -hd],
        [hw, hh, -hd],
      ],
    },
    {
      // Left (-X)
      uvKey: 'right',
      vertices: [
        [-hw, -hh, -hd],
        [-hw, -hh, hd],
        [-hw, hh, hd],
        [-hw, hh, -hd],
      ],
    },
    {
      // Right (+X)
      uvKey: 'left',
      vertices: [
        [hw, -hh, hd],
        [hw, -hh, -hd],
        [hw, hh, -hd],
        [hw, hh, hd],
      ],
    },
    {
      // Top (+Y)
      uvKey: 'top',
      vertices: [
        [-hw, hh, hd],
        [hw, hh, hd],
        [hw, hh, -hd],
        [-hw, hh, -hd],
      ],
    },
    {
      // Bottom (-Y)
      uvKey: 'bottom',
      vertices: [
        [-hw, -hh, -hd],
        [hw, -hh, -hd],
        [hw, -hh, hd],
        [-hw, -hh, hd],
      ],
    },
  ];

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // A tiny inset prevents UV sampling from crossing into adjacent pixels.
  const uvInset = 0.00001;

  faces.forEach((face, faceIndex) => {
    const rect = face.uvKey ? uv[face.uvKey] : undefined;

    if (!rect) {
      throw new Error(`Missing UV rectangle: ${face.uvKey}`);
    }

    let u1 = rect.u1 / 64;
    let u2 = rect.u2 / 64;
    let v1 = rect.v1 / 64;
    let v2 = rect.v2 / 64;

    if (u1 < u2) {
      u1 += uvInset;
      u2 -= uvInset;
    } else {
      u1 -= uvInset;
      u2 += uvInset;
    }

    if (v1 < v2) {
      v1 += uvInset;
      v2 -= uvInset;
    } else {
      v1 -= uvInset;
      v2 += uvInset;
    }

    const ua = u1;
    const ub = u2;

    const va = faceIndex === 5 ? v1 : v2;
    const vb = faceIndex === 5 ? v2 : v1;

    const baseIndex = positions.length / 3;

    face.vertices.forEach((vertex, vertexIndex) => {
      positions.push(
        vertex[0] + ox,
        vertex[1] + oy,
        vertex[2] + oz,
      );

      const u = vertexIndex === 0 || vertexIndex === 3 ? ua : ub;
      const v = vertexIndex < 2 ? va : vb;

      uvs.push(u, v);
    });

    indices.push(
      baseIndex,
      baseIndex + 1,
      baseIndex + 2,
      baseIndex + 2,
      baseIndex + 3,
      baseIndex,
    );
  });

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );

  geometry.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(uvs, 2),
  );

  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Builds a separate, invisible picking scene.
 * Its dimensions, bone positions and UVs match the library's default
 * Minecraft player model.
 */
function createPickingScene(model: 'steve' | 'alex') {
  const scene = new THREE.Scene();
  const meshes: PickMesh[] = [];

  const armWidth = model === 'alex' ? 3 : 4;

  const bodyGroup = new THREE.Group();
  bodyGroup.position.set(0, 24, 0);
  scene.add(bodyGroup);

  const headGroup = new THREE.Group();
  bodyGroup.add(headGroup);

  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(-(4 + armWidth / 2), 0, 0);
  bodyGroup.add(rightArmGroup);

  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(4 + armWidth / 2, 0, 0);
  bodyGroup.add(leftArmGroup);

  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(-2, -12, 0);
  bodyGroup.add(rightLegGroup);

  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(2, -12, 0);
  bodyGroup.add(leftLegGroup);

  const material = new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
  });

  function addLayer(
    part: PartName,
    layer: LayerName,
    parent: THREE.Group,
    size: [number, number, number],
    uv: Record<string, UvRect>,
    inflate: number,
    offset: [number, number, number],
  ) {
    const geometry = createPickBoxGeometry(
      size,
      uv,
      inflate,
      offset,
    );

    const mesh = new THREE.Mesh(geometry, material) as unknown as PickMesh;
    mesh.userData = { part, layer };
    mesh.visible = DEFAULT_VISIBILITY[part][layer];
    mesh.frustumCulled = false;

    parent.add(mesh);
    meshes.push(mesh);
  }

  // Head
  addLayer(
    'head',
    'inner',
    headGroup,
    [8, 8, 8],
    createBoxUV(0, 0, 8, 8, 8),
    0,
    [0, 4, 0],
  );

  addLayer(
    'head',
    'outer',
    headGroup,
    [8, 8, 8],
    createBoxUV(32, 0, 8, 8, 8),
    0.5,
    [0, 4, 0],
  );

  // Body
  addLayer(
    'body',
    'inner',
    bodyGroup,
    [8, 12, 4],
    createBoxUV(16, 16, 8, 12, 4),
    0,
    [0, -6, 0],
  );

  addLayer(
    'body',
    'outer',
    bodyGroup,
    [8, 12, 4],
    createBoxUV(16, 32, 8, 12, 4),
    0.25,
    [0, -6, 0],
  );

  // Right arm
  addLayer(
    'rightArm',
    'inner',
    rightArmGroup,
    [armWidth, 12, 4],
    createBoxUV(40, 16, armWidth, 12, 4),
    0,
    [0, -6, 0],
  );

  addLayer(
    'rightArm',
    'outer',
    rightArmGroup,
    [armWidth, 12, 4],
    createBoxUV(40, 32, armWidth, 12, 4),
    0.25,
    [0, -6, 0],
  );

  // Left arm
  addLayer(
    'leftArm',
    'inner',
    leftArmGroup,
    [armWidth, 12, 4],
    createBoxUV(32, 48, armWidth, 12, 4),
    0,
    [0, -6, 0],
  );

  addLayer(
    'leftArm',
    'outer',
    leftArmGroup,
    [armWidth, 12, 4],
    createBoxUV(48, 48, armWidth, 12, 4),
    0.25,
    [0, -6, 0],
  );

  // Right leg
  addLayer(
    'rightLeg',
    'inner',
    rightLegGroup,
    [4, 12, 4],
    createBoxUV(0, 16, 4, 12, 4),
    0,
    [0, -6, 0],
  );

  addLayer(
    'rightLeg',
    'outer',
    rightLegGroup,
    [4, 12, 4],
    createBoxUV(0, 32, 4, 12, 4),
    0.25,
    [0, -6, 0],
  );

  // Left leg
  addLayer(
    'leftLeg',
    'inner',
    leftLegGroup,
    [4, 12, 4],
    createBoxUV(16, 48, 4, 12, 4),
    0,
    [0, -6, 0],
  );

  addLayer(
    'leftLeg',
    'outer',
    leftLegGroup,
    [4, 12, 4],
    createBoxUV(0, 48, 4, 12, 4),
    0.25,
    [0, -6, 0],
  );

  scene.updateMatrixWorld(true);

  return { scene, meshes };
}

/**
 * Creates a temporary preview texture with pixel guides.
 * The original skin image is never modified.
 */
async function createGuidedSkinPreview(source: string, showGrid: boolean): Promise<string> {
  const image = new Image();
  image.src = source;

  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not create skin preview canvas.');
  }

  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, 64, 64);
  context.drawImage(image, 0, 0, 64, 64);

  // Grid is a preview-only visual layer; it is never included in exported PNGs.
  if (showGrid) {
  context.save();
  // Draw a fine guide on every 64x64 texel boundary. These pixels exist
  // only in this temporary preview bitmap, never in the editable/export canvas.
  context.fillStyle = 'rgba(235, 240, 248, 0.72)';
  for (let i = 0; i <= 64; i++) {
    if (i < 64) {
      context.fillRect(i, 0, 0.14, 64);
      context.fillRect(0, i, 64, 0.14);
    }
  }
  context.restore();
  }

  return canvas.toDataURL('image/png');
}

export function SkinViewer3D({
  skinUrl,
  model,
  activeLayer,
  showGrid,
  onPaint,
}: SkinViewer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<any>(null);

  const pickingSceneRef = useRef<THREE.Scene | null>(null);
  const pickingMeshesRef = useRef<PickMesh[]>([]);
  const pickingCameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const visibilityRef = useRef<PartVisibility>(DEFAULT_VISIBILITY);

  const paintingRef = useRef(false);
  const rotatingRef = useRef(false);
  const activePointerRef = useRef<number | null>(null);
  const lastPixelRef = useRef<string | null>(null);

  const previewRequestRef = useRef(0);

  const [viewerReady, setViewerReady] = useState(false);
  const [visibility, setVisibility] =
    useState<PartVisibility>(DEFAULT_VISIBILITY);

  /**
   * Initialize the original renderer.
   */
  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !skinUrl) return;

    let cancelled = false;

    (async () => {
      try {
        const preview = await createGuidedSkinPreview(skinUrl, showGrid);

        if (cancelled) return;

        const viewer = await createSkinViewer({
          canvas,
          skin: preview,
          slim: model === 'alex',
          enableRotate: false,
          enableZoom: true,
          autoRotate: false,
          zoom: 60,
        });

        if (cancelled) {
          viewer.dispose?.();
          return;
        }

        viewer.setEnableRotate(false);
        viewer.startRenderLoop();

        viewerRef.current = viewer;
        setViewerReady(true);
      } catch (error) {
        console.error('Skin viewer initialization failed:', error);
      }
    })();

    return () => {
      cancelled = true;

      viewerRef.current?.dispose?.();
      viewerRef.current = null;

      setViewerReady(false);
    };
    // The viewer is initialized once. Skin changes are handled separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Update the preview texture whenever the real skin changes.
   */
  useEffect(() => {
    if (!viewerReady || !skinUrl || !viewerRef.current) return;

    const requestId = ++previewRequestRef.current;
    let cancelled = false;

    (async () => {
      try {
        const preview = await createGuidedSkinPreview(skinUrl, showGrid);

        if (
          cancelled ||
          requestId !== previewRequestRef.current ||
          !viewerRef.current
        ) {
          return;
        }

        viewerRef.current.setSkin(preview);
      } catch (error) {
        console.error('Could not update skin preview:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [skinUrl, viewerReady, showGrid]);

  /**
   * Keep the displayed model variant synchronized.
   */
  useEffect(() => {
    if (!viewerReady || !viewerRef.current) return;

    viewerRef.current.setSlim(model === 'alex');
  }, [model, viewerReady]);

  /**
   * Build the invisible picking geometry.
   */
  useEffect(() => {
    const { scene, meshes } = createPickingScene(model);

    pickingSceneRef.current = scene;
    pickingMeshesRef.current = meshes;

    meshes.forEach((mesh) => {
      const part = mesh.userData.part;
      const layer = mesh.userData.layer;

      mesh.visible = visibilityRef.current[part][layer];
    });

    return () => {
      meshes.forEach((mesh) => {
        mesh.geometry.dispose();
      });

      pickingSceneRef.current = null;
      pickingMeshesRef.current = [];
    };
  }, [model]);

  /**
   * Synchronize Base / Overlay visibility in both systems.
   */
  useEffect(() => {
    visibilityRef.current = visibility;

    const viewer = viewerRef.current;

    if (viewerReady && viewer) {
      PART_NAMES.forEach((part) => {
        viewer.setPartVisibility(part, 'inner', visibility[part].inner);
        viewer.setPartVisibility(part, 'outer', visibility[part].outer);
      });
    }

    pickingMeshesRef.current.forEach((mesh) => {
      const part = mesh.userData.part;
      const layer = mesh.userData.layer;

      mesh.visible = visibility[part][layer];
    });
  }, [visibility, viewerReady]);

  /**
   * Keep the invisible picking camera synchronized with the real viewer.
   */
  function updatePickingCamera() {
    const canvas = canvasRef.current;
    const viewer = viewerRef.current;
    const camera = pickingCameraRef.current;

    if (!canvas || !viewer || !camera) return;

    const rect = canvas.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();

    const rotation = viewer.getRotation();
    const distance = viewer.getZoom();

    const theta = rotation?.theta ?? 0;
    const phi = rotation?.phi ?? Math.PI / 2;
    const zoom = typeof distance === 'number' ? distance : 60;

    const targetX = 0;
    const targetY = 16;
    const targetZ = 0;

    camera.position.set(
      targetX + zoom * Math.sin(phi) * Math.sin(theta),
      targetY + zoom * Math.cos(phi),
      targetZ + zoom * Math.sin(phi) * Math.cos(theta),
    );

    camera.lookAt(targetX, targetY, targetZ);
    camera.updateMatrixWorld(true);

    pickingSceneRef.current?.updateMatrixWorld(true);
  }

  /**
   * Convert a screen pointer position into a skin pixel.
   */
  function getSkinPixel(event: PointerEvent) {
    const canvas = canvasRef.current;
    const scene = pickingSceneRef.current;

    if (!canvas || !scene) return null;

    if (!pickingCameraRef.current) {
      pickingCameraRef.current = new THREE.PerspectiveCamera(
        70,
        1,
        0.1,
        1000,
      );
    }

    updatePickingCamera();

    const camera = pickingCameraRef.current;
    const rect = canvas.getBoundingClientRect();

    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);

    const visibleMeshes = pickingMeshesRef.current.filter(
      (mesh) => mesh.visible && mesh.userData.layer === activeLayer,
    );

    const hits = raycaster.intersectObjects(visibleMeshes, false);
    const hit = hits.find(
      (item) => item.uv !== undefined && item.faceIndex !== undefined,
    );

    if (!hit?.uv) return null;

    // The skin renderer uploads the 64x64 PNG with its top row at UV v=1.
    // Raycaster UVs use a bottom-left origin, so convert v back to PNG y.
    // Convert raycast UV coordinates directly to 64x64 PNG pixel coordinates.
    // The picking geometry already uses top-origin Minecraft skin UV coordinates.
    const texelU = THREE.MathUtils.clamp(hit.uv.x * 64, 0, 63.999999);
    const texelV = THREE.MathUtils.clamp(hit.uv.y * 64, 0, 63.999999);
    
    const x = Math.floor(texelU);
    const y = Math.floor(texelV);

    return { x, y };
  }

  /**
   * Custom pointer controls:
   * Left button = paint.
   * Right button = rotate.
   *
   * The library's own rotation is disabled, so the two controls cannot
   * interfere with each other.
   */
  /**
   * Custom pointer controls:
   * Left button = paint.
   * Right button = rotate.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    const viewer = viewerRef.current;

    if (!canvas || !viewerReady || !viewer) return;

    let lastX: number | null = null;
    let lastY: number | null = null;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button === 2) {
        rotatingRef.current = true;
        paintingRef.current = false;
        activePointerRef.current = event.pointerId;

        lastX = event.clientX;
        lastY = event.clientY;

        canvas.setPointerCapture(event.pointerId);
        event.preventDefault();
        return;
      }

      if (event.button !== 0) return;

      const pixel = getSkinPixel(event);
      if (!pixel) return;

      paintingRef.current = true;
      rotatingRef.current = false;
      activePointerRef.current = event.pointerId;

      lastPixelRef.current = `${pixel.x},${pixel.y}`;

      canvas.setPointerCapture(event.pointerId);
      onPaint?.(pixel.x, pixel.y, true);

      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (rotatingRef.current) {
        if (lastX === null || lastY === null) return;

        const deltaX = event.clientX - lastX;
        const deltaY = event.clientY - lastY;

        lastX = event.clientX;
        lastY = event.clientY;

        const rotation = viewer.getRotation();
        if (!rotation) return;

        viewer.setRotation(
          rotation.theta - deltaX * 0.005,
          rotation.phi - deltaY * 0.005,
        );

        return;
      }

      if (!paintingRef.current) return;

      const pixel = getSkinPixel(event);
      if (!pixel) return;

      const key = `${pixel.x},${pixel.y}`;

      if (key !== lastPixelRef.current) {
        lastPixelRef.current = key;
        onPaint?.(pixel.x, pixel.y, false);
      }
    };

    const finishPointer = (event: PointerEvent) => {
      if (
        activePointerRef.current !== null &&
        event.pointerId !== activePointerRef.current
      ) {
        return;
      }

      paintingRef.current = false;
      rotatingRef.current = false;
      activePointerRef.current = null;
      lastPixelRef.current = null;

      lastX = null;
      lastY = null;

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    // Keep the viewer's picking camera synchronized with its dimensions.
    const parent = canvas.parentElement;

    const observer = parent
      ? new ResizeObserver(() => {
          updatePickingCamera();
        })
      : null;

    if (parent && observer) {
      observer.observe(parent);
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', finishPointer);
    canvas.addEventListener('pointercancel', finishPointer);
    canvas.addEventListener('lostpointercapture', finishPointer);
    canvas.addEventListener('contextmenu', onContextMenu);

    return () => {
      observer?.disconnect();

      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', finishPointer);
      canvas.removeEventListener('pointercancel', finishPointer);
      canvas.removeEventListener('lostpointercapture', finishPointer);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
  }, [viewerReady, activeLayer, onPaint]);

  const toggle = (part: PartName, layer: LayerName) => {
    setVisibility((previous) => ({
      ...previous,
      [part]: {
        ...previous[part],
        [layer]: !previous[part][layer],
      },
    }));
  };

  return (
    <div
      className="skin-viewer-3d"
      style={{ position: 'relative' }}
    >
      <canvas
        ref={canvasRef}
        className="skin-viewer-3d-canvas"
      />

      <div className="skin-parts-panel">
        <div className="skin-parts-title">Body Parts</div>

        {PART_NAMES.map((part) => (
          <div key={part} className="skin-part-row">
            <span className="skin-part-label">
              {part.replace(/([A-Z])/g, ' $1')}
            </span>

            <label className="skin-part-toggle">
              <input
                type="checkbox"
                checked={visibility[part].inner}
                onChange={() => toggle(part, 'inner')}
              />
              <span>Base</span>
            </label>

            <label className="skin-part-toggle">
              <input
                type="checkbox"
                checked={visibility[part].outer}
                onChange={() => toggle(part, 'outer')}
              />
              <span>Overlay</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
