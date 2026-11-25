# THE LAST LAMP: Unreal Engine 5 Build Guide (Blueprints only)

A step-by-step plan for the team's developer. **No C++ is needed.** The target is a playable 3-minute build.
It is based on the **Third Person** template (UE 5.3 or newer). The node names below are the standard Blueprint nodes.

---

## Step 0: Project setup (15 min)
1. Create a new project from **Games → Third Person → Blueprint**, with Starter Content **on**.
2. Make these folders under `Content/LastLamp/`: `Blueprints`, `Enemies`, `UI`, `FX`, `Audio`, `Maps`, `Materials`.
3. Create a new level, **`L_HilatAlSarab`**, from the "Open World" or "Basic" template.
4. Turn on **Lumen** in Project Settings (Global Illumination and Reflections = Lumen).

## Step 1: The night desert map (Art, 2–3 hours)
1. **Landscape:** 1–2 km² with gentle dunes. Paint a sand material (Megascans "Desert Sand" from Fab, free).
2. **The village square** at the centre: 6–8 mud-brick houses (Megascans clay walls), a well, a ghaf tree, and palm-frond huts made from planks and palm meshes.
3. **Lighting:**
   - `Directional Light` (the moon): cool blue, intensity about 0.5 lux
   - `Sky Atmosphere` + `Sky Light` (real-time capture)
   - `Exponential Height Fog`: low and blue-grey. Volumetric fog on.
4. **Spawn points:** place 10–12 `TargetPoint` actors in the dunes and dark alleys around the square, and tag them `Spawn`.
5. Put the **lamp** (`BP_Lamp`, step 3) in the centre of the square.

## Step 2: The player, `BP_Theyab` (Dev)
Duplicate `BP_ThirdPersonCharacter` → `BP_Theyab`.

**Variables:** `Light` (float, 100), `MaxLight` (100), `Charge` (float), `bCharging` (bool), `Score` (int), `NamesSpoken` (int).

**Light blast:**
```
IA_Blast (Started)   → Set bCharging = true → Timeline "ChargeTL" (0→1 over 1.5s) → Set Charge = value
IA_Blast (Completed) → Set bCharging = false
   → Cost = Lerp(5, 20, Charge) → if Light >= Cost:
        Light -= Cost
        Radius = Lerp(250, 700, Charge)
        Sphere Overlap Actors (Location = Actor Location, Radius, Object Types = Pawn, Class Filter = BP_EnemyBase)
           → For Each → Apply Damage (Base Damage = Lerp(1, 3, Charge))
        Spawn System at Location (NS_LightBurst, scale by Charge)
        Play Sound 2D (SFX_LightBlast)
   → Reset Charge = 0
```
**Dodge:** `IA_Dodge` → `Launch Character` (Forward Vector × 1200, Z = 200) → a 1 s cooldown with `Delay` and a bool gate.

**Light regeneration:** on `Event Tick` (or a 0.2 s timer): if within 400 units of the lamp, add 4 Light per second, clamped to MaxLight.

**Golden cracks:** a dynamic material on the mesh. Set a scalar `CrackGlow` = Charge so the arms glow while charging.

**Collapse:** if Light ≤ 0 → disable input, play a fall montage, then call `GameOver("Your Light went out")`.

## Step 3: The objective, `BP_Lamp` (Dev and Art)
- Components: a static mesh (a small oil lamp on a stone), a `Point Light` (warm amber, attenuation 1500), and a `Box Collision`.
- Variable: `Health` = 100.
- Event `Drain(Amount)`: `Health -= Amount` → `Point Light → Set Intensity` = MapRange(Health, 0–100, 200–5000) → if Health ≤ 0, call `GameOver("The last lamp died")`.
- A little flicker: a Timeline loops intensity ±10%.

## Step 4: Enemies (Dev)
### `BP_EnemyBase` (parent Character)
- Variables: `HP`, `Speed`, `DrainPerSecond`, `Target` (Actor), `bRevealed`.
- **AI:** set `AI Controller Class` = `AIC_Enemy`. Use a **Behavior Tree** `BT_Enemy`, or simply `AI MoveTo` on a loop:
```
BeginPlay → Target = BP_Lamp (Get Actor Of Class) → Loop every 0.5s:
     AI MoveTo (Target) ; if Distance(Target) < 150:
         if Target is Lamp → Lamp.Drain(DrainPerSecond * 0.5)
         else → Theyab.Light -= 5 (hit)
```
- `Event AnyDamage` → `HP -= Damage` → if HP ≤ 0: spawn `NS_SinkIntoSand`, add Score, then `Destroy Actor`.
- **Listen for the whisper:** on BeginPlay, `Bind Event to OnNameSpoken` (from `BP_WaveManager`) → `Target = Player` → `Delay 8` → `Target = Lamp`.
- **Listen for the bark:** `Bind Event to OnBark` → set `bRevealed = true` → swap to the silver overlay material for 3 s.

### Children
| Blueprint | HP | Speed | Special |
|---|---|---|---|
| `BP_Emptied` | 1 | 200 | Plays a random "last words" voice line when spawned |
| `BP_Hoofed` | 1 | 450 | Material opacity 0.1 until `bRevealed` or within 400 units. Leaves hoof-print decals |
| `BP_Worn` | 3 | 250 | Every 3 s within 1200 units, spawns `BP_ThrownPot` toward the player |
| `BP_SmilingHunger` (boss) | 8 | 150 | Stops at 900 units and drains the lamp from range (a beam: Niagara ribbon). Weak point: takes double damage while `bRevealed` |
| `BP_Whirler` | — | 600 | Not an enemy: a moving `Radial Force` + Niagara sand vortex that crosses the map |

## Step 5: The companion, `BP_Ghareeb` (+1 / Dev)
- Use any quadruped mesh from Fab (search "dog"). Give it a lean, sand-coloured look and set **one eye's material to an emissive silver**.
- AI: `AI MoveTo` (the player, acceptance radius 250) on a 0.5 s loop.
- `IA_Bark` (**E**, 6 s cooldown) → play the bark sound → call `OnBark` on the WaveManager, which broadcasts it to all enemies within 2000 units.
- Bonus: if a Hoofed enemy is within 600 units, Ghareeb growls (an audio cue) before it appears.

## Step 6: `BP_WaveManager`, the heart of the 3 minutes (Dev and Design)
Place one in the level.

**Variables:** `TimeLeft` = 180, `Wave` = 0, `EnemyCount`, `NextWaveIn`, `WhisperInterval` = 30.

**Event Dispatchers:** `OnNameSpoken`, `OnBark`.
```
BeginPlay → Set Timer by Event (1.0s, looping) → "Tick1s":
    TimeLeft -= 1 ; update HUD
    Sun: Directional Light rotation pitch = MapRange(TimeLeft, 180→0, -20 → +10)
    if TimeLeft in [165, 135, 90, 45] → StartWave(next)
    WhisperTimer += 1 ; if WhisperTimer >= WhisperInterval:
        WhisperTimer = 0 ; Call OnNameSpoken ; Play Sound 2D (SFX_WindName "Theyab…") ;
        Player.NamesSpoken += 1 ; show HUD text "THE WIND SAID YOUR NAME"
    if TimeLeft <= 35 → WhisperInterval = 10
    if TimeLeft <= 0 → Victory()

StartWave(n):
    wave 1: spawn 6 × BP_Emptied
    wave 2: spawn 4 × BP_Hoofed + 3 × BP_Emptied
    wave 3: spawn 4 × BP_Worn + 2 × BP_Hoofed ; spawn BP_Whirler
    wave 4: spawn BP_SmilingHunger + 4 × BP_Emptied
    (Spawn Actor from Class at random actors tagged "Spawn")
```

## Step 7: UI (Dev)
`WBP_HUD` (added to the viewport in `BP_Theyab` BeginPlay):
- Top left: **Enemy count**
- Top centre: **Time to dawn: 2:41** and **Next wave in: 12**
- Top right: **Wave 2 / Score 115**
- Bottom: **Light bar** (gold) and **Lamp bar** (amber)
- Centre flash text: **"THE WIND SAID YOUR NAME"** (a fade animation)

Also `WBP_Title` (*"Never say your name to the wind."*, Play), `WBP_GameOver` (the reason, Retry) and `WBP_Victory` (*"Dawn. They say it truly happened."* plus the score).

## Step 8: Effects and sound (Art / +1)
- `NS_LightBurst`: a golden sphere burst with sparks (start from the Niagara "Burst" template, colour gold, lifetime 0.4 s).
- `NS_SinkIntoSand`: sand particles falling downward, with a grey smoke puff.
- `NS_WhirlerVortex`: a tall spinning sand ribbon.
- Audio: wind loop, the whisper "Theyab…", the dog's growl and bark, oud at dawn, and the Emptied's murmured last words.

## Step 9: Polish and build (last day)
- Playtest **10 times**. Tune Light costs and wave sizes until a first-time player wins about 50% of the time.
- Camera shake on big blasts. Slow-motion (`Set Global Time Dilation` 0.3 for 0.5 s) on the boss kill.
- Package with **Platforms → Windows → Package Project** (Shipping).

---

## Milestones (5-person team)
| Day | Goal |
|---|---|
| 1 | Map blockout, player blast working, lamp and lose condition |
| 2 | Enemy base and Emptied, WaveManager, HUD |
| 3 | The whisper twist, Hoofed, Worn, Ghareeb's bark |
| 4 | Boss, Whirler, effects, audio, the dawn sequence |
| 5 | Polish, playtests, packaged build, pitch rehearsal |
