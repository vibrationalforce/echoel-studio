document.addEventListener('DOMContentLoaded', () => {
    // Download-Funktionalität
    const downloadMac = document.getElementById('download-mac');
    const downloadWindows = document.getElementById('download-windows');
    const downloadLinux = document.getElementById('download-linux');

    downloadMac.addEventListener('click', () => {
        window.location.href = 'download/echoel-studio-mac.dmg';
    });

    downloadWindows.addEventListener('click', () => {
        window.location.href = 'download/echoel-studio-windows.exe';
    });

    downloadLinux.addEventListener('click', () => {
        window.location.href = 'download/echoel-studio-linux.tar.gz';
    });

    // Formular-Funktionalität
    const form = document.getElementById('contact-form');
    form.addEventListener('submit', handleSubmit);
});

async function handleSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);

    try {
        const response = await fetch(form.action, {
            method: 'POST',
            body: data,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            form.reset();
            alert('Vielen Dank für Ihre Nachricht!');
        } else {
            throw new Error('Formular konnte nicht gesendet werden.');
        }
    } catch (error) {
        console.error(error);
        alert('Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später noch einmal.');
    }
}
