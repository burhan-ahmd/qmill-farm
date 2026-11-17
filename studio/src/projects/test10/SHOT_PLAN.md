# Test10 shot plan (300f / 10.000s / 30fps)

| Shot | Frames | Flow / framing | Depth layers & props | Light | Caption / action |
|---|---:|---|---|---|---|
| 1 | 0–299 | One `flow()` path, wide auction-room establish → glide to “SOLD” placard → dealer reaction close | Foreground table + paddles; two dealers midground; tall hotel windows, framed wall trim, bench, chandelier detail background | Bridge day palette, warm cream/brick/ochre, directional key | Captions at canon 1450px; second paddle rises on final “again” gag; music bed + gavel tick + descending whistle |

Physical check: `assertScene(1, ...)` on first, middle and last flow stop (0, 149, 299); sign text via `fitText` / `drawFittedText`. One room, two stylized dealer figures, one gag, no cut.
