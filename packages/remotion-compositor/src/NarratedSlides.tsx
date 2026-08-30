import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, useCurrentFrame } from "remotion";

export interface NarratedSlideProps {
  [key: string]: unknown;
  fps: number;
  durationSeconds: number;
  audioMaster: string;
  slides: Array<{ image: string; start: number; end: number }>;
  captions: Array<{ start: number; end: number; text: string }>;
}

export function narratedDurationInFrames(props: NarratedSlideProps): number {
  const slideFrames = Math.ceil(Math.max(...props.slides.map((slide) => slide.end), 0) * props.fps);
  // AAC adds a padded packet at the tail. Floor the audio frame count so the
  // encoded stream remains within the 50 ms master-duration tolerance.
  const audioFrames = Math.floor(props.durationSeconds * props.fps);
  return Math.max(1, slideFrames, audioFrames);
}

function SlideImage({ image, durationInFrames }: { image: string; durationInFrames: number }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, Math.max(11, durationInFrames - 10), durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.025], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ backgroundColor: "black", opacity, alignItems: "center", justifyContent: "center", overflow: "hidden" }}><Img src={image} style={{ width: "100%", height: "100%", objectFit: "contain", transform: `scale(${scale})` }} /></AbsoluteFill>;
}

export const NarratedSlides: React.FC<NarratedSlideProps> = ({ fps, audioMaster, slides, captions }) => {
  const frame = useCurrentFrame();
  const seconds = frame / fps;
  const caption = captions.find((cue) => seconds >= cue.start && seconds < cue.end);
  return <AbsoluteFill style={{ backgroundColor: "black", fontFamily: "Arial, sans-serif" }}>
    <Audio src={audioMaster} />
    {slides.map((slide, index) => <Sequence key={`${index}-${slide.image}`} from={Math.round(slide.start * fps)} durationInFrames={Math.max(1, Math.round((slide.end - slide.start) * fps))}><SlideImage image={slide.image} durationInFrames={Math.max(1, Math.round((slide.end - slide.start) * fps))} /></Sequence>)}
    {caption ? <div style={{ position: "absolute", left: "9%", right: "9%", bottom: 54, color: "white", fontSize: 46, lineHeight: 1.25, textAlign: "center", textShadow: "0 2px 12px black,0 0 3px black", background: "rgba(0,0,0,.48)", borderRadius: 14, padding: "12px 22px" }}>{caption.text}</div> : null}
  </AbsoluteFill>;
};
