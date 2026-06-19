-- ============================================================
-- Migration 005 — Additional Crowd Models
-- ============================================================
-- Five more crowd models beyond Late Night Bar. Each encodes a
-- different gig shape (set count, BPM bands, energy arc, openers,
-- closers, bans). Adds to the picker in the GENERATE modal so the
-- band can match the model to the gig type.
--
-- Models added:
--   wedding_reception_4set_8to12    — generation-mixed, peak 10:30, family-safe
--   cocktail_hour_2set_6to9         — groove only, conversation-friendly
--   festival_patio_2set_3to6        — sun-drenched, broad recognition
--   corporate_private_3set_8to11    — recognizable, dialed-back energy
--   brewery_taproom_2set_7to10      — older demo, classic rock heavier
--
-- Idempotent — re-running just updates the config.
-- ============================================================

INSERT INTO crowd_models (id, name, description, set_count, total_duration_minutes, break_duration_minutes, config)
VALUES
  -- ── Wedding reception ────────────────────────────────────────────────
  (
    'wedding_reception_4set_8to12',
    'Wedding Reception — 8pm to midnight',
    'Four 45-minute sets with 15-min breaks. Generation-mixed crowd. Peak 10:30. No songs with curse words. Mandatory variety across decades — grandparents on the floor for one song, kids for the next.',
    4,
    240,
    15,
    $$
    {
      "phases": [
        {
          "set_index": 0,
          "name": "Cocktail / First Dance",
          "wall_clock": "8:00-8:45",
          "duration_minutes": 45,
          "energy_arc": [4, 5, 5, 6, 6, 7, 7],
          "bpm_range": [95, 130],
          "open_rules": { "must_be": ["recognizable", "groove"], "ban": ["loud", "above_140_bpm"] },
          "close_rules": { "must_be": ["mid_tempo_anthem"] },
          "ban": ["explicit_lyrics", "above_150_bpm"],
          "max_unknown_in_row": 0,
          "lifeline_max_gap": 3
        },
        {
          "set_index": 1,
          "name": "Build",
          "wall_clock": "9:00-9:45",
          "duration_minutes": 45,
          "energy_arc": [6, 7, 7, 8, 8, 7, 7],
          "bpm_range": [110, 150],
          "open_rules": { "must_be": ["recognizable", "energetic"] },
          "close_rules": { "must_be": ["singalong_anchor"] },
          "ban": ["explicit_lyrics", "ballad"],
          "max_unknown_in_row": 0,
          "lifeline_max_gap": 3
        },
        {
          "set_index": 2,
          "name": "Peak",
          "wall_clock": "10:00-10:45",
          "duration_minutes": 45,
          "energy_arc": [8, 9, 9, 9, 8, 8, 9],
          "bpm_range": [115, 165],
          "open_rules": { "must_be": ["banger", "peak_eligible"] },
          "close_rules": { "must_be": ["singalong_anchor", "universal"] },
          "ban": ["explicit_lyrics", "ballad"],
          "max_unknown_in_row": 0,
          "lifeline_max_gap": 2,
          "glue_density": "1_every_4"
        },
        {
          "set_index": 3,
          "name": "Late",
          "wall_clock": "11:00-11:45",
          "duration_minutes": 45,
          "energy_arc": [8, 7, 8, 8, 7, 8, 9],
          "bpm_range": [110, 160],
          "open_rules": { "must_be": ["energetic"] },
          "close_rules": { "must_be": ["closer_capable", "singalong_anchor"], "should_be": ["universal_recognition"] },
          "ban": ["explicit_lyrics"],
          "max_unknown_in_row": 0,
          "lifeline_max_gap": 2
        }
      ],
      "global_rules": {
        "lifeline_max_gap": 3,
        "alternate_vibes": true,
        "no_song_repeat_across_gig": true,
        "ban_explicit": true,
        "force_decade_variety": true,
        "must_include": ["broad_appeal_anchors"]
      },
      "peak_window": {
        "start_minutes_from_door": 120,
        "end_minutes_from_door": 165,
        "description": "10pm-10:45pm wall clock. Universal anchors hit here when the bar tab is fully open and Grandma is dancing."
      },
      "philosophy": "Everyone leaves having had at least one song. No explicit lyrics. Peak earlier than a bar gig (10:30, not 12:30) because the room is older and tired."
    }
    $$::jsonb
  ),

  -- ── Cocktail hour ────────────────────────────────────────────────────
  (
    'cocktail_hour_2set_6to9',
    'Cocktail Hour — 6pm to 9pm',
    'Two 60-minute sets, low energy, groove-led, conversation-friendly. Audience is standing or seated, drinks in hand, talking. The band is the soundtrack to the room, not the focus.',
    2,
    180,
    15,
    $$
    {
      "phases": [
        {
          "set_index": 0,
          "name": "Arrival",
          "wall_clock": "6:00-7:00",
          "duration_minutes": 60,
          "energy_arc": [3, 3, 4, 4, 5, 5, 5],
          "bpm_range": [80, 120],
          "open_rules": { "must_be": ["groove", "low_energy"], "ban": ["above_125_bpm"] },
          "close_rules": { "must_be": ["recognizable_groove"] },
          "ban": ["above_140_bpm", "loud"],
          "max_unknown_in_row": 2,
          "lifeline_max_gap": 5
        },
        {
          "set_index": 1,
          "name": "Lean-In",
          "wall_clock": "7:15-8:15",
          "duration_minutes": 60,
          "energy_arc": [5, 5, 6, 6, 6, 7, 7],
          "bpm_range": [90, 130],
          "open_rules": { "must_be": ["recognizable_groove"] },
          "close_rules": { "must_be": ["recognizable", "mid_tempo"] },
          "ban": ["above_140_bpm"],
          "max_unknown_in_row": 2,
          "lifeline_max_gap": 4
        }
      ],
      "global_rules": {
        "lifeline_max_gap": 4,
        "alternate_vibes": true,
        "no_song_repeat_across_gig": true,
        "energy_ceiling": 7,
        "favor_grooves": true
      },
      "philosophy": "Audience is talking, not dancing. Job is to flatter the room — make people say this place feels good. Energy stays under 7."
    }
    $$::jsonb
  ),

  -- ── Festival patio ──────────────────────────────────────────────────
  (
    'festival_patio_2set_3to6',
    'Festival / Patio — 3pm to 6pm',
    'Two 60-minute sets, outdoor, daylight, mixed crowd of intentional listeners and passers-by. Broad recognition is the currency. Lower BPM than bar shows because people are standing on grass, not dancing on hardwood.',
    2,
    180,
    15,
    $$
    {
      "phases": [
        {
          "set_index": 0,
          "name": "Sun-Up",
          "wall_clock": "3:00-4:00",
          "duration_minutes": 60,
          "energy_arc": [5, 6, 6, 7, 7, 6, 7],
          "bpm_range": [95, 140],
          "open_rules": { "must_be": ["recognizable", "broad_appeal"] },
          "close_rules": { "must_be": ["singalong_anchor"] },
          "ban": ["dark", "above_160_bpm"],
          "max_unknown_in_row": 1,
          "lifeline_max_gap": 3
        },
        {
          "set_index": 1,
          "name": "Sun-Down",
          "wall_clock": "4:30-5:30",
          "duration_minutes": 60,
          "energy_arc": [6, 7, 7, 8, 8, 7, 8],
          "bpm_range": [100, 150],
          "open_rules": { "must_be": ["recognizable", "anthem_capable"] },
          "close_rules": { "must_be": ["closer_capable", "singalong_anchor"] },
          "ban": ["above_165_bpm"],
          "max_unknown_in_row": 1,
          "lifeline_max_gap": 3
        }
      ],
      "global_rules": {
        "lifeline_max_gap": 3,
        "alternate_vibes": true,
        "no_song_repeat_across_gig": true,
        "favor_universal": true
      },
      "philosophy": "Half the crowd didn't choose to come. Every song needs to grab a stranger. Bias toward universal anchors. No deep cuts."
    }
    $$::jsonb
  ),

  -- ── Corporate / private ─────────────────────────────────────────────
  (
    'corporate_private_3set_8to11',
    'Corporate / Private — 8pm to 11pm',
    'Three 45-minute sets. Recognizable, family-safe, mid-energy. The CEO is in the room. Volume slightly dialed back. No songs that say a curse word in the chorus.',
    3,
    180,
    15,
    $$
    {
      "phases": [
        {
          "set_index": 0,
          "name": "Warm-Up",
          "wall_clock": "8:00-8:45",
          "duration_minutes": 45,
          "energy_arc": [4, 5, 5, 6, 6, 7],
          "bpm_range": [95, 135],
          "open_rules": { "must_be": ["recognizable", "groove"], "ban": ["explicit_lyrics"] },
          "close_rules": { "must_be": ["singalong_anchor_or_lifeline_8"] },
          "ban": ["explicit_lyrics", "ballad", "above_150_bpm"],
          "max_unknown_in_row": 1,
          "lifeline_max_gap": 3
        },
        {
          "set_index": 1,
          "name": "Engage",
          "wall_clock": "9:00-9:45",
          "duration_minutes": 45,
          "energy_arc": [6, 7, 7, 8, 8, 7],
          "bpm_range": [110, 150],
          "open_rules": { "must_be": ["energetic", "recognizable"] },
          "close_rules": { "must_be": ["anthem", "universal"] },
          "ban": ["explicit_lyrics", "ballad"],
          "max_unknown_in_row": 0,
          "lifeline_max_gap": 3
        },
        {
          "set_index": 2,
          "name": "Send-Off",
          "wall_clock": "10:00-10:45",
          "duration_minutes": 45,
          "energy_arc": [7, 8, 8, 8, 8, 8, 9],
          "bpm_range": [105, 160],
          "open_rules": { "must_be": ["banger", "peak_eligible"] },
          "close_rules": { "must_be": ["closer_capable", "singalong_anchor"] },
          "ban": ["explicit_lyrics", "above_165_bpm"],
          "max_unknown_in_row": 0,
          "lifeline_max_gap": 2
        }
      ],
      "global_rules": {
        "lifeline_max_gap": 3,
        "alternate_vibes": true,
        "no_song_repeat_across_gig": true,
        "ban_explicit": true,
        "favor_universal": true
      },
      "philosophy": "Recognizable, clean, mid-energy. The audience is dressed up, the boss is watching. Universal anchors only."
    }
    $$::jsonb
  ),

  -- ── Brewery taproom ─────────────────────────────────────────────────
  (
    'brewery_taproom_2set_7to10',
    'Brewery / Taproom — 7pm to 10pm',
    'Two 75-minute sets. Older demographic (35-55), classic rock heavier, BPM slightly lower than the bar model. Audience is here to drink craft beer and nod along to riffs they recognize.',
    2,
    180,
    15,
    $$
    {
      "phases": [
        {
          "set_index": 0,
          "name": "Settle-In",
          "wall_clock": "7:00-8:15",
          "duration_minutes": 75,
          "energy_arc": [4, 5, 5, 6, 6, 7, 7, 7, 7],
          "bpm_range": [90, 140],
          "open_rules": { "must_be": ["recognizable", "classic"], "ban": ["above_155_bpm"] },
          "close_rules": { "must_be": ["singalong_anchor_or_classic_riff"] },
          "ban": ["above_165_bpm"],
          "max_unknown_in_row": 2,
          "lifeline_max_gap": 4,
          "glue_density": "1_every_3"
        },
        {
          "set_index": 1,
          "name": "Cruise",
          "wall_clock": "8:30-9:45",
          "duration_minutes": 75,
          "energy_arc": [6, 7, 7, 8, 8, 7, 7, 8, 8],
          "bpm_range": [95, 150],
          "open_rules": { "must_be": ["classic_anthem"] },
          "close_rules": { "must_be": ["closer_capable", "singalong_anchor"] },
          "ban": ["above_165_bpm"],
          "max_unknown_in_row": 2,
          "lifeline_max_gap": 4,
          "glue_density": "1_every_3"
        }
      ],
      "global_rules": {
        "lifeline_max_gap": 4,
        "alternate_vibes": true,
        "no_song_repeat_across_gig": true,
        "favor_classic_rock": true,
        "energy_ceiling": 8
      },
      "philosophy": "Older demo, lower BPM ceiling, more classic-rock glue. They're here for the beer and the riff."
    }
    $$::jsonb
  )

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  config = EXCLUDED.config,
  updated_at = NOW();
