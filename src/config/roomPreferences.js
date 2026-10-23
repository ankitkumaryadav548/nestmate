/**
 * Room Preferences Configuration (Phase 4 Part 2)
 * 
 * Defines allowable preferences for roommate groups and auto-assign students.
 * Preferences are SOFT preferences: the allocation engine attempts to honour them
 * in priority order during room assignment, but availability cannot be guaranteed.
 */

export const MAX_PREFERRED_HOSTELS = 3;

export const AC_OPTIONS = ["ac", "non-ac", "no-preference"];

export const AC_DETAILS = {
  ac: {
    value: "ac",
    label: "AC Room",
    description: "Climate-controlled air-conditioned accommodation",
    icon: "❄️",
  },
  "non-ac": {
    value: "non-ac",
    label: "Non-AC Room",
    description: "Standard naturally ventilated accommodation",
    icon: "🍃",
  },
  "no-preference": {
    value: "no-preference",
    label: "No Preference",
    description: "Flexible with either AC or Non-AC accommodation",
    icon: "✨",
  },
};

export const FLOOR_OPTIONS = ["low", "mid", "high", "any"];

export const FLOOR_DETAILS = {
  low: {
    value: "low",
    label: "Lower Floors",
    description: "Ground and bottom floors — convenient quick access without lifts",
    icon: "⬇️",
  },
  mid: {
    value: "mid",
    label: "Middle Floors",
    description: "Central intermediate levels — balanced elevation and noise reduction",
    icon: "↔️",
  },
  high: {
    value: "high",
    label: "Upper Floors",
    description: "Top floors — scenic views, minimal hallway foot traffic, quieter",
    icon: "⬆️",
  },
  any: {
    value: "any",
    label: "Any Floor",
    description: "No specific floor height preference — maximum allocation flexibility",
    icon: "🏢",
  },
};
