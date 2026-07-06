const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const certDir = path.join(__dirname, '../certs');

function setupHttps() {
  console.log('--- Pulpax HTTPS Setup ---');

  if (!fs.existsSync(certDir)) {
    console.log('Creating certs directory...');
    fs.mkdirSync(certDir);
  }

  const keyPath = path.join(certDir, 'localhost.key');
  const certPath = path.join(certDir, 'localhost.crt');

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('SSL Certificates already exist. Skipping generation.');
    return;
  }

  console.log('Generating self-signed SSL certificates for localhost...');
  try {
    // OpenSSL command (works on Linux, macOS, and Windows with OpenSSL installed/Git Bash)
    // subjectAltName is required - modern browsers reject CN-only certs outright.
    const cmd = `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=TR/ST=Istanbul/L=Istanbul/O=Pulpax/OU=Dev/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"`;
    execSync(cmd, { stdio: 'inherit' });
    console.log('SSL Certificates generated successfully in /certs directory.');
  } catch (error) {
    console.error('Failed to generate SSL certificates. Please ensure OpenSSL is installed and in your PATH.');
    console.error('Manual command:', `openssl req -x509 -newkey rsa:2048 -keyout certs/localhost.key -out certs/localhost.crt -days 365 -nodes -subj "/C=TR/ST=Istanbul/L=Istanbul/O=Pulpax/OU=Dev/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"`);
    process.exit(1);
  }
}

setupHttps();
