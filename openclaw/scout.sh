#!/usr/bin/env bash
# Usage: ./scout.sh --company <name> [--website <url>] [--industry <str>] [--size <str>]
#                    [--first <name> --last <name>] [--email <addr>] [--phone <str>]
#                    [--job-title <str>] [--linkedin <url>]
#                    [--note <content>] [--note-title <str>]
#                    [--note-for <contact|company|both>] [--note-external-id <uuid>]

set -euo pipefail

KEY="wid_55b843e3b63f4444838cea5fe2701d49b9dc6d99d1490c0e463d85f414f565de"
SECRET="9dbfe040e4cea48a3def4cb50922a1d03d7d2e0dee8b217d1d6163eea513f85a"

COMPANY_NAME="" COMPANY_WEBSITE="" COMPANY_INDUSTRY="" COMPANY_SIZE=""
FIRST="" LAST="" EMAIL="" PHONE="" JOB_TITLE="" LINKEDIN=""
NOTE="" NOTE_TITLE="" NOTE_FOR="both" NOTE_EXTERNAL_ID=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --company)   COMPANY_NAME="$2";    shift 2 ;;
    --website)   COMPANY_WEBSITE="$2"; shift 2 ;;
    --industry)  COMPANY_INDUSTRY="$2";shift 2 ;;
    --size)      COMPANY_SIZE="$2";    shift 2 ;;
    --first)     FIRST="$2";           shift 2 ;;
    --last)      LAST="$2";            shift 2 ;;
    --email)     EMAIL="$2";           shift 2 ;;
    --phone)     PHONE="$2";           shift 2 ;;
    --job-title)         JOB_TITLE="$2";         shift 2 ;;
    --linkedin)          LINKEDIN="$2";           shift 2 ;;
    --note)              NOTE="$2";               shift 2 ;;
    --note-title)        NOTE_TITLE="$2";         shift 2 ;;
    --note-for)          NOTE_FOR="$2";           shift 2 ;;
    --note-external-id)  NOTE_EXTERNAL_ID="$2";   shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

[[ -z "$COMPANY_NAME" && -z "$FIRST" ]] && { echo "Error: at least --company or --first/--last required" >&2; exit 1; }
[[ -n "$FIRST" && -z "$LAST" ]] && { echo "Error: --last required when --first is given" >&2; exit 1; }
[[ -n "$LAST" && -z "$FIRST" ]] && { echo "Error: --first required when --last is given" >&2; exit 1; }

# Build JSON with jq (handles escaping safely)
build_company() {
  jq -n \
    --arg name    "$COMPANY_NAME" \
    --arg website "$COMPANY_WEBSITE" \
    --arg industry "$COMPANY_INDUSTRY" \
    --arg size    "$COMPANY_SIZE" \
    '{ name: $name }
     | if $website  != "" then . + { website: $website }   else . end
     | if $industry != "" then . + { industry: $industry } else . end
     | if $size     != "" then . + { size: $size }         else . end'
}

build_note() {
  local associate_to
  case "$NOTE_FOR" in
    contact) associate_to='["contact"]' ;;
    company) associate_to='["company"]' ;;
    *)       associate_to='["contact","company"]' ;;
  esac

  jq -n \
    --arg content    "$NOTE" \
    --arg title      "$NOTE_TITLE" \
    --arg extId      "$NOTE_EXTERNAL_ID" \
    --argjson assoc  "$associate_to" \
    '{ content: $content, associateTo: $assoc }
     | if $title != "" then . + { title: $title }      else . end
     | if $extId  != "" then . + { externalId: $extId } else . end'
}

build_contact() {
  jq -n \
    --arg firstName  "$FIRST" \
    --arg lastName   "$LAST" \
    --arg email      "$EMAIL" \
    --arg phone      "$PHONE" \
    --arg jobTitle   "$JOB_TITLE" \
    --arg linkedinUrl "$LINKEDIN" \
    '{ firstName: $firstName, lastName: $lastName }
     | if $email      != "" then . + { email: $email }           else . end
     | if $phone      != "" then . + { phone: $phone }           else . end
     | if $jobTitle   != "" then . + { jobTitle: $jobTitle }     else . end
     | if $linkedinUrl != "" then . + { linkedinUrl: $linkedinUrl } else . end'
}

if [[ -n "$COMPANY_NAME" && -n "$FIRST" ]]; then
  BODY=$(jq -n --argjson company "$(build_company)" --argjson contact "$(build_contact)" \
    '{ company: $company, contact: $contact }')
elif [[ -n "$COMPANY_NAME" ]]; then
  BODY=$(jq -n --argjson company "$(build_company)" '{ company: $company }')
else
  BODY=$(jq -n --argjson contact "$(build_contact)" '{ contact: $contact }')
fi

if [[ -n "$NOTE" ]]; then
  BODY=$(jq -n --argjson base "$BODY" --argjson note "$(build_note)" \
    '$base + { notes: [$note] }')
fi

TS=$(date +%s)
SIG=$(printf '%s' "${TS}.${BODY}" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST https://admin-wenindoubt-com.vercel.app/api/v1/scout \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $KEY" \
  -H "X-Signature: $SIG" \
  -H "X-Timestamp: $TS" \
  -d "$BODY")

HTTP_CODE=$(tail -n1 <<< "$RESPONSE")
BODY_OUT=$(head -n-1 <<< "$RESPONSE")

echo "HTTP $HTTP_CODE"
echo "$BODY_OUT" | jq .

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
  COMPANY_STATUS=$(echo "$BODY_OUT" | jq -r '.company._status // "n/a"')
  CONTACT_STATUS=$(echo "$BODY_OUT" | jq -r '.contact._status // "n/a"')
  NOTES_STATUS=$(echo "$BODY_OUT" | jq -r '[.notes[]? | "_status=\(._status) id=\(.id)"] | join(", ")' 2>/dev/null || echo "n/a")
  echo "company=$COMPANY_STATUS contact=$CONTACT_STATUS notes=[$NOTES_STATUS]"
else
  exit 1
fi
