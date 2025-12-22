# Monster Opera Level 7 - Pixel Spot Location Diagram

## Admin Canvas Coordinate System (900×480)

```
┌─────────────────────────────────────────────────┐
│  (0,0)                                (900,0)   │
│                                                 │
│                                                 │
│                                                 │
│                    ✨ PIXEL SPOT HERE          │
│                    (450, 130)                   │
│                                                 │
│         ┌─────────────────────────┐            │
│         │    TOP PLATFORM         │            │
│         │      (est. y ~100)      │            │
│         └─────────────────────────┘            │
│                                                 │
│                                                 │
│ ═══════════════════════════════════════════════ │ ← Stage Top (y=380)
│ ┌─────────────────────────────────────────────┐ │
│ │           STAGE AREA (Stage proper)         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│  (0,480)                              (900,480) │
└─────────────────────────────────────────────────┘
```

## Game Canvas Conversion

When the game loads, the pixel spot coordinates are automatically converted:

```
Admin Canvas (900×480) 
    ↓ (automatic conversion)
Game Canvas (responsive width × responsive height)
    ↓
Click detection checks if player clicks within radius
    ↓
Pixel hunt activated!
```

## Pixel Spot Properties

| Property | Value | Details |
|----------|-------|---------|
| X | 450 | Center of screen horizontally (900 ÷ 2) |
| Y | 130 | Just below the top platform |
| Size | 25 | Clickable radius (medium difficulty) |
| Canvas | Admin (900×480) | Automatically converted to game canvas |
| Location | Above Stage | In the playable game area |

## Estimated Game Canvas Location

Assuming:
- Game canvas: 550px wide (responsive)
- Game canvas height: varies with viewport
- Stage top: approximately 75% down the screen

**Converted Position:**
- X ≈ 305px (450 × 550/900)
- Y ≈ 48px (130 × gameStageTop/380)

This places it **in the upper-middle area of the screen**, just below where the top platform would be.

## Clicking to Claim

```
Player sees Level 7
    ↓
Looks for the hidden pixel (invisible, just needs to click area)
    ↓
Clicks near center-top of game canvas
    ↓
Click position checked against all pixelSpots
    ↓
If distance to spot ≤ spot.size (25px)
    ↓
claimPixelSpot() function called
    ↓
Cloud Function requests pixel code
    ↓
Pixel modal appears with claim interface
```

## Configuration Details

### Current Level 7 Setup
```json
{
  "level": 7,
  "weapons": [...],
  "actors": [...],
  "platforms": [...],
  "pixelSpots": [
    {
      "x": 450,
      "y": 130,
      "size": 25
    }
  ]
}
```

### Why These Coordinates?

- **x: 450** - Centered horizontally for easy discoverability
- **y: 130** - Above the stage, just below expected top platform
- **size: 25** - Large enough to be findable, not so large as to be obvious

### Adjusting Difficulty

To make the pixel spot:
- **Harder to find**: Reduce size to 15-20 px, move to less obvious location
- **Easier to find**: Increase size to 30+ px, move to more central location

---

**Ready to deploy!** Use any of the three methods in PIXEL_SPOTS_SETUP.md to add this to Firestore.
