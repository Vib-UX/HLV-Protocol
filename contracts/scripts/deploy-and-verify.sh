#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   HTLC Deployment & Verification     ║${NC}"
echo -e "${BLUE}║        Hedera Testnet                 ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please create a .env file with:"
    echo "  HEDERA_RPC_URL=https://testnet.hashio.io/api"
    echo "  HEDERA_PRIVATE_KEY=0x-your-private-key"
    exit 1
fi

# Load environment variables
source .env

# Verify required variables
if [ -z "$HEDERA_PRIVATE_KEY" ]; then
    echo -e "${RED}Error: HEDERA_PRIVATE_KEY not set in .env${NC}"
    exit 1
fi

if [ -z "$HEDERA_RPC_URL" ]; then
    echo -e "${RED}Error: HEDERA_RPC_URL not set in .env${NC}"
    exit 1
fi

# Derive address from private key
echo -e "${YELLOW}Checking deployer account...${NC}"
DEPLOYER_ADDRESS=$(cast wallet address $HEDERA_PRIVATE_KEY)
echo -e "${GREEN}Deployer Address: ${DEPLOYER_ADDRESS}${NC}"

# Check balance
BALANCE=$(cast balance $DEPLOYER_ADDRESS --rpc-url $HEDERA_RPC_URL)
BALANCE_ETH=$(cast --to-unit $BALANCE ether)
echo -e "${GREEN}Balance: ${BALANCE_ETH} HBAR${NC}"
echo ""

if [ $(echo "$BALANCE_ETH < 10" | bc) -eq 1 ]; then
    echo -e "${YELLOW}Warning: Low balance. You may need more HBAR for deployment.${NC}"
    echo -e "${YELLOW}Get testnet HBAR from: https://portal.hedera.com/${NC}"
    echo ""
fi

# Build contracts
echo -e "${YELLOW}Building contracts...${NC}"
forge build
echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Run tests
echo -e "${YELLOW}Running tests...${NC}"
forge test --gas-report
echo -e "${GREEN}✓ All tests passed${NC}"
echo ""

# Deploy contract
echo -e "${YELLOW}Deploying HTLC contract to Hedera Testnet...${NC}"
DEPLOY_OUTPUT=$(forge script script/HTLC.s.sol:HTLCScript \
    --rpc-url testnet \
    --broadcast \
    --legacy 2>&1)

echo "$DEPLOY_OUTPUT"

# Extract contract address from output
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "HTLC deployed to:" | awk '{print $4}')

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo -e "${RED}Error: Failed to extract contract address${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Contract deployed successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}Contract Address: ${CONTRACT_ADDRESS}${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""

# Save contract address to file
echo "HTLC_CONTRACT_ADDRESS=$CONTRACT_ADDRESS" > .contract-address
echo -e "${BLUE}Contract address saved to .contract-address${NC}"
echo ""

# Ask if user wants to verify
read -p "$(echo -e ${YELLOW}Do you want to verify the contract on Hashscan? [y/N]: ${NC})" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Verifying contract on Hashscan...${NC}"
    
    forge verify-contract $CONTRACT_ADDRESS \
        src/HTLC.sol:HTLC \
        --chain-id 296 \
        --verifier sourcify \
        --verifier-url "https://server-verify.hashscan.io/" || true
    
    echo ""
    echo -e "${GREEN}✓ Verification submitted${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Next Steps:${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "1. View contract on Hashscan:"
echo -e "   ${GREEN}https://hashscan.io/testnet/contract/${CONTRACT_ADDRESS}${NC}"
echo ""
echo -e "2. Set environment variable:"
echo -e "   ${GREEN}export CONTRACT_ADDRESS=${CONTRACT_ADDRESS}${NC}"
echo ""
echo -e "3. Test the contract:"
echo -e "   ${GREEN}./scripts/test-htlc.sh${NC}"
echo ""
echo -e "4. Integrate with Vincent Agent:"
echo -e "   ${GREEN}See INTEGRATION_GUIDE.md${NC}"
echo ""

