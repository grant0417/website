---
title: Turning a year of commits into music
description: My homepage plays my GitHub contribution graph as a song. Here's how 53 weeks of commits become a melody.
date: 2026-10-01
tags: [web audio, canvas]
cover: ridges
draft: true
---

The banner on [my homepage](/) is drawn from my last year of GitHub contributions: every ridge is two weeks, and the peaks are the busy days. Press play and it becomes a song.

## One note per week

Each week is an eighth note at 96 BPM. I take the busiest day of the week and map it onto A minor pentatonic, so nothing ever clashes. Quiet days sit low, and the really busy ones jump up an octave.

```ts {4}
export function busiestDay(week: number[]) {
  let day = -1, level = 0;
  week.forEach((lv, d) => {
    if (lv > level) { level = lv; day = d; }
  });
  return { day, level };
}
```

Line 4 is the whole trick: keep the loudest day. Then the note is one lookup into `SCALE`, where Saturday lands at the bottom and a level-4 day jumps three steps up:

```ts {3}
// A minor pentatonic, two octaves
const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99];
const freq = SCALE[6 - day + (level >= 4 ? 3 : 0)];
```

## Making it not sound bad

The first version played every day at once and sounded like a cat on a piano. Three changes fixed it:

- Play only the busiest day of each week.
- Add a soft bass note every four weeks.
- Run everything through a delay, a reverb and a limiter.

The `Synth` class builds the audio graph once, on the first press of play, because browsers only allow sound after a user gesture.[^1]

[^1]: Creating an `AudioContext` before then leaves it suspended until the page calls `resume()`.
