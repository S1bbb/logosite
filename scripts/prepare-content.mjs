import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = path.join(root, 'public');
const articles = [
  { slug: 'greeting', title: 'Приветствие', section: 'greeting', images: false },
  { slug: 'family-and-speech', title: 'Роль семьи в речевом развитии ребёнка', section: 'parents', images: false },
  { slug: 'lexical-topics', title: 'Для чего нужны лексические темы', section: 'parents', images: false },
  { slug: 'finger-games', title: 'Пальчиковые игры', section: 'parents', images: true },
  { slug: 'speech-development', title: 'Путь к правильной речи: от звука до связного высказывания', section: 'parents', images: false },
  { slug: 'migratory-birds-lesson', title: 'Конспект занятия «Перелётные птицы»', section: 'colleagues', images: false },
  { slug: 'riddles-and-speech', title: 'Загадка как средство развития речи', section: 'colleagues', images: false },
  { slug: 'connected-speech', title: 'Развитие связной речи', section: 'colleagues', images: true },
  { slug: 'rhythmic-songs', title: 'Логоритмические песенки в режимных моментах', section: 'experience', images: false },
];
const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

await mkdir(path.join(publicRoot, 'articles'), { recursive: true });
await mkdir(path.join(publicRoot, 'assets', 'reading'), { recursive: true });
await mkdir(path.join(publicRoot, 'audio'), { recursive: true });
await mkdir(path.join(publicRoot, 'assets', 'worksheets'), { recursive: true });
for (const filename of ['image-001.jpg', 'image-002.jpg', 'image-003.jpg']) {
  await copyFile(path.join(root, 'materials', 'assets', 'ai-worksheets', filename), path.join(publicRoot, 'assets', 'worksheets', filename));
}
for (const article of articles) {
  const source = path.join(root, 'materials', 'documents', `${article.slug}.md`);
  let markdown = (await readFile(source, 'utf8')).replace(/<!--[^]*?-->/g, '').replace(/^\s*# .+\n/, '');
  if (article.slug === 'rhythmic-songs') {
    markdown = markdown
      .replace(/^\s*Публичное представление собственного педагогического опыта на сайте\s*\n/, '')
      .replace(/^\s*\*\*«Использование логоритмических упражнений в режимных моментах»\*\*\s*\n/, '')
      .replace(/^\s*Подготовила\s*\n\s*учитель-логопед Соколова О\.В\.\s*\n/, '')
      .replace(/^-\s+1\.\s+\*\*(.+?)\*\*\s*$/gm, (_, heading) => `### ${heading.replace(/\.$/, '')}`)
      .replace(/\|  \|  \|\r?\n\| --- \| --- \|/g, '| Текст | Движения |\n| --- | --- |');
  }
  const pendingImages = [];
  markdown = markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, relative) => {
    if (!article.images) return '';
    const imageSource = path.resolve(path.dirname(source), relative);
    const assetsRoot = path.join(root, 'materials', 'assets') + path.sep;
    if (!imageSource.startsWith(assetsRoot)) throw new Error(`Image outside material assets: ${relative}`);
    const filename = `${article.slug}-${path.basename(imageSource)}`;
    pendingImages.push(copyFile(imageSource, path.join(publicRoot, 'assets', 'reading', filename)));
    return `![${alt || `Иллюстрация к материалу «${article.title}»`}](/assets/reading/${filename})`;
  });
  await Promise.all(pendingImages);
  let html = await marked.parse(markdown, { gfm: true });
  const normalizeTitle = (value) => value.replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
  html = html.replace(/^\s*<p><strong>([^]*?)<\/strong><\/p>/, (paragraph, heading) => {
    const candidate = normalizeTitle(heading);
    return candidate.includes(normalizeTitle(article.title)) ? '' : paragraph;
  });
  // Supplied material is content, never executable page code.
  if (/<\s*(script|iframe|object|embed|form)\b|\bon\w+\s*=|(?:javascript|data):/i.test(html)) throw new Error(`Unsupported HTML in ${article.slug}`);
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<img /g, '<img loading="lazy" decoding="async" ');
  html = html.replace(/<a href="(https?:[^\"]+)"/g, '<a href="$1" target="_blank" rel="noopener noreferrer"');
  const page = `<!doctype html>
<html lang="ru">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${escapeHtml(article.title)} — Ольга Соколова</title><link rel="stylesheet" href="/article.css" /><link rel="icon" href="/favicon.svg" type="image/svg+xml" /></head>
<body class="article-page"><main><article class="article-prose"><a class="article-back" href="/#${article.section}">← Вернуться к материалам</a><h1>${escapeHtml(article.title)}</h1><p class="article-byline">Из методических материалов Ольги Владимировны Соколовой</p>${html}</article></main></body>
</html>\n`;
  await writeFile(path.join(publicRoot, 'articles', `${article.slug}.html`), page);
}
await copyFile(path.join(root, 'src', 'article.css'), path.join(publicRoot, 'article.css'));
for (const [source, name] of [['media1.m4a', 'duck'], ['media2.m4a', 'cuckoo'], ['media3.m4a', 'nightingale'], ['media4.m4a', 'stork']]) {
  await copyFile(path.join(root, 'materials', 'presentations', 'migratory-birds-audio', source), path.join(publicRoot, 'audio', `${name}.m4a`));
}
console.log(`Prepared ${articles.length} articles and selected images/audio.`);
