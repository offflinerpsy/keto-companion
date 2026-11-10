"""Search intent regressions from C17; synthetic accounts, no paid provider."""
import copy
import json
from pathlib import Path
import pytest
from service.domain import Service, new_document, k
from service import food_search, food_source


class ReadOnlyStore:
    def __init__(self): self.documents = {}
    def read(self, subject): return copy.deepcopy(self.documents.get(subject, new_document(subject))), None
    def write(self, *args): raise AssertionError('Search must not save personal state')
    def delete(self, *args): raise AssertionError('Search must not delete personal state')


@pytest.fixture
def svc(): return Service(ReadOnlyStore(), None)


def food_ids(svc, query, subject='search-one'):
    return [food['food_id'] for food in svc.kitchen(subject, 'foods', query=query)['foods']]


@pytest.mark.parametrize('query', ['сыр', ' СЫР ', 'сыра', 'сыры', 'сыров', 'сыром', 'cheese'])
def test_cheese_is_not_raw_meat_or_a_shared_prefix(svc, query):
    expected = {'F173414','F173420','F173418','F170845','F170855'}
    assert set(food_ids(svc, query)) == expected
    assert food_ids(svc, query) == food_ids(svc, 'сыр')
    response = svc.kitchen('search-one', 'foods', query=query)
    assert response['search']['alternatives']==[{'query':'сырые продукты','label':'Сырые продукты'}]


def test_known_word_families_and_specificity(svc):
    for query in ('яйцо','яйца','яиц','яйцами','egg'):
        assert set(food_ids(svc, query))=={'F171287','F172183'}
    for query in ('рыба','рыбой','fish'):
        assert set(food_ids(svc, query))=={fid for fid,food in svc.base['foods'].items() if food.get('group')=='fish'}
    assert set(food_ids(svc,'лосось'))=={'F175167','F175168'}
    assert set(food_ids(svc,'курица'))==set(food_ids(svc,'chicken'))=={'F171477','F171077','F171060'}
    assert food_ids(svc,'оливковое масло')==['F171413']
    assert food_ids(svc,'сливочное масло')==['F173410']
    assert food_ids(svc,'яичный белок')==['F172183']
    assert set(food_ids(svc,'куриная грудка'))=={'F171477','F171077'}
    assert food_ids(svc,'моцарелла')==['F170845']
    assert food_ids(svc,'сыр российский')==[]
    assert food_ids(svc,'сметана 20%')==[]
    assert food_ids(svc,'F173414')==['F173414']
    assert food_ids(svc,'сырой')==food_ids(svc,'в сыром виде')
    assert all(svc.base['foods'][fid]['state']=='raw' for fid in food_ids(svc,'сырой'))


def test_personal_names_and_account_scope_do_not_require_english_or_group(svc):
    document=new_document('search-one')
    document['core']['custom_foods']={}
    for fid,name,allergens in [('Ucheese111','Мой сыр с травами',['milk']),('Usausage11','Сыровяленая колбаса',[]),('Ueggs11111','Перепелиные яйца',['egg'])]:
        document['core']['custom_foods'][fid]=k.validate_custom_food({'food_id':fid,'name_ru':name,'state':'ready_to_eat','allergens':allergens,'label_confirmed':True,'source_ref':'user-label:synthetic','carb_basis':'total_includes_fiber','energy_kcal':100,'protein_g':10,'fat_g':6,'carbohydrate_total_g':1,'fiber_g':0})
    svc.store.documents['search-one']=document
    assert 'Ucheese111' in food_ids(svc,'сыр')
    assert 'Usausage11' not in food_ids(svc,'сыр')
    assert 'Ueggs11111' in food_ids(svc,'яиц')
    assert not any(fid.startswith('U') for fid in food_ids(svc,'сыр','search-two'))
    assert food_ids(svc,'Ucheese111')==['Ucheese111']


def test_recipe_search_keeps_all_terms_and_negative_ingredients(svc):
    eggs=svc.catalog('search-one','яйцо',limit=72)
    assert eggs['total']>=9
    assert 'B05' in {r['recipe_id'] for r in eggs['recipes']}
    for query in ('яйца','яиц','egg'):
        assert {r['recipe_id'] for r in svc.catalog('search-one',query,limit=72)['recipes']}=={r['recipe_id'] for r in eggs['recipes']}
    no_eggs=svc.catalog('search-one','без яиц',limit=72)
    assert no_eggs['recipes'] and all('egg' not in r['allergens'] for r in no_eggs['recipes'])
    assert svc.catalog('search-one','яйцо лунная мука')['total']==0
    chicken_soup=svc.catalog('search-one','куриный суп',limit=72)['recipes']
    assert all('суп' in r['name_ru'].lower() and any(i['food_id'] in ('F171477','F171077') for i in r['ingredients']) for r in chicken_soup)
    paired=svc.catalog('search-one','яйцо помидоры',limit=72)['recipes']
    assert paired and all(any(i['food_id'] in ('F171287','F172183') for i in r['ingredients']) and any(i['food_id']=='F170457' for i in r['ingredients']) for r in paired)
    assert food_search.compile_query('оливковое масло').score('Салат','Маслины зрелые','Масло сливочное') is None


def test_search_pagination_and_restrictions_remain_authoritative(svc):
    query='яйцо'
    first=svc.catalog('search-one',query,limit=4)
    seen=[]
    for offset in range(0,first['total'],4):
        result=svc.catalog('search-one',query,limit=4,offset=offset)
        assert result['total']==first['total']
        seen.extend(row['recipe_id'] for row in result['recipes'])
    assert len(seen)==len(set(seen))==first['total']
    document=new_document('search-one');document['core']['profile']['allergies']=['egg'];svc.store.documents['search-one']=document
    assert svc.catalog('search-one','яиц')['total']==0
    result=svc.catalog('search-one','сыр',limit=72,max_minutes=10,category='side')
    assert all(r['active_minutes']<=10 and r['category']=='side' and 'egg' not in r['allergens'] for r in result['recipes'])


def all_source(svc, query):
    result=food_source.search(query,None,50,svc.base['foods']);total=result['total'];rows=list(result['candidates'])
    while result['next_cursor']:
        result=food_source.search(query,result['next_cursor'],50,svc.base['foods']);rows.extend(result['candidates'])
    assert len(rows)==len({r['candidate_id'] for r in rows})==total
    return rows


def test_reference_whole_words_remove_eggplant_and_boiled_false_matches(svc):
    eggs=all_source(svc,'яиц');oils=all_source(svc,'масла')
    assert len(eggs)>20 and len(oils)>20
    assert all('eggplant' not in row['name_en'].casefold() and 'veggie' not in row['name_en'].casefold() for row in eggs)
    import re
    assert all(re.search(r'\b(?:oil|oils|butter)\b',row['name_en'],re.I) for row in oils)
    raw_chicken={row['candidate_id'] for row in all_source(svc,'курица сырая')}
    cheese={row['candidate_id'] for row in all_source(svc,'сыр')}
    assert raw_chicken and cheese and not raw_chicken&cheese
    first=food_source.search('сыр',None,8,svc.base['foods'])
    assert all(row['name_en'].startswith('Cheese,') for row in first['candidates'])
    assert [row['candidate_id'] for row in first['candidates']]==[row['candidate_id'] for row in food_source.search('cheese',None,8,svc.base['foods'])['candidates']]
    with pytest.raises(ValueError):food_source.search('яйцо',first['next_cursor'],8,svc.base['foods'])
    with pytest.raises(ValueError):food_source.search('сыр',first['next_cursor'],9,svc.base['foods'])


def test_original_food_nutrients_and_ids_are_unchanged():
    import hashlib
    assert hashlib.sha256(Path('library/skills/keto-menu/data/foods.json').read_bytes()).hexdigest()=='8b881cfbcfb553c5cf84a932e078799c9d0ba53d5a16efda5028fed074ad0fe9'


def test_product_qualifiers_are_explicit_and_keep_added_sugar_distinct():
    for query in ('молоко без сахара','milk without sugar','sugar-free milk'):
        q=food_search.compile_query(query)
        assert q.score('Milk, sugar-free') is not None
        for name in ('Молоко с сахаром','Milk, fat free, with sugar','Milk with no added sugar','Молоко без добавленного сахара','Молоко без добавления сахара','Молоко'):
            assert q.score(name) is None,(query,name)
    for query in ('молоко без добавленного сахара','milk with no added sugar'):
        q=food_search.compile_query(query)
        assert q.score('Молоко без добавления сахара') is not None
        assert q.score('Milk, sugar-free') is None
    assert food_search.compile_query('сыр без соли').score('Сыр с солью') is None
    assert food_search.compile_query('сыр без соли').score('Сыр без соли') is not None
    assert food_search.compile_query('безлактозное молоко').score('Milk, lactose-free') is not None


def test_phrases_and_negative_prefixes_do_not_reintroduce_raw_cheese_collision(svc):
    assert food_search.compile_query('сыр').score('Лосось в сыром виде') is None
    assert food_search.compile_query('cottage cheese').score('Творог') is not None
    assert food_search.compile_query('sour cream').score('Сметана') is not None
    assert food_ids(svc,'butter')==['F173410']
    assert food_search.compile_query('butter').score('Салат','Cream','Olive oil') is None
    assert food_search.compile_query('сливочное масло').score('Peanut butter, smooth') is None
    for text,excluded in [('без яи','Яйцо'),('без мол','Молоко'),('без сыровялен','Сыровяленая колбаса')]:
        assert food_search.compile_query(text,negatives=True).score(excluded) is None
    for value in (None,{},[],42):
        with pytest.raises(ValueError):food_search.compile_query(value)
    for text in ('без','без м','без яиц без'):
        with pytest.raises(ValueError):food_search.compile_query(text,negatives=True)
    assert food_search.compile_query('без добавленного сахара',negatives=True).score('Блюдо','Сахар') is None


def test_expanded_library_preserves_originals_and_complete_recipe_pages(svc):
    import hashlib
    rows=json.loads(Path('library/skills/keto-menu/data/recipes.json').read_text())
    digest=hashlib.sha256(json.dumps(rows[:72],ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    assert digest=='18aeac293471803e679537e42498b27da563739906764726b43f6d1bc78ba0d0'
    assert len(rows)==len({r['recipe_id'] for r in rows})==108
    sets=[]
    for recipe in rows:
        sets.append(frozenset(i['food_id'] for i in recipe['ingredients']))
    for recipe,ingredients in zip(rows[72:],sets[72:]):
        assert sets.count(ingredients)==1
        result=k.calculate_recipe(svc.base,recipe['recipe_id'])
        assert result['allergens']==sorted(recipe['allergens'])
        assert all(result['nutrition'][key] is not None for key in k.CORE)
        assert result['kitchen_tested'] is False and recipe['clinical_validated'] is False
        for ingredient in recipe['ingredients']:
            food=svc.base['foods'][ingredient['food_id']]
            assert ingredient['state']==food['state'] and ingredient['fdc_id']==food['fdc_id']
    found=[]
    for offset in range(0,108,24):
        response=svc.catalog('search-one','',limit=24,offset=offset)
        assert response['total']==108
        found.extend(r['recipe_id'] for r in response['recipes'])
    assert len(found)==len(set(found))==108
    eggs=svc.catalog('search-one','яиц',limit=72)
    assert eggs['total']==24
    assert all(any(i['food_id']=='F171287' for i in r['ingredients']) for r in eggs['recipes'])
