import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { ColdframeSmokeTest, SMOKE_FRAMES } from "./videos/bridge/SmokeTest";

// One <Composition> per short. Every project lives in its own folder: code + docs in
// src/projects/<name>/, only the binary assets staticFile() needs in public/<name>/
// (a Remotion constraint: staticFile serves from public/ only). Copy the template
// src/videos/bridge/ into the new project folder and register the composition here.
// Deleting a project = removing its two folders + its lines here. Done.
export const Root: React.FC = () => (
  <>
    {/* the proven original from the repo creator: the full 2,025-frame film + the look template */}
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    {/* distributed-render smoke test: the story's first 450 frames plus the committed 15 s soundtrack */}
    <Composition id="ColdframeSmokeTest" component={ColdframeSmokeTest} durationInFrames={SMOKE_FRAMES} fps={30} width={1080} height={1920} />
    {/* >>> PROJECT REGISTRATIONS â€” sync_project.ps1 appends here; wipe_project.ps1 resets the file <<< */}
import { Test10, TEST10_FRAMES } from "./projects/test10/Test10.tsx";
    <Composition id="Test10" component={Test10} durationInFrames={TEST10_FRAMES} fps={30} width={1080} height={1920} />
    {/* <<< END PROJECT REGISTRATIONS â€” wipe_project.ps1 resets the file <<< */}
  </>
);
