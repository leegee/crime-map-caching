import { execSync } from 'child_process';
import { networkInterfaces } from 'os';
import { mkdirSync } from 'fs';
import { join } from 'path';

function getLocalIPv4() {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1';
}

function makeCerts() {
    const ip = getLocalIPv4();
    console.log(`Detected local IP: ${ip}`);

    const certsDir = join(process.cwd(), 'certs');
    mkdirSync(certsDir, { recursive: true });

    const certFile = join(certsDir, 'cert.pem');
    const keyFile = join(certsDir, 'key.pem');

    const cmd = `mkcert -cert-file "${certFile}" -key-file "${keyFile}" ${ip} localhost 127.0.0.1`;
    console.log(`Running: ${cmd}`);

    try {
        const output = execSync(cmd, { stdio: 'inherit' });
    } catch (e) {
        console.error('Failed to run mkcert:', e);
        process.exit(1);
    }

    console.log(`Certificates generated in ${certsDir}`);
}

makeCerts();
