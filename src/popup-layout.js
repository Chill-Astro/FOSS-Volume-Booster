// A browser action popup has no current tab; a full-page extension view does.
(async () => {
  const extensionApi = globalThis.browser || globalThis.chrome;
  let isPage = !extensionApi?.runtime?.id;

  if (!isPage) {
    try {
      isPage = Boolean(await extensionApi.tabs.getCurrent());
    } catch {
      // Keep the compact layout if the host cannot identify this view.
    }
  }

  if (!isPage) return;

  document.body.classList.add('full-page');
  const card = document.querySelector('.card');
  const resize = () => {
    const scale = Math.max(1, Math.min(
      2.5,
      (document.documentElement.clientWidth - 32) / card.offsetWidth,
      (window.innerHeight - 32) / card.offsetHeight
    ));
    document.body.style.setProperty('--page-scale', scale);
  };

  window.addEventListener('resize', resize);
  new ResizeObserver(resize).observe(card);
  resize();
})();
