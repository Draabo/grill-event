const EMOJI_MAP: [RegExp, string][] = [
  // Fleisch
  [/steak/i, '🥩'],
  [/rind/i, '🥩'],
  [/burger/i, '🍔'],
  [/hamburger/i, '🍔'],
  [/cheeseburger/i, '🍔'],
  [/patty|pattie|bulette|frikadelle/i, '🍔'],
  [/wurst|wuerst|würst|bratwurst|bockwurst|wiener|frankfurter|nuernberger|nürnberger|thueringer|thüringer/i, '🌭'],
  [/hotdog|hot dog|hot-dog/i, '🌭'],
  [/ripp?chen|spareribs|ribs/i, '🍖'],
  [/keule|drumstick/i, '🍗'],
  [/h(ä|ae)hnchen|chicken|huhn|hühn|gefl/i, '🍗'],
  [/spie(ss|ß)|schaschlik|sate/i, '🍢'],
  [/lamm/i, '🐑'],
  [/schwein|pork|schnitzel|kotelett/i, '🐷'],
  [/bacon|speck|bauch/i, '🥓'],
  [/hack/i, '🥩'],

  // Fisch
  [/lachs|salmon/i, '🐟'],
  [/fisch|fish/i, '🐟'],
  [/garnele|shrimp|prawn/i, '🦐'],

  // Gemuese
  [/salat/i, '🥗'],
  [/mais|corn/i, '🌽'],
  [/kartoffel|pommes|frites|wedges/i, '🥔'],
  [/tomate|tomaten/i, '🍅'],
  [/paprika|pepper/i, '🫑'],
  [/zwiebel|onion/i, '🧅'],
  [/pilz|champignon|mushroom/i, '🍄'],
  [/zucchini|aubergine|eggplant/i, '🍆'],
  [/gem(ü|ue)se|veggie|vegetarisch/i, '🥦'],
  [/halloumi|k(ä|ae)se|cheese/i, '🧀'],
  [/tofu/i, '🫘'],

  // Brot & Beilagen
  [/br(ö|oe)tchen|bun|semmel|weck/i, '🍞'],
  [/brot|bread|baguette|toast/i, '🍞'],
  [/nachos|chips|tortilla/i, '🌮'],
  [/reis|rice/i, '🍚'],
  [/nudel|pasta|spaghetti/i, '🍝'],

  // Saucen & Dips
  [/ketchup/i, '🍅'],
  [/senf|mustard/i, '🟡'],
  [/sauce|so(ss|ß)e|dip|mayo/i, '🫙'],
  [/kr(ä|ae)uterbutter|butter/i, '🧈'],

  // Getraenke
  [/bier|beer|pils|weizen|helles|lager|ale/i, '🍺'],
  [/wein|wine/i, '🍷'],
  [/cocktail|aperol|spritz|hugo/i, '🍹'],
  [/cola|fanta|sprite|limo|limonade|saft|juice/i, '🥤'],
  [/wasser|water|sprudel/i, '💧'],
  [/kaffee|coffee|espresso/i, '☕'],
  [/schnaps|vodka|whisky|rum|lik(ö|oe)r|shot/i, '🥃'],
  [/radler|shandy/i, '🍺'],

  // Dessert
  [/eis|ice|gelato/i, '🍨'],
  [/kuchen|cake|torte/i, '🍰'],
  [/obst|frucht|fruit|melone|ananas/i, '🍉'],
  [/marshmallow/i, '🍡'],
  [/schokolade|chocolate/i, '🍫'],

  // Sonstiges
  [/kohle|brikett/i, '♨️'],
  [/anz(ü|ue)nder|feuer/i, '🔥'],
  [/teller|plate|geschirr/i, '🍽️'],
  [/serviette|napkin/i, '🧻'],
  [/alufolie|alu|folie/i, '🫕'],
]

export function getItemEmoji(name: string): string {
  for (const [pattern, emoji] of EMOJI_MAP) {
    if (pattern.test(name)) return emoji
  }
  return ''
}
