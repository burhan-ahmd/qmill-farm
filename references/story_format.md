# Story format for Ricks-style fact shorts

## What the channel does
- A true story told as a funny animated short, 40-70 s, vertical, simple characters in a rich 3D world.
- A natural, dry narrator (curious, deadpan, quietly amused, and never laughing) over absurd pictures. The pictures carry the comedy; the narrator reports. The characters keep deadpan faces and react to what happens.
- Word-by-word captions, a new subject every 2-3 s, mostly reached by camera travel instead of cuts, a sound on almost every move, music under the voice.

## Story engine (what makes people stay)
A short is watched to the end only if the viewer needs an answer. Every video is built on **one open question, asked in the first 3 s and answered only at the end**, with smaller questions opening every 8-10 s so there is always a reason to wait.

There are two shapes that work. Decide which one the topic is before writing, and say so in the script's story spine.

### Shape A: character story
Someone wants something and cannot have it.
- **One protagonist with a want** (a person, an animal, even a stubborn object) and an **obstacle** that keeps beating them.
- The reversal is what the character did, or what was done to them.
- Example: the handyman who stole the Mona Lisa because he thought it belonged in Italy.

### Shape B: question story
The question itself is the protagonist, and the viewer's own wrong assumption is the obstacle. No single character is needed.
- **A question people half-wonder about already**, and feel slightly stupid for not knowing.
- **A believable wrong answer**, stated early and then knocked down. This is the obstacle.
- Each beat **narrows or breaks the answer** by BUT / THEREFORE, never "and then".
- **The true answer is weirder than the assumption**, and lands at about 70 %.
- Example: turkeys come from America, so why are they named after a country in Asia?

### True of both shapes
- **But / therefore, never "and then".** Each beat is caused by the one before and changes something: the stakes rise, someone is proven wrong, the answer gets worse. If a beat only adds a fact, cut it or fold it into the beat before.
- **A reversal at about 70 %** that the viewer did not expect but, looking back, was set up by the clue.
- **Few names.** At most 4 named people, places or countries. More is trivia and the viewer stops following.
- **The ending pays off the question and echoes the first line** with a new meaning (this also makes people replay and comment).
- **Specific beats generic.** The exact number, the odd detail, the real quote, the funniest true moment. Research for these before writing.
- **Every key beat has a picture that carries the joke** without the words. If you cannot draw it clearly, change the beat.
- **A list is not a story.** Weak: "the English say X, the Dutch say Y, the Portuguese say Z" with nothing at stake. The same material becomes Shape B the moment one question is asked at the top and the list becomes the chain of wrong answers on the way to it.

Typical shapes that work: the confident person proven wrong (or right) by a small detail; the cover-up that grows; the rule followed so literally it breaks; the mix-up everyone passes on to someone else, ending on who finally owns it; the ignored warning; the name everyone says wrong for 400 years. Modern or unusual settings (shop, office, ship, street) need their own set: plan it in the shot plan and build it from the code-made props in `templates/bridge/props.ts` plus new builders.

## The hook (the first line)
The first sentence decides whether the video is watched at all. Nothing else in the script matters if this line fails. Treat it as a gate, not a flourish: `docs/new-video.md` Phase 2 will not let the script be written until a hook passes.

**What a hook must be**
- **One sentence**, under about 14 spoken words.
- **Understandable with zero context.** It is the first thing a stranger hears, mid-scroll, with the sound half on.
- **It opens a question the viewer cannot answer and now wants answered.**
- **True**, and it does not spoil the payoff.
- **Its strongest word is near the end**, so the line lands instead of trailing off.

**Patterns to draft from** (write across at least four of these, never only one)
1. **Contradiction** - two true things that cannot both be right. "Turkeys are from America. So why are they named after a country in Asia?"
2. **Weird action, no context** - "In 1925, one man sold the Eiffel Tower. Twice."
3. **Impossible number** - "The most famous painting on earth was gone for 24 hours before anyone noticed."
4. **Named wrong assumption** - "Everyone blames the thief. The museum lost it first."
5. **Direct dare or question** - "Name this bird. You just named a country."
6. **Status flip** - "The man who stole the Mona Lisa was the man hired to protect it."

**Rewrite the hook if any of these are true**
- It needs a second sentence before it makes sense.
- It announces a topic instead of opening a question ("Today, the story of the Mona Lisa theft").
- It could open a hundred other videos: nothing in it is specific to this story.
- It gives away the payoff.
- It carries two or more names, or a date the viewer has no reason to care about yet.
- It starts with throat-clearing: "Did you know", "Have you ever wondered", "In this video", "So", "Let me tell you".
- The most interesting word is in the first half and the line dribbles out after it.

**The 3-second test.** Read only the hook aloud, to someone who knows nothing about the topic. They must be able to say what question the video is about to answer. If they cannot, the hook fails, whatever else is good about it.

## The six beats
The beat names below are written for Shape A. Shape B uses the same six positions with different content, in the right-hand column.

| # | Shape A (character story) | Shape B (question story) |
|---|---|---|
| 1 | **Hook (0-3 s):** a weird action with no context, one picture. ("In 1925, one man sold the Eiffel Tower. Twice.") | **Hook (0-3 s):** the contradiction, in one picture. ("Turkeys are from America. So why the Asian name?") |
| 2 | **The laugh:** other characters mock, doubt or ignore the hero. Or an overconfident expert dismisses the clue. | **The obvious answer:** the thing everyone assumes, said with full confidence. |
| 3 | **They all look right:** time passes, the hero seems wrong or harmless, the crowd relaxes. | **It falls apart:** one fact kills the obvious answer, and the question is now worse than before. |
| 4 | **The clue:** one small detail that foreshadows the payoff. Show it, do not explain it. | **The clue:** the small true detail that the real answer hangs on. Show it, do not explain it. |
| 5 | **The payoff:** the event that shows who was right. The visual climax. | **The reveal:** the real answer, and it is stranger than the assumption. The visual climax. |
| 6 | **The science / the reason:** the mechanism in one simple sentence with an everyday analogy. | **Why it stuck:** one sentence on why nobody ever fixed it. |

- **Callback ending:** the last line twists the first line, and starts an argument or a comment. Show it as a held payoff beat; never end on a walk-away.

## Topic types that work
Both shapes are welcome. Breadth is good: the channel is animated true stories, history and interesting facts under a minute.
- **Why a thing is called what it is called** - animals, foods, places, words, brands.
- **Why an everyday object is shaped the way it is**, or has a part nobody uses.
- **Why an odd rule, building, border or custom exists**, with a real reason behind it.
- **A con, a mistake or a stunt** that sounds made up but is documented.
- **A confident person proven wrong** by physics, maths or nature.
- **An interesting fact with a mechanism behind it** - allowed as Shape B, as long as one question drives the whole video and the answer is a reversal, not a list.
Avoid: tragedies with real victims as the joke, living private people, medical, legal or political claims, hate or stereotypes. The target of the joke is overconfidence and smugness.

## Titles
"Why X ...", "How X ...", "What X really meant", "The man who ...". No spoilers of the payoff.

## Comedy toolbox (use at least three kinds per short)
- **Line gags:** understatement, "Luckily ... / Unluckily ...", a flat number or fact delivered like a weather report.
- **Visual gags:** reaction faces, a wrong-scale prop, a tiny background detail, a running gag character (pigeon, man with a sandwich) that pays off at the end.
- **Sound gags:** record scratch, crowd laugh, a tiny ding, a gulp.
- **Rule of three:** two normal beats, the third breaks the pattern.
- **Dialogue beat (optional, at most 2):** the narrator reads a quoted line of 8 words or fewer in the same voice, slightly acted, the speaker is a camera stop, a 6-10 frame pause, the camera glides or racks focus to the listener, whose face lands 3-6 frames after the last word.

## Reaction faces to schedule
laugh (+crowd laugh), shock (+gasp or scratch), nervous (+gulp), dazed (+ding), pained, smug (smile or grin), guilty (whistle), unimpressed (stern, held 12 frames).

## Pacing numbers
- 3.5-3.7 words per second of speech, plus pauses: 120-150 words for 40-55 s.
- A new subject every 2-3 s. A gag every 4-6 s. A sound on almost every move.
- At most 2 hard cuts per 60 s; everything else is camera flow or a short dissolve.
- 12-16 places and 20+ props for a 60 s short; every place gets its own light mood.
