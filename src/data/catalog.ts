import {
  Article,
  Author,
  GiftGuide,
  Product,
  RecipientSpotlight,
  ResearchCitation,
} from '../types/content';

export const AUTHORS: Record<string, Author> = {
  auth_clara_vance: {
    id: 'auth_clara_vance',
    name: 'Clara Vance',
    role: 'Founding Editor',
    bio: 'Clara writes about the psychology of generosity, everyday rituals, and why the smallest, most thoughtful gestures stay with us the longest.',
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  },
  auth_julian_merritt: {
    id: 'auth_julian_merritt',
    name: 'Julian Merritt',
    role: 'Home & Table Editor',
    bio: 'Julian covers independent makers, kitchen upgrades, and tactile objects that bring warmth to dinner tables and living rooms.',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  },
  auth_maya_lin_chen: {
    id: 'auth_maya_lin_chen',
    name: 'Maya Chen',
    role: 'Family & Nostalgia Editor',
    bio: 'Maya curates heirloom games, creative kits for curious kids, and keepsakes that turn ordinary weekends into family traditions.',
    avatarUrl:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
  },
};

export const CITATIONS: Record<string, ResearchCitation> = {
  cit_galak_2016: {
    id: 'cit_galak_2016',
    authors: 'Galak, J., Givi, J., & Williams, E. F.',
    year: 2016,
    title:
      'Why Certain Gifts Are Great to Give Folks But Not to Receive: A Framework for Understanding Errors in Gift Giving',
    publication: 'Current Directions in Psychological Science, 25(6), 380–385',
    doiOrUrl: 'https://doi.org/10.1177/0963721416656937',
    keyFinding:
      'Givers often optimize for the dramatic unwrapping moment, while recipients cherish gifts that remain genuinely useful and delightful months later.',
  },
  cit_yang_urminsky_2018: {
    id: 'cit_yang_urminsky_2018',
    authors: 'Yang, A. X., & Urminsky, O.',
    year: 2018,
    title:
      'The Smile-Seeking Hypothesis: How Immediate Affective Reactions Motivate and Mislead Gift-Givers',
    publication: 'Psychological Science, 29(8), 1221–1233',
    doiOrUrl: 'https://doi.org/10.1177/0956797618761373',
    keyFinding:
      'Choosing a slightly more luxurious version of something a person uses every day consistently creates deeper gratitude than a high-novelty gag or gadget.',
  },
  cit_chan_mogilner_2017: {
    id: 'cit_chan_mogilner_2017',
    authors: 'Chan, C., & Mogilner, C.',
    year: 2017,
    title: 'Experiential Gifts Foster Stronger Social Relationships Than Material Gifts',
    publication: 'Journal of Consumer Research, 43(6), 913–931',
    doiOrUrl: 'https://doi.org/10.1093/jcr/ucw067',
    keyFinding:
      'Gifts that invite shared experiences—like a board game, a matcha ceremony set, or a tasting flight—bring giver and recipient closer together.',
  },
  cit_givi_galak_2017: {
    id: 'cit_givi_galak_2017',
    authors: 'Givi, J., & Galak, J.',
    year: 2017,
    title: 'Sentimental Value and Gift Giving: Givers’ Fears of Getting It Wrong',
    publication: 'Journal of Consumer Psychology, 27(4), 473–479',
    doiOrUrl: 'https://doi.org/10.1016/j.jcps.2017.06.002',
    keyFinding:
      'Givers underestimate how much friends and partners treasure sentimental, personalized gifts—often shying away when they should lean in.',
  },
};

export const PRODUCTS: Record<string, Product> = {
  prod_beeswax_taper_pair_10: {
    id: 'prod_beeswax_taper_pair_10',
    slug: 'hand-dipped-honeycomb-beeswax-taper-candles-and-holder',
    title: 'Hand-Dipped Golden Beeswax Taper Pair & Pebble Holder',
    subtitle: 'Unscented raw apiary beeswax candles that burn with a warm honey aroma and zero soot',
    vendor: 'Sample Maker: Meadow Apiary',
    price: 18,
    currency: 'USD',
    budgetTier: 'under-50',
    guidePriceBucket: 'under-25',
    productType: 'Home & Atmosphere',
    commerceProvider: 'affiliate',
    purchaseUrl: 'https://example.com/dev-placeholder/meadow-apiary-beeswax-tapers',
    isPlaceholderLink: true,
    inStock: true,
    calloutTag: 'Under $20',
    whyToGiveIt:
      'For the person who lights a candle even when eating weeknight soup alone. Pure beeswax smells faintly of warm wildflowers without artificial perfume.',
    detailsAndCare:
      'Two 10-inch hand-dipped 100% beeswax tapers (~9 hours burn time each) with a speckled stoneware pebble base. Sample product for preview.',
    bestForSummary: 'Hosts, neighbors, teachers, and cozy evening readers.',
    recipients: ['host', 'friend', 'coworker', 'parent'],
    interests: ['Candlelight & Hygge', 'Dinner Parties', 'Natural Home'],
    ageRanges: ['young-adult', 'adult', 'parents-grandparents'],
    occasions: ['thank-you', 'housewarming', 'holidays', 'just-because'],
    personalityTraits: ['cozy-homebody', 'everyday-ritual', 'foodie-host'],
    images: [
      {
        id: 'img_beeswax_10',
        url: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=80',
        fallbackColor: '#FFF4D6',
        alt: 'Warm golden beeswax candles glowing softly on a ceramic dish',
        caption: 'Wrapped in unbleached tissue and tied with cotton twine.',
      },
    ],
    citationIds: ['cit_yang_urminsky_2018'],
  },
  prod_letterpress_recipe_cards_11: {
    id: 'prod_letterpress_recipe_cards_11',
    slug: 'botanical-letterpress-heirloom-recipe-cards',
    title: 'Heirloom Botanical Letterpress Recipe Cards (Set of 24)',
    subtitle: 'Thick cotton rag cards debossed with herb illustrations for trading family dishes',
    vendor: 'Sample Maker: Paper & Thread Press',
    price: 22,
    currency: 'USD',
    budgetTier: 'under-50',
    guidePriceBucket: 'under-25',
    productType: 'Stationery & Kitchen',
    commerceProvider: 'direct',
    purchaseUrl: 'https://example.com/dev-placeholder/botanical-letterpress-recipe-cards',
    isPlaceholderLink: true,
    inStock: true,
    calloutTag: 'Personal Touch',
    whyToGiveIt:
      'Write down two of your own favorite recipes on the top cards before tying the box back up—it turns a $22 stationery set into a deeply personal gesture.',
    detailsAndCare:
      '24 cards on 300gsm 100% cotton paper (4" × 6") · Smudge-resistant surface for fountain and gel pens. Sample product for preview.',
    bestForSummary: 'Home cooks, newlyweds, parents, and close friends.',
    recipients: ['friend', 'parent', 'host', 'partner'],
    interests: ['Cooking & Baking', 'Handwritten Notes', 'Family Traditions'],
    ageRanges: ['young-adult', 'adult', 'parents-grandparents'],
    occasions: ['housewarming', 'thank-you', 'birthday', 'holidays'],
    personalityTraits: ['foodie-host', 'nostalgic-sentimental'],
    images: [
      {
        id: 'img_recipecards_11',
        url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80',
        fallbackColor: '#F3ECE1',
        alt: 'Thick cream letterpress cards and fountain pen resting on a wooden desk',
        caption: 'Printed on an antique platen press with plant-based inks.',
      },
    ],
    citationIds: ['cit_givi_galak_2017'],
  },
  prod_french_butter_crock_12: {
    id: 'prod_french_butter_crock_12',
    slug: 'stoneware-water-seal-french-butter-keeper-crock',
    title: 'Speckled Stoneware French Butter Keeper Crock',
    subtitle: 'Traditional water-seal ceramic bell that keeps butter soft and spreadable on the counter',
    vendor: 'Sample Maker: Atelier Terre',
    price: 24,
    currency: 'USD',
    budgetTier: 'under-50',
    guidePriceBucket: 'under-25',
    productType: 'Kitchen & Tabletop',
    commerceProvider: 'affiliate',
    purchaseUrl: 'https://example.com/dev-placeholder/atelier-terre-butter-crock',
    isPlaceholderLink: true,
    inStock: true,
    calloutTag: 'Best Under $25',
    whyToGiveIt:
      'Anyone who has ever torn a piece of warm sourdough trying to spread rock-hard refrigerator butter will thank you every single morning.',
    detailsAndCare:
      'Holds one standard stick (4 oz) of butter · Glazed in oat and soft coastal blue · Dishwasher safe. Sample product for preview.',
    bestForSummary: 'Bread bakers, breakfast lovers, and practical minimalists.',
    recipients: ['friend', 'host', 'parent', 'coworker', 'partner'],
    interests: ['Sourdough & Baking', 'Slow Mornings', 'Kitchen Upgrades'],
    ageRanges: ['young-adult', 'adult', 'parents-grandparents'],
    occasions: ['housewarming', 'thank-you', 'just-because', 'holidays'],
    personalityTraits: ['everyday-ritual', 'foodie-host', 'cozy-homebody'],
    images: [
      {
        id: 'img_buttercrock_12',
        url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80',
        fallbackColor: '#E8F8F0',
        alt: 'Artisan crusty sourdough bread and ceramic butter crock on a linen tablecloth',
        caption: 'A splash of cold water in the base creates a natural airtight seal.',
      },
    ],
    citationIds: ['cit_galak_2016', 'cit_yang_urminsky_2018'],
  },
  prod_chili_honey_flight_01: {
    id: 'prod_chili_honey_flight_01',
    slug: 'small-batch-chili-crisp-and-wildflower-honey-tasting-flight',
    title: 'Small-Batch Chili Crisp & Infused Wildflower Honey Flight',
    subtitle: 'Three culinary jars crafted with heirloom peppers, toasted sesame, and apiary honey',
    vendor: 'Sample Maker: Hearth & Pantry Co.',
    price: 38,
    currency: 'USD',
    budgetTier: 'under-50',
    guidePriceBucket: '25-to-75',
    productType: 'Artisan Food & Pantry',
    commerceProvider: 'affiliate',
    purchaseUrl: 'https://example.com/dev-placeholder/hearth-pantry-flight',
    isPlaceholderLink: true,
    inStock: true,
    calloutTag: 'Host Favorite',
    whyToGiveIt:
      'It solves the "what do I bring to dinner?" dilemma with something they can open immediately over pizza, cheese boards, or roasted vegetables—and nothing goes to clutter.',
    detailsAndCare:
      'Includes 3 × 6oz glass jars in a reusable letterpress gift box with tasting notes and pairing cards. Sample product for preview.',
    bestForSummary: 'Dinner hosts, home cooks, and people who claim they have no room for more stuff.',
    recipients: ['host', 'friend', 'coworker', 'parent'],
    interests: ['Cooking & Hosting', 'Artisan Food', 'Dinner Parties'],
    ageRanges: ['young-adult', 'adult', 'parents-grandparents'],
    occasions: ['housewarming', 'thank-you', 'holidays', 'just-because'],
    personalityTraits: ['foodie-host', 'everyday-ritual'],
    images: [
      {
        id: 'img_honey_01',
        url: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=900&q=80',
        fallbackColor: '#F6E27F',
        alt: 'Golden jars of infused wildflower honey and artisan condiments on a sunlit wooden kitchen table',
        caption: 'Packaged in a warm letterpress tasting box with recipe suggestions.',
      },
    ],
    citationIds: ['cit_galak_2016', 'cit_chan_mogilner_2017'],
  },
  prod_cloud_waffle_robe_02: {
    id: 'prod_cloud_waffle_robe_02',
    slug: 'organic-turkish-cotton-cloud-waffle-robe',
    title: 'Loomed Turkish Cotton Cloud-Waffle Bath Robe',
    subtitle: 'Breathable, garment-washed honeycomb weave in soft seafoam and oat',
    vendor: 'Sample Maker: Sloane & Loom',
    price: 98,
    currency: 'USD',
    budgetTier: '50-to-100',
    guidePriceBucket: 'over-75',
    productType: 'Cozy Home & Lounge',
    commerceProvider: 'affiliate',
    purchaseUrl: 'https://example.com/dev-placeholder/sloane-cloud-robe',
    isPlaceholderLink: true,
    inStock: true,
    calloutTag: 'Most Gifted',
    whyToGiveIt:
      'The ultimate "everyday luxury" upgrade: something people rarely splurge on for themselves, yet reach for every single morning while making coffee.',
    detailsAndCare:
      '100% long-staple Turkish cotton · Deep patch pockets · Machine wash cold, tumble dry low. Sample product for preview.',
    bestForSummary: 'Partners, tired parents, and anyone who loves slow Sunday mornings.',
    recipients: ['partner', 'parent', 'friend'],
    interests: ['Cozy Sanctuary', 'Slow Mornings', 'Self-Care'],
    ageRanges: ['young-adult', 'adult', 'parents-grandparents'],
    occasions: ['birthday', 'anniversary', 'holidays'],
    personalityTraits: ['cozy-homebody', 'everyday-ritual'],
    images: [
      {
        id: 'img_robe_02',
        url: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=900&q=80',
        fallbackColor: '#C3F3DF',
        alt: 'Soft folded waffle-weave cotton textiles and robe in warm morning light',
        caption: 'Pre-washed for immediate softness right out of the ribbon-tied linen bag.',
      },
    ],
    citationIds: ['cit_yang_urminsky_2018'],
  },
  prod_kyoto_matcha_bowl_03: {
    id: 'prod_kyoto_matcha_bowl_03',
    slug: 'hand-thrown-speckled-matcha-bowl-and-whisk-set',
    title: 'Hand-Thrown Speckled Stoneware Matcha Bowl & Bamboo Whisk Set',
    subtitle: 'Wheel-thrown ceramic chawan with pouring spout, 100-prong whisk, and ceremonial tin',
    vendor: 'Sample Maker: Studio Kissa',
    price: 58,
    currency: 'USD',
    budgetTier: '50-to-100',
    guidePriceBucket: '25-to-75',
    productType: 'Coffee & Tea Rituals',
    commerceProvider: 'affiliate',
    purchaseUrl: 'https://example.com/dev-placeholder/studio-kissa-matcha',
    isPlaceholderLink: true,
    inStock: true,
    calloutTag: 'Ritual Favorite',
    whyToGiveIt:
      'Turns an afternoon caffeine habit into a peaceful five-minute ritual. The hand-glazed coastal blue rim makes every pour feel special.',
    detailsAndCare:
      'Lead-free speckled stoneware bowl (450ml), hand-carved bamboo chasen, scoop, and 30g matcha tin. Sample product for preview.',
    bestForSummary: 'Tea lovers, design-minded friends, and work-from-home creatives.',
    recipients: ['friend', 'partner', 'coworker', 'host'],
    interests: ['Coffee & Tea', 'Ceramics', 'Mindful Routines'],
    ageRanges: ['young-adult', 'adult'],
    occasions: ['birthday', 'housewarming', 'thank-you', 'holidays'],
    personalityTraits: ['everyday-ritual', 'curious-creative', 'cozy-homebody'],
    images: [
      {
        id: 'img_matcha_03',
        url: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=900&q=80',
        fallbackColor: '#C3F3DF',
        alt: 'Freshly whisked vibrant green matcha in a handmade ceramic bowl with bamboo whisk',
        caption: 'Includes a 30g tin of shade-grown matcha so they can whisk a cup on day one.',
      },
    ],
    citationIds: ['cit_chan_mogilner_2017', 'cit_yang_urminsky_2018'],
  },
  prod_custom_star_map_04: {
    id: 'prod_custom_star_map_04',
    slug: 'custom-night-sky-constellation-linen-framed-print',
    title: 'Custom Night Sky Constellation Print in Solid Oak Frame',
    subtitle: 'Star chart printed for the exact date, time, and place of a favorite memory',
    vendor: 'Sample Maker: Celestia Press',
    price: 68,
    currency: 'USD',
    budgetTier: '50-to-100',
    guidePriceBucket: '25-to-75',
    productType: 'Personalized Keepsakes',
    commerceProvider: 'fourthwall',
    purchaseUrl: 'https://example.com/dev-placeholder/custom-night-sky-print',
    isPlaceholderLink: true,
    inStock: true,
    calloutTag: 'Personalizable',
    whyToGiveIt:
      'Research shows givers often shy away from sentimental gifts out of fear, yet recipients consistently rate personalized mementos as their most treasured keepsakes.',
    detailsAndCare:
      'Archival pigment ink on 310gsm cotton rag paper in deep midnight blue · Milled white oak frame (11" × 14"). Sample product for preview.',
    bestForSummary: 'Anniversaries, weddings, new babies, or commemorating a big milestone.',
    recipients: ['partner', 'parent', 'friend'],
    interests: ['Sentimental Keepsakes', 'Astronomy', 'Home Decor'],
    ageRanges: ['young-adult', 'adult', 'parents-grandparents'],
    occasions: ['anniversary', 'birthday', 'holidays'],
    personalityTraits: ['nostalgic-sentimental', 'cozy-homebody'],
    images: [
      {
        id: 'img_starmap_04',
        url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=80',
        fallbackColor: '#1B3D5F',
        alt: 'Deep blue starry night sky over mountains evoking a framed constellation keepsake',
        caption: 'Custom-printed with your chosen location coordinates and a personal dedication line.',
      },
    ],
    citationIds: ['cit_givi_galak_2017'],
  },
  prod_olivewood_board_game_05: {
    id: 'prod_olivewood_board_game_05',
    slug: 'heirloom-walnut-and-brass-travel-backgammon-set',
    title: 'Inlaid Walnut & Linen Roll-Up Backgammon & Checkers Set',
    subtitle: 'Weighted stone pips, solid brass dice cups, and water-resistant Belgian linen board',
    vendor: 'Sample Maker: Sonder Tabletop',
    price: 84,
    currency: 'USD',
    budgetTier: '50-to-100',
    guidePriceBucket: 'over-75',
    productType: 'Games & Gatherings',
    commerceProvider: 'affiliate',
    purchaseUrl: 'https://example.com/dev-placeholder/sonder-backgammon',
    isPlaceholderLink: true,
    inStock: true,
    calloutTag: 'Screen-Free Fun',
    whyToGiveIt:
      'Gorgeous enough to leave on the coffee table and compact enough to toss into a weekender bag for cabin trips, beach afternoons, or rainy evenings.',
    detailsAndCare:
      'Heavyweight flax linen playing surface, tumbled alabaster and navy stones, leather tie strap. Sample product for preview.',
    bestForSummary: 'Couples, families, cabin hosts, and board game enthusiasts.',
    recipients: ['partner', 'friend', 'parent', 'host'],
    interests: ['Board Games', 'Travel & Outdoors', 'Hosting'],
    ageRanges: ['young-adult', 'adult', 'parents-grandparents', 'all-ages'],
    occasions: ['holidays', 'anniversary', 'housewarming', 'birthday'],
    personalityTraits: ['curious-creative', 'nostalgic-sentimental', 'foodie-host'],
    images: [
      {
        id: 'img_game_05',
        url: 'https://images.unsplash.com/photo-1611996575749-79a3a250f948?auto=format&fit=crop&w=900&q=80',
        fallbackColor: '#99BFF9',
        alt: 'Tactile wooden tabletop board game pieces arranged for an evening game night',
        caption: 'Rolls into a compact cylinder that fits inside a coat pocket or tote bag.',
      },
    ],
    citationIds: ['cit_chan_mogilner_2017'],
  },
  prod_terracotta_herb_kit_06: {
    id: 'prod_terracotta_herb_kit_06',
    slug: 'self-watering-terracotta-windowsill-herb-garden-trio',
    title: 'Self-Watering Glazed & Terracotta Windowsill Herb Trio',
    subtitle: 'Passive hydro-wicking ceramic vessels with organic Genovese basil, thyme, and mint seeds',
    vendor: 'Sample Maker: Botanica Goods',
    price: 45,
    currency: 'USD',
    budgetTier: 'under-50',
    guidePriceBucket: '25-to-75',
    productType: 'Plants & Gardening',
    commerceProvider: 'affiliate',
    purchaseUrl: 'https://example.com/dev-placeholder/botanica-herb-trio',
    isPlaceholderLink: true,
    inStock: true,
    calloutTag: 'Under $50',
    whyToGiveIt:
      'Unlike cut flowers that wilt in five days, this self-watering windowsill trio keeps fresh basil and mint within arm’s reach of the stove all year long.',
    detailsAndCare:
      'Nested porous terracotta core draws water from the glazed outer reservoir between refills. Sample product for preview.',
    bestForSummary: 'New homeowners, apartment cooks, and plant lovers.',
    recipients: ['host', 'parent', 'friend', 'coworker'],
    interests: ['Gardening', 'Cooking & Hosting', 'Home Decor'],
    ageRanges: ['young-adult', 'adult', 'parents-grandparents'],
    occasions: ['housewarming', 'thank-you', 'birthday', 'just-because'],
    personalityTraits: ['outdoors-nature', 'foodie-host', 'cozy-homebody'],
    images: [
      {
        id: 'img_herb_06',
        url: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=80',
        fallbackColor: '#C3F3DF',
        alt: 'Fresh green culinary herbs sprouting in warm terracotta pots on a sunny windowsill',
        caption: 'Includes organic seed packets, coconut coir disks, and brass plant markers.',
      },
    ],
    citationIds: ['cit_galak_2016'],
  },
  prod_cyanotype_explorer_kit_07: {
    id: 'prod_cyanotype_explorer_kit_07',
    slug: 'sun-print-botanical-cyanotype-and-field-press-kit',
    title: 'Sunlight Botanical Cyanotype & Wooden Flower Press Kit',
    subtitle: 'Hands-on Prussian blue sun-printing studio for curious kids and creative adults alike',
    vendor: 'Sample Maker: Fieldwork Workshop',
    price: 34,
    currency: 'USD',
    budgetTier: 'under-50',
    guidePriceBucket: '25-to-75',
    productType: 'Creative Kits & Kids',
    commerceProvider: 'fourthwall',
    purchaseUrl: 'https://example.com/dev-placeholder/cyanotype-sun-print-kit',
    isPlaceholderLink: true,
    inStock: true,
    calloutTag: 'All-Ages Hit',
    whyToGiveIt:
      'Turns a backyard walk into magic: arrange leaves or shells on photosensitive cotton paper, set it in the sun for four minutes, and rinse in water to reveal rich Prussian-blue prints.',
    detailsAndCare:
      '24 pre-coated archival sun-print sheets, acrylic pressing frame, pocket maple flower press, and illustrated guide. Sample product for preview.',
    bestForSummary: 'Curious kids (ages 6+), families, art lovers, and nature buffs.',
    recipients: ['kids', 'friend', 'parent'],
    interests: ['Art & Craft', 'Nature & Outdoors', 'Family Activities'],
    ageRanges: ['kids', 'all-ages', 'adult'],
    occasions: ['birthday', 'holidays', 'just-because'],
    personalityTraits: ['curious-creative', 'outdoors-nature'],
    images: [
      {
        id: 'img_cyanotype_07',
        url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=900&q=80',
        fallbackColor: '#99BFF9',
        alt: 'Botanical art prints and creative studio tools arranged on a bright table',
        caption: 'Requires only sunlight and tap water—safe, mess-free, and endlessly rewarding.',
      },
    ],
    citationIds: ['cit_chan_mogilner_2017'],
  },
  prod_five_year_memory_book_08: {
    id: 'prod_five_year_memory_book_08',
    slug: 'linen-bound-five-year-one-line-a-day-journal',
    title: 'Belgian Linen Five-Year “One Line a Day” Time Capsule Journal',
    subtitle: 'A low-pressure three-sentence daily diary that stacks five years of memories on each page',
    vendor: 'Sample Maker: Paper & Thread Press',
    price: 28,
    currency: 'USD',
    budgetTier: 'under-50',
    guidePriceBucket: '25-to-75',
    productType: 'Books & Stationery',
    commerceProvider: 'affiliate',
    purchaseUrl: 'https://example.com/dev-placeholder/five-year-linen-journal',
    isPlaceholderLink: true,
    inStock: true,
    calloutTag: 'Friend Favorite',
    whyToGiveIt:
      'Blank notebooks can feel intimidating, but writing just two lines before bed takes 30 seconds—and by year two, you get to read what made you laugh on that exact date last year.',
    detailsAndCare:
      'Smyth-sewn lay-flat binding in cornflower blue linen · Gold foil edges · 100gsm fountain-pen friendly paper. Sample product for preview.',
    bestForSummary: 'Close friends, new parents, graduates, or anyone starting a new chapter.',
    recipients: ['friend', 'partner', 'parent', 'coworker'],
    interests: ['Journaling & Reading', 'Milestones', 'Mindful Routines'],
    ageRanges: ['young-adult', 'adult', 'parents-grandparents'],
    occasions: ['birthday', 'holidays', 'thank-you', 'just-because'],
    personalityTraits: ['nostalgic-sentimental', 'everyday-ritual'],
    images: [
      {
        id: 'img_journal_08',
        url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=900&q=80',
        fallbackColor: '#D6CDEA',
        alt: 'Open linen-bound journal with a warm cup of coffee and reading glasses on a wooden table',
        caption: 'Start on any day of the year—no wasted pages if they begin in mid-November.',
      },
    ],
    citationIds: ['cit_givi_galak_2017', 'cit_galak_2016'],
  },
  prod_fluted_bedside_carafe_09: {
    id: 'prod_fluted_bedside_carafe_09',
    slug: 'hand-blown-two-tone-bedside-water-carafe-and-glass',
    title: 'Hand-Blown Two-Tone Bedside Water Carafe & Tumbler',
    subtitle: 'Rippled borosilicate glass in coastal blue and mint with a matching cup that doubles as a lid',
    vendor: 'Sample Maker: Atelier Verre',
    price: 48,
    currency: 'USD',
    budgetTier: 'under-50',
    guidePriceBucket: '25-to-75',
    productType: 'Tabletop & Glassware',
    commerceProvider: 'affiliate',
    purchaseUrl: 'https://example.com/dev-placeholder/atelier-verre-carafe',
    isPlaceholderLink: true,
    inStock: true,
    calloutTag: 'Editor’s Pick',
    whyToGiveIt:
      'Looks like a piece of sunlit sea glass on a nightstand or home office desk, keeping water fresh overnight while turning an ordinary sip of water into a small sensory pleasure.',
    detailsAndCare:
      'Hand-blown thermal borosilicate glass · 700ml carafe + 220ml tumbler · Dishwasher top-rack safe. Sample product for preview.',
    bestForSummary: 'Anyone who appreciates quiet morning and evening rituals, hosts, and partners.',
    recipients: ['friend', 'host', 'partner', 'coworker', 'parent'],
    interests: ['Home Decor', 'Tabletop & Entertaining', 'Everyday Rituals'],
    ageRanges: ['young-adult', 'adult', 'parents-grandparents'],
    occasions: ['housewarming', 'birthday', 'thank-you', 'just-because'],
    personalityTraits: ['cozy-homebody', 'everyday-ritual', 'curious-creative'],
    images: [
      {
        id: 'img_carafe_09',
        url: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=900&q=80',
        fallbackColor: '#99BFF9',
        alt: 'Hand-blown glass carafe and matching tumbler catching warm morning light on a wooden table',
        caption: 'The inverted tumbler keeps dust out overnight and nests smoothly without clinking.',
      },
    ],
    citationIds: ['cit_yang_urminsky_2018'],
  },
  prod_wool_picnic_throw_13: {
    id: 'prod_wool_picnic_throw_13',
    slug: 'merino-lambswool-reading-and-outdoor-throw-blanket',
    title: 'Brushed Merino Lambswool & Whipstitch Reading Throw',
    subtitle: 'Generously sized herringbone weave in heather blue, seafoam mint, and warm oatmeal',
    vendor: 'Sample Maker: North Coast Mill',
    price: 115,
    currency: 'USD',
    budgetTier: '100-plus',
    guidePriceBucket: 'over-75',
    productType: 'Cozy Home & Textiles',
    commerceProvider: 'affiliate',
    purchaseUrl: 'https://example.com/dev-placeholder/north-coast-merino-throw',
    isPlaceholderLink: true,
    inStock: true,
    calloutTag: 'Heirloom Comfort',
    whyToGiveIt:
      'Equally at home draped over the arm of a reading chair or carried out to the porch on a crisp autumn evening—it feels substantial, soft, and built for decades.',
    detailsAndCare:
      '100% pure new merino lambswool · 55" × 72" with contrast blanket-stitched edge · Dry clean or gentle wool wash. Sample product for preview.',
    bestForSummary: 'Parents, couples, milestone birthdays, and housewarmings.',
    recipients: ['parent', 'partner', 'host', 'friend'],
    interests: ['Cozy Sanctuary', 'Reading & Relaxation', 'Home Decor'],
    ageRanges: ['young-adult', 'adult', 'parents-grandparents'],
    occasions: ['housewarming', 'anniversary', 'holidays', 'birthday'],
    personalityTraits: ['cozy-homebody', 'outdoors-nature', 'nostalgic-sentimental'],
    images: [
      {
        id: 'img_throw_13',
        url: 'https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?auto=format&fit=crop&w=900&q=80',
        fallbackColor: '#99BFF9',
        alt: 'Folded woven wool throw blanket draped over a sunlit armchair',
        caption: 'Woven in small batches using soft, non-scratch merino lambswool.',
      },
    ],
    citationIds: ['cit_yang_urminsky_2018'],
  },
};

export const RECIPIENT_SPOTLIGHTS: RecipientSpotlight[] = [
  {
    id: 'spot_impossible_parent',
    title: 'The “I Don’t Need Anything” Parent',
    subtitle: 'Consumable treats, nostalgic keepsakes, and cozy upgrades that never feel like clutter',
    recipientFilter: 'parent',
    imageUrl:
      'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Warm sunlit kitchen with fresh herbs and ceramic mugs',
    accentBg: '#F3ECE1',
  },
  {
    id: 'spot_dinner_host',
    title: 'The Effortless Dinner Host',
    subtitle: 'Small-batch pantry flights and tabletop pieces that ask zero extra work at the door',
    recipientFilter: 'host',
    imageUrl:
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Friends gathered around a warm candlelit dinner table sharing small plates',
    accentBg: '#FFF5EB',
  },
  {
    id: 'spot_cozy_homebody',
    title: 'The Cozy Sunday Homebody',
    subtitle: 'Cloud-waffle robes, ceremonial matcha bowls, and rainy-day rituals',
    personalityFilter: 'cozy-homebody',
    imageUrl:
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Cozy morning reading corner with linen notebook and warm drink',
    accentBg: '#E8F8F0',
  },
  {
    id: 'spot_under_50',
    title: 'Small Wonders Under $50',
    subtitle: 'High-delight gifts for friends, teachers, coworkers, and secret Santas',
    budgetFilter: 'under-50',
    imageUrl:
      'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Thoughtfully wrapped gift parcels tied with cotton ribbon and botanical sprigs',
    accentBg: '#EBF3FE',
  },
];

export const GIFT_GUIDES: GiftGuide[] = [
  {
    id: 'guide_little_things_2026',
    slug: 'thoughtful-gifts-for-people-who-appreciate-the-little-things',
    title: 'Thoughtful Gifts for People Who Appreciate the Little Things',
    subtitle:
      'For the friend who notices the weight of a teacup, the parent who savors quiet mornings, and anyone who prefers everyday warmth over grand gestures.',
    introParagraphs: [
      'We all know someone whose favorite part of the day is a five-minute ritual: the first pour of morning coffee before the house wakes up, lighting a beeswax taper on a rainy Tuesday, or jotting down a single funny memory before bed. Shopping for them can feel intimidating—not because they have expensive tastes, but because generic "gift sets" miss the mark.',
      'This guide is curated specifically for those observant, detail-loving people. Instead of flashy novelty gadgets, we gathered eleven tactile, genuinely useful pieces across three straightforward budgets—from an $18 pair of apiary beeswax tapers to heirloom merino wool throws—each chosen to make ordinary moments feel a little more special.',
    ],
    whoThisGuideIsFor: [
      'Friends and partners who value quiet daily rituals over big, flashy surprises',
      'Parents and in-laws who insist they "already have everything they need"',
      'Hosts, teachers, and coworkers who appreciate thoughtful, clutter-free gestures',
    ],
    affiliateDisclosure:
      'Editorial & Development Note: This is a sample editorial gift guide demonstrating the Science of Gifts experience. Products and makers shown here are illustrative sample records with placeholder purchase links. When live merchant links are enabled in production, Science of Gifts may earn an affiliate commission on qualifying purchases at no extra cost to you.',
    seo: {
      seoTitle:
        'Thoughtful Gifts for People Who Appreciate the Little Things (2026 Guide) | Science of Gifts',
      metaDescription:
        'Discover warm, memorable gifts for people who notice small everyday details—organized from under-$25 pleasures to special keepsakes over $75.',
      canonicalPath: '/guides/thoughtful-gifts-for-people-who-appreciate-the-little-things',
      ogType: 'article',
      schemaType: 'ItemList',
    },
    category: 'Everyday Rituals & Little Things',
    publishedAt: '2026-10-20',
    updatedAt: '2026-10-27',
    readTimeMinutes: 7,
    authorId: 'auth_clara_vance',
    heroImageUrl:
      'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1400&q=80',
    heroImageAlt:
      'Thoughtfully wrapped linen gift parcels with natural ribbon, botanical sprigs, and a warm ceramic cup on a sunlit wooden table',
    heroImageCaption:
      'The most memorable gifts rarely shout for attention—they simply make an ordinary Tuesday morning feel cared for.',
    accentTone: 'mint',
    editorsPick: {
      productId: 'prod_fluted_bedside_carafe_09',
      kicker: 'Editor’s Standout Pick',
      headline: 'A Jewel-Toned Bedside Ritual They Would Never Think to Buy for Themselves',
      editorialRationale:
        'A glass of water on the nightstand is universal, yet most of us make do with a mismatched kitchen mug that collects dust overnight. Hand-blown in rippled coastal blue and seafoam mint borosilicate glass, this two-piece carafe and nested tumbler catches the morning light like sea glass and turns the simplest daily habit into a quiet pleasure.',
      intendedRecipientAndSituation:
        'Ideal for a partner, a design-loving close friend, a weekend host’s guest room, or a housewarming gift under $50.',
      targetSectionId: 'sec-25-to-75',
    },
    quickPicks: [
      {
        id: 'qp-best-overall',
        label: 'Best Overall',
        productId: 'prod_fluted_bedside_carafe_09',
        reason: 'Turns bedside or desk hydration into a sunlit, two-tone glass sculpture.',
        targetSectionId: 'sec-25-to-75',
      },
      {
        id: 'qp-best-under-25',
        label: 'Best Under $25',
        productId: 'prod_french_butter_crock_12',
        reason: 'Keeps butter soft and spreadable on the counter using a simple water seal.',
        targetSectionId: 'sec-under-25',
      },
      {
        id: 'qp-best-close-friend',
        label: 'Best for a Close Friend',
        productId: 'prod_five_year_memory_book_08',
        reason: 'A low-pressure three-line daily time capsule bound in cornflower Belgian linen.',
        targetSectionId: 'sec-25-to-75',
      },
      {
        id: 'qp-best-has-everything',
        label: 'Best for Someone Who Has Everything',
        productId: 'prod_chili_honey_flight_01',
        reason: 'Three artisan pantry jars that deliver immediate culinary joy with zero shelf clutter.',
        targetSectionId: 'sec-25-to-75',
      },
      {
        id: 'qp-best-personalized',
        label: 'Best Personalized Gift',
        productId: 'prod_custom_star_map_04',
        reason: 'Maps the exact night sky from a meaningful date and place in deep blue and oak.',
        targetSectionId: 'sec-25-to-75',
      },
    ],
    sections: [
      {
        id: 'sec-under-25',
        shortNavTitle: 'Under $25',
        title: 'Small but Thoughtful Gifts Under $25',
        priceRangeLabel: '$18 – $24 USD',
        summary:
          'Proof that a memorable gesture never requires an intimidating budget. Each of these small upgrades brings warmth to the kitchen table or evening routine.',
        accentSurface: 'cream',
        recommendations: [
          {
            productId: 'prod_french_butter_crock_12',
            awardLabel: 'Best Under $25',
            customEditorialNote:
              'There is a quiet joy in spreading soft, room-temperature butter onto morning toast without tearing the bread. This speckled stoneware crock uses a traditional water seal to keep butter fresh on the counter for weeks.',
            idealFor: 'Sourdough bakers, Sunday breakfast lovers, and hosts.',
            goodToKnow: 'Refresh the cold water in the base every 3–4 days for best results.',
            layoutHighlight: 'feature-horizontal',
          },
          {
            productId: 'prod_beeswax_taper_pair_10',
            awardLabel: 'Best Warm Atmosphere',
            customEditorialNote:
              'Unlike paraffin candles drenched in synthetic fragrance, pure apiary beeswax burns cleanly with a natural, faint honey-and-wildflower scent—and comes paired with a minimal ceramic pebble holder.',
            idealFor: 'Teachers, neighbors, coworkers, or pairing with a bottle of wine.',
            goodToKnow: 'Trim the cotton wick to 1/4 inch before lighting for an even, dripless flame.',
          },
          {
            productId: 'prod_letterpress_recipe_cards_11',
            awardLabel: 'Most Personal Under $25',
            customEditorialNote:
              'Printed on heavy 300gsm cotton rag paper that stands up to kitchen splatters. Slip two of your own handwritten family recipes into the stack before wrapping it to make the gift unmistakably yours.',
            idealFor: 'Parents, siblings, newlyweds, and friends who love to cook.',
            goodToKnow: 'Works beautifully with ballpoint, rollerball, or archival fountain inks.',
          },
        ],
      },
      {
        id: 'sec-25-to-75',
        shortNavTitle: '$25 to $75',
        title: 'Memorable Gifts From $25 to $75',
        priceRangeLabel: '$28 – $68 USD',
        summary:
          'The sweet spot of gift-giving: tactile ceramics, small-batch flavors, and personal keepsakes that feel generous without crossing into over-the-top extravagance.',
        accentSurface: 'sand',
        recommendations: [
          {
            productId: 'prod_fluted_bedside_carafe_09',
            awardLabel: 'Best Overall · Editor’s Pick',
            customEditorialNote:
              'Featured at the top of our guide for a reason: the optical fluting feels wonderful in the hand, the mint tumbler keeps dust out overnight, and the two-tone glass brightens any bedside or study table.',
            idealFor: 'Partners, close friends, housewarmings, and guest bedrooms.',
            goodToKnow: 'Holds 700ml—enough for two full glasses of water overnight.',
            layoutHighlight: 'feature-horizontal',
          },
          {
            productId: 'prod_five_year_memory_book_08',
            awardLabel: 'Best for a Close Friend',
            customEditorialNote:
              'Instead of a daunting blank page, each calendar date is divided into five short slots—one for each year. Writing a single sentence takes 20 seconds and builds an extraordinary personal archive.',
            idealFor: 'Best friends, new parents, graduates, and milestone birthdays.',
            goodToKnow: 'Smyth-sewn linen binding lies completely flat on a nightstand.',
          },
          {
            productId: 'prod_chili_honey_flight_01',
            awardLabel: 'Best for Someone Who Has Everything',
            customEditorialNote:
              'When someone insists their closets are full, give them something delicious they can finish in a month. This three-jar flight pairs smoky chili crisp with wildflower and citrus-infused honeys.',
            idealFor: 'Minimalist parents, foodie friends, and dinner party hosts.',
            goodToKnow: 'Comes in a sturdy letterpress tasting box with pairing ideas.',
          },
          {
            productId: 'prod_kyoto_matcha_bowl_03',
            awardLabel: 'Best Morning Ritual Set',
            customEditorialNote:
              'A wheel-thrown stoneware chawan with a drip-free pouring spout, paired with a 100-prong bamboo whisk and ceremonial Uji matcha so they can whisk a frothy cup the morning they open it.',
            idealFor: 'Tea drinkers, remote workers, and afternoon ritual lovers.',
            goodToKnow: 'Bowl is dishwasher safe; rinse the bamboo whisk with warm water and air-dry.',
          },
          {
            productId: 'prod_custom_star_map_04',
            awardLabel: 'Best Personalized Gift',
            customEditorialNote:
              'Captures the exact alignment of constellations overhead on a meaningful night—whether an anniversary, a child’s birth, or the evening a friendship began—framed in solid white oak.',
            idealFor: 'Partners, anniversaries, weddings, and milestone family moments.',
            goodToKnow: 'Includes a customizable two-line dedication beneath the star chart.',
          },
        ],
      },
      {
        id: 'sec-over-75',
        shortNavTitle: 'Over $75',
        title: 'Special Gifts Over $75',
        priceRangeLabel: '$84 – $115 USD',
        summary:
          'When the occasion calls for a lasting splurge—cozy textiles and heirloom tabletop pieces crafted to be used and loved for years.',
        accentSurface: 'mint',
        recommendations: [
          {
            productId: 'prod_cloud_waffle_robe_02',
            awardLabel: 'Best Cozy Upgrade',
            customEditorialNote:
              'People will happily wear the same threadbare bathrobe for a decade before replacing it themselves. This garment-washed Turkish cotton waffle weave feels airy, dries quickly, and gets softer with every wash.',
            idealFor: 'Partners, moms, dads, and winter birthdays.',
            goodToKnow: 'Relaxed unisex fit with deep pockets; size down if in between.',
            layoutHighlight: 'feature-horizontal',
          },
          {
            productId: 'prod_olivewood_board_game_05',
            awardLabel: 'Best for Shared Evenings',
            customEditorialNote:
              'Replaces tattered cardboard game boxes with a heavy Belgian linen board, weighted alabaster and navy stones, and brass dice cups that roll up neatly like a scroll.',
            idealFor: 'Couples, families, and friends who love cabin weekends or game nights.',
            goodToKnow: 'Plays both Backgammon and Checkers; includes stitched leather carry strap.',
          },
          {
            productId: 'prod_wool_picnic_throw_13',
            awardLabel: 'Best Heirloom Home Gift',
            customEditorialNote:
              'Woven from soft, non-scratch merino lambswool in a timeless coastal herringbone pattern that warms up a reading nook or wraps around two pairs of shoulders outdoors.',
            idealFor: 'Housewarmings, anniversaries, parents, and grandparents.',
            goodToKnow: 'Generous 55" × 72" dimensions with whipstitched edges.',
          },
        ],
      },
    ],
    buyingAdviceIntro:
      'People who appreciate "the little things" rarely judge a gift by its price tag. Instead, they notice texture, usefulness, and whether the choice reflects how they actually spend their days.',
    buyingAdvice: [
      {
        id: 'tip-upgrade-habit',
        heading: '1. Upgrade a Humble Daily Habit by 20%',
        body: 'Ask yourself what they touch between 7:00 a.m. and 9:00 a.m. or in the last hour before sleep. Elevating an everyday object—a butter dish, a bedside water glass, or a bathrobe—delivers a spark of gratitude every single day.',
        expandablePrompt: 'Why consumer psychology backs the "everyday upgrade" rule',
        expandableDetails:
          'In research on the "Smile-Seeking Hypothesis" (Yang & Urminsky, 2018; Galak et al., 2016), psychologists found that gift-givers over-focus on the 10-second surprise of unwrapping. Recipients, however, evaluate a gift over months of post-exchange use—meaning quiet, tactile upgrades consistently win out over high-concept novelties.',
      },
      {
        id: 'tip-consumables-for-minimalists',
        heading: '2. Match the Gift’s Footprint to Their Living Space',
        body: 'If your recipient lives in a cozy apartment or actively tries to pare down possessions, choose something delicious that disappears cleanly (like an infused honey flight or beeswax tapers) or replaces an existing item on their counter.',
        expandablePrompt: 'How to make a consumable gift still feel personal and lasting',
        expandableDetails:
          'Pair a consumable treat with a handwritten note explaining *how* you pictured them enjoying it ("For your Sunday sourdough toast" or "For the first snowy evening in December"). That specific mental picture is what makes a consumable feel deeply personal.',
      },
      {
        id: 'tip-sentimental-confidence',
        heading: '3. Don’t Talk Yourself Out of a Sentimental Touch',
        body: 'Many shoppers hesitate to give a personalized or nostalgic gift—like a five-year memory book or custom star print—worrying it might feel too earnest. In practice, those are the exact gifts people keep on their shelves for decades.',
        expandablePrompt: 'Quick checklist before choosing a personalized gift',
        expandableDetails:
          'Keep personalization subtle and timeless: instead of printing a giant slogan or novelty photo, opt for a meaningful date, coordinates of a favorite place, or a short handwritten inscription inside the front cover.',
      },
    ],
    relatedGuideIds: ['guide_hosts_and_gatherings_2026'],
    relatedArticleIds: ['art_smile_seeking_trap', 'art_host_etiquette'],
    citationIds: ['cit_galak_2016', 'cit_yang_urminsky_2018', 'cit_givi_galak_2017'],
  },
  {
    id: 'guide_hosts_and_gatherings_2026',
    slug: 'thoughtful-host-and-gathering-gifts-under-100',
    title: 'The Art of the Gathering: Host Gifts & Tabletop Favorites That Spark Connection',
    subtitle:
      'Skip the last-minute grocery store bouquet. These rituals, games, and vessels honor your host’s time and linger long after dessert.',
    introParagraphs: [
      'A truly gracious host gift follows one simple rule: it never creates a chore while the host is greeting guests at the door. Instead of uncut flower stems that demand an empty vase and kitchen shears, these tabletop pieces and morning-after treats wait quietly to delight your host the next day.',
    ],
    whoThisGuideIsFor: [
      'Dinner party guests looking for an effortless $20–$85 thank-you',
      'Weekend houseguests thanking friends or family for a stay',
    ],
    affiliateDisclosure:
      'Editorial & Development Note: Sample guide content with placeholder merchant links for preview.',
    seo: {
      seoTitle: 'Best Host Gifts & Dinner Party Presents (2026) | Science of Gifts',
      metaDescription:
        'Explore memorable host gifts, tabletop games, and tea rituals under $100 that create zero extra work for the host.',
      canonicalPath: '/guides/thoughtful-host-and-gathering-gifts-under-100',
      ogType: 'article',
      schemaType: 'ItemList',
    },
    category: 'Entertaining & Home',
    publishedAt: '2026-10-20',
    updatedAt: '2026-10-26',
    readTimeMinutes: 5,
    authorId: 'auth_julian_merritt',
    heroImageUrl:
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80',
    heroImageAlt: 'Warm candlelit dinner party table with artisan dishes and glassware',
    heroImageCaption: 'The best host gifts celebrate the quiet morning after the party.',
    accentTone: 'butter',
    editorsPick: {
      productId: 'prod_chili_honey_flight_01',
      kicker: 'Editor’s Host Pick',
      headline: 'An Instant Tasting Flight That Needs Zero Fridge Space or Prep',
      editorialRationale:
        'Arrives in a letterpress tasting box ready to hand over at the door—your host can either crack it open alongside the cheese board or save it for Sunday eggs.',
      intendedRecipientAndSituation: 'Dinner party hosts, holiday gatherings, and foodie friends.',
      targetSectionId: 'sec-host-tabletop',
    },
    quickPicks: [
      {
        id: 'qp-host-overall',
        label: 'Best Overall Host Gift',
        productId: 'prod_chili_honey_flight_01',
        reason: 'Three small-batch condiment jars ready to enjoy immediately or save for later.',
        targetSectionId: 'sec-host-tabletop',
      },
      {
        id: 'qp-host-under-25',
        label: 'Best Under $25',
        productId: 'prod_beeswax_taper_pair_10',
        reason: 'Hand-dipped beeswax tapers with a ceramic pebble holder for future dinners.',
        targetSectionId: 'sec-host-tabletop',
      },
      {
        id: 'qp-host-morning',
        label: 'Best Morning-After Ritual',
        productId: 'prod_kyoto_matcha_bowl_03',
        reason: 'Gives your host a serene Sunday morning treat after a busy night of entertaining.',
        targetSectionId: 'sec-host-tabletop',
      },
      {
        id: 'qp-host-game',
        label: 'Best Weekend Houseguest Gift',
        productId: 'prod_olivewood_board_game_05',
        reason: 'Invites everyone to linger at the table with a tactile roll-up game of backgammon.',
        targetSectionId: 'sec-host-tabletop',
      },
    ],
    sections: [
      {
        id: 'sec-host-tabletop',
        shortNavTitle: 'Tabletop & Morning-After',
        title: 'Tabletop Favorites & Morning-After Treats',
        priceRangeLabel: '$18 – $84 USD',
        summary: 'Self-contained gifts that honor your host’s bandwidth and elevate their home.',
        accentSurface: 'cream',
        recommendations: [
          {
            productId: 'prod_chili_honey_flight_01',
            awardLabel: 'Best Edible Host Gift',
            customEditorialNote:
              'Every jar balances heat, sweetness, and crunch—and the letterpress box looks beautiful without needing extra wrapping paper.',
            idealFor: 'Dinner hosts and home cooks.',
            goodToKnow: 'Shelf-stable for 14 months unopened.',
            layoutHighlight: 'feature-horizontal',
          },
          {
            productId: 'prod_beeswax_taper_pair_10',
            awardLabel: 'Best Under $25',
            customEditorialNote:
              'Includes its own speckled stoneware holder so your host never has to hunt for a candlestick.',
            idealFor: 'Casual dinners and neighbor thank-yous.',
            goodToKnow: '100% pure unscented beeswax.',
          },
          {
            productId: 'prod_kyoto_matcha_bowl_03',
            awardLabel: 'Best Ritual Set',
            customEditorialNote:
              'Complete with a ceremonial tin of Uji matcha and a hand-carved bamboo whisk so nothing extra is needed.',
            idealFor: 'Weekend hosts and tea lovers.',
            goodToKnow: 'Stoneware bowl is dishwasher safe.',
          },
          {
            productId: 'prod_olivewood_board_game_05',
            awardLabel: 'Best for Cabin & Weekend Stays',
            customEditorialNote:
              'Replaces flimsy cardboard boxes with rolled Belgian linen and weighted alabaster stones.',
            idealFor: 'Couples, vacation home hosts, and family holidays.',
            goodToKnow: 'Includes full rules for both Backgammon and Checkers.',
          },
        ],
      },
    ],
    buyingAdvice: [
      {
        id: 'tip-tomorrow-morning',
        heading: 'The “Tomorrow Morning” Rule of Hosting Etiquette',
        body: 'Never hand a host something that demands immediate fridge space, an empty vase, or oven time while they are greeting guests. The best host gifts are self-contained and meant to be enjoyed the next morning.',
      },
    ],
    relatedGuideIds: ['guide_little_things_2026'],
    relatedArticleIds: ['art_host_etiquette', 'art_smile_seeking_trap'],
    citationIds: ['cit_chan_mogilner_2017', 'cit_galak_2016'],
  },
];

export const ARTICLES: Article[] = [
  {
    id: 'art_smile_seeking_trap',
    slug: 'why-the-best-gifts-whisper-instead-of-shout',
    title: 'Why the Best Gifts Whisper Instead of Shout: The Case for “Everyday Luxury”',
    subtitle:
      'Psychologists call it the Smile-Seeking Trap: we shop for the ten-second gasp when the ribbon comes off, when we should be shopping for Tuesday morning at 7:30 a.m.',
    seo: {
      seoTitle: 'The Psychology of Great Gifts: Why Everyday Upgrades Win | Science of Gifts',
      metaDescription:
        'Discover why behavioral psychologists say practical, luxurious upgrades to daily habits outlast flashy novelty gifts every time.',
      canonicalPath: '/articles/why-the-best-gifts-whisper-instead-of-shout',
      ogType: 'article',
      schemaType: 'Article',
    },
    category: 'The Psychology of Giving',
    publishedAt: '2026-10-22',
    readTimeMinutes: 6,
    authorId: 'auth_clara_vance',
    heroImageUrl:
      'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1400&q=80',
    heroAlt: 'Warmly wrapped gifts with natural linen ribbon and sunlit coffee mug on a wooden table',
    heroCaption:
      'The best gifts rarely shout for attention at the party—instead, they quietly become part of someone’s favorite daily routine.',
    executiveSummary: [
      'When we shop for someone we love, we naturally picture the exact second they open the box—leading us to pick dramatic, quirky, or ultra-specific novelty items (Galak et al., 2016).',
      'Recipients experience gifts on a completely different timeline: they value how warm, useful, and comforting an object feels over the next hundred days.',
      'The simplest formula for an unforgettable gift is “Familiar Habit + 30% More Delight”—upgrading something they already love but wouldn’t splurge on for themselves.',
    ],
    sections: [
      {
        id: 'the-unwrapping-illusion',
        heading: '01. The Ten-Second Unwrapping Illusion',
        paragraphs: [
          'Think back to the favorite gift you have received in the last five years. Chances are, it wasn’t a complicated gadget or a theatrical novelty item. More likely, it was a remarkably soft robe, a kitchen tool you reach for every weekend, a framed memory, or a jar of something delicious that turned an ordinary meal into a celebration.',
          'In behavioral studies led by Jeff Galak and Adelle Yang, researchers found a fascinating blind spot in human generosity: givers are magnetized by the “unwrapping moment,” while receivers care about every moment that comes *after* the wrapping paper is recycled.',
        ],
        pullQuote: {
          text: 'A truly great gift doesn’t ask the recipient to invent a brand-new personality. It takes a quiet ritual they already love and makes it feel cherished.',
          attribution: 'Clara Vance, Founding Editor',
        },
        expandableNote: {
          title: 'Behind the Research: The Smile-Seeking Hypothesis (Yang & Urminsky, 2018)',
          methodologyDetail:
            'Across six experiments published in Psychological Science, researchers demonstrated that gift-givers prioritize immediate facial expressions ("smile-seeking") over long-term recipient satisfaction. When givers are reminded to picture the recipient using the gift three months later, their choices shift dramatically toward tactile quality and everyday utility.',
        },
        recommendedProductIds: ['prod_cloud_waffle_robe_02', 'prod_fluted_bedside_carafe_09'],
      },
      {
        id: 'sentimental-courage',
        heading: '02. Why You Should Never Shy Away From Sentimental Gifts',
        paragraphs: [
          'Another common mistake? Talking ourselves out of a heartfelt, personal gift at the last minute and buying a safe gift card instead. In research by Julian Givi and Jeff Galak (2017), givers consistently underestimated how deeply friends and partners wanted sentimental keepsakes.',
          'Whether it’s a five-year memory book with a handwritten note on page one or a custom star chart marking the night you met, leaning into emotional warmth is almost always the right call.',
        ],
        recommendedProductIds: ['prod_custom_star_map_04', 'prod_five_year_memory_book_08'],
      },
    ],
    comparisonTable: {
      title: 'How Givers vs. Recipients Actually Experience a Gift',
      caption:
        'A quick guide to avoiding common gift-shopping blind spots, adapted from consumer psychology literature.',
      headers: ['What We’re Tempted to Buy', 'What Recipients Secretly Prefer', 'Why It Works Better'],
      rows: [
        {
          dimension: 'The Big Unwrapping Surprise',
          noveltyGift: 'A complex single-purpose gadget or inside joke',
          ritualObject: 'An elevated version of something they use daily',
          empiricalEffect: 'Every use reminds them of your thoughtfulness',
        },
        {
          dimension: 'For Someone With a Full House',
          noveltyGift: 'Another decorative knick-knack for the shelf',
          ritualObject: 'Artisan consumables (chili crisp, honey, ceremonial tea)',
          empiricalEffect: 'Zero clutter anxiety and immediate sensory joy',
        },
        {
          dimension: 'For Close Friends & Partners',
          noveltyGift: 'A "safe" generic store voucher',
          ritualObject: 'A personal keepsake or shared tabletop game',
          empiricalEffect: 'Strengthens emotional closeness (Chan & Mogilner, 2017)',
        },
      ],
    },
    citationIds: [
      'cit_galak_2016',
      'cit_yang_urminsky_2018',
      'cit_chan_mogilner_2017',
      'cit_givi_galak_2017',
    ],
  },
  {
    id: 'art_host_etiquette',
    slug: 'what-to-bring-when-the-host-says-bring-nothing',
    title: 'What to Bring to Dinner When the Host Insists “Just Bring Yourself!”',
    subtitle:
      'Why uncut flowers secretly create a five-minute kitchen emergency at the door—and what to hand them instead.',
    seo: {
      seoTitle: 'Thoughtful Host Gifts That Create Zero Extra Work | Science of Gifts',
      metaDescription:
        'Skip cut flowers that need trimming and a vase while the host is cooking. Discover effortless, memorable host gifts under $50.',
      canonicalPath: '/articles/what-to-bring-when-the-host-says-bring-nothing',
      ogType: 'article',
      schemaType: 'Article',
    },
    category: 'Modern Etiquette',
    publishedAt: '2026-10-16',
    readTimeMinutes: 4,
    authorId: 'auth_julian_merritt',
    heroImageUrl:
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80',
    heroAlt: 'Friends toasting around a warm dinner table with small plates and candlelight',
    heroCaption:
      'The best host gifts ask nothing of tonight’s dinner party and wait quietly to delight your host tomorrow morning.',
    executiveSummary: [
      'Handing a host wrapped flower stems at 7:00 p.m. forces them to abandon the stove, hunt for a clean vase, and trim stems while guests are arriving.',
      'Follow the “Tomorrow Morning Principle”: bring a self-contained treat—like infused honey, a morning matcha set, or a potted windowsill herb kit—that requires zero prep tonight.',
    ],
    sections: [
      {
        id: 'the-tomorrow-morning-rule',
        heading: '01. The Tomorrow Morning Principle',
        paragraphs: [
          'The ten minutes after guests arrive are the busiest moment of any dinner party. When you hand over a gift that requires immediate refrigeration, reheating, or a vase, your generosity accidentally becomes a chore.',
          'Instead, hand your host something wrapped with a quick verbal permission slip: “Don’t open this tonight—it’s for your Sunday morning breakfast!”',
        ],
        pullQuote: {
          text: 'The most gracious host gift is one that takes care of your host the morning after the party.',
          attribution: 'Julian Merritt, Home & Table Editor',
        },
        recommendedProductIds: ['prod_chili_honey_flight_01', 'prod_terracotta_herb_kit_06'],
      },
    ],
    citationIds: ['cit_galak_2016', 'cit_chan_mogilner_2017'],
  },
];
