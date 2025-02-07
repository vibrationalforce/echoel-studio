/* Grundlegende Styles */
:root {
    --primary-color: #222;
    --secondary-color: #f8f8f8;
    --text-color: #333;
}

body {
    font-family: sans-serif;
    margin: 0;
    background-color: var(--secondary-color);
    color: var(--text-color);
}

.container {
    max-width: 960px;
    margin: 0 auto;
    padding: 20px;
}

header {
    background-color: var(--primary-color);
    color: #fff;
    padding: 10px 0;
    text-align: center;
}

nav ul {
    list-style: none;
    padding: 0;
}

nav li {
    display: inline;
    margin: 0 10px;
}

nav a {
    color: #fff;
    text-decoration: none;
}

section {
    padding: 40px 0;
}

h2 {
    font-size: 2em;
    margin-bottom: 20px;
}

/* Studio-spezifische Styles */
#studio {
    text-align: center;
}

#studio img {
    max-width: 80%;
    margin-top: 20px;
}

/* Funktionen-spezifische Styles */
.feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}

.feature-card {
    border: 1px solid #ccc;
    padding: 20px;
    text-align: center;
}

.feature-card h3 {
    margin-bottom: 10px;
}

/* Download-spezifische Styles */
.download-buttons {
    display: flex;
    justify-content: center;
    gap: 20px;
}

/* Kontaktformular-spezifische Styles */
#contact-form {
    max-width: 400px;
    margin: 0 auto;
}

.form-group {
    margin-bottom: 10px;
}

label {
    display: block;
    margin-bottom: 5px;
}

input,
textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
}

button {
    background-color: var(--primary-color);
    color: #fff;
    padding: 10px 15px;
    border: none;
    cursor: pointer;
}

footer {
    background-color: var(--primary-color);
    color: #fff;
    padding: 10px 0;
    text-align: center;
}

