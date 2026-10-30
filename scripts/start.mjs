// Local configuration is optional; exported environment variables take precedence.
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
if (existsSync(new URL('../.env.local', import.meta.url))) {
    process.loadEnvFile(new URL('../.env.local', import.meta.url));
}
const child = spawn('npm', ['start', '--prefix', 'vendor/spessasynth'], {
    cwd: root, stdio: 'inherit',
    env: { ...process.env, SPESSASYNTH_HOST: '127.0.0.1', SPESSASYNTH_AUTO_UPDATE: '0' }
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => { process.exitCode = code ?? 1; });
