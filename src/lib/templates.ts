export interface NglTemplateQuestion {
  id: string;
  category: 'crush' | 'deep' | 'fun' | 'spicy' | 'friendship' | 'vibes' | 'school';
  text: string;
  emoji: string;
}

export const NGL_60_TEMPLATES: string[] = [
  // 1-10: Classic & Crushes
  "Send me an anonymous message",
  "do you like anyone right now? 👀",
  "confess your crush anonymously",
  "what's a secret you've never told me?",
  "tell me what you really think of me",
  "who was your first crush?",
  "would you date me? be honest",
  "can we hang out soon?",
  "i think i have a crush on u 🫣",
  "are u single right now?",

  // 11-20: Spicy & Bold
  "what's the wildest thing you've ever done?",
  "what's your biggest red flag in someone?",
  "whats the last thing you ate? 🍕",
  "tell me a lie you told that everyone believed",
  "have you ever talked behind my back?",
  "what's something you regret not saying to me?",
  "give me your most brutal unfiltered opinion of me",
  "who in our circle do you secretly dislike?",
  "have you ever stalked my social media profile?",
  "what's one thing you'd change about me?",

  // 21-30: Deep & Meaningful
  "what is keeping you awake at 2 AM?",
  "what's a hard lesson life taught you recently?",
  "are you genuinely happy right now?",
  "what is your biggest fear that you hide from people?",
  "who is someone you miss terribly but can't talk to?",
  "if we never spoke again, what would you want me to know?",
  "what is a dream you gave up on?",
  "do you believe in soulmates or right person wrong time?",
  "what's the best compliment anyone has ever given you?",
  "what makes you feel most understood?",

  // 31-40: Fun & Chaos
  "roast my Instagram feed in one sentence 😂",
  "send me your favorite song recommendation 🎵",
  "if we were stranded on an island, what would happen?",
  "give me a dare and I might do it on story",
  "what is the weirdest habit you have?",
  "tell me an embarrassing story from middle school",
  "what song describes my energy perfectly?",
  "drop your favorite conspiracy theory 🛸",
  "if you could swap lives with me for 24 hours, what would you do?",
  "what's the funniest rumor you ever heard about me?",

  // 41-50: Friendship & Vibes
  "what vibe do I give off at first glance?",
  "what's our best memory together?",
  "what kind of aesthetic do you associate with me?",
  "describe me using only three emojis ✨",
  "am I intimidating or approachable?",
  "what's something I do that always makes you laugh?",
  "if I were a fictional character, who would I be?",
  "would you trust me with your deepest secret?",
  "what's a personality trait of mine you admire?",
  "rate my style / outfits from 1 to 10 honestly 🔥",

  // 51-60: Campus, Work & Late Night
  "send me your hot take on campus drama ☕",
  "what's your favorite late-night craving?",
  "what's something everyone loves that you secretly hate?",
  "what's your go-to karaoke track?",
  "tell me a goal you want to achieve this year",
  "what's the last thing that made you smile genuinely?",
  "if you could teleport anywhere right now, where would you go?",
  "what superpower would you choose and why?",
  "give me a nickname that nobody else calls me",
  "tell me something I should try at least once in life",

  // 61-70: Bonus Aesthetic & Relatable
  "drop a lyric that hits different every time 🎧",
  "what is your definition of a perfect weekend?",
  "send me a question only I would know the answer to",
  "what movie could you watch 100 times without getting bored?",
  "are you an overthinker or go-with-the-flow?",
  "what's the most random compliment you received?",
  "if you wrote a book about your life, what's the title?",
  "tell me one thing you wish people knew about you",
  "what makes someone immediately attractive to you?",
  "send me a message that will make my day brighter ☀️"
];

// Helper to generate a unique 6-character random alphanumeric code
export function generateRandomCode(length = 6): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // Avoid confusing chars (0, O, 1, l, i)
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
