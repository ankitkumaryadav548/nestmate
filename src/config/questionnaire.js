/**
 * Central Questionnaire Configuration (Single Source of Truth)
 * 
 * IMPORTANT DESIGN RULES & ETHICAL GUIDELINES:
 * 1. Substance-Free Policy: Smoking and alcohol are strictly prohibited in university hostels.
 *    Therefore, no smoking or alcohol questions are included anywhere in this system.
 * 2. Inclusivity & Non-Discrimination: Nationality, region, or ethnicity must NEVER be used
 *    to rank, penalize, or segregate students. Cultural comfort and language preferences
 *    exist solely to improve living comfort, are completely self-declared, and are strictly optional.
 * 3. Strict Privacy: A student's preferences and profile are strictly private. No student
 *    can ever inspect another student's profile or answers. Only the student themselves
 *    and verified administrators have access.
 * 4. Deal-Breakers: The roommate matching engine (a subsequent phase) will interpret deal-breakers
 *    as strict filtering criteria before compatibility scoring.
 */

export const COURSE_YEAR_LIMITS = {
  min: 1,
  max: 6,
};

export const LANGUAGE_OPTIONS = [
  "English",
  "Hindi",
  "Punjabi",
  "Bengali",
  "Marathi",
  "Gujarati",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Odia",
  "Assamese",
  "Urdu",
  "Nepali",
  "Arabic",
  "French",
  "Swahili",
  "Luganda",
  "Amharic",
  "Other",
];

export const DEAL_BREAKER_OPTIONS = [
  {
    key: "food",
    label: "Strict Dietary Compatibility",
    description: "Roommate must share the exact same food type (e.g. Vegetarian only).",
    icon: "🥗",
  },
  {
    key: "lateNightNoise",
    label: "No Late-Night Calls / Noise",
    description: "No roommate with frequent late-night phone or video conversations.",
    icon: "🤫",
  },
  {
    key: "visitors",
    label: "Low Visitor Traffic",
    description: "No roommate with very high social activity or frequent visitors in the room.",
    icon: "🚪",
  },
  {
    key: "cleanliness",
    label: "Minimum Cleanliness Standard",
    description: "Roommate must be at least moderately tidy (cleanliness score 3 out of 5 or higher).",
    icon: "✨",
  },
  {
    key: "acType",
    label: "Strict AC Requirement",
    description: "Room assignment must strictly match my AC or Non-AC preference.",
    icon: "❄️",
  },
];

export const QUESTIONNAIRE_STEPS = [
  {
    id: 1,
    title: "Daily Routine",
    description: "Your sleep pattern, active study hours, and late-night habits.",
    icon: "⏰",
  },
  {
    id: 2,
    title: "Living Habits",
    description: "Tidiness, noise sensitivity, social preferences, and climate control.",
    icon: "🏡",
  },
  {
    id: 3,
    title: "Food & Languages",
    description: "Dietary preferences, food tolerance, and spoken languages.",
    icon: "🍽️",
  },
  {
    id: 4,
    title: "Deal-Breakers & Review",
    description: "Non-negotiable constraints and final submission review.",
    icon: "🛡️",
  },
];

export const QUESTIONS = [
  // Step 1: Daily Routine
  {
    key: "sleepSchedule",
    step: 1,
    label: "Sleep Schedule",
    helpText: "When do you typically sleep on most weekdays and nights?",
    type: "enum",
    required: true,
    options: [
      {
        value: "early",
        label: "Early to Bed",
        description: "Usually sleep before 10:00 PM",
        icon: "🌅",
      },
      {
        value: "normal",
        label: "Normal Hours",
        description: "Usually sleep between 10:00 PM and 12:00 AM",
        icon: "🌙",
      },
      {
        value: "late",
        label: "Night Owl",
        description: "Usually sleep after 12:00 AM (midnight)",
        icon: "🦉",
      },
    ],
  },
  {
    key: "studyTime",
    step: 1,
    label: "Preferred Study Time",
    helpText: "At what time of day are you most productive for focused study?",
    type: "enum",
    required: true,
    options: [
      {
        value: "morning",
        label: "Morning Person",
        description: "Dawn to midday focus",
        icon: "☕",
      },
      {
        value: "daytime",
        label: "Daytime",
        description: "Afternoon and early evening",
        icon: "☀️",
      },
      {
        value: "night",
        label: "Night Owl Study",
        description: "Late evening into midnight quiet",
        icon: "🌌",
      },
      {
        value: "flexible",
        label: "Flexible / Anytime",
        description: "Adapts easily to schedule changes",
        icon: "🔄",
      },
    ],
  },
  {
    key: "nightCalls",
    step: 1,
    label: "Late-Night Phone / Video Calls",
    helpText: "How frequently do you take calls after 11 PM (e.g. international family, relatives)?",
    type: "enum",
    required: true,
    options: [
      {
        value: "never",
        label: "Rarely or Never",
        description: "I avoid late-night calls in the shared room",
        icon: "🔕",
      },
      {
        value: "sometimes",
        label: "Occasionally",
        description: "A few times a week, kept brief or whispered",
        icon: "📱",
      },
      {
        value: "often",
        label: "Frequently",
        description: "Regular late-night calls (e.g., family in distant time zone)",
        icon: "🌐",
      },
    ],
  },

  // Step 2: Living Habits
  {
    key: "cleanliness",
    step: 2,
    label: "Cleanliness & Tidiness",
    helpText: "How tidy and organized do you keep your room and personal area?",
    type: "scale",
    required: true,
    min: 1,
    max: 5,
    minLabel: "1 - Relaxed / Easygoing",
    maxLabel: "5 - Spotless / Very Tidy",
    descriptions: {
      1: "Relaxed: Uncluttered is fine, but doesn't mind laundry or study books left out.",
      2: "Casual: Tidy occasionally, general order is enough.",
      3: "Moderate: Daily wipe down, bed made, neat study desk.",
      4: "Very Neat: Keeps floor and surfaces clear and clean.",
      5: "Spotless: Highly disciplined, everything in its place, very hygienic.",
    },
  },
  {
    key: "noiseTolerance",
    step: 2,
    label: "Noise Tolerance",
    helpText: "How sensitive are you to background noise when resting or concentrating?",
    type: "scale",
    required: true,
    min: 1,
    max: 5,
    minLabel: "1 - Needs Silence",
    maxLabel: "5 - Fine with Noise",
    descriptions: {
      1: "Pin-drop silence required to focus or sleep.",
      2: "Low noise: Distracted by audio or conversation.",
      3: "Average: Tolerates normal room ambience with headphones.",
      4: "High tolerance: Can comfortably sleep or work with background chatter.",
      5: "Imprevious: Not bothered by lively conversations or music nearby.",
    },
  },
  {
    key: "socialLevel",
    step: 2,
    label: "Social Level & Guests",
    helpText: "How often do you invite classmates or friends into your room for social visits?",
    type: "scale",
    required: true,
    min: 1,
    max: 5,
    minLabel: "1 - Quiet Sanctuary",
    maxLabel: "5 - Social Hub",
    descriptions: {
      1: "Prefers the room strictly as a peaceful retreat; very few visitors.",
      2: "Occasional study partner; prefers socializing outside the bedroom.",
      3: "Balanced: Happy to have a friend or two over occasionally.",
      4: "Social: Enjoys frequent group hangouts and collaborative prep.",
      5: "Very Social: Loves an active, open-door environment with friends dropping in.",
    },
  },
  {
    key: "acPreference",
    step: 2,
    label: "AC Preference",
    helpText: "What type of room cooling do you prefer?",
    type: "enum",
    required: true,
    options: [
      {
        value: "ac",
        label: "Air Conditioned (AC)",
        description: "Prefer continuous cooling comfort",
        icon: "❄️",
      },
      {
        value: "non-ac",
        label: "Non-AC (Ventilated)",
        description: "Comfortable with ceiling fans and natural breeze",
        icon: "🍃",
      },
      {
        value: "no-preference",
        label: "No Preference",
        description: "Either AC or Non-AC is perfectly fine",
        icon: "⚖️",
      },
    ],
  },

  // Step 3: Food & Languages
  {
    key: "foodType",
    step: 3,
    label: "Dietary Lifestyle",
    helpText: "What type of meals do you consume?",
    type: "enum",
    required: true,
    options: [
      {
        value: "veg",
        label: "Vegetarian",
        description: "Plant-based foods, dairy permitted",
        icon: "🥗",
      },
      {
        value: "non-veg",
        label: "Non-Vegetarian",
        description: "Includes poultry, meat, and seafood",
        icon: "🍗",
      },
      {
        value: "eggetarian",
        label: "Eggetarian",
        description: "Vegetarian diet inclusive of eggs",
        icon: "🍳",
      },
      {
        value: "halal",
        label: "Halal",
        description: "Non-vegetarian adhering strictly to Halal guidelines",
        icon: "🥩",
      },
      {
        value: "jain",
        label: "Jain Vegetarian",
        description: "Strict vegetarian without root vegetables (onion, garlic, etc.)",
        icon: "🌱",
      },
    ],
  },
  {
    key: "okWithDifferentFood",
    step: 3,
    label: "Comfort Sharing with Different Diet",
    helpText: "Are you comfortable sharing your room with a student who consumes a different diet?",
    type: "boolean",
    required: true,
    options: [
      {
        value: true,
        label: "Comfortable with Any Diet",
        description: "I am fine with my roommate having different dietary practices",
        icon: "🤝",
      },
      {
        value: false,
        label: "Prefer Same Diet Only",
        description: "I prefer a roommate who eats similarly to me",
        icon: "🔒",
      },
    ],
  },
  {
    key: "languages",
    step: 3,
    label: "Languages Spoken / Understood",
    helpText: "Select languages you comfortably converse in (minimum 1, you can also add custom ones).",
    type: "multiselect",
    required: true,
  },
  {
    key: "culturalComfort",
    step: 3,
    label: "Cultural Background Preference",
    helpText: "Self-declared comfort preference. Optional and given low importance in matching; never used to exclude anyone.",
    type: "enum",
    required: false,
    options: [
      {
        value: "open-to-all",
        label: "Open to All Backgrounds",
        description: "Excited to live with students from any country, state, or culture",
        icon: "🌍",
      },
      {
        value: "prefer-similar-background",
        label: "Prefer Familiar Background",
        description: "Feel slightly more at home with someone from a similar cultural region",
        icon: "🏡",
      },
      {
        value: "no-preference",
        label: "No Preference",
        description: "No specific inclination",
        icon: "🤝",
      },
    ],
  },
];
