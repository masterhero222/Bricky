// Run in the console of the existing editor tab before reloading it.
// Reads article form fields only; no credentials, network requests or server writes.
(() => {
  const root = document.querySelector('.cms-editor-fieldset');
  if (!root) throw new Error('Отворете редакцията на статията, не прегледа.');
  const field = (name, scope = root) => {
    const label = [...scope.querySelectorAll('label')].find(element =>
      [...element.childNodes].filter(node => node.nodeType === 3).map(node => node.textContent).join('').trim() === name);
    const input = label?.querySelector('input,textarea,select');
    if (!input) throw new Error(`Не е намерено поле: ${name}. Не презареждайте.`);
    return input.type === 'checkbox' ? input.checked : input.value;
  };
  const image = element => ({
    url: new URL(element.querySelector('img').src).pathname.replace(/^\/api\/uploads\//, '/uploads/'),
    alt: field('Описание на изображението (alt)', element),
    caption: field('Надпис под изображението', element),
    align: { 'Вляво': 'left', 'Цяла ширина': 'wide', 'Вдясно': 'right' }[element.querySelector('[aria-pressed="true"]')?.getAttribute('aria-label')] || 'wide',
    kind: field('Вид', element),
  });
  const blocks = [...root.querySelectorAll('.cms-block')].map((element, index) => {
    const id = `recovered-${index + 1}`;
    const input = element.querySelector('textarea[aria-label="Текст на блока"]');
    if (input) return { id, type: 'text', markdown: input.value };
    const images = [...element.querySelectorAll('.cms-image-fields')].map(image);
    if (!images.length) throw new Error(`Блок ${index + 1} не е прочетен. Не презареждайте.`);
    return element.querySelector('.cms-gallery-item') ? { id, type: 'gallery', images } : { id, type: 'image', image: images[0] };
  });
  if (!blocks.length) throw new Error('Липсва съдържание. Не презареждайте.');
  const heroSection = [...root.querySelectorAll('.cms-editor-content > .cms-editor-section')].find(element => element.querySelector('h2')?.textContent === 'Основно изображение');
  const hero = heroSection?.querySelector('.cms-image-fields');
  const article = {
    title: field('Заглавие'), slug: field('Постоянен адрес'), excerpt: field('Кратко описание'),
    rubricId: Number(field('Рубрика')), repairCategoryId: Number(field('Ремонтна категория')) || null,
    contentType: field('Тип съдържание'), author: field('Автор'), featured: field('Водеща статия'),
    tagsInput: field('Етикети (разделени със запетая)'), keywordsInput: field('Ключови думи (разделени със запетая)'),
    calculatorCategory: field('Калкулатор') || null, seoTitle: field('SEO заглавие'), seoDescription: field('SEO описание'),
    heroImage: hero ? image(hero) : null, blocks,
  };
  const json = JSON.stringify({ format: 'bricky-knowledge-draft-v1', article });
  sessionStorage.setItem(`bricky:knowledge-draft:${article.slug || 'new'}`, json);
  if (sessionStorage.getItem(`bricky:knowledge-draft:${article.slug || 'new'}`) !== json) throw new Error('Копието не е записано. Не презареждайте.');
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `${article.slug || 'article'}-recovery.json`;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  alert(`Съхранени са ${blocks.length} блока, текстът и снимките в този таб. След обновяването отворете същата статия и потвърдете възстановяването.`);
})();
