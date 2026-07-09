/**
 * smartSearch.ts
 *
 * Intelligent search for electrical materials with:
 *  - Trade slang / alias expansion (e.g. "4 square" → "4-11/16 box", "romex" → "NM-B")
 *  - Abbreviation expansion (e.g. "emt" → "electrical metallic tubing")
 *  - Fuzzy substring matching with token scoring
 *  - Results ranked by relevance (exact match > alias match > partial match)
 */

// ─── Trade Alias Map ──────────────────────────────────────────────────────────
// Each entry: [canonical search terms that should match this alias]
// Keys are normalized query fragments; values are arrays of extra search terms
// injected into the item's searchable text.

const ALIAS_MAP: Record<string, string[]> = {
  // ── Boxes ──────────────────────────────────────────────────────────────────
  "4 square":         ["4-11/16", "4 inch square", "junction box", "square box", "4s"],
  "4s":               ["4-11/16", "4 inch square", "junction box", "square box"],
  "four square":      ["4-11/16", "4 inch square", "junction box", "square box"],
  "4x4":              ["4-11/16", "4 inch square", "junction box", "square box"],
  "4 11/16":          ["4-11/16 square box"],
  "411":              ["4-11/16 square box"],
  "4 gang":           ["4-11/16", "square box"],
  "jbox":             ["junction box", "pull box", "outlet box"],
  "j-box":            ["junction box", "pull box", "outlet box"],
  "j box":            ["junction box", "pull box", "outlet box"],
  "handy box":        ["utility box", "2x4 box", "handy"],
  "handy":            ["utility box", "2x4 box"],
  "old work":         ["old-work", "remodel box", "cut-in box"],
  "new work":         ["new-work", "nail-on box"],
  "cut in":           ["old-work", "remodel box", "cut-in"],
  "mud ring":         ["extension ring", "raised cover", "plaster ring"],
  "plaster ring":     ["mud ring", "extension ring", "raised cover"],
  "extension ring":   ["mud ring", "plaster ring", "raised cover"],
  "raised cover":     ["mud ring", "plaster ring", "extension ring"],
  "single gang":      ["1-gang", "device box", "switch box"],
  "double gang":      ["2-gang", "device box"],
  "two gang":         ["2-gang", "device box"],
  "three gang":       ["3-gang", "device box"],
  "octagon":          ["oct box", "4 inch round", "ceiling box", "fan box"],
  "oct":              ["octagon box", "4 inch round", "ceiling box"],
  "round box":        ["octagon", "ceiling box", "fan box"],
  "fan box":          ["ceiling box", "octagon", "brace"],
  "pull box":         ["junction box", "wireway", "handhole"],
  "wireway":          ["pull box", "trough", "gutter"],
  "gutter":           ["wireway", "auxiliary gutter", "pull box"],
  "weatherproof":     ["WP", "outdoor box", "in-use cover", "rain tight"],
  "wp":               ["weatherproof", "outdoor", "rain tight"],
  "in use":           ["in-use cover", "weatherproof cover", "while-in-use"],
  "while in use":     ["in-use cover", "weatherproof cover"],

  // ── Conduit ────────────────────────────────────────────────────────────────
  "emt":              ["electrical metallic tubing", "thin wall", "thinwall"],
  "thin wall":        ["EMT", "electrical metallic tubing"],
  "thinwall":         ["EMT", "electrical metallic tubing"],
  "rigid":            ["RMC", "rigid metal conduit", "galvanized rigid", "GRC"],
  "rmc":              ["rigid metal conduit", "galvanized rigid", "GRC"],
  "imc":              ["intermediate metal conduit", "intermediate"],
  "pvc":              ["polyvinyl chloride conduit", "plastic conduit", "schedule 40", "schedule 80"],
  "sch 40":           ["schedule 40", "PVC schedule 40"],
  "sch 80":           ["schedule 80", "PVC schedule 80"],
  "schedule 40":      ["sch 40", "PVC"],
  "schedule 80":      ["sch 80", "PVC"],
  "flex":             ["FMC", "flexible metal conduit", "greenfield"],
  "fmc":              ["flexible metal conduit", "greenfield", "flex"],
  "greenfield":       ["FMC", "flexible metal conduit", "flex"],
  "liquid tight":     ["LFMC", "LFNC", "liquidtight", "liquid-tight"],
  "liquidtight":      ["LFMC", "LFNC", "liquid tight"],
  "lfmc":             ["liquid tight flexible metal conduit", "liquidtight"],
  "lfnc":             ["liquid tight flexible nonmetallic", "liquidtight"],
  "sealtite":         ["LFMC", "liquid tight", "liquidtight"],
  "half inch":        ["1/2\"", "1/2 inch", "trade size 1/2"],
  "3/4 inch":         ["3/4\"", "trade size 3/4"],
  "one inch":         ["1\"", "1 inch", "trade size 1"],
  "inch and a quarter": ["1-1/4\"", "1.25 inch"],
  "inch and a half":  ["1-1/2\"", "1.5 inch"],
  "two inch":         ["2\"", "2 inch", "trade size 2"],

  // ── Conduit Fittings ───────────────────────────────────────────────────────
  "connector":        ["fitting", "conduit connector", "EMT connector", "set screw", "compression"],
  "set screw":        ["connector", "coupling", "EMT set screw"],
  "compression":      ["connector", "coupling", "EMT compression", "rain tight"],
  "coupling":         ["conduit coupling", "EMT coupling", "RMC coupling"],
  "sweep":            ["90 degree", "90° sweep", "conduit bend", "elbow"],
  "elbow":            ["sweep", "90 degree", "conduit bend", "LB", "LR", "LL"],
  "90":               ["sweep", "elbow", "90 degree bend"],
  "lb":               ["conduit body", "LB body", "back pull"],
  "lr":               ["conduit body", "LR body"],
  "ll":               ["conduit body", "LL body"],
  "c body":           ["conduit body", "C type"],
  "conduit body":     ["LB", "LR", "LL", "C body", "T body"],
  "offset":           ["conduit offset", "EMT offset"],
  "nipple":           ["close nipple", "conduit nipple", "threaded nipple"],
  "bushing":          ["reducing bushing", "conduit bushing", "grounding bushing"],
  "locknut":          ["lock nut", "conduit locknut", "chase nipple"],
  "chase nipple":     ["locknut", "reducing bushing"],
  "strut":            ["unistrut", "channel", "slotted channel", "P1000", "P1001"],
  "unistrut":         ["strut", "channel", "slotted channel"],
  "channel":          ["strut", "unistrut", "slotted channel"],
  "beam clamp":       ["strut clamp", "beam attachment", "strut attachment"],
  "pipe clamp":       ["conduit clamp", "one hole strap", "two hole strap"],
  "one hole":         ["1-hole strap", "conduit strap", "pipe clamp"],
  "two hole":         ["2-hole strap", "conduit strap", "pipe clamp"],
  "strap":            ["conduit strap", "pipe strap", "one hole", "two hole"],

  // ── Wire & Cable ───────────────────────────────────────────────────────────
  "romex":            ["NM-B", "nonmetallic sheathed", "house wire"],
  "nm-b":             ["romex", "nonmetallic sheathed", "house wire"],
  "nm":               ["NM-B", "romex", "nonmetallic sheathed"],
  "house wire":       ["NM-B", "romex"],
  "thhn":             ["THWN", "THWN-2", "building wire", "single conductor"],
  "thwn":             ["THHN", "THWN-2", "building wire"],
  "building wire":    ["THHN", "THWN", "single conductor"],
  "mc cable":         ["metal clad", "armored cable", "MC"],
  "armored":          ["MC cable", "metal clad", "BX"],
  "bx":               ["MC cable", "armored cable", "metal clad"],
  "ac cable":         ["armored cable", "BX", "MC cable"],
  "ser":              ["service entrance", "SER cable", "service cable"],
  "seu":              ["service entrance", "SEU cable"],
  "service entrance": ["SER", "SEU", "service cable"],
  "urd":              ["underground", "direct burial", "URD cable"],
  "direct burial":    ["URD", "underground", "USE-2"],
  "use-2":            ["URD", "direct burial", "underground"],
  "cat6":             ["category 6", "ethernet", "data cable", "network cable"],
  "cat 6":            ["category 6", "ethernet", "data cable"],
  "ethernet":         ["CAT6", "category 6", "data cable"],
  "coax":             ["coaxial", "RG6", "RG59", "cable TV"],
  "low voltage":      ["LV", "data", "control wire", "thermostat wire"],
  "thermostat wire":  ["low voltage", "control wire", "18/5", "18/8"],
  "control wire":     ["low voltage", "thermostat wire"],
  "14 gauge":         ["14 AWG", "#14", "14/2", "14/3"],
  "12 gauge":         ["12 AWG", "#12", "12/2", "12/3"],
  "10 gauge":         ["10 AWG", "#10", "10/2", "10/3"],
  "8 gauge":          ["8 AWG", "#8"],
  "6 gauge":          ["6 AWG", "#6"],
  "4 gauge":          ["4 AWG", "#4"],
  "2 gauge":          ["2 AWG", "#2"],
  "1/0":              ["1/0 AWG", "one ought", "0 gauge"],
  "2/0":              ["2/0 AWG", "two ought"],
  "3/0":              ["3/0 AWG", "three ought"],
  "4/0":              ["4/0 AWG", "four ought"],
  "250 mcm":          ["250 KCMIL", "250 MCM"],
  "350 mcm":          ["350 KCMIL", "350 MCM"],
  "500 mcm":          ["500 KCMIL", "500 MCM"],
  "kcmil":            ["MCM", "thousand circular mils"],
  "mcm":              ["KCMIL", "thousand circular mils"],

  // ── Distribution / Panels ──────────────────────────────────────────────────
  "panel":            ["load center", "breaker panel", "distribution panel", "panelboard"],
  "load center":      ["panel", "breaker panel", "distribution panel"],
  "breaker panel":    ["load center", "panel", "distribution panel"],
  "main panel":       ["main breaker", "load center", "200 amp panel"],
  "sub panel":        ["subpanel", "sub-panel", "load center", "distribution panel"],
  "meter":            ["meter base", "meter socket", "meter can", "metering"],
  "meter base":       ["meter socket", "meter can", "meter"],
  "meter socket":     ["meter base", "meter can"],
  "meter can":        ["meter base", "meter socket"],
  "disconnect":       ["safety switch", "fusible disconnect", "non-fusible", "pull-out"],
  "safety switch":    ["disconnect", "fusible disconnect"],
  "pull out":         ["disconnect", "meter combo", "pull-out"],
  "breaker":          ["circuit breaker", "CB", "OCPD"],
  "cb":               ["circuit breaker", "breaker"],
  "single pole":      ["1-pole", "1P", "SP breaker"],
  "double pole":      ["2-pole", "2P", "DP breaker", "240V breaker"],
  "2 pole":           ["double pole", "2P", "240V breaker"],
  "gfci breaker":     ["GFCI circuit breaker", "ground fault breaker"],
  "afci breaker":     ["AFCI circuit breaker", "arc fault breaker"],
  "dual function":    ["DFCI", "AFCI/GFCI", "combination breaker"],
  "tandem":           ["twin breaker", "slimline breaker", "half-size breaker"],
  "twin":             ["tandem breaker", "slimline", "half-size"],
  "square d":         ["Square-D", "QO", "HOM", "Homeline"],
  "qo":               ["Square D", "QO breaker"],
  "homeline":         ["HOM", "Square D", "Homeline breaker"],
  "hom":              ["Homeline", "Square D"],
  "eaton":            ["Cutler-Hammer", "CH", "BR", "Eaton breaker"],
  "cutler hammer":    ["Eaton", "CH breaker"],
  "ch":               ["Eaton", "Cutler-Hammer", "CH breaker"],
  "br":               ["Eaton", "BR breaker"],
  "siemens":          ["ITE", "Siemens breaker", "QP"],
  "ite":              ["Siemens", "ITE breaker"],
  "schneider":        ["Square D", "Schneider Electric"],
  "ge":               ["General Electric", "GE breaker", "THQL"],
  "thql":             ["GE breaker", "General Electric"],
  "fuse":             ["fuse holder", "fuse block", "cartridge fuse", "class R"],
  "fuse block":       ["fuse holder", "fuse", "cartridge fuse"],

  // ── Devices & Trim ─────────────────────────────────────────────────────────
  "outlet":           ["receptacle", "duplex", "plug", "NEMA 5-15R", "device"],
  "receptacle":       ["outlet", "duplex", "plug", "device"],
  "duplex":           ["receptacle", "outlet", "duplex outlet", "plug"],
  "plug":             ["receptacle", "outlet", "duplex", "NEMA 5-15R"],
  "device":           ["receptacle", "outlet", "switch", "plug", "duplex"],
  "gfci outlet":      ["GFCI receptacle", "ground fault outlet", "GFI"],
  "gfi":              ["GFCI", "ground fault", "GFCI outlet", "GFCI receptacle"],
  "ground fault":     ["GFCI", "GFI", "GFCI outlet", "GFCI receptacle"],
  "gfci":             ["GFI", "ground fault", "GFCI outlet", "GFCI receptacle"],
  "afci":             ["arc fault", "AFCI breaker", "arc fault circuit interrupter"],
  "arc fault":        ["AFCI", "AFCI breaker", "arc fault circuit interrupter"],
  "switch":           ["single pole switch", "3-way switch", "toggle switch", "device"],
  "toggle":           ["toggle switch", "single pole switch"],
  "3 way":            ["3-way switch", "three-way", "traveler"],
  "three way":        ["3-way switch", "three-way", "traveler"],
  "4 way":            ["4-way switch", "four-way"],
  "four way":         ["4-way switch", "four-way"],
  "dimmer":           ["dimmer switch", "dimmer control", "rheostat"],
  "decorator":        ["decora", "rocker switch", "paddle switch"],
  "decora":           ["decorator", "rocker switch", "paddle"],
  "rocker":           ["decorator", "decora", "rocker switch", "paddle switch"],
  "paddle":           ["decora", "rocker switch", "decorator"],
  "plate":            ["wall plate", "cover plate", "faceplate", "screwless"],
  "cover plate":      ["wall plate", "faceplate", "plate"],
  "faceplate":        ["wall plate", "cover plate", "plate"],
  "wall plate":       ["cover plate", "faceplate", "plate"],
  "outlet cover":     ["wall plate", "cover plate", "receptacle plate", "duplex plate", "faceplate"],
  "outlet plate":     ["wall plate", "cover plate", "receptacle plate", "duplex plate"],
  "switch cover":     ["wall plate", "toggle plate", "switch plate", "cover plate"],
  "switch plate":     ["wall plate", "toggle plate", "cover plate"],
  "cover":            ["wall plate", "cover plate", "blank cover", "faceplate"],
  "screwless":        ["screwless wall plate", "screwless cover", "decorator plate", "no screw plate", "smooth plate"],
  "no screw":         ["screwless wall plate", "screwless cover", "screwless plate"],
  "smooth plate":     ["screwless wall plate", "screwless cover", "no screw plate"],
  "seamless plate":   ["screwless wall plate", "screwless cover", "no screw plate"],
  "blank":            ["blank plate", "blank cover", "blank wall plate"],
  "midsize plate":    ["midsize wall plate", "mid-size cover plate", "leviton 80601", "leviton 80714"],
  "jumbo plate":      ["jumbo wall plate", "oversized cover plate", "leviton 88001", "leviton 88014"],
  "oversized plate":  ["jumbo wall plate", "jumbo cover plate", "leviton 88001"],
  "double gang plate":["2-gang wall plate", "2 gang cover plate", "double gang cover"],
  "triple gang plate":["3-gang wall plate", "3 gang cover plate", "triple gang cover"],
  "quad plate":       ["4-gang wall plate", "4 gang cover plate", "quad gang cover"],
  "quad gang plate":  ["4-gang wall plate", "4 gang cover plate", "quad cover"],
  "2 gang plate":     ["2-gang wall plate", "double gang wall plate", "2 gang cover plate"],
  "3 gang plate":     ["3-gang wall plate", "triple gang wall plate", "3 gang cover plate"],
  "4 gang plate":     ["4-gang wall plate", "quad gang wall plate", "4 gang cover plate"],
  "combination plate":["combo plate", "combination wall plate", "combo cover plate"],
  "combo plate":      ["combination plate", "combination wall plate", "combo cover"],
  "usb":              ["USB outlet", "USB receptacle", "USB-C", "USB-A", "charger outlet"],
  "charger":          ["USB outlet", "USB receptacle", "USB-C", "USB-A"],
  "tamper resistant": ["TR outlet", "tamper-resistant", "child proof", "childproof", "TR receptacle"],
  "tamper proof":     ["TR outlet", "tamper-resistant", "child proof", "TR receptacle"],
  "tr":               ["tamper resistant", "tamper-resistant outlet", "TR receptacle"],
  "child proof":      ["tamper resistant", "TR outlet", "TR receptacle"],
  "spec grade":       ["commercial grade", "specification grade", "heavy duty"],
  "commercial grade": ["spec grade", "specification grade", "heavy duty", "20A"],
  "hospital grade":   ["HG receptacle", "hospital grade outlet", "red outlet"],
  "20 amp":           ["20A", "T-slot", "20 ampere"],
  "15 amp":           ["15A", "standard outlet", "15 ampere"],
  "dryer outlet":     ["30A 250V", "NEMA 10-30R", "NEMA 14-30R", "dryer receptacle"],
  "dryer":            ["30A 250V", "NEMA 14-30R", "dryer receptacle", "dryer outlet"],
  "range outlet":     ["50A", "NEMA 14-50R", "range receptacle", "stove outlet"],
  "stove":            ["50A", "NEMA 14-50R", "range receptacle", "range outlet"],
  "range":            ["50A", "NEMA 14-50R", "range receptacle"],
  "rv outlet":        ["RV", "NEMA TT-30R", "NEMA 14-50R", "RV receptacle"],
  "ev":               ["EV charger", "electric vehicle", "NEMA 14-50R", "Level 2"],
  "electric vehicle": ["EV charger", "NEMA 14-50R", "Level 2 charger"],
  "pilot light":      ["pilot switch", "illuminated switch", "lighted switch"],
  "illuminated":      ["pilot light switch", "lighted switch"],
  "motion sensor":    ["occupancy sensor", "motion switch", "PIR sensor"],
  "occupancy":        ["occupancy sensor", "motion sensor", "motion switch"],
  "pir":              ["PIR sensor", "motion sensor", "occupancy sensor"],
  "timer switch":     ["digital timer", "timer", "time switch"],
  "keyed switch":     ["key switch", "keyed", "security switch"],

  // ── Lighting ───────────────────────────────────────────────────────────────
  "can light":        ["recessed light", "wafer light", "downlight", "pot light", "can"],
  "can":              ["recessed light", "can light", "downlight", "pot light"],
  "pot light":        ["recessed light", "can light", "downlight"],
  "recessed":         ["can light", "pot light", "downlight", "wafer", "recessed housing"],
  "recessed housing": ["can light", "new construction housing", "IC housing"],
  "ic housing":       ["insulation contact", "recessed housing", "can light"],
  "retrofit":         ["retrofit kit", "LED retrofit", "can retrofit", "recessed retrofit"],
  "wafer":            ["wafer light", "slim recessed", "ultra-thin recessed", "disk light"],
  "disk light":       ["wafer light", "slim recessed", "LED disk"],
  "led":              ["LED light", "LED fixture", "LED wafer", "LED downlight"],
  "downlight":        ["recessed light", "can light", "pot light", "wafer"],
  "troffer":          ["2x4 troffer", "2x2 troffer", "fluorescent troffer", "LED troffer", "flat panel"],
  "flat panel":       ["LED flat panel", "troffer", "2x4 LED", "2x2 LED"],
  "2x4":              ["2x4 troffer", "2x4 fixture", "2x4 LED"],
  "2x2":              ["2x2 troffer", "2x2 fixture", "2x2 LED"],
  "strip light":      ["LED strip", "shop light", "strip fixture", "utility light"],
  "shop light":       ["LED strip", "strip fixture", "vapor tight", "utility light"],
  "vapor tight":      ["vapor proof", "wet location fixture", "shop light", "vapor-tight"],
  "vapor proof":      ["vapor tight", "wet location", "shop light"],
  "high bay":         ["high-bay", "warehouse light", "UFO light", "industrial light"],
  "ufo":              ["UFO high bay", "round high bay", "LED high bay"],
  "wall pack":        ["wall-pack", "outdoor wall light", "area light"],
  "flood light":      ["floodlight", "area light", "outdoor flood"],
  "exit sign":        ["exit light", "exit fixture", "egress"],
  "emergency light":  ["emergency fixture", "bug eye", "emergency lighting", "egress"],
  "bug eye":          ["emergency light", "emergency fixture", "twin head"],
  "smoke detector":   ["smoke alarm", "smoke det", "fire alarm", "hardwired smoke"],
  "smoke alarm":      ["smoke detector", "hardwired smoke", "fire alarm"],
  "co detector":      ["carbon monoxide", "CO alarm", "CO detector"],
  "carbon monoxide":  ["CO detector", "CO alarm", "combo detector"],
  "smoke co":         ["smoke/CO combo", "combination detector", "combo alarm"],
  "doorbell":         ["doorbell transformer", "chime", "bell transformer"],
  "thermostat":       ["thermostat wire", "t-stat", "HVAC control"],
  "t-stat":           ["thermostat", "thermostat wire", "HVAC control"],

  // ── Supports & Fasteners ───────────────────────────────────────────────────
  "wire nut":         ["twist-on connector", "marrette", "wire connector", "wing nut"],
  "marrette":         ["wire nut", "twist-on connector"],
  "twist on":         ["wire nut", "twist-on connector"],
  "wire connector":   ["wire nut", "twist-on connector"],
  "staple":           ["cable staple", "NM staple", "romex staple"],
  "romex staple":     ["cable staple", "NM staple", "staple"],
  "threaded rod":     ["all-thread", "allthread", "hanger rod"],
  "all thread":       ["threaded rod", "allthread", "hanger rod"],
  "allthread":        ["threaded rod", "all-thread", "hanger rod"],
  "hanger rod":       ["threaded rod", "all-thread"],
  "strut nut":        ["channel nut", "spring nut", "strut channel nut"],
  "channel nut":      ["strut nut", "spring nut"],
  "spring nut":       ["strut nut", "channel nut"],
  "conduit hanger":   ["conduit clamp", "pipe hanger", "clevis hanger"],
  "clevis hanger":    ["conduit hanger", "pipe hanger"],
  "beam clamp alt":   ["strut attachment", "beam attachment"],
  "anchor":           ["concrete anchor", "lag shield", "wedge anchor", "drop-in anchor"],
  "wedge anchor":     ["concrete anchor", "anchor bolt"],
  "drop in":          ["drop-in anchor", "concrete anchor"],
  "lag":              ["lag screw", "lag bolt", "wood screw"],
  "self tapping":     ["sheet metal screw", "self-tapping screw", "tek screw"],
  "tek":              ["tek screw", "self-tapping", "sheet metal screw"],

  // ── Civil & Grounding ──────────────────────────────────────────────────────
  "ground rod":       ["grounding electrode", "copper clad rod", "8 ft rod", "10 ft rod"],
  "grounding rod":    ["ground rod", "grounding electrode"],
  "ground clamp":     ["grounding clamp", "rod clamp", "acorn clamp"],
  "acorn":            ["acorn clamp", "ground clamp", "grounding clamp"],
  "grounding wire":   ["ground wire", "bare copper", "green wire"],
  "bare copper":      ["grounding wire", "ground wire"],
  "green wire":       ["grounding wire", "ground wire"],
  "conduit seal":     ["sealing fitting", "EYS", "conduit sealing"],
  "duct seal":        ["duct sealing compound", "conduit seal"],
  "marking tape":     ["caution tape", "warning tape", "underground tape"],
  "underground tape": ["marking tape", "warning tape", "caution tape"],
  "caution tape":     ["marking tape", "warning tape"],
  "pulling lubricant": ["wire lube", "cable lube", "pulling compound"],
  "wire lube":        ["pulling lubricant", "cable lube"],
  "cable lube":       ["pulling lubricant", "wire lube"],
  "fish tape":        ["pull tape", "fish wire"],
  "pull string":      ["pull line", "mule tape", "fish line"],
  "mule tape":        ["pull string", "pull line"],
  "conduit plug":     ["end cap", "conduit cap"],
  "end cap":          ["conduit plug", "conduit cap"],

  // ── Boxes ─────────────────────────────────────────────────────────
  "box":              ["electrical box", "junction box", "device box", "outlet box", "switch box"],
  "gem box":          ["single gang box", "1-gang box", "device box", "switch box", "outlet box"],
  "blue box":         ["plastic box", "device box", "gem box", "1-gang box"],
  "device box":       ["gem box", "1-gang box", "switch box", "outlet box"],
  "switch box":       ["device box", "gem box", "1-gang box"],
  "outlet box":       ["device box", "gem box", "1-gang box"],
  "remodel box":      ["old work box", "cut-in box", "retrofit box"],
  "nail on":          ["new work box", "new construction box", "nail-on box"],
  "nail-on":          ["new work box", "new construction box", "nail on box"],
  "junction box":     ["j-box", "jbox", "4-square", "4 square"],
  "ceiling box":      ["octagon box", "round box", "fan box", "light box"],
  "fan rated":        ["fan-rated box", "ceiling fan box", "fan box"],
  "utility box":      ["handy box", "surface box"],
  "weatherproof box": ["WP box", "outdoor box", "in-use cover", "bubble cover"],
  "in use cover":     ["weatherproof cover", "bubble cover", "WP cover"],
  "bubble cover":     ["in-use cover", "weatherproof cover", "WP cover"],
  "pvc box":          ["PVC device box", "plastic conduit box", "Schedule 40 box"],
  "vapor barrier":    ["vapor box", "airtight box", "vapor-barrier box"],
  "siding box":       ["siding mount box", "exterior box", "siding fixture"],
  "pancake box":      ["shallow box", "pancake", "shallow ceiling box"],

  // ── Conduit & Fittings ────────────────────────────────────────────────
  "grc":              ["galvanized rigid conduit", "RMC", "rigid"],
  "pvc conduit":      ["PVC", "schedule 40", "schedule 80", "grey conduit"],
  "ent":              ["electrical nonmetallic tubing", "smurf tube", "blue flex"],
  "smurf tube":       ["ENT", "electrical nonmetallic tubing", "blue flex"],
  "blue flex":        ["ENT", "smurf tube"],
  "pulling elbow":    ["conduit body", "LB", "sweep"],
  "kindorf":          ["strut", "unistrut", "channel"],

  // ── Wire & Cable ───────────────────────────────────────────────────────
  "nm cable":         ["Romex", "NM-B", "nonmetallic sheathed"],
  "metal clad":       ["MC cable", "MC", "armored cable"],
  "armored cable":    ["MC cable", "AC cable", "BX", "metal clad"],
  "se cable":         ["SER", "service entrance", "service cable"],
  "service cable":    ["SER", "SE cable", "service entrance cable"],
  "xhhw":             ["XHHW-2", "aluminum wire", "aluminum conductor"],
  "aluminum wire":    ["XHHW", "XHHW-2", "Al wire"],
  "tray cable":       ["TC cable", "TC-ER", "tray"],
  "tc cable":         ["tray cable", "TC-ER"],
  "vfd cable":        ["VFD wire", "motor lead", "variable frequency drive cable"],
  "cat5":             ["Cat 5", "ethernet cable", "data cable"],
  "data cable":       ["Cat6", "Cat5", "ethernet", "network cable"],

  // ── Panels & Breakers (additional terms) ────────────────────────────────────
  "half size":        ["tandem breaker", "slim breaker"],
  "service panel":    ["load center", "panel", "main panel", "breaker box"],
  "breaker box":      ["load center", "panel", "service panel"],
  "main breaker":     ["main disconnect", "main CB", "main circuit breaker"],
  "subpanel":         ["sub panel", "sub-panel", "distribution panel"],
  "transfer switch":  ["generator transfer", "ATS", "automatic transfer switch"],
  "ats":              ["automatic transfer switch", "transfer switch"],
  "surge protector":  ["SPD", "surge protection device", "whole house surge"],
  "spd":              ["surge protector", "surge protection device"],
};

// ─── Normalize helper ─────────────────────────────────────────────────────────
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[″"]/g, '"')          // normalize Unicode inch symbols
    .replace(/[–—]/g, "-")          // normalize dashes
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Build searchable text for an item ────────────────────────────────────────
export interface SearchableItem {
  id: string;
  description: string;
  category?: string | null;
  unit?: string | null;
  [key: string]: unknown;
}

function buildSearchText(item: SearchableItem): string {
  const parts = [
    item.description,
    item.category ?? "",
    item.id ?? "",
    item.unit ?? "",
    // Include embedded trade slang / brand aliases if present
    (() => { const a = (item as { searchAliases?: string | string[] }).searchAliases; return Array.isArray(a) ? a.join(" ") : (a ?? ""); })(),
  ];
  return normalize(parts.join(" "));
}

// ─── Expand query with aliases ────────────────────────────────────────────────
function expandQuery(query: string): string[] {
  const q = normalize(query);
  const terms = new Set<string>([q]);

  // Add alias expansions
  for (const [alias, expansions] of Object.entries(ALIAS_MAP)) {
    if (q.includes(alias) || alias.includes(q)) {
      for (const exp of expansions) {
        terms.add(normalize(exp));
      }
    }
  }

  // Also check if any alias value matches the query
  for (const [alias, expansions] of Object.entries(ALIAS_MAP)) {
    for (const exp of expansions) {
      if (normalize(exp).includes(q) || q.includes(normalize(exp))) {
        terms.add(normalize(alias));
        for (const e2 of expansions) {
          terms.add(normalize(e2));
        }
      }
    }
  }

  return Array.from(terms);
}

// ─── Score a single item against a query ─────────────────────────────────────
function scoreItem(searchText: string, terms: string[]): number {
  let score = 0;
  for (const term of terms) {
    if (!term) continue;
    if (searchText === term) {
      score += 100;
    } else if (searchText.startsWith(term)) {
      score += 60;
    } else if (searchText.includes(term)) {
      // Bonus for matching at word boundary
      const wordBoundary = new RegExp(`(^|\\s)${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
      score += wordBoundary.test(searchText) ? 40 : 20;
    }
    // Token-level matching: split term into tokens and check each
    const tokens = term.split(" ").filter(Boolean);
    if (tokens.length > 1) {
      const matchedTokens = tokens.filter((t) => searchText.includes(t));
      score += (matchedTokens.length / tokens.length) * 15;
    }
  }
  return score;
}

// ─── Main search function ─────────────────────────────────────────────────────
export interface SmartSearchResult<T extends SearchableItem> {
  item: T;
  score: number;
}

export function smartSearch<T extends SearchableItem>(
  items: T[],
  query: string,
  maxResults = 100
): T[] {
  const q = normalize(query);
  if (!q) return items.slice(0, maxResults);

  const expandedTerms = expandQuery(q);

  const scored: SmartSearchResult<T>[] = [];
  for (const item of items) {
    const searchText = buildSearchText(item);
    const score = scoreItem(searchText, expandedTerms);
    if (score > 0) {
      scored.push({ item, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults).map((r) => r.item);
}

// ─── Category-aware search (groups results by category) ───────────────────────
export function smartSearchGrouped<T extends SearchableItem>(
  items: T[],
  query: string,
  maxResults = 200
): Map<string, T[]> {
  const results = smartSearch(items, query, maxResults);
  const grouped = new Map<string, T[]>();
  for (const item of results) {
    const cat = item.category ?? "Other";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }
  return grouped;
}
