// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {HTLC} from "../src/HTLC.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";

contract HTLCTest is Test {
    HTLC public htlc;
    ERC20Mock public token;

    address public sender;
    address public receiver;
    address public agent;

    bytes32 public secret = bytes32("lightning_payment_secret_123");
    bytes32 public hashlock;

    uint256 public constant LOCK_AMOUNT = 1 ether;
    uint256 public constant TOKEN_AMOUNT = 1000e18;
    uint256 public constant TIMELOCK_DURATION = 1 hours;

    event HTLCCreated(
        bytes32 indexed contractId,
        address indexed sender,
        address indexed receiver,
        address tokenAddress,
        uint256 amount,
        bytes32 hashlock,
        uint256 timelock
    );

    event HTLCClaimed(
        bytes32 indexed contractId,
        address indexed receiver,
        bytes32 preimage
    );

    event HTLCRefunded(
        bytes32 indexed contractId,
        address indexed sender
    );

    function setUp() public {
        htlc = new HTLC();
        token = new ERC20Mock();

        sender = makeAddr("sender");
        receiver = makeAddr("receiver");
        agent = makeAddr("agent");

        hashlock = sha256(abi.encodePacked(secret));

        // Fund accounts
        vm.deal(sender, 10 ether);
        vm.deal(receiver, 1 ether);
        vm.deal(agent, 1 ether);

        // Mint tokens to sender
        token.mint(sender, 10000e18);
    }

    function test_CreateHTLCNative() public {
        uint256 timelock = block.timestamp + TIMELOCK_DURATION;

        vm.prank(sender);
        bytes32 contractId = htlc.createHTLCNative{value: LOCK_AMOUNT}(
            hashlock,
            timelock
        );

        assertTrue(htlc.hasContract(contractId), "Contract should exist");
        
        HTLC.Contract memory c = htlc.getContract(contractId);
        assertEq(c.sender, sender);
        assertEq(c.tokenAddress, address(0));
        assertEq(c.amount, LOCK_AMOUNT);
        assertEq(c.hashlock, hashlock);
        assertEq(c.timelock, timelock);
        assertFalse(c.withdrawn);
        assertFalse(c.refunded);
    }

    function test_CreateHTLCToken() public {
        uint256 timelock = block.timestamp + TIMELOCK_DURATION;

        vm.startPrank(sender);
        
        token.approve(address(htlc), TOKEN_AMOUNT);
        
        bytes32 contractId = htlc.createHTLCToken(
            hashlock,
            timelock,
            address(token),
            TOKEN_AMOUNT
        );

        vm.stopPrank();

        assertTrue(htlc.hasContract(contractId), "Contract should exist");
        
        HTLC.Contract memory c = htlc.getContract(contractId);
        assertEq(c.sender, sender);
        assertEq(c.tokenAddress, address(token));
        assertEq(c.amount, TOKEN_AMOUNT);
        assertEq(token.balanceOf(address(htlc)), TOKEN_AMOUNT);
    }

    function test_ClaimHTLCNative() public {
        uint256 timelock = block.timestamp + TIMELOCK_DURATION;

        vm.prank(sender);
        bytes32 contractId = htlc.createHTLCNative{value: LOCK_AMOUNT}(
            hashlock,
            timelock
        );

        uint256 agentBalanceBefore = agent.balance;

        // Agent (liquidity provider) claims with preimage
        vm.prank(agent);
        htlc.claim(contractId, secret);

        uint256 agentBalanceAfter = agent.balance;

        // Agent receives the funds (not sender)
        assertEq(agentBalanceAfter - agentBalanceBefore, LOCK_AMOUNT);
        
        HTLC.Contract memory c = htlc.getContract(contractId);
        assertTrue(c.withdrawn);
        assertEq(c.preimage, secret);
    }

    function test_ClaimHTLCToken() public {
        uint256 timelock = block.timestamp + TIMELOCK_DURATION;

        vm.startPrank(sender);
        token.approve(address(htlc), TOKEN_AMOUNT);
        bytes32 contractId = htlc.createHTLCToken(
            hashlock,
            timelock,
            address(token),
            TOKEN_AMOUNT
        );
        vm.stopPrank();

        uint256 agentBalanceBefore = token.balanceOf(agent);

        // Agent (liquidity provider) claims with preimage
        vm.prank(agent);
        htlc.claim(contractId, secret);

        uint256 agentBalanceAfter = token.balanceOf(agent);

        // Agent receives the tokens
        assertEq(agentBalanceAfter - agentBalanceBefore, TOKEN_AMOUNT);
        
        HTLC.Contract memory c = htlc.getContract(contractId);
        assertTrue(c.withdrawn);
        assertEq(c.preimage, secret);
    }

    function test_RefundHTLCNativeAfterExpiry() public {
        uint256 timelock = block.timestamp + TIMELOCK_DURATION;

        vm.prank(sender);
        bytes32 contractId = htlc.createHTLCNative{value: LOCK_AMOUNT}(
            hashlock,
            timelock
        );

        // Fast forward past timelock
        vm.warp(timelock + 1);

        uint256 senderBalanceBefore = sender.balance;

        // Agent auto-refunds expired HTLC
        vm.prank(agent);
        htlc.refund(contractId);

        uint256 senderBalanceAfter = sender.balance;

        assertEq(senderBalanceAfter - senderBalanceBefore, LOCK_AMOUNT);
        
        HTLC.Contract memory c = htlc.getContract(contractId);
        assertTrue(c.refunded);
    }

    function test_RefundHTLCTokenAfterExpiry() public {
        uint256 timelock = block.timestamp + TIMELOCK_DURATION;

        vm.startPrank(sender);
        token.approve(address(htlc), TOKEN_AMOUNT);
        bytes32 contractId = htlc.createHTLCToken(
            hashlock,
            timelock,
            address(token),
            TOKEN_AMOUNT
        );
        vm.stopPrank();

        // Fast forward past timelock
        vm.warp(timelock + 1);

        uint256 senderBalanceBefore = token.balanceOf(sender);

        // Agent auto-refunds expired HTLC
        vm.prank(agent);
        htlc.refund(contractId);

        uint256 senderBalanceAfter = token.balanceOf(sender);

        assertEq(senderBalanceAfter - senderBalanceBefore, TOKEN_AMOUNT);
        
        HTLC.Contract memory c = htlc.getContract(contractId);
        assertTrue(c.refunded);
    }

    function test_RevertClaimWithWrongPreimage() public {
        uint256 timelock = block.timestamp + TIMELOCK_DURATION;

        vm.prank(sender);
        bytes32 contractId = htlc.createHTLCNative{value: LOCK_AMOUNT}(
            hashlock,
            timelock
        );

        bytes32 wrongSecret = bytes32("wrong_secret");

        vm.prank(agent);
        vm.expectRevert("HTLC: Hashlock does not match");
        htlc.claim(contractId, wrongSecret);
    }

    function test_RevertClaimBySender() public {
        uint256 timelock = block.timestamp + TIMELOCK_DURATION;

        vm.prank(sender);
        bytes32 contractId = htlc.createHTLCNative{value: LOCK_AMOUNT}(
            hashlock,
            timelock
        );

        // SECURITY TEST: Sender cannot claim their own HTLC
        vm.prank(sender);
        vm.expectRevert("HTLC: Sender cannot claim own HTLC");
        htlc.claim(contractId, secret);

        // But others (agent) CAN claim with valid preimage
        vm.prank(agent);
        htlc.claim(contractId, secret);

        HTLC.Contract memory c = htlc.getContract(contractId);
        assertTrue(c.withdrawn);
    }

    function test_RevertRefundBeforeExpiry() public {
        uint256 timelock = block.timestamp + TIMELOCK_DURATION;

        vm.prank(sender);
        bytes32 contractId = htlc.createHTLCNative{value: LOCK_AMOUNT}(
            hashlock,
            timelock
        );

        vm.prank(agent);
        vm.expectRevert("HTLC: Timelock not yet passed");
        htlc.refund(contractId);
    }

    function test_RevertClaimAfterRefund() public {
        uint256 timelock = block.timestamp + TIMELOCK_DURATION;

        vm.prank(sender);
        bytes32 contractId = htlc.createHTLCNative{value: LOCK_AMOUNT}(
            hashlock,
            timelock
        );

        // Fast forward past timelock
        vm.warp(timelock + 1);

        // Refund first
        vm.prank(agent);
        htlc.refund(contractId);

        // Try to claim after refund
        vm.prank(agent);
        vm.expectRevert("HTLC: Already refunded");
        htlc.claim(contractId, secret);
    }

    function test_RevertRefundAfterClaim() public {
        uint256 timelock = block.timestamp + TIMELOCK_DURATION;

        vm.prank(sender);
        bytes32 contractId = htlc.createHTLCNative{value: LOCK_AMOUNT}(
            hashlock,
            timelock
        );

        // Claim first (agent claims)
        vm.prank(agent);
        htlc.claim(contractId, secret);

        // Fast forward past timelock
        vm.warp(timelock + 1);

        // Try to refund after claim
        vm.prank(agent);
        vm.expectRevert("HTLC: Already withdrawn");
        htlc.refund(contractId);
    }

    function test_IsRefundable() public {
        uint256 timelock = block.timestamp + TIMELOCK_DURATION;

        vm.prank(sender);
        bytes32 contractId = htlc.createHTLCNative{value: LOCK_AMOUNT}(
            hashlock,
            timelock
        );

        assertFalse(htlc.isRefundable(contractId), "Should not be refundable yet");

        // Fast forward past timelock
        vm.warp(timelock + 1);

        assertTrue(htlc.isRefundable(contractId), "Should be refundable now");
    }

    function test_IsClaimable() public {
        uint256 timelock = block.timestamp + TIMELOCK_DURATION;

        vm.prank(sender);
        bytes32 contractId = htlc.createHTLCNative{value: LOCK_AMOUNT}(
            hashlock,
            timelock
        );

        assertTrue(htlc.isClaimable(contractId), "Should be claimable");

        // Fast forward past timelock
        vm.warp(timelock + 1);

        assertFalse(htlc.isClaimable(contractId), "Should not be claimable after expiry");
    }

    function test_MultipleHTLCs() public {
        uint256 timelock1 = block.timestamp + TIMELOCK_DURATION;
        uint256 timelock2 = block.timestamp + TIMELOCK_DURATION + 1 hours;

        vm.startPrank(sender);
        
        bytes32 contractId1 = htlc.createHTLCNative{value: LOCK_AMOUNT}(
            hashlock,
            timelock1
        );

        bytes32 secret2 = bytes32("second_secret");
        bytes32 hashlock2 = sha256(abi.encodePacked(secret2));

        bytes32 contractId2 = htlc.createHTLCNative{value: LOCK_AMOUNT}(
            hashlock2,
            timelock2
        );

        vm.stopPrank();

        assertTrue(htlc.hasContract(contractId1));
        assertTrue(htlc.hasContract(contractId2));
        assertTrue(contractId1 != contractId2);
    }
}

