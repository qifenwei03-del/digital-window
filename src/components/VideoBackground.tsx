// key={src} 讓切換影片時整個 <video> 重掛，省去手動呼叫 load()
export default function VideoBackground({ src }: { src: string }) {
  return (
    <video
      key={src}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
