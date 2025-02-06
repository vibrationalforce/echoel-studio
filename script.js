const form = document.querySelector('#kontakt form');

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = document.querySelector('#name').value;
  const email = document.querySelector('#email').value;

  if (name === '' || email === '') {
    alert('Bitte füllen Sie alle Felder aus.');
    return;
  }

  if (!validateEmail(email)) {
    alert('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
    return;
  }

  // Hier den Code zum Senden des Formulars einfügen.
  // Zum Beispiel:
  // form.submit();

  alert('Vielen Dank für Ihre Nachricht!');
  form.reset();
});

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}
