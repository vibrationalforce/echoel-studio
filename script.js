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

<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
  $name = $_POST["name"];
  $email = $_POST["email"];
  $message = $_POST["message"];

  $to = "michael@tropicaldrones.com";
  $subject = "Neue Nachricht von deiner Website";
  $headers = "From: $email";

  if (mail($to, $subject, $message, $headers)) {
    echo "Vielen Dank für deine Nachricht!";
  } else {
    echo "Beim Senden deiner Nachricht ist ein Fehler aufgetreten.";
  }
}?>


  alert('Vielen Dank für Ihre Nachricht!');
  form.reset();
});

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}
