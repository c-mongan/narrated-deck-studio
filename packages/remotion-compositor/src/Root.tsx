import React from "react";
import { Composition, type AnyZodObject } from "remotion";
import { NarratedSlides, narratedDurationInFrames, type NarratedSlideProps } from "./NarratedSlides.js";

const defaults: NarratedSlideProps = { fps: 30, durationSeconds: 1, audioMaster: "", slides: [{ image: "", start: 0, end: 1 }], captions: [] };

export const RemotionRoot: React.FC = () => <Composition<AnyZodObject, NarratedSlideProps>
  id="NarratedSlides"
  component={NarratedSlides}
  width={1920}
  height={1080}
  fps={30}
  durationInFrames={30}
  defaultProps={defaults}
  calculateMetadata={({ props }) => ({ durationInFrames: narratedDurationInFrames(props), fps: props.fps })}
/>;
