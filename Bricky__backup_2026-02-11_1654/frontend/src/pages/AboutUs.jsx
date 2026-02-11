export default function AboutUs() {
  return (
    <section className="w-full bg-gray-900 text-white py-20 px-6 flex justify-center">
      <div className="max-w-4xl space-y-10">

        <h1 className="text-4xl font-bold text-center text-orange-400">
          🧱 About Us
        </h1>

        {/* Кой съм аз */}
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-orange-300">Кой стои зад Bricky</h2>
          <p className="text-gray-300 leading-7">
            Казвам се Цветослав Паськалев. Идвам от свят, в който ремонтите често се правят „на доверие“, 
            а доверието свършва с първия крив фаянс. 
            Работил съм в бранша и съм видял доброто и лошото.  
            И стигнах до едно просто заключение: 
            <span className="text-orange-400 font-semibold"> ремонтите не трябва да бъдат лотария.</span>
          </p>
        </div>

        {/* Проблемът */}
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-orange-300">Проблемът</h2>
          <p className="text-gray-300 leading-7">
            Хората не могат да преценят майсторите. Майсторите не могат да си изградят име.
            Комуникацията е хаос, цените са неясни.  
            Всеки се оплаква, никой не подрежда системата.
          </p>
          <p className="text-gray-300 leading-7 font-semibold">
            Резултатът: нерви, ниско качество и загубени пари.
          </p>
        </div>

        {/* Какво прави Bricky различно */}
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-orange-300">Какво прави Bricky различно</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li>Работим само с проверени фирмени бригади</li>
            <li>Следим комуникацията, качеството и поведението</li>
            <li>Рейтинг, снимки и история на ремонтите</li>
            <li>Филтрираме слабите още на входа</li>
            <li>Клиентът вижда само доказани екипи</li>
            <li>Бригадите плащат абонамент за достъп и държат ниво</li>
          </ul>
          <p className="text-orange-400 font-semibold">
            Това не е посредничество. Това е филтър за качество.
          </p>
        </div>

        {/* Мисия */}
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-orange-300">Мисията</h2>
          <p className="text-gray-300 leading-7">
            Да създадем най-надеждната, подредена и честна система за ремонти в България – 
            място, където клиентът знае какво получава, а майсторът се доказва с работа, не с обещания.
          </p>
        </div>

        {/* Обещания */}
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-orange-300">Обещание към клиентите</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li>Спокойствие</li>
            <li>Ясна комуникация</li>
            <li>Проверени професионалисти</li>
            <li>Без изненади и без скрити такси</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-orange-300">Обещание към фирмите</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li>Реални клиенти</li>
            <li>Реални заявки</li>
            <li>Изграждане на имидж и история</li>
            <li>Проекти, а не измислени „лидове“</li>
          </ul>
        </div>

        {/* Бъдещето */}
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-orange-300">Бъдещето</h2>
          <p className="text-gray-300 leading-7">
            Ако Bricky успее, ремонтите в България няма да зависят от „препоръката от комшията“.  
            Ще има стандарти, прозрачност и професионализъм – така както трябваше да бъде отдавна.
          </p>
        </div>

      </div>
    </section>
  );
}
