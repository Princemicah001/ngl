import { PromptTemplate } from '../types';

export const PROMPT_SUGGESTIONS: PromptTemplate[] = [
  { id: '1', category: 'trending', text: "What's something you secretly wish I knew about you?", tag: "Secret" },
  { id: '2', category: 'trending', text: "What was your honest first impression of me?", tag: "Honesty" },
  { id: '3', category: 'confessions', text: "Drop a confession you haven't told anyone...", tag: "Confession" },
  { id: '4', category: 'crush', text: "Do you have a crush on someone we both know? 👀", tag: "Crush" },
  { id: '5', category: 'roast', text: "Roast my style in 3 words or less 💀", tag: "Roast" },
  { id: '6', category: 'friendship', text: "What's your favorite memory of us together?", tag: "Memory" },
  { id: '7', category: 'trending', text: "If we could go anywhere right now, where to?", tag: "Travel" },
  { id: '8', category: 'confessions', text: "What's the biggest lie you've ever told with a straight face?", tag: "Secret" },
  { id: '9', category: 'crush', text: "Rate how attractive you find me from 1-10 honestly 🔥", tag: "Rating" },
  { id: '10', category: 'trending', text: "What song reminds you of me whenever it plays?", tag: "Music" },
  { id: '11', category: 'friendship', text: "What's one thing you appreciate about our friendship?", tag: "Love" },
  { id: '12', category: 'roast', text: "What's my biggest red flag and green flag? 🚩🟩", tag: "Flags" },
  { id: '13', category: 'trending', text: "Tell me a secret you've never told anyone else 🤫", tag: "Whisper" },
  { id: '14', category: 'confessions', text: "Have you ever stalked my social media profiles?", tag: "Stalker" },
  { id: '15', category: 'crush', text: "Would you ever go on a date with me if I asked?", tag: "Date" },
  { id: '16', category: 'trending', text: "What's the best advice you could give me right now?", tag: "Advice" },
  { id: '17', category: 'friendship', text: "Who in our circle do you trust the most?", tag: "Trust" },
  { id: '18', category: 'trending', text: "What is your biggest fear that keeps you awake at night?", tag: "Deep" }
];

export const ANONYMOUS_AVATARS = [
  { emoji: '🦊', label: 'Mysterious Fox', bg: 'from-amber-400 to-orange-500' },
  { emoji: '🕵️', label: 'Secret Detective', bg: 'from-blue-500 to-indigo-600' },
  { emoji: '🐱', label: 'Midnight Cat', bg: 'from-purple-500 to-pink-500' },
  { emoji: '🎭', label: 'Phantom', bg: 'from-rose-500 to-red-600' },
  { emoji: '🦄', label: 'Dreamer', bg: 'from-cyan-400 to-blue-500' },
  { emoji: '👾', label: 'Glitch', bg: 'from-emerald-400 to-teal-600' },
  { emoji: '⚡', label: 'Spark', bg: 'from-yellow-400 to-amber-500' },
  { emoji: '🌙', label: 'Night Owl', bg: 'from-violet-500 to-purple-800' }
];

export const CARD_GRADIENTS = [
  'from-[#fa0f5c] to-[#fc6320]',
  'from-[#8A2387] via-[#E94057] to-[#F27121]',
  'from-[#00c6ff] to-[#0072ff]',
  'from-[#f857a6] to-[#ff5858]',
  'from-[#11998e] to-[#38ef7d]',
  'from-[#654ea3] to-[#eaafc8]'
];

export const DEFAULT_PROMPT = "send me anonymous messages!";
