"""Private deterministic files, generated in memory only."""
import base64,io,threading
from datetime import datetime,timezone,date,timedelta
from pathlib import Path
from xml.sax.saxutils import escape
PDF_LOCK=threading.Lock()
FOOD_STATES={'raw':'сырой продукт','ready_to_eat':'готовый к употреблению','cooked_roasted':'запечённый','cooked_dry_heat':'приготовленный сухим жаром','canned_drained':'консервированный, без жидкости','ready_to_cook':'подготовленный к приготовлению','cooked_boiled':'варёный','cooked':'приготовленный','dry':'сухой','canned':'консервированный','frozen':'замороженный'}
def food_state(value):return FOOD_STATES.get(value,'состояние уточните в карточке продукта')
def grams(value):return ('%.1f'%value).rstrip('0').rstrip('.').replace('.',',')
def menu_pdf(plan,shopping,root):
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak
    from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
    from reportlab.lib import colors
    fonts=next((p for p in [Path(root)/'runtime-fonts',Path(root)/'.runtime-fonts'] if (p/'NotoSans-Regular.ttf').is_file() and (p/'NotoSans-Bold.ttf').is_file()),None)
    if fonts is None:raise ValueError('PDF_FONT_UNAVAILABLE')
    with PDF_LOCK:
        for name,file in [('Noto','NotoSans-Regular.ttf'),('NotoBold','NotoSans-Bold.ttf')]:
            if name not in pdfmetrics.getRegisteredFontNames():pdfmetrics.registerFont(TTFont(name,str(fonts/file)))
        pdfmetrics.registerFontFamily('Noto',normal='Noto',bold='NotoBold',italic='Noto',boldItalic='NotoBold')
    styles=getSampleStyleSheet();styles.add(ParagraphStyle(name='BodyRu',fontName='Noto',fontSize=10.5,leading=16,spaceAfter=7));styles.add(ParagraphStyle(name='TitleRu',fontName='NotoBold',fontSize=20,leading=27,spaceAfter=14));styles.add(ParagraphStyle(name='HeadRu',fontName='NotoBold',fontSize=14,leading=20,spaceBefore=12,spaceAfter=9))
    def p(s,style='BodyRu'):return Paragraph(escape(str(s)).replace('\n','<br/>'),styles[style])
    states={'raw':'сырой продукт','ready_to_eat':'готовый к употреблению','cooked_roasted':'запечённый','cooked_boiled':'варёный','cooked_dry_heat':'приготовленный сухим жаром','canned_drained':'консервированный без жидкости','dry':'сухой','canned':'консервированный','cooked':'приготовленный','ready_to_cook':'подготовленный к приготовлению'}
    story=[p('Моё меню · KETO','TitleRu'),p('Расчётный план, не медицинское назначение'),p('Создано '+datetime.now(timezone.utc).strftime('%d.%m.%Y')+' (UTC). Масса съедобной части в граммах; состояние продукта указано рядом.')]
    for index,day in enumerate(plan['days']):
        if index:story.append(PageBreak())
        story.append(p(day['date'],'HeadRu'))
        for meal in day['meals']:
            story.extend([p(meal['name_ru'],'HeadRu'),p('Порций: '+str(meal.get('portions',1))+' · активное приготовление: '+str(meal.get('active_minutes','уточните'))+' мин')])
            for ing in meal['ingredients']:story.append(p(f"• {ing['name_ru']} — {round(ing['grams_edible'],1)} г; {states.get(ing.get('state'),ing.get('state','уточните состояние'))}"))
            steps=meal.get('steps_ru',[])
            if isinstance(steps,str):steps=[steps]
            for num,step in enumerate(steps,1):story.append(p(f'{num}. {step}'))
    story.extend([PageBreak(),p('Список покупок','TitleRu')])
    for item in shopping:story.append(p(f"□ {item['name_ru']} — {round(item['grams_edible'],1)} г; {states.get(item.get('state'),item.get('state','уточните состояние'))}"))
    out=io.BytesIO()
    def page(canvas,doc):
        if doc.page>30:raise ValueError('PDF_TOO_MANY_PAGES')
        canvas.setFont('Noto',9);canvas.drawRightString(550,25,str(doc.page))
    SimpleDocTemplate(out,pagesize=(595.28,841.89),leftMargin=38,rightMargin=38,topMargin=38,bottomMargin=42,title='Моё меню KETO',author='KETO Companion').build(story,onFirstPage=page,onLaterPages=page)
    data=out.getvalue()
    if len(data)>900000:raise ValueError('PDF_TOO_LARGE')
    return {'filename':'keto-menu-'+plan['days'][0]['date']+'.pdf','mime':'application/pdf','base64':base64.b64encode(data).decode()}
def reminder_ics(reminder,subject):
    import hashlib
    from zoneinfo import ZoneInfo
    from icalendar import Calendar,Event,Alarm,Timezone
    zone=ZoneInfo(reminder['timezone']);start=datetime.fromisoformat(reminder['next_due']).astimezone(zone)
    calendar=Calendar();calendar.add('prodid','-//KETO Companion//Reminders//RU');calendar.add('version','2.0')
    calendar.add_component(Timezone.from_tzinfo(zone,first_date=date(start.year-1,1,1),last_date=date(start.year+3,1,1)))
    event=Event();event.add('uid',hashlib.sha256((subject+':'+reminder['id']).encode()).hexdigest()+'@keto.local');event.add('dtstamp',datetime.now(timezone.utc));event.add('dtstart',start);event.add('summary',reminder['title']);event.add('description','Личное напоминание KETO. Изменения в приложении не обновляют импортированное событие автоматически.')
    if reminder['days_of_week']:event.add('rrule',{'freq':'weekly','until':(start+timedelta(days=730)).astimezone(timezone.utc),'byday':[['MO','TU','WE','TH','FR','SA','SU'][i] for i in reminder['days_of_week']]})
    alarm=Alarm();alarm.add('action','DISPLAY');alarm.add('description',reminder['title']);alarm.add('trigger',timedelta(0));event.add_component(alarm);calendar.add_component(event)
    return {'filename':'keto-reminder.ics','mime':'text/calendar;charset=utf-8','text':calendar.to_ical().decode('utf-8')}
