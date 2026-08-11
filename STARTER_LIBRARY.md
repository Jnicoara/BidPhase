# Starter Library

Reference content for the shipped baseline library — the "real starter library of common electrical materials/assemblies" called for in [ASSEMBLIES_PLAN.md](ASSEMBLIES_PLAN.md) § ADDITIONAL FOUNDATIONAL NOTES, so first use feels functional instead of presenting an empty catalog.

**This is a reference document only.** Nothing here is loaded into the database yet. These rows become baseline library entries (`userId IS NULL`) when Library screens are built in step 2.

> **Prices are starting estimates, not quotes.** Every figure below is a placeholder to make the app usable on day one. Real numbers come from the user's own suppliers and market.

---

## Labor Rates

Starting estimates — adjust to local market.

| Role | Hourly Cost |
|---|---|
| Apprentice | $45.00 |
| Journeyman | $75.00 |
| Foreman | $95.00 |

---

## Modifiers

Labor-hour adjustments. Remember these **ADD** rather than compound — height + outdoor together is +35%, not +38%.

| Modifier | Labor Adjustment | Scope * |
|---|---|---|
| Working from height | +20% | global |
| Outdoor / weather | +15% | global |
| Existing / retrofit | +35% | global |
| Tight / congested space | +15% | global |
| Isolated ground circuit | +40% | assembly |
| After-hours / occupied space | +30% | global |

\* **Scope is inferred, please confirm.** ASSEMBLIES_PLAN.md names isolated ground as its example of an *assembly-specific* one-off modifier, so it's marked `assembly` here while the rest are `global`. Worth a second look before these are seeded.

---

## Materials

`Unit` maps to the `materials.unitOfSale` column (`each` / `foot` / `box`).

### Wire & Cable

| Material | Cost | Unit |
|---|---|---|
| #14 THHN | $0.40 | foot |
| #12 THHN | $0.55 | foot |
| #10 THHN | $0.85 | foot |
| #8 THHN | $1.35 | foot |
| 14-2 NM-B | $0.65 | foot |
| 12-2 NM-B | $0.90 | foot |

### Conduit & Fittings

| Material | Cost | Unit |
|---|---|---|
| 1/2" EMT | $0.90 | foot |
| 3/4" EMT | $1.20 | foot |
| 1" EMT | $1.80 | foot |
| 1/2" PVC | $0.45 | foot |
| EMT connector 1/2" | $0.60 | each |
| EMT connector 3/4" | $0.85 | each |
| EMT strap | $0.35 | each |

### Boxes & Devices

| Material | Cost | Unit |
|---|---|---|
| Single-gang box | $1.25 | each |
| 4" square box | $1.75 | each |
| Fan-rated ceiling box | $6.50 | each |
| Duplex receptacle | $1.50 | each |
| GFCI receptacle | $16.00 | each |
| Single-pole switch | $1.75 | each |
| 3-way switch | $4.50 | each |
| Dimmer | $22.00 | each |
| Wall plate | $1.25 | each |
| Wire nuts | $0.08 | each |

### Panels & Breakers

| Material | Cost | Unit |
|---|---|---|
| 20A breaker | $9.00 | each |
| 20/2 breaker | $28.00 | each |
| 200A main panel | $285.00 | each |

### Lighting Hardware

| Material | Cost | Unit |
|---|---|---|
| 6ft MC whip | $12.00 | each |
| Fixture mounting bracket | $4.00 | each |

---

## Assemblies

Two tiers: **CORE** gets built first, **PHASE 2** is deferred. Groupings match the five values of the `assemblies.category` enum exactly.

Each entry is tagged **Residential / Commercial / Both**.

> **Note on the Res/Comm tag:** this is a *market segment* label for organizing the starter content. It is **not** the schema's `trade` field, which distinguishes electrical from plumbing/HVAC for multi-trade unlocking. Two different axes — don't wire them together.

> **Labor hours are deliberately absent.** See [Important Notes](#important-notes) — they must not be invented.

### CORE — build first

**Devices**

| Assembly | Segment |
|---|---|
| Duplex receptacle standard | Both |
| Duplex receptacle retrofit | Both |
| GFCI receptacle | Both |
| Dedicated 20A receptacle | Both |
| Single-pole switch | Both |
| 3-way switch | Both |
| Dimmer switch | Both |
| Range receptacle | Residential |
| Dryer receptacle | Residential |
| EV charger circuit | Both |

**Lighting**

| Assembly | Segment |
|---|---|
| Recessed can new construction | Both |
| Recessed can retrofit | Both |
| Surface-mount ceiling fixture | Both |
| Ceiling fan standard | Residential |
| Exit sign | Commercial |
| Emergency battery unit | Commercial |

**Panels**

| Assembly | Segment |
|---|---|
| Service upgrade 200A | Residential |
| Panel replacement like-for-like | Both |
| Breaker add/replace | Both |
| Subpanel install | Both |
| Whole-house surge protector | Residential |

**Equipment Connections**

| Assembly | Segment |
|---|---|
| HVAC condenser disconnect + whip | Both |
| Electric water heater connection | Both |
| Dishwasher connection | Residential |
| Bath exhaust fan wiring | Residential |

**Low Voltage/EMS**

| Assembly | Segment |
|---|---|
| Data/network drop | Both |
| Combination smoke/CO detector | Residential |

### PHASE 2 — deferred

**Devices**

| Assembly | Segment |
|---|---|
| AFCI receptacle | Both |
| Quad receptacle | Commercial |
| Floor receptacle | Commercial |
| USB combo receptacle | Residential |
| 4-way switch | Both |
| Smart switch | Residential |
| Occupancy/motion sensor switch | Commercial |
| Timer switch | Residential |
| Fan/light combo switch | Residential |
| Garbage disposal switch | Residential |
| Doorbell button | Residential |

**Lighting**

| Assembly | Segment |
|---|---|
| Pendant light | Residential |
| Chandelier heavy bracing | Residential |
| Track lighting | Commercial |
| Under-cabinet lighting | Residential |
| Exterior wall pack | Commercial |
| Flood/security light | Both |
| Landscape lighting circuit | Residential |
| Vanity light bar | Residential |
| Closet light | Residential |

**Panels**

| Assembly | Segment |
|---|---|
| Generator transfer switch | Residential |
| Load center relocate | Both |

**Equipment Connections**

| Assembly | Segment |
|---|---|
| Furnace/air handler connection | Residential |
| Pool pump connection | Residential |
| Hot tub/spa connection | Residential |
| Well pump connection | Residential |
| Sump pump circuit | Residential |

**Low Voltage/EMS**

| Assembly | Segment |
|---|---|
| Cable TV drop | Residential |
| Video doorbell wiring | Residential |
| Security system device wiring | Both |
| Thermostat low-voltage wiring | Both |

### Counts

| Category | CORE | PHASE 2 | Total |
|---|---|---|---|
| Devices | 10 | 11 | 21 |
| Lighting | 6 | 9 | 15 |
| Panels | 5 | 2 | 7 |
| Equipment Connections | 4 | 5 | 9 |
| Low Voltage/EMS | 2 | 4 | 6 |
| **Total** | **27** | **31** | **58** |

---

## Important Notes

- **Labor units are not AI-generated.** Any labor unit appearing here or in future entries is a placeholder/reference estimate only. Real labor units must come from the user's own field experience and/or the **NECA Manual of Labor Units** — a real, purchasable industry reference. Never treat an AI-produced labor unit as fact.
- **Box material and wiring method are NOT separate assemblies.** Metal vs plastic boxes, Romex vs conduit — these are handled by swapping materials within a single assembly, or by a user forking their own variant. Splitting them would multiply the library without adding value.
- **Conduit and wire runs are intentionally excluded** from the assembly list. They're handled by traced, dynamically-calculated footage on the takeoff page (see ASSEMBLIES_PLAN.md § CONDUIT & WIRE CALCULATION), not as fixed assemblies.
