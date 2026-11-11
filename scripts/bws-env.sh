#!/usr/bin/env bash
# Fetch this deployment's runtime config from Bitwarden Secrets Manager.
#
#   scripts/bws-env.sh                  print KEY=VALUE lines (docker --env-file format)
#   scripts/bws-env.sh run -- CMD ...   export every secret into CMD's environment
#                                       (e.g. `docker compose ... up -d`, whose
#                                       ${VAR} interpolation reads the shell env)
#
# Reads a small owner-only config file (default
# ~/.config/tslen-workhub/bws.conf, override with TSLEN_BWS_CONFIG):
#
#   BWS_PROJECT_ID=<uuid of the Secrets Manager project>
#   BWS_ACCESS_TOKEN_FILE=$HOME/.config/tslen-workhub/bws-access-token
#   # BWS_SERVER_URL=https://vault.bitwarden.eu    # only for the EU cloud
#   # REQUIRED_KEYS="JWT_SECRET DB_PASSWORD"       # fail fast if any is missing
#
# The access token belongs to a machine account with READ-ONLY access to
# that one project - it's the single bootstrap secret left on disk.
#
# Why not `bws secret list -o env` / `bws run` directly: `-o env` wraps
# values in double quotes, which docker --env-file passes through
# literally (it doesn't parse shell quoting), and neither validates
# anything. Here every key must be a valid env var name, keys must be
# unique, and values must be single-line (docker --env-file is
# line-based - store JSON credentials minified, `jq -c`). Errors name the
# offending key, never its value.
set -euo pipefail

CONFIG="${TSLEN_BWS_CONFIG:-$HOME/.config/tslen-workhub/bws.conf}"
BWS_BIN="${BWS_BIN:-bws}"

die() { echo "bws-env: $*" >&2; exit 1; }

[ -r "$CONFIG" ] || die "config not found: $CONFIG"
# shellcheck source=/dev/null
. "$CONFIG"

: "${BWS_PROJECT_ID:?bws-env: BWS_PROJECT_ID not set in $CONFIG}"
: "${BWS_ACCESS_TOKEN_FILE:?bws-env: BWS_ACCESS_TOKEN_FILE not set in $CONFIG}"
[ -r "$BWS_ACCESS_TOKEN_FILE" ] || die "access token file not readable: $BWS_ACCESS_TOKEN_FILE"
command -v "$BWS_BIN" >/dev/null || die "'$BWS_BIN' not found - install the Bitwarden Secrets Manager CLI"
command -v jq >/dev/null || die "jq not found"

# Token goes to bws via its environment, never argv (argv is visible in ps).
json="$(
    BWS_ACCESS_TOKEN="$(cat "$BWS_ACCESS_TOKEN_FILE")"
    export BWS_ACCESS_TOKEN
    if [ -n "${BWS_SERVER_URL:-}" ]; then export BWS_SERVER_URL; fi
    "$BWS_BIN" secret list "$BWS_PROJECT_ID" --output json --color no
)" || die "bws secret list failed"

env_lines="$(jq -r '
    if type != "array" or length == 0 then error("no secrets returned for this project") else . end
    | ([group_by(.key)[] | select(length > 1) | .[0].key]) as $dups
    | if ($dups | length) > 0 then error("duplicate keys: \($dups | join(", "))") else . end
    | .[]
    | if (.key | test("^[A-Za-z_][A-Za-z0-9_]*$") | not) then error("invalid env var name: \(.key)")
      elif (.value | test("[\r\n]")) then error("value of \(.key) is multi-line; store it single-line (jq -c for JSON)")
      else "\(.key)=\(.value)" end
' <<<"$json")" || die "secrets failed validation"

for key in ${REQUIRED_KEYS:-}; do
    grep -q "^${key}=" <<<"$env_lines" || die "required key missing from Bitwarden project: $key"
done

case "${1:-}" in
    "")
        printf '%s\n' "$env_lines"
        ;;
    run)
        shift
        [ "${1:-}" = "--" ] && shift
        [ "$#" -gt 0 ] || die "usage: $0 run -- CMD [ARGS...]"
        while IFS= read -r line; do
            # shellcheck disable=SC2163 # exporting the KEY=VALUE pair itself is the point
            export "$line"
        done <<<"$env_lines"
        exec "$@"
        ;;
    *)
        die "unknown argument: $1 (usage: $0 [run -- CMD ...])"
        ;;
esac
