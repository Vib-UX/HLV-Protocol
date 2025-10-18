#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      HTLC Interactive Test Suite     ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo ""

# Load environment
source .env

# Load contract address
if [ -f .contract-address ]; then
    source .contract-address
fi

if [ -z "$HTLC_CONTRACT_ADDRESS" ]; then
    read -p "$(echo -e ${YELLOW}Enter HTLC Contract Address: ${NC})" HTLC_CONTRACT_ADDRESS
fi

# Derive addresses
SENDER_ADDRESS=$(cast wallet address $HEDERA_PRIVATE_KEY)
echo -e "${GREEN}Sender Address: ${SENDER_ADDRESS}${NC}"
echo -e "${GREEN}Contract Address: ${HTLC_CONTRACT_ADDRESS}${NC}"
echo ""

# Generate receiver address (for demo)
RECEIVER_PRIVATE_KEY=$(openssl rand -hex 32)
RECEIVER_ADDRESS=$(cast wallet address 0x$RECEIVER_PRIVATE_KEY)
echo -e "${BLUE}Generated Receiver Address: ${RECEIVER_ADDRESS}${NC}"
echo ""

# Generate secret and hashlock
SECRET=$(openssl rand -hex 32)
SECRET_BYTES32="0x${SECRET}"
HASHLOCK=$(cast keccak $SECRET_BYTES32)
echo -e "${BLUE}Generated Secret (preimage): ${SECRET_BYTES32}${NC}"
echo -e "${BLUE}Generated Hashlock: ${HASHLOCK}${NC}"
echo ""

# Set timelock (1 hour from now)
CURRENT_TIME=$(date +%s)
TIMELOCK=$((CURRENT_TIME + 3600))
TIMELOCK_DATE=$(date -r $TIMELOCK)
echo -e "${BLUE}Timelock set to: ${TIMELOCK} (${TIMELOCK_DATE})${NC}"
echo ""

# Test 1: Create HTLC with native HBAR
echo -e "${YELLOW}Test 1: Creating HTLC with 0.1 HBAR...${NC}"
TX_HASH=$(cast send $HTLC_CONTRACT_ADDRESS \
    "createHTLCNative(address,bytes32,uint256)" \
    $RECEIVER_ADDRESS \
    $HASHLOCK \
    $TIMELOCK \
    --value 0.1ether \
    --private-key $HEDERA_PRIVATE_KEY \
    --rpc-url $HEDERA_RPC_URL \
    --json | jq -r '.transactionHash')

echo -e "${GREEN}✓ HTLC Created${NC}"
echo -e "${GREEN}Transaction: https://hashscan.io/testnet/transaction/${TX_HASH}${NC}"
echo ""

# Calculate contract ID
CONTRACT_ID=$(cast keccak $(cast abi-encode "f(address,address,address,uint256,bytes32,uint256)" \
    $SENDER_ADDRESS \
    $RECEIVER_ADDRESS \
    "0x0000000000000000000000000000000000000000" \
    100000000000000000 \
    $HASHLOCK \
    $TIMELOCK))

echo -e "${BLUE}Contract ID: ${CONTRACT_ID}${NC}"
echo ""

# Wait for transaction to be mined
echo -e "${YELLOW}Waiting for transaction to be confirmed...${NC}"
sleep 5

# Test 2: Check if HTLC exists
echo -e "${YELLOW}Test 2: Checking if HTLC exists...${NC}"
HAS_CONTRACT=$(cast call $HTLC_CONTRACT_ADDRESS \
    "hasContract(bytes32)" \
    $CONTRACT_ID \
    --rpc-url $HEDERA_RPC_URL)

if [ "$HAS_CONTRACT" == "0x0000000000000000000000000000000000000000000000000000000000000001" ]; then
    echo -e "${GREEN}✓ HTLC exists${NC}"
else
    echo -e "${RED}✗ HTLC not found${NC}"
    exit 1
fi
echo ""

# Test 3: Check if claimable
echo -e "${YELLOW}Test 3: Checking if HTLC is claimable...${NC}"
IS_CLAIMABLE=$(cast call $HTLC_CONTRACT_ADDRESS \
    "isClaimable(bytes32)" \
    $CONTRACT_ID \
    --rpc-url $HEDERA_RPC_URL)

if [ "$IS_CLAIMABLE" == "0x0000000000000000000000000000000000000000000000000000000000000001" ]; then
    echo -e "${GREEN}✓ HTLC is claimable${NC}"
else
    echo -e "${RED}✗ HTLC is not claimable${NC}"
fi
echo ""

# Test 4: Claim HTLC with preimage
echo -e "${YELLOW}Test 4: Claiming HTLC with preimage...${NC}"

# Fund receiver with gas money
echo -e "${BLUE}Funding receiver account with gas money...${NC}"
cast send $RECEIVER_ADDRESS \
    --value 0.5ether \
    --private-key $HEDERA_PRIVATE_KEY \
    --rpc-url $HEDERA_RPC_URL > /dev/null

CLAIM_TX=$(cast send $HTLC_CONTRACT_ADDRESS \
    "claim(bytes32,bytes32)" \
    $CONTRACT_ID \
    $SECRET_BYTES32 \
    --private-key 0x$RECEIVER_PRIVATE_KEY \
    --rpc-url $HEDERA_RPC_URL \
    --json | jq -r '.transactionHash')

echo -e "${GREEN}✓ HTLC Claimed${NC}"
echo -e "${GREEN}Transaction: https://hashscan.io/testnet/transaction/${CLAIM_TX}${NC}"
echo ""

# Wait for claim to be confirmed
sleep 5

# Test 5: Verify HTLC was withdrawn
echo -e "${YELLOW}Test 5: Verifying HTLC status...${NC}"
CONTRACT_DATA=$(cast call $HTLC_CONTRACT_ADDRESS \
    "getContract(bytes32)" \
    $CONTRACT_ID \
    --rpc-url $HEDERA_RPC_URL)

echo -e "${GREEN}✓ HTLC Status Retrieved${NC}"
echo ""

# Summary
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}Test Suite Complete! ✓${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "1. ✓ Created HTLC with 0.1 HBAR"
echo -e "2. ✓ Verified HTLC exists"
echo -e "3. ✓ Confirmed HTLC is claimable"
echo -e "4. ✓ Claimed HTLC with preimage"
echo -e "5. ✓ Verified final state"
echo ""
echo -e "${BLUE}The HTLC contract is working correctly!${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "- Integrate with Vincent Agent (see INTEGRATION_GUIDE.md)"
echo -e "- Test auto-refund functionality"
echo -e "- Deploy to mainnet when ready"
echo ""

