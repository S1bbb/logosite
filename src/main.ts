import './style.css';

document.documentElement.classList.add('js');

const menuToggle = document.querySelector<HTMLButtonElement>('.menu-toggle');
const nav = document.querySelector<HTMLElement>('#main-nav');
const mobileMenu = window.matchMedia('(max-width: 950px)');

function closeMenu(returnFocus = false) {
  menuToggle?.setAttribute('aria-expanded', 'false');
  nav?.classList.remove('is-open');
  if (returnFocus) menuToggle?.focus();
}

if (menuToggle && nav) {
  menuToggle.hidden = false;
  menuToggle.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  });
  nav.addEventListener('click', (event) => {
    if ((event.target as Element).closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  document.addEventListener('click', (event) => {
    if (!(event.target as Element).closest('.site-header')) closeMenu();
  });
  mobileMenu.addEventListener('change', () => closeMenu());
}

const sections = [...document.querySelectorAll<HTMLElement>('main > section[id]')];
const navigationLinks = [...document.querySelectorAll<HTMLAnchorElement>('.main-nav a')];
let scrollScheduled = false;

function updateNavigation() {
  const threshold = Math.min(window.innerHeight * 0.3, 220);
  let current: HTMLElement | undefined = sections[0];
  for (const section of sections) if (section.getBoundingClientRect().top <= threshold) current = section;
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) current = sections.at(-1);
  for (const link of navigationLinks) {
    if (link.hash === `#${current?.id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  scrollScheduled = false;
}

window.addEventListener('scroll', () => {
  if (!scrollScheduled) {
    requestAnimationFrame(updateNavigation);
    scrollScheduled = true;
  }
}, { passive: true });
window.addEventListener('resize', updateNavigation);
updateNavigation();

const dialog = document.querySelector<HTMLDialogElement>('.reading-dialog');
const readerContent = document.querySelector<HTMLElement>('.reader-content');
let readerTrigger: HTMLAnchorElement | null = null;
const articleCache = new Map<string, string>();
let articleLoading = false;

if (dialog && readerContent && typeof dialog.showModal === 'function') {
  document.querySelectorAll<HTMLAnchorElement>('a[data-article]').forEach((link) => {
    link.addEventListener('click', async (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      if (articleLoading) return;
      articleLoading = true;
      link.setAttribute('aria-busy', 'true');
      try {
        let content = articleCache.get(link.pathname);
        if (!content) {
          const response = await fetch(link.href);
          if (!response.ok) throw new Error('Article unavailable');
          const articleDocument = new DOMParser().parseFromString(await response.text(), 'text/html');
          const article = articleDocument.querySelector('article');
          if (!article) throw new Error('Article content missing');
          article.querySelector('.article-back')?.remove();
          const heading = article.querySelector('h1');
          if (heading) {
            const title = articleDocument.createElement('h2');
            title.id = 'reader-title';
            title.textContent = heading.textContent;
            heading.replaceWith(title);
          }
          content = article.outerHTML;
          articleCache.set(link.pathname, content);
        }
        readerTrigger = link;
        readerContent.innerHTML = content;
        dialog.showModal();
        dialog.scrollTop = 0;
        document.body.classList.add('has-dialog');
      } catch {
        window.location.assign(link.href);
      } finally {
        link.removeAttribute('aria-busy');
        articleLoading = false;
      }
    });
  });
  document.querySelector('.reader-close')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('has-dialog');
    readerTrigger?.focus({ preventScroll: true });
  });
}

const audioPlayers = [...document.querySelectorAll('audio')];
for (const player of audioPlayers) {
  player.addEventListener('play', () => {
    for (const other of audioPlayers) if (other !== player) other.pause();
  });
}
