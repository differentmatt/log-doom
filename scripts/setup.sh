#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="log-doom"
DOMAIN="logdoom.com"
REGION="us-east-1"

echo "=== Log Doom Infrastructure Setup ==="
echo ""

# Step 1: Request ACM certificate
echo "Requesting ACM certificate for ${DOMAIN} and www.${DOMAIN}..."
CERT_ARN=$(aws acm request-certificate \
  --region "${REGION}" \
  --domain-name "${DOMAIN}" \
  --subject-alternative-names "www.${DOMAIN}" \
  --validation-method DNS \
  --query 'CertificateArn' \
  --output text)

echo "Certificate ARN: ${CERT_ARN}"
echo ""

# Step 2: Show DNS validation records
echo "Waiting for validation details..."
sleep 5

VALIDATION=$(aws acm describe-certificate \
  --region "${REGION}" \
  --certificate-arn "${CERT_ARN}" \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
  --output json)

CNAME_NAME=$(echo "${VALIDATION}" | python3 -c "import sys,json; print(json.load(sys.stdin)['Name'])")
CNAME_VALUE=$(echo "${VALIDATION}" | python3 -c "import sys,json; print(json.load(sys.stdin)['Value'])")

echo "============================================"
echo "  Add this CNAME record in Cloudflare DNS:"
echo ""
echo "  Name:  ${CNAME_NAME}"
echo "  Value: ${CNAME_VALUE}"
echo ""
echo "  (One record covers both ${DOMAIN} and www.${DOMAIN})"
echo "  Set Cloudflare proxy to DNS-only (grey cloud)."
echo "============================================"
echo ""
read -rp "Press Enter after adding the DNS record..."

# Step 3: Wait for certificate validation
echo "Waiting for certificate validation (this may take a few minutes)..."
aws acm wait certificate-validated \
  --region "${REGION}" \
  --certificate-arn "${CERT_ARN}"
echo "Certificate validated!"
echo ""

# Step 4: Check if OIDC provider already exists
CREATE_OIDC="true"
if aws iam get-open-id-connect-provider \
  --open-id-connect-provider-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):oidc-provider/token.actions.githubusercontent.com" \
  &>/dev/null; then
  echo "GitHub OIDC provider already exists, skipping creation."
  CREATE_OIDC="false"
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
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset

echo ""
echo "Stack deployed! Fetching outputs..."
echo ""

# Step 6: Print outputs
OUTPUTS=$(aws cloudformation describe-stacks \
  --region "${REGION}" \
  --stack-name "${STACK_NAME}" \
  --query 'Stacks[0].Outputs' \
  --output json)

BUCKET=$(echo "${OUTPUTS}" | python3 -c "import sys,json; print(next(o['OutputValue'] for o in json.load(sys.stdin) if o['OutputKey']=='BucketName'))")
DIST_ID=$(echo "${OUTPUTS}" | python3 -c "import sys,json; print(next(o['OutputValue'] for o in json.load(sys.stdin) if o['OutputKey']=='DistributionId'))")
DIST_DOMAIN=$(echo "${OUTPUTS}" | python3 -c "import sys,json; print(next(o['OutputValue'] for o in json.load(sys.stdin) if o['OutputKey']=='DistributionDomain'))")
ROLE_ARN=$(echo "${OUTPUTS}" | python3 -c "import sys,json; print(next(o['OutputValue'] for o in json.load(sys.stdin) if o['OutputKey']=='DeployRoleArn'))")

echo "============================================"
echo "  Stack outputs:"
echo ""
echo "  S3 Bucket:        ${BUCKET}"
echo "  Distribution ID:  ${DIST_ID}"
echo "  CloudFront Domain: ${DIST_DOMAIN}"
echo "  Deploy Role ARN:  ${ROLE_ARN}"
echo ""
echo "  Next steps:"
echo ""
echo "  1. Add CNAME records in Cloudflare:"
echo "     logdoom.com     → ${DIST_DOMAIN}"
echo "     www.logdoom.com → ${DIST_DOMAIN}"
echo "     (Set Cloudflare proxy to DNS-only / grey cloud)"
echo ""
echo "  2. Set GitHub repo variables (Settings → Secrets and variables → Actions → Variables):"
echo "     AWS_ROLE_ARN              = ${ROLE_ARN}"
echo "     S3_BUCKET                 = ${BUCKET}"
echo "     CLOUDFRONT_DISTRIBUTION_ID = ${DIST_ID}"
echo ""
echo "  3. Push to main to trigger the first deploy."
echo "============================================"
