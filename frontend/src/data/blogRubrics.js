export const BLOG_RUBRICS = [
  { key: 'kolko-struva', label: 'Колко струва', description: 'Бюджети, цени за труд и материали, непредвидени разходи.' },
  { key: 'cherven-flag', label: 'Червен флаг при ремонт', description: 'Как да разпознаем рисковете и да уточним очакванията навреме.' },
  { key: 'briki-obyasnyava', label: 'Брики обяснява', description: 'Практични отговори за подготовката и организацията на ремонта.' },
  { key: 'istinski-obekti', label: 'Истински обекти', description: 'Реални ремонти, решения и истории на изпълнители.' },
  { key: 'remontni-dilemi', label: 'Ремонтни дилеми', description: 'Сравнения, избор на материали и различни подходи.' },
  { key: 'za-profesionalisti', label: 'За професионалисти', description: 'Портфолио, комуникация и представяне на работата.' },
  { key: 'stroim-bricky', label: 'Строим Bricky', description: 'Новини от платформата и уроците по пътя.' },
];

export function blogRubricPath(key) {
  return key && key !== 'all' ? `/blog?rubrika=${encodeURIComponent(key)}` : '/blog';
}
