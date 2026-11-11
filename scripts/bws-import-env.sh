#!/usr/bin/env bash
# One-time import of an existing .env into Bitwarden Secrets Manager.
#
#   scripts/bws-import-env.sh ENV_FILE [KEY=path/to/credentials.json ...]
#
# Every KEY=VALUE line in ENV_FILE becomes a secret in the project named
# by BWS_PROJECT_ID (same config file as scripts/bws-env.sh). Each extra
# KEY=file.json argument overrides KEY with that file's contents,
# minified to one line - use it to inline JSON credentials that the app
# currently reads from disk (FIREBASE_SERVICE_ACCOUNT,
# GOOGLE_CREDENTIALS_PATH both accept either a .json path or the JSON
# itself).
#
# Values are taken literally, exactly as docker --env-file reads them
# (no quote stripping). Empty values are skipped - unset is equivalent for
# the app. Keys that already exist in the project are skipped, not
# overwritten, so it's safe to re-run. Never prints a value.
#
# Needs a token with READ/WRITE access to the project - use one only for
# the import, then revoke it and keep the read-only deploy token.
#
# Note: bws takes the value as a command-line argument, so each value is
# briefly visible in the process list to other users on this host while
# its `bws secret create` runs. Fine on a single-user deploy box; don't
# run this on a shared machine.
set -euo pipefail

CONFIG="${TSLEN_BWS_CONFIG:-$HOME/.config/tslen-workhub/bws.conf}"
BWS_BIN="${BWS_BIN:-bws}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-5}"
RETRY_DELAY="${RETRY_DELAY:-2}"   # whole seconds, multiplied by the attempt number
PACE_DELAY="${PACE_DELAY:-0.5}"   # seconds between successful creates (fractions ok)

die() { echo "bws-import-env: $*" >&2; exit 1; }

[[ "$MAX_ATTEMPTS" =~ ^[1-9][0-9]*$ ]] || die "MAX_ATTEMPTS must be a positive integer"
[[ "$RETRY_DELAY" =~ ^[0-9]+$ ]] || die "RETRY_DELAY must be a whole number of seconds"

[ "$#" -ge 1 ] || die "usage: $0 ENV_FILE [KEY=file.json ...]"
ENV_FILE="$1"; shift
[ -r "$ENV_FILE" ] || die "cannot read $ENV_FILE"
[ -r "$CONFIG" ] || die "config not found: $CONFIG"
# shellcheck source=/dev/null
. "$CONFIG"
: "${BWS_PROJECT_ID:?not set in $CONFIG}"
TOKEN_FILE="${BWS_IMPORT_ACCESS_TOKEN_FILE:-${BWS_ACCESS_TOKEN_FILE:?not set in $CONFIG}}"
[ -r "$TOKEN_FILE" ] || die "access token file not readable: $TOKEN_FILE"
command -v jq >/dev/null || die "jq not found"
command -v "$BWS_BIN" >/dev/null || die "'$BWS_BIN' not found - install the Bitwarden Secrets Manager CLI"

BWS_ACCESS_TOKEN="$(cat "$TOKEN_FILE")"
export BWS_ACCESS_TOKEN
if [ -n "${BWS_SERVER_URL:-}" ]; then export BWS_SERVER_URL; fi

declare -A values=()
order=()
while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^[[:space:]]*(#|$) ]] && continue
    [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]] || die "unparseable line in $ENV_FILE (not KEY=VALUE)"
    key="${BASH_REMATCH[1]}"
    [ -z "${values[$key]+x}" ] && order+=("$key")
    values[$key]="${BASH_REMATCH[2]%$'\r'}"   # tolerate CRLF line endings
done <"$ENV_FILE"

for override in "$@"; do
    [[ "$override" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.+)$ ]] || die "bad override (want KEY=file.json): $override"
    key="${BASH_REMATCH[1]}"; file="${BASH_REMATCH[2]}"
    [ -r "$file" ] || die "cannot read $file"
    [ -z "${values[$key]+x}" ] && order+=("$key")
    values[$key]="$(jq -c . "$file")" || die "$file is not valid JSON"
done

# docker --env-file is line-based and bws-env.sh rejects multi-line
# values, so refuse them here rather than import something that breaks
# the next deploy (e.g. a stray CR, or a JSON file holding several
# top-level values, which `jq -c` prints one per line).
for key in "${order[@]}"; do
    [[ "${values[$key]}" == *[$'\r\n']* ]] && die "value of $key is multi-line; it must be a single line"
done

existing="$("$BWS_BIN" secret list "$BWS_PROJECT_ID" --output json --color no | jq -r '.[].key')" \
    || die "bws secret list failed (check token/project id)"

note="imported from $(basename "$ENV_FILE") on $(date -u +%Y-%m-%d)"
created=0; skipped=0
for key in "${order[@]}"; do
    value="${values[$key]}"
    if [ -z "$value" ]; then
        echo "skip  $key (empty)"; skipped=$((skipped + 1)); continue
    fi
    if grep -qxF "$key" <<<"$existing"; then
        echo "skip  $key (already in project)"; skipped=$((skipped + 1)); continue
    fi
    # Bitwarden rate-limits bursts of writes (429 "Slow down"), so pace
    # the creates and retry with backoff - but ONLY on a 429: that request
    # was rejected outright, so retrying can't duplicate the secret. Any
    # other failure (timeout, 5xx) may have been applied server-side, and
    # a blind retry could create the key twice, which bws-env.sh then
    # refuses on every deploy - so stop and let a re-run (which skips
    # existing keys) pick up from there.
    #
    # Options go before `--` so a value starting with "-" is never parsed
    # as a flag. Any bws error is printed with the value redacted.
    attempt=1
    until err="$("$BWS_BIN" secret create --note "$note" --output none -- "$key" "$value" "$BWS_PROJECT_ID" 2>&1)"; do
        err="${err//"$value"/<redacted>}"
        if ! grep -qiE '429|too many requests|slow down' <<<"$err"; then
            grep -m1 -iE 'error' <<<"$err" >&2 || true
            die "failed creating $key (not retried: re-run to continue, existing keys are skipped)"
        fi
        if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
            grep -m1 -iE 'error' <<<"$err" >&2 || true
            die "failed creating $key after $MAX_ATTEMPTS rate-limited attempts"
        fi
        sleep $((attempt * RETRY_DELAY))
        attempt=$((attempt + 1))
    done
    echo "add   $key"; created=$((created + 1))
    sleep "$PACE_DELAY"
done
echo "done: $created created, $skipped skipped"
