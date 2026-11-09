import copy, json, unittest
from service.brain import AzureBrain, BrainUnavailable
from service.label import extract

CANDIDATE={'readability':'partial','name':'Milk','brand':None,'barcode':None,'basis':'per100ml','serving_mass':None,'serving_unit':None,'nutrients':[{'name':'Carbohydrate','value':3.2,'unit':'g','column':'100 ml'},{'name':'Energy','value':120,'unit':'kJ','column':'serving'}],'carbohydrate_basis':'unknown','carbohydrate_caption':None,'ingredients_text':None,'allergen_statement_text':None,'unresolved_fields':['fiber'],'reshoot_hint':None}

def response(c):return {'status':'completed','output':[{'content':[{'type':'output_text','text':json.dumps(c)}]}]}
class LabelTest(unittest.TestCase):
 def test_one_call_and_no_normalization(self):
  calls=[]
  brain=AzureBrain(transport=lambda p:(calls.append(p),response(CANDIDATE))[1])
  result=extract(brain,'data:image/jpeg;base64,abc')
  self.assertEqual(result['review_candidate'],CANDIDATE);self.assertEqual(len(calls),1)
  wire=calls[0]['text']['format']['schema']; encoded=json.dumps(wire);self.assertNotIn('maxLength',encoded);self.assertNotIn('minimum',encoded);self.assertNotIn('maxItems',encoded);self.assertFalse(wire['additionalProperties']);self.assertEqual(set(wire['required']),set(wire['properties']));self.assertFalse(wire['properties']['nutrients']['items']['additionalProperties']);self.assertEqual(calls[0]['model'],brain.deployment);self.assertFalse(calls[0]['store']);self.assertEqual(calls[0]['max_output_tokens'],1200)
 def test_reject_untrusted_shapes(self):
  for patch in [{'extra':1},{'serving_mass':True},{'serving_mass':-1},{'serving_mass':float('nan')},{'nutrients':[CANDIDATE['nutrients'][0]]*21},{'name':'x'*201}]:
   c=copy.deepcopy(CANDIDATE);c.update(patch)
   with self.subTest(patch=patch),self.assertRaises(BrainUnavailable):extract(AzureBrain(transport=lambda _:response(c)),'image')
 def test_incomplete_and_refusal(self):
  for result in [{'status':'incomplete','output':[]},{'status':'completed','output':[{'content':[{'type':'refusal','refusal':'no'}]}]}]:
   with self.assertRaises(BrainUnavailable):extract(AzureBrain(transport=lambda _:result),'image')

class ReviewedLabelTest(unittest.TestCase):
 def test_available_carbohydrate_remains_separate_and_not_recipe_eligible(self):
  from service.domain import k
  base={'food_id':'U12345678','name_ru':'Тест','state':'ready_to_eat','allergens':[],'label_confirmed':True,'source_ref':'Личная этикетка','carb_basis':'total_includes_fiber','nutrient_status':'partial','provenance':{'type':'shop_label','provider':'personal_label','barcode':None,'license':None},'recipe_eligible':False,'energy_kcal':100,'protein_g':2,'fat_g':3,'carbohydrate_total_g':None,'fiber_g':None,'declared_carbohydrate':{'value':4,'basis':'available_excludes_fiber'},'declared_label':{'basis':'per100g','mass_g':100,'energy_kcal':100,'protein_g':2,'fat_g':3,'carbohydrate_g':4,'fiber_g':None,'carbohydrate_basis':'available_excludes_fiber'}}
  food=k.validate_custom_food(base);self.assertIsNone(food['carbohydrate_total_g']);self.assertIsNone(food['fiber_g']);self.assertFalse(food['recipe_eligible']);self.assertEqual(food['declared_carbohydrate']['value'],4)
  bad=copy.deepcopy(base);bad['declared_carbohydrate']['value']=True
  with self.assertRaises(k.KetoError):k.validate_custom_food(bad)
