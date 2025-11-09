export const REACTION_OPTIONS = [
    { emoji: "👍", label: "Thumbs up" },
    { emoji: "❤️", label: "Heart" },
    { emoji: "😂", label: "Laughing" },
    { emoji: "😮", label: "Surprised" },
    { emoji: "😢", label: "Crying" },
    { emoji: "🙏", label: "Thank you" },
];

export const REACTION_LABELS = REACTION_OPTIONS.reduce((accumulator, option) => {
    accumulator[option.emoji] = option.label;
    return accumulator;
}, {});

