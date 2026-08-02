"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";

function VideoPlane({ src }: { src: string }) {
  const [aspect, setAspect] = useState(16 / 9);

  const video = useMemo(() => {
    const el = document.createElement("video");
    el.src = src;
    el.muted = true;
    el.loop = true;
    el.playsInline = true;
    el.preload = "auto";
    return el;
  }, [src]);

  const texture = useMemo(() => {
    const tex = new THREE.VideoTexture(video);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [video]);

  useEffect(() => {
    const onLoaded = () => setAspect(video.videoWidth / video.videoHeight);
    video.addEventListener("loadedmetadata", onLoaded);
    video.play().catch(() => {});
    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.pause();
      texture.dispose();
    };
  }, [video, texture]);

  // 依影片比例把 plane 放大到蓋滿整個視口（object-fit: cover）
  const { viewport } = useThree();
  const width = Math.max(viewport.width, viewport.height * aspect);

  return (
    <mesh scale={[width, width / aspect, 1]}>
      <planeGeometry />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

export default function VideoBackground({ src }: { src: string }) {
  return (
    <div className="absolute inset-0">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <VideoPlane src={src} />
      </Canvas>
    </div>
  );
}
