#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="log-doom"
DOMAIN="logdoom.com"
REGION="us-east-1"
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"

echo "=== Log Doom Infrastructure Setup ==="
echo ""

# Step 1: Check for existing ACM certificate or request a new one
echo "Checking for ACM certificate for ${DOMAIN}..."
CERT_ARN=$(aws acm list-certificates \
  --region "${REGION}" \
  --certificate-statuses ISSUED \
  --query "CertificateSummaryList[?DomainName=='${DOMAIN}'].CertificateArn | [0]" \
  --output text)

if [[ "${CERT_ARN}" != "None" && -n "${CERT_ARN}" ]]; then
  echo "Found validated certificate: ${CERT_ARN}"
  FIRST_RUN=false
else
  # Check for a pending certificate before requesting a new one
  CERT_ARN=$(aws acm list-certificates \
    --region "${REGION}" \
    --certificate-statuses PENDING_VALIDATION \
    --query "CertificateSummaryList[?DomainName=='${DOMAIN}'].CertificateArn | [0]" \
    --output text)

  if [[ "${CERT_ARN}" == "None" || -z "${CERT_ARN}" ]]; then
    echo "No certificate found. Requesting new certificate for ${DOMAIN} and www.${DOMAIN}..."
    CERT_ARN=$(aws acm request-certificate \
      --region "${REGION}" \
      --domain-name "${DOMAIN}" \
      --subject-alternative-names "www.${DOMAIN}" \
      --validation-method DNS \
      --query 'CertificateArn' \
      --output text)
    echo "Requested certificate: ${CERT_ARN}"
  else
    echo "Found pending certificate: ${CERT_ARN}"
  fi

  FIRST_RUN=true
  echo ""

  # Step 2: Wait for validation resource records to be populated, then display them
  echo "Waiting for DNS validation details to become available..."

  MAX_ATTEMPTS=12
  ATTEMPT=0
  while true; do
    RECORD_COUNT=$(aws acm describe-certificate \
      --region "${REGION}" \
      --certificate-arn "${CERT_ARN}" \
      --query 'length(Certificate.DomainValidationOptions[?ResourceRecord].ResourceRecord)' \
      --output text)

    if [[ "${RECORD_COUNT}" -gt 0 ]] 2>/dev/null; then
      break
    fi

    ATTEMPT=$((ATTEMPT + 1))
    if [[ "${ATTEMPT}" -ge "${MAX_ATTEMPTS}" ]]; then
      echo "ERROR: Validation records not available after ${MAX_ATTEMPTS} attempts. Check the certificate in the AWS console."
      exit 1
    fi

    SLEEP_TIME=$(( ATTEMPT < 5 ? 2 : 5 ))
    echo "  Waiting ${SLEEP_TIME}s for records... (attempt ${ATTEMPT}/${MAX_ATTEMPTS})"
    sleep "${SLEEP_TIME}"
  done

  # Fetch validation records, deduplicated by CNAME name (column 2)
  VALIDATION_TEXT=$(aws acm describe-certificate \
    --region "${REGION}" \
    --certificate-arn "${CERT_ARN}" \
    --query 'Certificate.DomainValidationOptions[].[DomainName, ResourceRecord.Name, ResourceRecord.Value]' \
    --output text)

  echo "============================================"
  echo "  Add these CNAME records in Cloudflare DNS:"
  echo "  (Set Cloudflare proxy to DNS-only / grey cloud)"
  echo ""

  RECORD_INDEX=0
  while IFS=$'\t' read -r domain cname_name cname_value; do
    RECORD_INDEX=$((RECORD_INDEX + 1))
    echo "  Record ${RECORD_INDEX} (for ${domain}):"
    echo "    Name:  ${cname_name}"
    echo "    Value: ${cname_value}"
    echo ""
  done <<< "$(echo "${VALIDATION_TEXT}" | sort -t$'\t' -k2,2 -u)"

  echo "============================================"
  echo ""
  read -rp "Press Enter after adding the DNS record(s)..."

  # Step 3: Wait for certificate validation
  echo "Waiting for certificate validation (this may take a few minutes)..."
  aws acm wait certificate-validated \
    --region "${REGION}" \
    --certificate-arn "${CERT_ARN}"
  echo "Certificate validated!"
fi
echo ""

# Step 4: Check if OIDC provider already exists
ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
if [[ -z "${ACCOUNT_ID}" ]]; then
  echo "ERROR: Could not determine AWS account ID."
  exit 1
fi

# If the stack already exists, preserve its CreateOIDCProvider parameter
# (flipping it would cause CloudFormation to delete a stack-managed OIDC provider)
CURRENT_CREATE_OIDC=$(aws cloudformation describe-stacks \
  --region "${REGION}" \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Parameters[?ParameterKey=='CreateOIDCProvider'].ParameterValue | [0]" \
  --output text 2>/dev/null || echo "")

if [[ -n "${CURRENT_CREATE_OIDC}" && "${CURRENT_CREATE_OIDC}" != "None" ]]; then
  CREATE_OIDC="${CURRENT_CREATE_OIDC}"
  echo "Preserving existing stack CreateOIDCProvider=${CREATE_OIDC}"
else
  OIDC_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
  CREATE_OIDC="true"
  if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "${OIDC_ARN}" >/dev/null 2>&1; then
    echo "GitHub OIDC provider already exists, skipping creation."
    CREATE_OIDC="false"
  else
    echo "GitHub OIDC provider will be created by the stack."
  fi
fi

# Step 5: Deploy CloudFormation stack
echo "Deploying CloudFormation stack..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

aws cloudformation deploy \
  --region "${REGION}" \
  --stack-name "${STACK_NAME}" \
  --template-file "${SCRIPT_DIR}/../infra/template.yaml" \
  --parameter-overrides \
    "CertificateArn=${CERT_ARN}" \
    "CreateOIDCProvider=${CREATE_OIDC}" \
    "GoogleClientId=${GOOGLE_CLIENT_ID}" \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset

echo ""
echo "Stack deployed! Fetching outputs..."
echo ""

# Step 6: Fetch stack outputs using --query (no python dependency)
BUCKET=$(aws cloudformation describe-stacks \
  --region "${REGION}" \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue | [0]" \
  --output text)

DIST_ID=$(aws cloudformation describe-stacks \
  --region "${REGION}" \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue | [0]" \
  --output text)

DIST_DOMAIN=$(aws cloudformation describe-stacks \
  --region "${REGION}" \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionDomain'].OutputValue | [0]" \
  --output text)

ROLE_ARN=$(aws cloudformation describe-stacks \
  --region "${REGION}" \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='DeployRoleArn'].OutputValue | [0]" \
  --output text)

DAYS_FN=$(aws cloudformation describe-stacks \
  --region "${REGION}" \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='DaysFunctionName'].OutputValue | [0]" \
  --output text)

SETTINGS_FN=$(aws cloudformation describe-stacks \
  --region "${REGION}" \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='SettingsFunctionName'].OutputValue | [0]" \
  --output text)

STACK_CERT_ARN=$(aws cloudformation describe-stacks \
  --region "${REGION}" \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='CertificateArn'].OutputValue | [0]" \
  --output text)

# Step 7: Set GitHub repo variables if gh CLI is available
if command -v gh &>/dev/null; then
  echo "Setting GitHub repo variables via gh CLI..."
  gh variable set AWS_ROLE_ARN --body "${ROLE_ARN}"
  gh variable set S3_BUCKET --body "${BUCKET}"
  gh variable set CLOUDFRONT_DISTRIBUTION_ID --body "${DIST_ID}"
  gh variable set DAYS_FUNCTION_NAME --body "${DAYS_FN}"
  gh variable set SETTINGS_FUNCTION_NAME --body "${SETTINGS_FN}"
  gh variable set ACM_CERTIFICATE_ARN --body "${STACK_CERT_ARN}"
  [[ -n "${GOOGLE_CLIENT_ID}" ]] && gh variable set VITE_GOOGLE_CLIENT_ID --body "${GOOGLE_CLIENT_ID}"
  echo "GitHub variables set."
  echo ""
fi

echo "============================================"
echo "  Stack outputs:"
echo ""
echo "  S3 Bucket:         ${BUCKET}"
echo "  Distribution ID:   ${DIST_ID}"
echo "  CloudFront Domain: ${DIST_DOMAIN}"
echo "  Deploy Role ARN:   ${ROLE_ARN}"
echo "  Days Function:     ${DAYS_FN}"
echo "  Settings Function: ${SETTINGS_FN}"
echo "  Certificate ARN:   ${STACK_CERT_ARN}"
echo ""
if [[ "${FIRST_RUN}" == "true" ]]; then
  echo "  Next steps:"
  echo ""
  echo "  1. Add CNAME records in Cloudflare:"
  echo "     logdoom.com     → ${DIST_DOMAIN}"
  echo "     www.logdoom.com → ${DIST_DOMAIN}"
  echo "     (Set Cloudflare proxy to DNS-only / grey cloud)"
  echo ""
  if command -v gh &>/dev/null; then
    echo "  2. GitHub repo variables have been set automatically."
  else
    echo "  2. Set GitHub repo variables (Settings → Secrets and variables → Actions → Variables):"
    echo "     AWS_ROLE_ARN              = ${ROLE_ARN}"
    echo "     S3_BUCKET                 = ${BUCKET}"
    echo "     CLOUDFRONT_DISTRIBUTION_ID = ${DIST_ID}"
  fi
  echo ""
  echo "  3. Push to main to trigger a deploy."
else
  if command -v gh &>/dev/null; then
    echo "  GitHub repo variables updated."
  fi
  echo "  Stack is up to date. Push to main to deploy."
fi
echo "============================================"
