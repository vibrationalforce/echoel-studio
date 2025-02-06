// Formularvalidierung
const form = document.querySelector('form');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  // Hier kommt die Validierungslogik hin
  //...
  form.submit();
});
