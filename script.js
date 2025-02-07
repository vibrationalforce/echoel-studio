<!DOCTYPE html>
<html lang="de">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Echoel Studio</title>
    <link rel="stylesheet" href="style.css">
</head>

<body>
    <header>
        <div class="container">
            <h1>Echoel Studio</h1>
            <nav>
                <ul>
                    <li><a href="#studio">Echoel Studio</a></li>
                    <li><a href="#funktionen">Funktionen</a></li>
                    <li><a href="#download">Download</a></li>
                    <li><a href="#kontakt">Kontakt</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <main>
        <section id="studio">
            <div class="container">
                <h2>Echoel Studio</h2>
                <p>
                    Professionelle Software für kreative Köpfe.
                </p>
                <img src="echoel-studio-screenshot.jpg" alt="Echoel Studio Screenshot">
            </div>
        </section>

        <section id="funktionen">
            <div class="container">
                <h2>Funktionen</h2>
                <div class="feature-grid">
                    <div class="feature-card">
                        <h3>Intuitive Benutzeroberfläche</h3>
                        <p>
                            Entwickelt für einen reibungslosen Workflow, vom ersten Entwurf bis zum fertigen Produkt.
                        </p>
                    </div>
                    <div class="feature-card">
                        <h3>Leistungsstarke Tools</h3>
                        <p>
                            Professionelle Werkzeuge für Sounddesign, Audioproduktion und mehr.
                        </p>
                    </div>
                    <div class="feature-card">
                        <h3>Umfassende Plugin-Unterstützung</h3>
                        <p>
                            Kompatibel mit einer Vielzahl von Plugins für erweiterte Funktionalität.
                        </p>
                    </div>
                    <div class="feature-card">
                        <h3>Plugin Suite für alle gängigen DAWs</h3>
                        <p>
                            Integriere Echoel Studio nahtlos in deine bevorzugte DAW und nutze die volle Leistung.
                            <br>
                            Unsere Plugins bieten:
                            <br>
                            <ul>
                                <li>
                                    <p><b>Kreative Klanggestaltung:</b></p>
                                    <p>Verändere und gestalte Sounds mit einzigartigen Effekten und Modulationen.</p>
                                </li>
                                <li>
                                    <p><b>Präzise Audioproduktion:</b></p>
                                    <p>Optimiere deine Tracks mit professionellen Tools für Mixing und Mastering.</p>
                                </li>
                                <li>
                                    <p><b>Nahtlose Integration:</b></p>
                                    <p>Nutze unsere Plugins direkt in deiner DAW, ohne zusätzliche Software.</p>
                                </li>
                                <li>
                                    <p><b>Hochwertige Instrumente, Drums und Effekte:</b></p>
                                    <p>Erstelle professionelle Produktionen mit hochwertigen virtuellen Instrumenten, realistischen Drums und vielseitigen Effekten.</p>
                                </li>
                                <li>
                                    <p><b>Umfangreiche Live-Funktionen:</b></p>
                                    <p>Nutze außergewöhnliche Timing- und Pitching-Einstellungen für einzigartige Live-Performances.</p>
                                </li>
                                <li>
                                    <p><b>Biofeedback to Audio Visual Option:</b></p>
                                    <p>Verbinde deine Performance mit einzigartigen visuellen Effekten, die auf deinem Biofeedback basieren.</p>
                                </li>
                                <li>
                                    <p><b>Steuerung per Mobile Browser WebRTC:</b></p>
                                    <p>Steuere Echoel Studio bequem über deinen Mobile Browser per WebRTC.</p>
                                </li>
                                <li>
                                    <p><b>Oktavanaloge Visualisierung:</b></p>
                                    <p>Erlebe deine Musik in Echtzeit mit verschiedenen Designoptionen.</p>
                                </li>
                                <li>
                                    <p><b>Spatial Audio und Video Produktion sowie Streaming und Rendering:</b></p>
                                    <p>Produziere immersive räumliche Audio- und Videoinhalte für Streaming und Rendering.</p>
                                </li>
                                <li>
                                    <p><b>Bildbearbeitung:</b></p>
                                    <p>Bearbeite deine Bilder direkt in Echoel Studio.</p>
                                </li>
                                <li>
                                    <p><b>KI-gestützte Funktionen:</b></p>
                                    <p>Nutze innovative KI-Funktionen für automatische Mixing- und Mastering-Aufgaben und vieles mehr.</p>
                                </li>
                            </ul>
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <section id="download">
            <div class="container">
                <h2>Download</h2>
                <div class="download-buttons">
                    <button id="download-mac">macOS</button>
                    <button id="download-windows">Windows</button>
                    <button id="download-linux">Linux</button>
                    <p>Unterstütze die Entwicklung mit einer Spende:</p>
                    <a href="https://www.paypal.me/echoel" target="_blank" rel="noopener noreferrer">
                        <button>Spenden via PayPal</button>
                    </a>
                </div>
            </div>
        </section>

        <section id="kontakt">
            <div class="container">
                <h2>Kontakt</h2>
                <form id="contact-form" action="https://formspree.io/f/mlekdwkv" method="POST">
                    <div class="form-group">
                        <label for="name">Name:</label>
                        <input type="text" id="name" name="name" required>
                    </div>
                    <div class="form-group">
                        <label for="email">E-Mail:</label>
                        <input type="email" id="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="message">Nachricht:</label>
                        <textarea id="message" name="message" required></textarea>
                    </div>
                    <button type="submit">Senden</button>
                </form>
            </div>
        </section>
    </main>

    <footer>
        <div class="container">
            <p>&copy; 2024 Echoel</p>
        </div>
    </footer>

    <script src="script.js"></script>
</body>

</html>
