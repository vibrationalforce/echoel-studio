document.addEventListener('DOMContentLoaded', () => {
    // Download functionality
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

    // Form functionality
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
            alert('Thank you for your message!');
        } else {
            throw new Error('Form could not be sent.');
        }
    } catch (error) {
        console.error(error);
        alert('An error occurred. Please try again later.');
    }
}
