// Warte bis das DOM vollständig geladen ist
document.addEventListener('DOMContentLoaded', () => {
    // Formular-Handling
    const form = document.querySelector('#kontakt-form');
    if (form) {
        setupForm(form);
    }

    // Smooth Scroll für Navigation
    setupSmoothScroll();

    // Fade-In Animation für Sektionen
    setupFadeInAnimations();
});

// Formular Setup und Validierung
function setupForm(form) {
    const inputs = form.querySelectorAll('input, textarea');

    // Live Validierung für alle Eingabefelder
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            validateField(input);
        });

        input.addEventListener('blur', () => {
            validateField(input);
        });
    });

    // Formular Submit Handler
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        if (validateForm(form)) {
            await submitForm(form);
        }
    });
}

// Validiert ein einzelnes Eingabefeld
function validateField(input) {
    const value = input.value.trim();
    let isValid = true;
    let errorMessage = '';

    // Entferne bestehende Fehlermeldungen
    removeError(input);

    // Überprüfe ob das Feld ausgefüllt ist
    if (!value) {
        isValid = false;
        errorMessage = 'Dieses Feld ist erforderlich.';
    }

    // Email-Validierung
    if (input.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            isValid = false;
            errorMessage = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
        }
    }

    if (!isValid) {
        showError(input, errorMessage);
    }

    return isValid;
}

// Validiert das gesamte Formular
function validateForm(form) {
    const inputs = form.querySelectorAll('input, textarea');
    let isValid = true;

    inputs.forEach(input => {
        if (!validateField(input)) {
            isValid = false;
        }
    });

    return isValid;
}

// Zeigt eine Fehlermeldung unter dem Eingabefeld an
function showError(input, message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    input.parentElement.appendChild(errorDiv);
    input.classList.add('error');
}

// Entfernt Fehlermeldungen
function removeError(input) {
    const errorDiv = input.parentElement.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.remove();
    }
    input.classList.remove('error');
}

// Sendet das Formular ab
async function submitForm(form) {
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    
    try {
        // Button-Status ändern
        submitButton.disabled = true;
        submitButton.textContent = 'Wird gesendet...';

        // Formular an Formspree senden
        const response = await fetch(form.action, {
            method: 'POST',
            body: new FormData(form),
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            // Erfolgsfall
            form.reset();
            showSuccess(form, 'Vielen Dank für Ihre Nachricht!');
        } else {
            throw new Error('Netzwerkfehler');
        }
    } catch (error) {
        console.error('Fehler beim Senden:', error);
        showError(submitButton, 'Es gab einen Fehler beim Senden. Bitte versuchen Sie es später erneut.');
    } finally {
        // Button-Status zurücksetzen
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
}

// Zeigt eine Erfolgsmeldung an
function showSuccess(form, message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    form.appendChild(successDiv);

    // Entferne die Erfolgsmeldung nach 5 Sekunden
    setTimeout(() => {
        successDiv.remove();
    }, 5000);
}

// Smooth Scroll Setup
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Fade-In Animation Setup
function setupFadeInAnimations() {
    const sections = document.querySelectorAll('section');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    sections.forEach(section => {
        section.classList.add('fade-in');
        observer.observe(section);
    });
}