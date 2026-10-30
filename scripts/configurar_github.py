#!/usr/bin/env python3
"""Cria/reutiliza o remoto seguro, envia main sem force e configura Pages. Não faz deploy."""
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent.parent
REPO = 'DjamesSuhanko/clavesol-midi'
DOMAIN = 'midi.clavesol.com.br'
URL = f'https://github.com/{REPO}.git'


def run(args, check=True):
    result = subprocess.run(args, cwd=ROOT, text=True, capture_output=True)
    if check and result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result


def api(endpoint, method=None, fields=None, optional=False):
    args = ['gh', 'api', endpoint]
    if method: args += ['--method', method]
    for name, value in (fields or {}).items(): args += ['-f', f'{name}={value}']
    result = run(args, check=False)
    if result.returncode:
        if optional and 'HTTP 404' in result.stderr: return None
        raise RuntimeError(result.stderr.strip())
    return json.loads(result.stdout) if result.stdout.strip() else {}


def main():
    run(['gh', 'auth', 'status'])
    if run(['git', 'branch', '--show-current']).stdout.strip() != 'main':
        raise RuntimeError('Use a branch main; nenhuma mudança automática de branch será feita.')
    if run(['git', 'status', '--porcelain']).stdout.strip():
        raise RuntimeError('Revise e faça commit das alterações locais antes de enviar.')
    remote = run(['git', 'remote', 'get-url', 'origin'], check=False)
    if remote.returncode == 0 and remote.stdout.strip() not in {URL, f'git@github.com:{REPO}.git'}:
        raise RuntimeError('Origin aponta para outro repositório; operação interrompida.')
    info = api('repos/' + REPO, optional=True)
    if info and (info['private'] or info['archived']):
        raise RuntimeError('Remoto privado/arquivado; configuração não será substituída.')
    pages = api('repos/' + REPO + '/pages', optional=True) if info else None
    if pages and (pages.get('cname') not in {None, DOMAIN} or pages.get('build_type') != 'workflow'):
        raise RuntimeError('Pages existente tem configuração diferente; nada será substituído.')
    if info and info['size'] > 0 and info['default_branch'] != 'main':
        raise RuntimeError('Remoto existente usa outra branch principal.')
    if not info:
        run(['gh', 'repo', 'create', REPO, '--public', '--description', 'Biblioteca MIDI Clave Sol com SpessaSynth completo'])
        print('Repositório público criado.')
    if remote.returncode: run(['git', 'remote', 'add', 'origin', URL])
    branches = run(['git', 'ls-remote', '--heads', 'origin']).stdout.strip()
    if branches:
        if not any(line.endswith('refs/heads/main') for line in branches.splitlines()):
            raise RuntimeError('Remoto contém branches mas não main; envio bloqueado.')
        run(['git', 'fetch', 'origin', 'main'])
        if run(['git', 'merge-base', '--is-ancestor', 'FETCH_HEAD', 'HEAD'], check=False).returncode:
            raise RuntimeError('Histórico remoto não é ancestral do local; envio bloqueado, sem force.')
    run(['git', 'push', '-u', 'origin', 'main'])
    api('repos/' + REPO, 'PATCH', {'default_branch': 'main'})
    if not pages: api('repos/' + REPO + '/pages', 'POST', {'build_type': 'workflow'})
    api('repos/' + REPO + '/pages', 'PUT', {'cname': DOMAIN, 'build_type': 'workflow'})
    state = api('repos/' + REPO + '/pages')
    if (state.get('https_certificate') or {}).get('state') == 'approved' and not state.get('https_enforced'):
        run(['gh', 'api', '--method', 'PUT', 'repos/' + REPO + '/pages', '-F', 'https_enforced=true'])
        state = api('repos/' + REPO + '/pages')
    print(json.dumps({'repository': REPO, 'branch': 'main', 'build_type': state.get('build_type'), 'cname': state.get('cname'), 'https_enforced': state.get('https_enforced')}, indent=2))
    print('Workflow NÃO executado. DNS NÃO alterado.')


if __name__ == '__main__':
    main()
