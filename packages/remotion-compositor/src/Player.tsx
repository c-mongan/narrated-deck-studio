import React from "react";
import { Player } from "@remotion/player";
import type { AnyZodObject } from "remotion";
import { NarratedSlides, type NarratedSlideProps } from "./NarratedSlides.js";

export const NarratedSlidesPlayer: React.FC<{ input: NarratedSlideProps }> = ({ input }) => <Player<AnyZodObject, NarratedSlideProps>
  component={NarratedSlides}
  inputProps={input}
  durationInFrames={Math.max(1, Math.ceil(Math.max(...input.slides.map((slide) => slide.end), 1) * input.fps))}
  compositionWidth={1920}
  compositionHeight={1080}
  fps={input.fps}
  controls
  style={{ width: "100%", aspectRatio: "16/9" }}
/>;
