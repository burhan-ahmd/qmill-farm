# Test10 shot plan (300f / 10.000 s / 30 fps, 1080×1920)

| Shot | Frames | Flow / framing | Depth layers & props | Light | Caption / action |
|---|---:|---|---|---|---|
| 1 | 0–299 | One `flow()` path with five settle stops (~65 f apart): wide room establish → slow glide toward the auctioneer → tight on the placard and face. No cut. | Foreground auction table + paddles; auctioneer and second dealer midground; tall blue hotel windows with gold trim, cream walls, wood floor in the back. | Bridge day palette: warm cream/brick/ochre, camera-relative warm key + cool fill, ink → DOF → bloom/tone/grade. | Captions at the canon 1450 px line. On "bids." (f≈252) the dealer's paddle rises and the placard flips from SOLD to SOLD AGAIN. Music bed + wooden gavel tick at 5.70 s + rising flourish at 8.35 s. |

## Gates wired before the scene

- `checkFlow(STOPS)` throws on any drift segment, overspeed or non-increasing stop.
- `assertScene(1, …)` runs at frames 0, 149 and 299 against the real camera path, with the auctioneer
  (`must-fit`), the head (`role: "head"`, ≤30 % frame height) and the SOLD placard plus `read` coverage
  (placard must be ≥10 % of frame height and inside the safe area).
- `fitText` sizes the placard text and the probe throws if the fitted size is under 24 px or overflows.
