import Groq from 'groq-sdk';
import { DraggableItem } from './types';

export const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds
export const MAX_REQUESTS = 10; // Keep some buffer below the 30 RPM limit
export const COMBINATION_COOLDOWN = 2000; // 2 seconds cooldown between combinations
export const COMBINATION_DISTANCE = 40; // Distance threshold for combining elements
export const MAX_RETRIES = 5;
export const BASE_DELAY = 500; // Base delay in milliseconds

export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'zh'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// UI translations
export const UI_TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    elements: 'Elements',
    mode: 'Mode',
    basic: 'Basic',
    timed: 'Timed',
    category: 'Category',
    oneVsOne: '1v1',
    language: 'Language',
    searchElements: 'Search elements...',
    baseElements: 'Base Elements',
    generatedElements: 'Generated Elements',
    noElementsFound: 'No elements found matching',
    lastActive: 'Last active',
    documentation: 'Documentation',
    signOut: 'Sign Out',
    changeBackground: 'Change background'
  },
  es: {
    elements: 'Elementos',
    mode: 'Modo',
    basic: 'Básico',
    timed: 'Tiempo',
    category: 'Categoría',
    oneVsOne: '1v1',
    language: 'Idioma',
    searchElements: 'Buscar elementos...',
    baseElements: 'Elementos Base',
    generatedElements: 'Elementos Generados',
    noElementsFound: 'No se encontraron elementos que coincidan con',
    lastActive: 'Última actividad',
    documentation: 'Documentación',
    signOut: 'Cerrar Sesión',
    changeBackground: 'Cambiar fondo'
  },
  fr: {
    elements: 'Éléments',
    mode: 'Mode',
    basic: 'Basique',
    timed: 'Chronométré',
    category: 'Catégorie',
    oneVsOne: '1v1',
    language: 'Langue',
    searchElements: 'Rechercher des éléments...',
    baseElements: 'Éléments de Base',
    generatedElements: 'Éléments Générés',
    noElementsFound: 'Aucun élément trouvé correspondant à',
    lastActive: 'Dernière activité',
    documentation: 'Documentation',
    signOut: 'Déconnexion',
    changeBackground: 'Changer le fond'
  },
  de: {
    elements: 'Elemente',
    mode: 'Modus',
    basic: 'Basis',
    timed: 'Zeit',
    category: 'Kategorie',
    oneVsOne: '1v1',
    language: 'Sprache',
    searchElements: 'Elemente suchen...',
    baseElements: 'Basiselemente',
    generatedElements: 'Generierte Elemente',
    noElementsFound: 'Keine Elemente gefunden für',
    lastActive: 'Zuletzt aktiv',
    documentation: 'Dokumentation',
    signOut: 'Abmelden',
    changeBackground: 'Hintergrund ändern'
  },
  zh: {
    elements: '元素',
    mode: '模式',
    basic: '基础',
    timed: '计时',
    category: '分类',
    oneVsOne: '1v1',
    language: '语言',
    searchElements: '搜索元素...',
    baseElements: '基础元素',
    generatedElements: '生成的元素',
    noElementsFound: '未找到匹配的元素',
    lastActive: '上次活动',
    documentation: '文档',
    signOut: '退出登录',
    changeBackground: '更改背景'
  }
};

export const baseElements: DraggableItem[] = [
  { 
    id: 'fire', 
    name: 'Fire',
    translations: {
      es: 'Fuego',
      fr: 'Feu',
      de: 'Feuer',
      zh: '火'
    },
    icon: '🔥', 
    position: null, 
    connectedPoints: [], 
    isBaseElement: true 
  },
  { 
    id: 'water', 
    name: 'Water', 
    translations: {
      es: 'Agua',
      fr: 'Eau',
      de: 'Wasser',
      zh: '水'
    },
    icon: '💧', 
    position: null, 
    connectedPoints: [], 
    isBaseElement: true 
  },
  { 
    id: 'earth', 
    name: 'Earth',
    translations: {
      es: 'Tierra',
      fr: 'Terre',
      de: 'Erde',
      zh: '土'
    },
    icon: '🌍', 
    position: null, 
    connectedPoints: [], 
    isBaseElement: true 
  },
  { 
    id: 'bitcoin', 
    name: 'Bitcoin',
    translations: {
      es: 'Bitcoin',
      fr: 'Bitcoin',
      de: 'Bitcoin',
      zh: '比特币'
    },
    icon: '₿', 
    position: null, 
    connectedPoints: [], 
    isBaseElement: true 
  }
];

// Comprehensive emoji mappings for common words and categories
const EMOJI_MAPPINGS: Record<string, string> = {
  // Nature elements
  'Water': '💧', 'Fire': '🔥', 'Earth': '🌍', 'Air': '💨', 'Wind': '🌬️',
  'Ice': '❄️', 'Snow': '❄️', 'Rain': '🌧️', 'Cloud': '☁️', 'Storm': '⛈️',
  'Lightning': '⚡', 'Thunder': '🌩️', 'Tornado': '🌪️', 'Hurricane': '🌀',
  'Volcano': '🌋', 'Lava': '🌋', 'Magma': '🌋', 'Rock': '🪨', 'Stone': '🪨',
  'Mountain': '⛰️', 'Hill': '🏔️', 'Valley': '🏞️', 'Canyon': '🏞️',
  'Forest': '🌲', 'Tree': '🌳', 'Plant': '🌱', 'Flower': '🌸', 'Grass': '🌿',
  'Ocean': '🌊', 'Sea': '🌊', 'Lake': '🏞️', 'River': '🏞️', 'Stream': '💦',
  'Desert': '🏜️', 'Beach': '🏖️', 'Island': '🏝️', 'Reef': '🐠',
  'Mud': '💧', 'Steam': '♨️', 'Fog': '🌫️', 'Mist': '🌫️', 'Dust': '💨',
  'Ash': '🔥', 'Smoke': '💨', 'Swamp': '🌿', 'Oasis': '🏝️', 'Glacier': '❄️',
  'Iceberg': '❄️', 'Geyser': '💦', 'Waterfall': '🏞️', 'Tsunami': '🌊',
  'Wave': '🌊', 'Earthquake': '🌋', 'Landslide': '🏔️', 'Avalanche': '❄️',
  
  // Crypto/Tech elements
  'Bitcoin': '₿', 'Crypto': '₿', 'Blockchain': '🔗', 'Token': '🪙',
  'Digital': '💻', 'Computer': '💻', 'Network': '🌐', 'Internet': '🌐',
  'Code': '👨‍💻', 'Program': '👨‍💻', 'Algorithm': '🧮', 'Data': '📊',
  'Cyber': '🤖', 'Robot': '🤖', 'AI': '🧠', 'Machine': '⚙️',
  'Mining': '⛏️', 'Hash': '#️⃣', 'Wallet': '👛', 'Key': '🔑',
  'Cryptomine': '⛏️', 'Dataflow': '📊', 'Firewall': '🔥', 'Cyberspace': '🌐',
  'Bitstream': '💧₿', 'Cryptokey': '🔑', 'Datacloud': '☁️',
  'Webflow': '🌊', 'Netstream': '💧', 'Codefire': '🔥', 'Techearth': '🌍',
  'Inferno': '🔥', 'Cryptinferno': '🔥₿', 'Infernox': '🔥⚡',
  
  // Fire-related
  'Blaze': '🔥', 'Flame': '🔥', 'Burn': '🔥', 'Ember': '🔥', 'Spark': '✨',
  'Furnace': '🔥', 'Forge': '🔥', 'Hearth': '🏠', 'Bonfire': '🔥',
  'Wildfire': '🔥', 'Firestorm': '🔥', 'Hellfire': '🔥', 'Pyre': '🔥',
  'Combustion': '💥', 'Ignite': '🔥', 'Kindle': '🔥', 'Scorch': '🔥',
  'Singe': '🔥', 'Char': '🔥', 'Incinerate': '🔥', 'Smolder': '🔥',
  
  // Water-related
  'Aqua': '💧', 'Hydro': '💧', 'Liquid': '💧', 'Fluid': '💧', 'Damp': '💧',
  'Moist': '💧', 'Wet': '💧', 'Splash': '💦', 'Spray': '💦', 'Sprinkle': '💦',
  'Drip': '💧', 'Drop': '💧', 'Puddle': '💧', 'Pool': '🏊', 'Pond': '🏞️',
  'Flood': '🌊', 'Deluge': '🌊', 'Torrent': '🌊', 'Current': '🌊',
  'Tide': '🌊', 'Wave': '🌊', 'Ripple': '🌊', 'Surf': '🏄', 'Foam': '🧼',
  
  // Earth-related
  'Terra': '🌍', 'Geo': '🌍', 'Land': '🏞️', 'Soil': '🌱', 'Clay': '🏺',
  'Sand': '🏝️', 'Dirt': '🌱', 'Dust': '💨', 'Pebble': '🪨', 'Boulder': '🪨',
  'Mineral': '💎', 'Crystal': '💎', 'Gem': '💎', 'Jewel': '💎',
  'Mountain': '⛰️', 'Hill': '🏔️', 'Valley': '🏞️', 'Canyon': '🏞️',
  'Cave': '🕳️', 'Tunnel': '🚇', 'Mine': '⛏️', 'Quarry': '⛏️',
  
  // Crypto-related
  'Coin': '🪙', 'Token': '🪙', 'Wallet': '👛', 'Ledger': '📒',
  'Block': '🧱', 'Chain': '⛓️', 'Hash': '#️⃣', 'Mine': '⛏️',
  'Crypto': '₿', 'Digital': '💻', 'Virtual': '🌐', 'Decentralized': '🔗',
  'Smart': '🧠', 'Contract': '📝', 'Transaction': '💱', 'Exchange': '💱',
  'Trade': '📈', 'Market': '📊', 'Value': '💰', 'Price': '💲',
  'Stake': '🥩', 'Yield': '🌱', 'Farm': '🚜', 'Harvest': '🌾',
  
  // Mythological/Fantasy
  'Dragon': '🐉', 'Phoenix': '🔥', 'Unicorn': '🦄', 'Mermaid': '🧜‍♀️',
  'Wizard': '🧙‍♂️', 'Magic': '✨', 'Spell': '🪄', 'Potion': '🧪',
  'Fairy': '🧚', 'Elf': '🧝', 'Dwarf': '👨‍🦰', 'Giant': '🏔️',
  'Ghost': '👻', 'Spirit': '👻', 'Soul': '✨', 'Angel': '👼',
  'Demon': '👿', 'Devil': '😈', 'God': '👑', 'Goddess': '👑',
  
  // Space/Cosmic
  'Star': '⭐', 'Planet': '🪐', 'Moon': '🌙', 'Sun': '☀️',
  'Galaxy': '🌌', 'Universe': '🌌', 'Cosmos': '🌌', 'Nebula': '🌌',
  'Comet': '☄️', 'Asteroid': '☄️', 'Meteor': '☄️', 'Black Hole': '⚫',
  'Supernova': '💥', 'Stardust': '✨', 'Orbit': '🔄', 'Gravity': '🧲',
  
  // Abstract concepts
  'Time': '⏰', 'Space': '🌌', 'Energy': '⚡', 'Power': '💪',
  'Life': '🌱', 'Death': '💀', 'Mind': '🧠', 'Soul': '✨',
  'Love': '❤️', 'Hate': '💔', 'Peace': '☮️', 'War': '⚔️',
  'Light': '💡', 'Dark': '🌑', 'Sound': '🔊', 'Silence': '🔇',
  'Truth': '✓', 'Lie': '❌', 'Dream': '💭', 'Nightmare': '👹',
  
  // Combinations
  'Blend': '🔄', 'Fusion': '🔄', 'Hybrid': '🔄', 'Mix': '🔄',
  'Combo': '🔄', 'Merge': '🔄', 'Alloy': '🔄', 'Compound': '🔄',
  'Synthesis': '🧪', 'Reaction': '⚗️', 'Transform': '🔄', 'Convert': '🔄',
  'Transmute': '🔄', 'Evolve': '🧬', 'Mutate': '🧬', 'Adapt': '🧬',
  
  // Additional categories
  'Burnchain': '🔥⛓️', 'Liquidcoin': '💧₿', 'Digicoin': '⛏️₿',
  'Flamecoin': '🔥₿', 'Aquacoin': '💧₿', 'Terracoin': '🌍₿',
  'Firecrypto': '🔥₿', 'Watercrypto': '💧₿', 'Earthcrypto': '🌍₿',
  'Flamecrypto': '🔥₿', 'Aquacrypto': '💧₿', 'Terracrypto': '🌍₿'
};

// Domain categorization for elements
const DOMAINS = {
  NATURE: ['Water', 'Fire', 'Earth', 'Air', 'Wind', 'Ice', 'Plant', 'Tree', 'Forest', 'Ocean', 'Mountain', 'River', 'Lake', 'Rain', 'Snow', 'Cloud', 'Storm', 'Lightning', 'Thunder', 'Volcano', 'Lava', 'Magma', 'Rock', 'Stone'],
  TECH: ['Bitcoin', 'Cyber', 'Digital', 'Quantum', 'Computer', 'Robot', 'AI', 'Code', 'Network', 'Crypto', 'Tech', 'Data', 'Blockchain', 'Token', 'Mining', 'Hash', 'Wallet', 'Key', 'Algorithm', 'Program', 'Internet', 'Web', 'Virtual', 'Smart'],
  CULTURE: ['Music', 'Art', 'Film', 'Dance', 'Book', 'Story', 'Song', 'Painting', 'Sculpture', 'Fashion', 'Media', 'Game', 'Play', 'Sport', 'Festival', 'Celebration', 'Tradition', 'Heritage', 'Language', 'Symbol', 'Icon', 'Emblem'],
  MYTHOLOGY: ['Dragon', 'Phoenix', 'Titan', 'God', 'Myth', 'Legend', 'Hero', 'Magic', 'Spirit', 'Soul', 'Fairy', 'Elf', 'Dwarf', 'Giant', 'Ghost', 'Angel', 'Demon', 'Devil', 'Wizard', 'Witch', 'Spell', 'Potion', 'Enchant', 'Mystic'],
  SCIENCE: ['Atom', 'Energy', 'Plasma', 'Chemical', 'Physics', 'Biology', 'Molecule', 'Element', 'Formula', 'Lab', 'Fusion', 'Reaction', 'Compound', 'Catalyst', 'Experiment', 'Research', 'Discovery', 'Theory', 'Hypothesis', 'Test', 'Analysis'],
  COSMIC: ['Star', 'Planet', 'Moon', 'Sun', 'Galaxy', 'Universe', 'Cosmos', 'Nebula', 'Comet', 'Asteroid', 'Meteor', 'Space', 'Orbit', 'Gravity', 'Supernova', 'Stardust', 'Constellation', 'Celestial', 'Cosmic', 'Astral', 'Stellar'],
  ABSTRACT: ['Time', 'Space', 'Energy', 'Power', 'Life', 'Death', 'Mind', 'Soul', 'Love', 'Hate', 'Peace', 'War', 'Light', 'Dark', 'Sound', 'Silence', 'Truth', 'Lie', 'Dream', 'Nightmare', 'Reality', 'Illusion', 'Concept', 'Idea'],
  ELEMENTAL: ['Blaze', 'Flame', 'Burn', 'Ember', 'Spark', 'Aqua', 'Hydro', 'Liquid', 'Fluid', 'Terra', 'Geo', 'Land', 'Soil', 'Aero', 'Zephyr', 'Gust', 'Breeze', 'Cryo', 'Frost', 'Freeze', 'Chill', 'Electro', 'Volt', 'Shock', 'Current']
};

// Cache for generated translations and emojis
const translationCache: Record<string, Record<SupportedLanguage, string>> = {};
const emojiCache: Record<string, string> = {};

// Initialize Groq client
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

// Function to determine which domain an element belongs to
export const getDomain = (element: string): string => {
  const lowerElement = element.toLowerCase();
  
  for (const [domain, elements] of Object.entries(DOMAINS)) {
    if (elements.some(e => lowerElement.includes(e.toLowerCase()))) {
      return domain;
    }
    
    // Check for partial matches for better categorization
    if (elements.some(e => {
      const lowerE = e.toLowerCase();
      return lowerElement.includes(lowerE) || 
             lowerE.includes(lowerElement) ||
             lowerElement.startsWith(lowerE) ||
             lowerElement.endsWith(lowerE);
    })) {
      return domain;
    }
  }
  
  // Check for common prefixes/suffixes
  if (lowerElement.includes('coin') || lowerElement.includes('token') || lowerElement.includes('chain') || lowerElement.includes('crypto')) {
    return 'TECH';
  }
  if (lowerElement.includes('fire') || lowerElement.includes('flame') || lowerElement.includes('burn') || lowerElement.includes('blaze')) {
    return 'ELEMENTAL';
  }
  if (lowerElement.includes('water') || lowerElement.includes('aqua') || lowerElement.includes('hydro') || lowerElement.includes('liquid')) {
    return 'ELEMENTAL';
  }
  if (lowerElement.includes('earth') || lowerElement.includes('terra') || lowerElement.includes('geo') || lowerElement.includes('land')) {
    return 'ELEMENTAL';
  }
  
  return 'UNKNOWN';
};

// Enhanced emoji mapping based on domain combinations
const DOMAIN_EMOJI_MAPPINGS: Record<string, string[]> = {
  'NATURE_NATURE': ['🌿', '🌱', '🌲', '🌊', '🔥', '🌋', '🌍', '🌈', '☀️', '🌙', '🌧️', '❄️', '⛈️', '🌪️', '🌫️', '🏞️', '🏔️', '⛰️', '🏜️', '🏝️'],
  'TECH_TECH': ['💻', '🤖', '📱', '🔌', '💾', '🖥️', '📡', '🛰️', '🔋', '⚙️', '🔧', '🔨', '🛠️', '📊', '📈', '📉', '📱', '🖲️', '🖱️', '⌨️'],
  'NATURE_TECH': ['🌐', '🔬', '🧪', '🧬', '🔭', '📊', '📈', '🧮', '🔍', '🔎', '🔋', '🔌', '📡', '🛰️', '🌡️', '🧭', '🧰', '🧲', '⚗️', '🔬'],
  'MYTHOLOGY_NATURE': ['🐉', '🦄', '🧚', '🧙‍♂️', '🧝', '🧜‍♀️', '🧞', '🦅', '🦁', '🐺', '🦊', '🐲', '🦢', '🦚', '🦉', '🦌', '🐍', '🦂', '🕸️', '🕷️'],
  'MYTHOLOGY_TECH': ['✨', '🔮', '⚡', '🌟', '💫', '🌠', '🎆', '🎇', '🧿', '📿', '🪄', '🧿', '🔮', '✨', '💫', '🌟', '⚡', '🌠', '🎆', '🎇'],
  'TECH_CULTURE': ['🎮', '🎬', '🎵', '📺', '📷', '🎨', '🎭', '🎤', '🎧', '🎹', '🎸', '🎻', '🎺', '🎷', '🎼', '🎵', '🎶', '🎙️', '🎚️', '🎛️'],
  'NATURE_CULTURE': ['🏞️', '🌅', '🌄', '🏜️', '🏝️', '🏔️', '🌋', '🗻', '🌇', '🌆', '🏙️', '🌃', '🌉', '🌌', '🌠', '🌟', '✨', '💫', '🌈', '☀️'],
  'SCIENCE_NATURE': ['🧪', '⚗️', '🔬', '🔭', '📊', '📈', '📉', '🧮', '🔍', '🔎', '🧬', '🦠', '🧫', '🧪', '⚗️', '🔬', '🔭', '📡', '🛰️', '🌡️'],
  'SCIENCE_TECH': ['🧪', '⚗️', '🔬', '🔭', '📊', '📈', '📉', '🧮', '🔍', '🔎', '🧬', '🦠', '🧫', '🧪', '⚗️', '🔬', '🔭', '📡', '🛰️', '🌡️'],
  'COSMIC_NATURE': ['🌌', '🌠', '🌟', '✨', '💫', '☄️', '🪐', '🌙', '☀️', '🌍', '🌎', '🌏', '🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'],
  'COSMIC_TECH': ['🌌', '🌠', '🌟', '✨', '💫', '☄️', '🪐', '🌙', '☀️', '🛰️', '📡', '🔭', '📊', '📈', '📉', '🧮', '🔍', '🔎', '🧬', '🦠'],
  'ABSTRACT_NATURE': ['🌈', '☀️', '🌙', '🌍', '🌎', '🌏', '🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘', '🌌', '🌠', '🌟', '✨', '💫', '☄️'],
  'ABSTRACT_TECH': ['💻', '🤖', '📱', '🔌', '💾', '🖥️', '📡', '🛰️', '🔋', '⚙️', '🔧', '🔨', '🛠️', '📊', '📈', '📉', '📱', '🖲️', '🖱️', '⌨️'],
  'ELEMENTAL_TECH': ['🔥', '💧', '🌍', '💨', '⚡', '❄️', '🌪️', '🌊', '🌋', '⛰️', '🏔️', '🏞️', '🏜️', '🏝️', '🌡️', '🧭', '🧰', '🧲', '⚗️', '🔬'],
  'ELEMENTAL_NATURE': ['🔥', '💧', '🌍', '💨', '⚡', '❄️', '🌪️', '🌊', '🌋', '⛰️', '🏔️', '🏞️', '🏜️', '🏝️', '🌡️', '🧭', '🧰', '🧲', '⚗️', '🔬'],
  'ELEMENTAL_ELEMENTAL': ['🔥', '💧', '🌍', '💨', '⚡', '❄️', '🌪️', '🌊', '🌋', '⛰️', '🏔️', '🏞️', '🏜️', '🏝️', '🌡️', '🧭', '🧰', '🧲', '⚗️', '🔬']
};

// Get a relevant emoji based on domains
export const getRelevantEmoji = (domain1: string, domain2: string): string => {
  // First check if we have a direct match in EMOJI_MAPPINGS
  const domainPair = `${domain1}_${domain2}`;
  const reverseDomainPair = `${domain2}_${domain1}`;
  
  // Try to find emoji for the specific domain pair
  let emojis = DOMAIN_EMOJI_MAPPINGS[domainPair] || DOMAIN_EMOJI_MAPPINGS[reverseDomainPair];
  
  // If no specific pair found, use generic emojis
  if (!emojis) {
    if (domain1 === 'TECH' || domain2 === 'TECH') {
      emojis = DOMAIN_EMOJI_MAPPINGS['TECH_TECH'];
    } else if (domain1 === 'NATURE' || domain2 === 'NATURE') {
      emojis = DOMAIN_EMOJI_MAPPINGS['NATURE_NATURE'];
    } else if (domain1 === 'ELEMENTAL' || domain2 === 'ELEMENTAL') {
      emojis = DOMAIN_EMOJI_MAPPINGS['ELEMENTAL_ELEMENTAL'];
    } else {
      emojis = ['💫', '✨', '🔮', '🌟', '💎', '🧩', '🎯', '🎪', '🎭', '🎨'];
    }
  }
  
  // Return a random emoji from the appropriate list
  return emojis[Math.floor(Math.random() * emojis.length)];
};

export async function getTranslationsForWord(word: string): Promise<Record<SupportedLanguage, string>> {
  // Return cached translations if available
  if (translationCache[word]) {
    return translationCache[word];
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a multilingual translator. Translate the given word into the following languages: Spanish (es), French (fr), German (de), and Chinese (zh). 
          STRICT RULES:
          1. MUST return a JSON object with language codes as keys
          2. Keep translations concise - single words when possible
          3. Maintain the meaning and context
          4. For Chinese, use simplified characters
          5. Format: {"es": "word", "fr": "word", "de": "word", "zh": "word"}`
        },
        {
          role: 'user',
          content: `Translate: ${word}`
        }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      stream: false
    });

    const translationsStr = completion.choices[0]?.message?.content?.trim() || '{}';
    
    // Handle potential JSON parsing errors
    let translations: Partial<Record<SupportedLanguage, string>> = {};
    try {
      translations = JSON.parse(translationsStr) as Partial<Record<SupportedLanguage, string>>;
    } catch (error) {
      console.log('Error parsing translations JSON:', error);
      // Continue with empty translations object
    }
    
    // Ensure all languages are present
    const fullTranslations: Record<SupportedLanguage, string> = {
      en: word,
      es: translations.es || word,
      fr: translations.fr || word,
      de: translations.de || word,
      zh: translations.zh || word
    };
    
    // Cache the translations
    translationCache[word] = fullTranslations;
    
    return fullTranslations;
  } catch (error) {
    console.log('Error generating translations:', error);
    // Return original word for all languages if translation fails
    return {
      en: word,
      es: word,
      fr: word,
      de: word,
      zh: word
    };
  }
}

export async function getEmojiForCombination(word: string): Promise<string> {
  // Return cached emoji if available
  if (emojiCache[word]) {
    return emojiCache[word];
  }

  // Check predefined mappings first
  if (EMOJI_MAPPINGS[word]) {
    emojiCache[word] = EMOJI_MAPPINGS[word];
    return EMOJI_MAPPINGS[word];
  }
  
  // Check for partial matches in the emoji mappings
  const lowerWord = word.toLowerCase();
  for (const [key, emoji] of Object.entries(EMOJI_MAPPINGS)) {
    if (lowerWord.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerWord)) {
      emojiCache[word] = emoji;
      return emoji;
    }
  }
  
  // Determine domain for the word
  const domain = getDomain(word);
  
  // Get a relevant emoji based on domain
  if (domain !== 'UNKNOWN') {
    const emoji = getRelevantEmoji(domain, domain);
    emojiCache[word] = emoji;
    return emoji;
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an emoji expert that selects the most appropriate single emoji for concepts. 
          STRICT RULES:
          1. MUST return EXACTLY ONE emoji character
          2. NO text, NO explanations
          3. Choose emoji that best represents the concept visually
          4. Prefer nature, element, and crypto-related emojis when applicable
          5. Consider the visual metaphor and symbolism
          6. If unsure, use related phenomena or symbols`
        },
        {
          role: 'user',
          content: `Select ONE emoji that best represents: ${word}`
        }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 1,
      top_p: 1,
      stream: false
    });

    const emoji = completion.choices[0]?.message?.content?.trim() || '💫';
    
    // Cache the result
    emojiCache[word] = emoji;
    
    return emoji;
  } catch (error) {
    console.log('Error generating emoji:', error);
    return '💫'; // Fallback to sparkles if generation fails
  }
}