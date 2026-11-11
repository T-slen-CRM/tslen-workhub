import { spawnSync, SpawnSyncReturns } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Drives scripts/bws-env.sh and scripts/bws-import-env.sh against a fake
 * `bws` binary (BWS_BIN), so no Bitwarden account or network is needed.
 * The fake serves `secret list` from a JSON fixture and appends every
 * call's argv + whether BWS_ACCESS_TOKEN was set to a log file.
 */
const repoRoot = path.resolve(__dirname, '../../..');
const ENV_SCRIPT = path.join(repoRoot, 'scripts/bws-env.sh');
const IMPORT_SCRIPT = path.join(repoRoot, 'scripts/bws-import-env.sh');
const TOKEN = 'fake-access-token-0123456789';
const PROJECT = '11111111-2222-3333-4444-555555555555';

// bws-import-env.sh uses associative arrays (bash >= 4). macOS ships
// bash 3.2 as /bin/bash; CI (ubuntu) and the Debian server have bash 5.
const bashMajor = Number(
    spawnSync('bash', ['-c', 'echo ${BASH_VERSINFO[0]}'], { encoding: 'utf8' }).stdout.trim(),
);
const itBash4 = bashMajor >= 4 ? it : it.skip;

interface Secret { key: string; value: string }

describe('bws secrets scripts', () => {
    let dir: string;
    let fixture: string;
    let log: string;
    let config: string;

    const writeSecrets = (secrets: Secret[]) =>
        fs.writeFileSync(fixture, JSON.stringify(secrets.map((s, i) => ({ id: `id-${i}`, projectId: PROJECT, ...s }))));

    const run = (script: string, args: string[] = [], extraEnv: Record<string, string> = {}): SpawnSyncReturns<string> =>
        spawnSync('bash', [script, ...args], {
            encoding: 'utf8',
            cwd: dir,
            env: {
                PATH: process.env.PATH,
                HOME: dir,
                TSLEN_BWS_CONFIG: config,
                BWS_BIN: path.join(dir, 'bws'),
                FAKE_BWS_FIXTURE: fixture,
                FAKE_BWS_LOG: log,
                ...extraEnv,
            },
        });

    const calls = (): string[] => (fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n') : []);

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bws-env-'));
        fixture = path.join(dir, 'secrets.json');
        log = path.join(dir, 'calls.log');
        config = path.join(dir, 'bws.conf');
        fs.writeFileSync(path.join(dir, 'token'), TOKEN);
        fs.writeFileSync(config, `BWS_PROJECT_ID=${PROJECT}\nBWS_ACCESS_TOKEN_FILE=${path.join(dir, 'token')}\n`);
        fs.writeFileSync(
            path.join(dir, 'bws'),
            [
                '#!/usr/bin/env bash',
                'echo "token=${BWS_ACCESS_TOKEN:+set} argv=$*" >> "$FAKE_BWS_LOG"',
                '[ -n "${FAKE_BWS_FAIL:-}" ] && { echo "401 unauthorized" >&2; exit 1; }',
                'case "$1 $2" in',
                '  "secret list") cat "$FAKE_BWS_FIXTURE" ;;',
                // Parses like the real (clap-based) CLI: before `--`, any
                // unknown dash-prefixed argument is rejected and echoed back.
                // FAKE_BWS_CREATE_FAILS=N: the first N creates fail with
                // FAKE_BWS_CREATE_ERROR (default: a 429).
                '  "secret create")',
                '    shift 2; dd=; pos=()',
                '    while [ $# -gt 0 ]; do',
                '      if [ -n "$dd" ]; then pos+=("$1")',
                '      elif [ "$1" = "--" ]; then dd=1',
                '      elif [ "$1" = "--note" ] || [ "$1" = "--output" ]; then shift',
                '      elif [[ "$1" == -* ]]; then echo "error: unexpected argument \'$1\' found" >&2; exit 2',
                '      else pos+=("$1"); fi',
                '      shift',
                '    done',
                '    [ "${#pos[@]}" -eq 3 ] || { echo "error: expected KEY VALUE PROJECT_ID" >&2; exit 2; }',
                '    n=$(cat "$FAKE_BWS_LOG.fails" 2>/dev/null || echo 0)',
                '    if [ "$n" -lt "${FAKE_BWS_CREATE_FAILS:-0}" ]; then',
                '      echo $((n + 1)) > "$FAKE_BWS_LOG.fails"',
                '      echo "${FAKE_BWS_CREATE_ERROR:-Error: [429 Too Many Requests] Slow down!} ${pos[1]}" >&2; exit 1',
                '    fi ;;',
                '  *) echo "unexpected: $*" >&2; exit 2 ;;',
                'esac',
            ].join('\n'),
            { mode: 0o755 },
        );
        writeSecrets([]);
    });

    afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

    describe('bws-env.sh', () => {
        it('prints unquoted KEY=VALUE lines, values kept literally', () => {
            writeSecrets([
                { key: 'JWT_SECRET', value: 'a=b"c' },
                { key: 'FIREBASE_SERVICE_ACCOUNT', value: '{"private_key":"-----BEGIN\\nKEY\\n"}' },
            ]);
            const res = run(ENV_SCRIPT);
            expect(res.status).toBe(0);
            expect(res.stdout).toBe(
                'JWT_SECRET=a=b"c\nFIREBASE_SERVICE_ACCOUNT={"private_key":"-----BEGIN\\nKEY\\n"}\n',
            );
        });

        it('passes the access token via the environment, never argv', () => {
            writeSecrets([{ key: 'A', value: '1' }]);
            run(ENV_SCRIPT);
            expect(calls()).toEqual([`token=set argv=secret list ${PROJECT} --output json --color no`]);
            expect(fs.readFileSync(log, 'utf8')).not.toContain(TOKEN);
        });

        it('rejects a multi-line value, naming the key but not leaking the value', () => {
            writeSecrets([{ key: 'PRIVATE_KEY', value: 'line1\nsupersecret' }]);
            const res = run(ENV_SCRIPT);
            expect(res.status).not.toBe(0);
            expect(res.stdout).toBe('');
            expect(res.stderr).toContain('PRIVATE_KEY');
            expect(res.stderr).not.toContain('supersecret');
        });

        it('rejects invalid env var names and duplicate keys', () => {
            writeSecrets([{ key: 'bad-name', value: 'x' }]);
            expect(run(ENV_SCRIPT).stderr).toContain('invalid env var name: bad-name');

            writeSecrets([{ key: 'A', value: '1' }, { key: 'A', value: '2' }]);
            expect(run(ENV_SCRIPT).stderr).toContain('duplicate keys: A');
        });

        it('fails on an empty project or a failing bws call', () => {
            expect(run(ENV_SCRIPT).status).not.toBe(0);

            writeSecrets([{ key: 'A', value: '1' }]);
            const res = run(ENV_SCRIPT, [], { FAKE_BWS_FAIL: '1' });
            expect(res.status).not.toBe(0);
            expect(res.stdout).toBe('');
        });

        it('enforces REQUIRED_KEYS from the config', () => {
            writeSecrets([{ key: 'A', value: '1' }]);
            fs.appendFileSync(config, 'REQUIRED_KEYS="A JWT_SECRET"\n');
            const res = run(ENV_SCRIPT);
            expect(res.status).not.toBe(0);
            expect(res.stderr).toContain('required key missing from Bitwarden project: JWT_SECRET');
        });

        it('run mode exports every secret into the child command', () => {
            writeSecrets([{ key: 'TUNNEL', value: 'tok en=1' }, { key: 'DB', value: 'pw' }]);
            const res = run(ENV_SCRIPT, ['run', '--', 'bash', '-c', 'printf "%s|%s" "$TUNNEL" "$DB"']);
            expect(res.status).toBe(0);
            expect(res.stdout).toBe('tok en=1|pw');
        });
    });

    describe('bws-import-env.sh', () => {
        itBash4('creates missing keys, skips existing/empty ones, inlines JSON minified, never prints values', () => {
            writeSecrets([{ key: 'ALREADY', value: 'old' }]);
            fs.writeFileSync(
                path.join(dir, '.env'),
                '# comment\n\nJWT_SECRET=s3cr3t=x\nBASE_PATH="/quoted"\nEMPTY=\nALREADY=new\nFIREBASE_SERVICE_ACCOUNT=credentials/fb.json\n',
            );
            fs.writeFileSync(path.join(dir, 'fb.json'), '{\n  "type": "service_account",\n  "k": "v"\n}\n');

            const res = run(IMPORT_SCRIPT, ['.env', `FIREBASE_SERVICE_ACCOUNT=${path.join(dir, 'fb.json')}`]);

            expect(res.status).toBe(0);
            expect(res.stdout).toContain('done: 3 created, 2 skipped');
            expect(res.stdout).not.toMatch(/s3cr3t|quoted|service_account/);
            const creates = calls().filter((c) => c.includes('secret create'));
            expect(creates).toEqual([
                expect.stringContaining('-- JWT_SECRET s3cr3t=x '),
                expect.stringContaining('-- BASE_PATH "/quoted" '),
                expect.stringContaining('-- FIREBASE_SERVICE_ACCOUNT {"type":"service_account","k":"v"} '),
            ]);
            creates.forEach((c) => expect(c).toMatch(/^token=set /));
        });

        itBash4('retries a rate-limited create, and gives up with the server error after MAX_ATTEMPTS', () => {
            fs.writeFileSync(path.join(dir, '.env'), 'A=1\n');
            const fast = { RETRY_DELAY: '0', PACE_DELAY: '0', MAX_ATTEMPTS: '3' };

            const ok = run(IMPORT_SCRIPT, ['.env'], { ...fast, FAKE_BWS_CREATE_FAILS: '2' });
            expect(ok.status).toBe(0);
            expect(ok.stdout).toContain('done: 1 created, 0 skipped');
            expect(calls().filter((c) => c.includes('secret create'))).toHaveLength(3);

            fs.rmSync(log, { force: true });
            fs.rmSync(`${log}.fails`, { force: true });
            const fail = run(IMPORT_SCRIPT, ['.env'], { ...fast, FAKE_BWS_CREATE_FAILS: '99' });
            expect(fail.status).not.toBe(0);
            expect(fail.stderr).toContain('429 Too Many Requests');
            expect(fail.stderr).toContain('failed creating A after 3 rate-limited attempts');
        });

        itBash4('does not retry a non-429 failure (it may have been applied), and redacts the value from the error', () => {
            fs.writeFileSync(path.join(dir, '.env'), 'A=topsecret\n');
            const res = run(IMPORT_SCRIPT, ['.env'], {
                RETRY_DELAY: '0', PACE_DELAY: '0',
                FAKE_BWS_CREATE_FAILS: '99', FAKE_BWS_CREATE_ERROR: 'Error: [504 Gateway Timeout]',
            });
            expect(res.status).not.toBe(0);
            expect(calls().filter((c) => c.includes('secret create'))).toHaveLength(1);
            expect(res.stderr).toContain('[504 Gateway Timeout] <redacted>');
            expect(res.stderr).toContain('not retried');
            expect(res.stderr).not.toContain('topsecret');
        });

        itBash4('imports a value starting with "-" as a value, not a flag', () => {
            fs.writeFileSync(path.join(dir, '.env'), 'JWT_SECRET=-x9Fk-secret\n');
            const res = run(IMPORT_SCRIPT, ['.env'], { PACE_DELAY: '0' });
            expect(res.status).toBe(0);
            expect(res.stdout).toContain('done: 1 created, 0 skipped');
            expect(res.stderr).not.toContain('-x9Fk-secret');
        });

        itBash4('strips CRLF line endings instead of importing a trailing \\r', () => {
            fs.writeFileSync(path.join(dir, '.env'), 'A=1\r\nB=two\r\n');
            const res = run(IMPORT_SCRIPT, ['.env'], { PACE_DELAY: '0' });
            expect(res.status).toBe(0);
            const creates = calls().filter((c) => c.includes('secret create'));
            expect(creates).toEqual([
                expect.stringMatching(/-- A 1 \S+$/),
                expect.stringMatching(/-- B two \S+$/),
            ]);
        });

        itBash4('refuses a JSON override holding several top-level values (would be multi-line)', () => {
            fs.writeFileSync(path.join(dir, '.env'), 'A=1\n');
            fs.writeFileSync(path.join(dir, 'multi.json'), '{"a":1}\n{"b":2}\n');
            const res = run(IMPORT_SCRIPT, ['.env', `CREDS=${path.join(dir, 'multi.json')}`], { PACE_DELAY: '0' });
            expect(res.status).not.toBe(0);
            expect(res.stderr).toContain('value of CREDS is multi-line');
            expect(calls().filter((c) => c.includes('secret create'))).toEqual([]);
        });

        itBash4('fails clearly when bws is missing or RETRY_DELAY is fractional', () => {
            fs.writeFileSync(path.join(dir, '.env'), 'A=1\n');
            expect(run(IMPORT_SCRIPT, ['.env'], { BWS_BIN: path.join(dir, 'nope') }).stderr)
                .toContain('not found - install the Bitwarden Secrets Manager CLI');
            expect(run(IMPORT_SCRIPT, ['.env'], { RETRY_DELAY: '0.5' }).stderr)
                .toContain('RETRY_DELAY must be a whole number of seconds');
        });

        itBash4('refuses a line that is not KEY=VALUE without echoing it', () => {
            fs.writeFileSync(path.join(dir, '.env'), 'export LEAKY=hunter2\n');
            const res = run(IMPORT_SCRIPT, ['.env']);
            expect(res.status).not.toBe(0);
            expect(res.stderr + res.stdout).not.toContain('hunter2');
            expect(calls().filter((c) => c.includes('secret create'))).toEqual([]);
        });
    });
});
