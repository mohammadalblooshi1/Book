# THE LAST LAMP
### A 3-minute Unreal Engine game from the novel *Never Say Your Name to the Wind*
*Game Design Document for the Khalifa Fund Gaming Accelerator: Game Idea Sprint*

---

## 1. The five answers (the course formula)

| | Our answer |
|---|---|
| 🧍 **WHO** | **Theyab**, a Marked Bedouin boy who carries a golden Light in his chest, and **Ghareeb**, his old saluki hound with one silver eye |
| 🏁 **WANTS WHAT** | Keep **the last lamp of the village** burning until dawn. If the lamp dies, the darkness takes everyone |
| 🎮 **HOW YOU PLAY** | Third-person wave survival. Run, dodge, and **charge your Light to blast** the creatures rising from the sand. Ghareeb **barks to reveal** where they will rise next |
| 🏜 **WHERE AND WHEN** | **Hilat al-Sarab**, a mud-brick oasis village at the edge of the great desert, **one night in the 1920s**: three minutes from midnight to dawn |
| 🎲 **THE TWIST** | ***Never say your name to the wind.*** Every 30 seconds **the wind whispers your name**, and every creature from below turns and hunts **you** instead of the lamp. You must choose: stay near the lamp and bring them to it, or run into the dark and pull them away |

> **One-line pitch:** *A Bedouin boy has three minutes to keep the last lamp alive, and every 30 seconds the wind tells the monsters his name.*

---

## 2. The 3-minute run

| Time | What happens |
|---|---|
| **0:00–0:15** | Cold open. The camera sweeps over dunes under the full moon. Text: *"Never say your name to the wind."* Theyab stands by Umm Hanan's lamp in the empty village square. Ghareeb growls at the sand |
| **0:15–0:45** | **Wave 1: the Emptied.** Grey villagers with white eyes walk slowly toward the lamp. One Light blast each. The player learns movement and the blast |
| **0:30** | **First whisper.** The wind says *"Theyab…"*. All enemies turn toward the player. A tutorial prompt: *"They know your name. Lead them away from the lamp."* |
| **0:45–1:30** | **Wave 2: the Hoofed.** Fast shape-shifters (donkey-hoof tracks show where they'll strike). Ghareeb's **bark** marks them with a silver glow for 3 seconds |
| **1:30–2:15** | **Wave 3: the Worn.** Possessed villagers who **throw** things and take 3 blasts. A **Whirler** (sand-devil) crosses the map and pushes everyone, including the player |
| **2:15–2:50** | **Final wave: the Smiling Hunger**, a mini-boss that drains the lamp from range. The wind whispers every 10 seconds now |
| **2:50–3:00** | **Dawn.** The sun rises, the creatures sink into the sand, and the lamp survives. Final text: *"They say it truly happened."* Score: lamp health, creatures burned, times your name was spoken |

**Lose condition:** the lamp's flame reaches zero, or Theyab's Light runs out.

---

## 3. Core mechanics

| Mechanic | Detail | Unreal (Blueprints) |
|---|---|---|
| **Move and dodge** | Third-person run, plus a dodge-roll with a short cooldown | Third Person Template, `Character Movement`, `Launch Character` for the dodge |
| **Light blast** | Hold to charge (0.2–1.5 s), release to fire a golden burst. A bigger charge gives bigger range | `Input Action`, a timeline for charge, `Sphere Overlap Actors` for damage, Niagara burst |
| **Light meter = your life** | Each blast **costs Light**. It refills slowly near the lamp. At 0 Light you collapse | A float variable on the player, shown in a UMG progress bar |
| **The lamp** | Has health (100). Enemies that touch it drain it | `BP_Lamp` with a box collision; a point light whose intensity follows its health |
| **Ghareeb** (AI companion) | Follows Theyab. Press **E** to make him **bark**: it reveals hidden enemies and highlights them silver | `BP_Ghareeb` with AI Move To; the bark fires an event to enemies → overlay material |
| **The whisper** (twist) | A timer every 30 s, which speeds up at the end. Enemies switch target from the lamp to the player for 8 s | `BP_WaveManager` timer → `Event Dispatcher` "OnNameSpoken" → enemies set the target to the player |
| **Waves** | Spawn points in the sand; the HUD shows *Enemy count / Next wave in / Wave / Score* | `BP_WaveManager` + `Spawn Actor from Class` at random `TargetPoint`s |
| **Dawn** | A 180-second master timer. The sun's rotation lerps from night to dawn | `Directional Light` rotation driven by a timeline; Sky Atmosphere |

---

## 4. Enemies (the ones from below)
| Enemy | Look | Behaviour | HP |
|---|---|---|---|
| **The Emptied** | Grey skin, blank white eyes, colourless robes | Walk slowly to the lamp, repeating their last words (audio) | 1 blast |
| **The Hoofed** | A traveller in a hooded cloak, with donkey hooves visible | Invisible until barked at or close. Fast lunges | 1 blast |
| **The Worn** | A possessed villager, eyes rolled white, black smoke at the mouth | Throws pots from range; tough | 3 blasts |
| **Whirler** | A spinning sand-devil | Crosses the map and pushes everything. It can't be killed, only dodged | — |
| **The Smiling Hunger** (boss) | A tall shadow wearing stolen faces, with a too-wide smile | Drains the lamp from range. Weak spot glows after Ghareeb barks | 8 blasts |

---

## 5. Art direction (for the Art role)
- **Look:** realistic Unreal lighting (**Lumen**) on a **night desert**: deep blue moonlight against **warm amber lamp-light and golden Light blasts**. Fog in the alleys.
- **Village:** mud-brick houses, palm-frond huts, a well, a ghaf tree, and the small lamp on a stone in the square.
- **People:** Arab Bedouin, 1920s. Men have short hair and wear the kandura. Umm Hanan (in the intro and outro only) wears a black abaya with her hair covered.
- **Free assets:** **Fab / Quixel Megascans** (desert rocks, sand, clay walls), **Paragon** characters or **Mixamo** for animation, the **Niagara** sample effects for the Light and the sand.
- **Sound:** wind (the whisper is the hero sound: layer real wind with a breathy voice saying "Theyab"), a low drone, a dog's growl and bark, and an oud motif at dawn.

---

## 6. Team of 5 (the course's tags)
| Tag | Person does |
|---|---|
| 🎨 **Art** | Village layout (Landscape plus Megascans), night lighting, the lamp, the Light and sand effects in Niagara, enemy materials (grey skin, white-eye glow) |
| 🎮 **Design** | Wave timings, Light costs, whisper rhythm, the 3-minute pacing, playtesting until it's tense but winnable |
| 💼 **Business** | The pitch: the one-liner, the novel tie-in, the target audience (horror and story fans, Gulf and world), the Demo Day presentation, the trailer capture |
| 💻 **Development** | Blueprints: `BP_Theyab`, `BP_Ghareeb`, `BP_Enemy` (parent) and its children, `BP_Lamp`, `BP_WaveManager`, the HUD widget, the win and lose screens, packaging the build |
| ➕ **+1 (second Dev or Art)** | Ghareeb's AI and bark, audio integration, the dawn sequence, polish |

---

## 7. Why it's a strong pitch
- **The twist is the title.** *"Never say your name to the wind"* is a rule players feel in 30 seconds.
- **A local story with global appeal:** Gulf folklore (the creatures from below), Bedouin life, and a famous-game formula (wave survival plus a protect objective).
- **It grows into a franchise:** a 150-chapter novel already plans the world, characters and lore for a full game later.
- **It's small enough to finish:** one map, one hero, one companion, 4 enemy types, one boss, and 3 minutes.
