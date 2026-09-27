(() => {
  const dialog = document.querySelector('.image-dialog');
  if (!dialog) return;
  const image = dialog.querySelector('img');
  document.querySelectorAll('[data-image]').forEach(button => {
    button.addEventListener('click', () => {
      image.src = button.dataset.image;
      image.alt = button.querySelector('img').alt;
      dialog.showModal();
    });
  });
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {if (event.target === dialog) dialog.close();});
})();
