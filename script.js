// Formular-Validierung und Handling
document.addEventListener('DOMContentLoaded', () => {
    // Selektoren
    const form = document.querySelector('#kontakt-form');
    const nameInput = document.querySelector('#name');
    const emailInput = document.querySelector('#email');

    // Utility Funktionen
    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email.trim());
    };

    const showError = (element, message) => {
        // Entferne bestehende Fehlermeldungen
        const existingError = element.parentElement.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // Erstelle neue Fehlermeldung
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.color = '#dc3545';
        errorDiv.style.fontSize = '0.875rem';
        errorDiv.style.marginTop = '0.25rem';

        // Füge Fehlermeldung hinzu
        element.parentElement.appendChild(errorDiv);
        element.style.borderColor = '#dc3545';
    };

    const removeError = (element) => {
        const errorDiv = element.parentElement.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.remove();
        }
        element.style.borderColor = '';
    };

    // Live-Validierung
    nameInput.addEventListener('input', () => {
        if (nameInput.value.trim()) {
            removeError(nameInput);
        }
    });

    emailInput.addEventListener('input', () => {
        if (emailInput.value.trim() && validateEmail(emailInput.value)) {
            removeError(emailInput);
        }
    });

    // Formular-Submission
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        let isValid = true;

        // Name validieren
        if (!nameInput.value.trim()) {
            showError(nameInput, 'Bitte füllen Sie dieses Feld aus.');
            isValid = false;
        }

        // Email validieren
        if (!emailInput.value.trim()) {
            showError(emailInput, 'Bitte füllen Sie dieses Feld aus.');
            isValid = false;
        } else if (!validateEmail(emailInput.value)) {
            showError(emailInput, 'Bitte geben Sie eine gültige E-Mail-Adresse ein.');
            isValid = false;
        }

        if (!isValid) {
            return;
        }

        try {
            // Loading-Zustand
            const submitButton = form.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Wird gesendet...';

            // Formular senden
            await fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: {
                    'Accept': 'application/json'
                }
            });

            // Erfolgsfall
            form.reset();
            // Moderne Erfolgsmeldung statt alert
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.textContent = 'Vielen Dank für Ihre Nachricht!';
            successMessage.style.backgroundColor = '#d4edda';
            successMessage.style.color = '#155724';
            successMessage.style.padding = '1rem';
            successMessage.style.borderRadius = '4px';
            successMessage.style.marginTop = '1rem';
            form.appendChild(successMessage);

            // Entferne Erfolgsmeldung nach 5 Sekunden
            setTimeout(() => {
                successMessage.remove();
            }, 5000);

        } catch (error) {
            console.error('Fehler beim Senden:', error);
            alert('Es gab einen Fehler beim Senden Ihrer Nachricht. Bitte versuchen Sie es später erneut.');
        } finally {
            // Reset Button-Zustand
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });

    // Mobile Menu Toggle
    const mobileMenuButton = document.querySelector('.mobile-menu-toggle');
    const navList = document.querySelector('.nav-list');

    if (mobileMenuButton && navList) {
        mobileMenuButton.addEventListener('click', () => {
            navList.classList.toggle('active');
            const isExpanded = navList.classList.contains('active');
            mobileMenuButton.setAttribute('aria-expanded', isExpanded);
        });
    }
});