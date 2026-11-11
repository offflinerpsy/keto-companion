"""Shared, deterministic food vocabulary. Search never changes food identity.

Whole Unicode words and explicit food word families are intentional: Russian
``сыр`` and ``сырой`` have different meanings despite their shared letters.
Unknown final words may be prefixes (at least three letters); known words never
fall back to substrings. There is no model, network lookup or nutrient inference.
"""
from __future__ import annotations
from dataclasses import dataclass
import functools
import re
import unicodedata

VERSION = 'food-words-v2'
FAMILIES = {
    'cheese': 'сыр сыра сыру сыром сыре сыры сыров сырам сырами сырах сырный сырная сырное сырные сырным сырных сырную cheese cheeses',
    'raw': 'сырой сырая сырое сырые сырого сырому сыром сырой сырую сырых сырыми raw uncooked',
    'egg': 'яйцо яйца яйцу яйцом яйце яиц яйцам яйцами яйцах яичный яичная яичное яичные яичных яичным яичную яичница яичницы яичницу egg eggs',
    'chicken': 'курица курицы курицу курицей куриц кур куриный куриная куриное куриные куриного куриной куриным куриных куриную курятина курятиной chicken chickens',
    'turkey': 'индейка индейки индейку индейкой индюшка индюшиный turkey',
    'beef': 'говядина говядины говядину говядиной говяжий говяжья говяжье говяжьи говяжьего говяжьей говяжьим beef',
    'pork': 'свинина свинины свинину свининой свиной свиная свиное свиные свиного свиную pork',
    'fish': 'рыба рыбы рыбу рыбой рыбе рыб рыбный рыбная рыбное рыбные рыбных рыбную fish fishes',
    'salmon': 'лосось лосося лососем лососевый семга семги семгой salmon',
    'cod': 'треска трески треску треской тресковый cod',
    'pollock': 'минтай минтая минтаем pollock',
    'mackerel': 'скумбрия скумбрии скумбрию скумбрией mackerel',
    'tuna': 'тунец тунца тунцом tuna',
    'sardine': 'сардина сардины сардин сардинами сардиной sardine sardines',
    'herring': 'сельдь сельди сельдью селедка селедки селедкой herring',
    'trout': 'форель форели форелью trout',
    'shrimp': 'креветка креветки креветок креветками креветкой shrimp shrimps prawns prawn',
    'oil': 'масло масла маслу маслом масле масел маслами маслах oil oils',
    'butter': 'butter',
    'salt': 'соль соли солью солей salt salted',
    'sugar': 'сахар сахара сахару сахаром сахаре sugar sugars',
    'lactose': 'лактоза лактозы лактозу лактозой lactose',
    'gluten': 'глютен глютена глютеном gluten',
    'olive': 'оливка оливки оливок оливками оливку маслины маслина маслин оливковый оливковое оливковая оливкового оливковом olive olives',
    'sunflower': 'подсолнечный подсолнечное подсолнечного подсолнечном sunflower',
    'cream': 'сливочный сливочная сливочное сливочные сливочного сливочной сливочным сливочном cream',
    'cabbage': 'капуста капусты капусту капустой капусте капустный капустная cabbage',
    'peking': 'пекинская пекинской пекинскую пекинский пекинского napa tsai',
    'green': 'зеленый зеленая зеленое зеленые зеленого зеленой зеленым зеленых spring scallion scallions',
    'juice': 'сок сока соку соком соки соков juice juices',
    'cauliflower': 'цветная цветной цветную cauliflower',
    'broccoli': 'брокколи broccoli',
    'zucchini': 'кабачок кабачка кабачки кабачков кабачком кабачками кабачковый кабачковая кабачковой цукини zucchini squash',
    'cucumber': 'огурец огурца огурцы огурцов огурцом огурцами огуречный огуречная огуречным cucumber cucumbers',
    'tomato': 'помидор помидоры помидора помидоров помидором помидорами томат томаты томата томатов томатный томатная томатным томатном tomato tomatoes',
    'mushroom': 'гриб грибы грибов грибами грибной грибная грибным грибного шампиньон шампиньоны шампиньонов шампиньонами mushroom mushrooms',
    'spinach': 'шпинат шпината шпинатом шпинате spinach',
    'avocado': 'авокадо avocado avocados',
    'yogurt': 'йогурт йогурта йогуртом йогурты йогуртов yogurt yoghurt',
    'sourcream': 'сметана сметаны сметану сметаной сметане сметанный сметанная',
    'cottage': 'творог творога творогу творогом твороге творожный творожная творожное творожные cottage',
    'breast': 'грудка грудки грудку грудкой грудок breast breasts',
    'white': 'белок белка белку белком белки белков white whites',
    'ground': 'фарш фарша фаршем фаршу ground minced',
    'hazelnut': 'фундук фундука фундуком hazelnut hazelnuts',
    'pecan': 'пекан пекана пеканом pecan pecans',
    'macadamia': 'макадамия макадамии macadamia macadamias',
    'peanut': 'арахис арахиса арахисом peanut peanuts',
    'milk': 'молоко молока молоком молоке молочный молочная молочное молочные молочных milk',
    'mozzarella': 'моцарелла моцареллы моцареллу моцареллой mozzarella',
    'feta': 'фета феты фету фетой feta',
    'cheddar': 'чеддер чеддера чеддером cheddar',
    'parmesan': 'пармезан пармезана пармезаном parmesan',
    'gouda': 'гауда гауды гаудой gouda',
    'brie': 'бри brie',
    'camembert': 'камамбер камамбера камамбером camembert',
    'ricotta': 'рикотта рикотты рикоттой ricotta',
    'tofu': 'тофу tofu',
    'eggplant': 'баклажан баклажаны баклажана баклажанов баклажаном баклажанами баклажанный баклажанная eggplant eggplants aubergine',
    'pepper': 'перец перца перцем перцы перцев pepper peppers',
    'onion': 'лук лука луком луке луковый луковая onion onions',
    'garlic': 'чеснок чеснока чесноком чесночный чесночная garlic',
    'asparagus': 'спаржа спаржи спаржу спаржей asparagus',
    'bean': 'фасоль фасоли фасолью bean beans',
    'lentil': 'чечевица чечевицы чечевицу чечевицей lentil lentils',
    'chickpea': 'нут нута нутом chickpea chickpeas garbanzo',
    'nut': 'орех орехи орехов орехами ореховый ореховая nut nuts',
    'almond': 'миндаль миндаля миндалем миндальный миндальная миндальное миндальным almond almonds',
    'walnut': 'грецкий грецкие грецкого грецких грецким walnut walnuts',
    'seed': 'семя семена семян семенами семечка семечки семечек семечками seed seeds',
    'sesame': 'кунжут кунжута кунжутом кунжутный кунжутная sesame',
    'flax': 'лен льна льном льняной льняная льняное льняным flax flaxseed',
    'chia': 'чиа chia',
    'lemon': 'лимон лимона лимоном лимоны лимонный лимонная lemon lemons',
    'lime': 'лайм лайма лаймом lime limes',
    'dill': 'укроп укропа укропом укропный укропная dill',
    'parsley': 'петрушка петрушки петрушкой parsley',
    'celery': 'сельдерей сельдерея сельдереем celery',
    'radish': 'редис редиса редисом редиска radish radishes',
    'raspberry': 'малина малины малиной малиновый малиновая raspberry raspberries',
    'strawberry': 'клубника клубники клубнику клубникой клубничный клубничная strawberry strawberries',
    'blackberry': 'ежевика ежевики ежевикой blackberry blackberries',
    'blueberry': 'голубика голубики голубикой blueberry blueberries',
    'coconut': 'кокос кокоса кокосом кокосовый кокосовая кокосовое кокосовым coconut coconuts',
    'cocoa': 'какао cocoa cacao',
    'liver': 'печень печени печенью liver',
    'rice': 'рис риса рисом рисовый рисовая рисовое rice',
    'salad': 'салат салата салаты салатов салатом salad salads',
    'soup': 'суп супа супы супов супом soup soups',
    'omelette': 'омлет омлета омлеты омлетов омлетом omelet omelette omelets omelettes',
}
# Add broader food families to document words, never to the query. This makes
# "рыба" find salmon, while "лосось" still requires salmon.
PARENTS = {
    'butter': ('oil','cream'),
    'cottage': ('cheese',),
    **{x: ('fish',) for x in ('salmon','cod','pollock','mackerel','tuna','sardine','herring','trout','tilapia','anchovy','anchovies','halibut','carp','haddock')},
    **{x: ('cheese',) for x in ('mozzarella','feta','cheddar','parmesan','gouda','brie','camembert','ricotta','roquefort','gruyere','gorgonzola','provolone')},
    **{x: ('nut',) for x in ('almond','walnut','pecan','hazelnut','macadamia')},
}
ALIASES = {word: family for family, words in FAMILIES.items() for word in words.split()}
# "сыром" is a cheese case form; raw uses "сырой/сыром виде" and the raw state.
ALIASES['сыром'] = 'cheese'
STOP = frozenset('с со из и или на в во к ко для по под за при a an the of with and in to продукты продукт еда блюдо блюда рецепт рецепты найти найди покажи пожалуйста'.split())
_NORM_SUBS = (
    (re.compile(r'\bсыром\s+виде\b'), 'сырой'),
    (re.compile(r'\bcottage\s+cheese\b'), 'cottage'),
    (re.compile(r'\bsour\s+cream\b'), 'sourcream'),
    (re.compile(r'\b(peanut|almond|cashew|sesame|sunflower|soy|nut|seed|apple)\s+butters?\b'), r'\1 spread'),
    (re.compile(r'\bcocoa\s+butter\b'), 'cocoa oil'),
)
_WORD_RE = re.compile(r'[^\W_]+', re.UNICODE)
_ADDED_SUGAR_RE = re.compile(r'\b(?:(?:no|without)\s+added\s+sugars?|без\s+(?:добавленного|добавления)\s+сахара)\b')
_FREE_RE = re.compile(r'\b([^\W_]+)[ -]+free\b')
_ABSENCE_PATTERNS = (
    (re.compile(r'\bunsalted\b'), 'salt'),
    (re.compile(r'\bбезлактозн(?:ый|ое|ая)\b'), 'lactose'),
    (re.compile(r'\bбезглютенов(?:ый|ое|ая)\b'), 'gluten'),
)
_CLAUSE_SPLIT_RE = re.compile(r'[,.;()]')
_COMPOUND_PAIRS = (
    ('olive','oil'),
    ('coconut','oil'),
    ('sunflower','oil'),
    ('cream','oil'),
    ('chicken','breast'),
    ('turkey','breast'),
    ('egg','white'),
    ('cauliflower','cabbage'),
)

@functools.lru_cache(maxsize=32768)
def normalize(value):
    value=' '.join(unicodedata.normalize('NFKC', str(value)).casefold().replace('ё','е').split())
    for pattern,replacement in _NORM_SUBS:
        value=pattern.sub(replacement,value)
    return value

@functools.lru_cache(maxsize=32768)
def words(value):
    return tuple(_WORD_RE.findall(normalize(value)))

@functools.lru_cache(maxsize=32768)
def document(value):
    raw = words(value)
    canonical = {ALIASES.get(word, word) for word in raw}
    expanded = canonical | {p for word in canonical for p in PARENTS.get(word, ())}
    if {'cream','oil'}<=canonical:
        expanded.add('butter')
    if 'cauliflower' in canonical:
        expanded.add('cabbage')
    return frozenset(expanded), raw

def absence_phrases(value):
    """Keep 'no added sugar' distinct from a sugar-free product label."""
    terms=set()
    def added(match):
        terms.add('added_sugar');return ' '
    def free(match):
        word=match.group(1);terms.add(ALIASES.get(word,word));return ' '
    value=_ADDED_SUGAR_RE.sub(added,normalize(value))
    value=_FREE_RE.sub(free,value)
    for pattern,term in _ABSENCE_PATTERNS:
        if pattern.search(value):terms.add(term);value=pattern.sub(' ',value)
    return value,terms

@functools.lru_cache(maxsize=16384)
def explicit_absence(value):
    """Only wording actually present in a product name, not missing metadata."""
    value,absent=absence_phrases(value)
    for part in _CLAUSE_SPLIT_RE.split(value):
        tokens=words(part);active=False
        for index,word in enumerate(tokens):
            if word in ('без','without','no'):
                active=True
                continue
            if word in ('с','со','with','contains'):
                active=False
            term=ALIASES.get(word,word)
            if active and word not in STOP:absent.add(term)
    return frozenset(absent)

@dataclass(frozen=True)
class Query:
    text: str
    required: tuple[str, ...]
    excluded: tuple[str, ...]
    qualifiers: tuple[str, ...] = ()

    def score(self, *fields, exclusion_fields=None):
        title = str(fields[0]) if fields else ''
        field_docs=[document(str(value or '')) for value in fields]
        concepts=set().union(*(item[0] for item in field_docs)) if field_docs else set()
        raw=tuple(word for item in field_docs for word in item[1])
        if exclusion_fields is not None:
            excl_docs=[document(str(value or '')) for value in exclusion_fields]
            excluded_concepts=set().union(*(item[0] for item in excl_docs)) if excl_docs else set()
            excluded_raw=tuple(word for item in excl_docs for word in item[1])
        else:
            excluded_concepts,excluded_raw=concepts,raw
        def matches_exclusion(term):
            return term in excluded_concepts or (term not in FAMILIES and len(term)>=3 and (any(w.startswith(term) for w in excluded_raw) or any(word.startswith(term) and family in excluded_concepts for word,family in ALIASES.items())))
        if self.excluded and any(matches_exclusion(term) for term in self.excluded):
            return None
        if self.qualifiers:
            absence=set().union(*(explicit_absence(str(field or '')) for field in fields))
            if not set(self.qualifiers)<=absence:return None
        exact = 0
        for index, term in enumerate(self.required):
            if term in concepts:
                exact += 1
            elif not (index == len(self.required)-1 and term not in FAMILIES and len(term)>=3 and term.isalpha() and any(word.startswith(term) for word in raw)):
                return None
        # Compound ingredient names must occur together in one field. A salad
        # containing olives plus butter is not evidence for olive oil.
        if len(self.required)>=2:
            req_set=set(self.required)
            for pair in _COMPOUND_PAIRS:
                if pair[0] in req_set and pair[1] in req_set and not any(pair[0] in d0 and pair[1] in d0 for d0,_ in field_docs):
                    return None
        title_concepts, title_raw = field_docs[0] if field_docs else document(title)
        title_matches = sum(term in title_concepts for term in self.required)
        title_words = tuple(ALIASES.get(word,word) for word in title_raw if word not in STOP)
        phrase = bool(self.required and title_words == self.required)
        starts = bool(self.required and title_words[:len(self.required)] == self.required)
        return 100*phrase + 20*starts + 5*title_matches + exact

def compile_query(value, *, negatives=False):
    if not isinstance(value,str):raise ValueError('Поисковый запрос должен быть текстом')
    raw = normalize(value)
    if len(raw)>200:
        raise ValueError('Запрос должен быть не длиннее 200 символов')
    remaining,phrases=absence_phrases(raw)
    required, excluded, qualifiers = [], sorted('sugar' if term=='added_sugar' else term for term in phrases) if negatives else [], [] if negatives else sorted(phrases)
    negative = awaiting = False
    for word in words(remaining):
        if word in ('без','without'):
            negative = awaiting = True
            continue
        if word in ('с','со','with','но'):
            negative = False
            continue
        if word in STOP:
            continue
        term = ALIASES.get(word, word)
        awaiting=False
        if negative and term not in FAMILIES and len(term)<3:
            families={family for alias,family in ALIASES.items() if len(term)>=2 and alias.startswith(term)}
            if len(families)==1:term=next(iter(families))
            else:raise ValueError('Допишите название продукта после «без»')
        target = (excluded if negatives else qualifiers) if negative else required
        if term not in target:
            target.append(term)
    if awaiting:raise ValueError('Уточните продукт после «без»')
    return Query(raw, tuple(required), tuple(excluded), tuple(qualifiers))

def food_score(query, food):
    if 'raw' in query.required and food.get('state') is not None and food.get('state')!='raw':
        return None
    name = food.get('name_ru') or food.get('name_ru_unofficial') or food.get('name_en') or ''
    state = 'raw' if food.get('state')=='raw' else ''
    # A food's broad USDA category is not its identity ("Dairy and Egg" does
    # not make cheese an egg). Trusted explicit fish groups may add that family.
    group = 'fish' if food.get('group')=='fish' else ''
    return query.score(name, food.get('name_en',''), state, group)

def search_info(query):
    if query.required==('cheese',) and not query.excluded and not query.qualifiers:
        return {'label':'Ищем сыр и его виды','alternatives':[{'query':'сырые продукты','label':'Сырые продукты'}]}
    if query.required==('raw',) and not query.excluded and not query.qualifiers:
        return {'label':'Ищем продукты в сыром виде','alternatives':[{'query':'сыр','label':'Сыр и его виды'}]}
    return {'label':'По названию и продуктам в составе','alternatives':[]}
