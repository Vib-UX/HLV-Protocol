#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   wBTC Test Token Deployment         ║${NC}"
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

# Build contracts
echo -e "${YELLOW}Building contracts...${NC}"
forge build
echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Deploy contract
echo -e "${YELLOW}Deploying wBTC test token to Hedera Testnet...${NC}"
DEPLOY_OUTPUT=$(forge script script/DeployERC20Mock.s.sol:DeployERC20MockScript \
    --rpc-url testnet \
    --broadcast \
    --legacy 2>&1)

echo "$DEPLOY_OUTPUT"

# Extract contract address from output
TOKEN_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "wBTC deployed to:" | awk '{print $4}')

if [ -z "$TOKEN_ADDRESS" ]; then
    echo -e "${RED}Error: Failed to extract token address${NC}"
    echo "Deploy output:"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✓ wBTC Token deployed successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}Token Address: ${TOKEN_ADDRESS}${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""

# Save token address to file
echo "WBTC_TOKEN_ADDRESS=$TOKEN_ADDRESS" > .wbtc-token-address
echo -e "${BLUE}Token address saved to .wbtc-token-address${NC}"

# Update integration test env file
INTEGRATION_ENV="../vincent-ability-starter-kit/packages/ability-hedera-htlc/.env.integration.test"
if [ -f "$INTEGRATION_ENV" ]; then
    echo -e "${YELLOW}Updating integration test configuration...${NC}"
    
    # Update or add WBTC_TOKEN_ADDRESS
    if grep -q "WBTC_TOKEN_ADDRESS=" "$INTEGRATION_ENV"; then
        # macOS sed syntax
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|WBTC_TOKEN_ADDRESS=.*|WBTC_TOKEN_ADDRESS=$TOKEN_ADDRESS|" "$INTEGRATION_ENV"
        else
            sed -i "s|WBTC_TOKEN_ADDRESS=.*|WBTC_TOKEN_ADDRESS=$TOKEN_ADDRESS|" "$INTEGRATION_ENV"
        fi
    else
        echo "WBTC_TOKEN_ADDRESS=$TOKEN_ADDRESS" >> "$INTEGRATION_ENV"
    fi
    
    echo -e "${GREEN}✓ Integration test configuration updated${NC}"
else
    echo -e "${YELLOW}Note: Integration test env file not found at $INTEGRATION_ENV${NC}"
    echo -e "${YELLOW}You may need to create it manually with WBTC_TOKEN_ADDRESS=$TOKEN_ADDRESS${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Next Steps:${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "1. View token on Hashscan:"
echo -e "   ${GREEN}https://hashscan.io/testnet/contract/${TOKEN_ADDRESS}${NC}"
echo ""
echo -e "2. Check your balance:"
echo -e "   ${GREEN}cast call $TOKEN_ADDRESS \"balanceOf(address)\" $DEPLOYER_ADDRESS --rpc-url testnet${NC}"
echo ""
echo -e "3. Mint more tokens if needed:"
echo -e "   ${GREEN}cast send $TOKEN_ADDRESS \"mint(address,uint256)\" $DEPLOYER_ADDRESS 1000000000000000000000 --private-key \$HEDERA_PRIVATE_KEY --rpc-url testnet${NC}"
echo ""
echo -e "4. Run integration tests:"
echo -e "   ${GREEN}cd ../vincent-ability-starter-kit/packages/ability-hedera-htlc && pnpm test:integration${NC}"
echo ""

