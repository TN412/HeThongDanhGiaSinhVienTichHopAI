import './Footer.css';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <p className="footer-text">
          © {currentYear} AI Assessment System. Built with React + Node.js + MongoDB + OpenAI.
        </p>
        <div className="footer-links">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <span className="separator">•</span>
          <a href="/docs">Documentation</a>
          <span className="separator">•</span>
          <a href="/about">About</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
