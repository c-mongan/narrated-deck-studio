import React from "react";
import { Player } from "@remotion/player";
import type { AnyZodObject } from "remotion";
import { NarratedSlides, narratedDurationInFrames, type NarratedSlideProps } from "./NarratedSlides.js";

export const NarratedSlidesPlayer: React.FC<{ input: NarratedSlideProps }> = ({ input }) => <Player<AnyZodObject, NarratedSlideProps>
  component={NarratedSlides}
  inputProps={input}
  durationInFrames={narratedDurationInFrames(input)}
  compositionWidth={1920}
  compositionHeight={1080}
  fps={input.fps}
  controls
  style={{ width: "100%", aspectRatio: "16/9" }}
/>;
