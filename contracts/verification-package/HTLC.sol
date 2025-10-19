// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HTLC - Hash Time-Locked Contract
 * @notice Enables atomic swaps between HBAR/ERC20 tokens and Lightning Network payments
 * @dev Supports the Vincent flow where agents can automatically submit preimages
 */
contract HTLC is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Contract {
        address sender;
        address receiver;
        address tokenAddress; // address(0) for native HBAR
        uint256 amount;
        bytes32 hashlock;
        uint256 timelock; // Unix timestamp
        bool withdrawn;
        bool refunded;
        bytes32 preimage;
    }

    mapping(bytes32 => Contract) public contracts;

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

    modifier contractExists(bytes32 _contractId) {
        require(hasContract(_contractId), "HTLC: Contract does not exist");
        _;
    }

    modifier hashlockMatches(bytes32 _contractId, bytes32 _preimage) {
        require(
            contracts[_contractId].hashlock == sha256(abi.encodePacked(_preimage)),
            "HTLC: Hashlock does not match"
        );
        _;
    }

    modifier withdrawable(bytes32 _contractId) {
        require(
            !contracts[_contractId].withdrawn,
            "HTLC: Already withdrawn"
        );
        require(
            !contracts[_contractId].refunded,
            "HTLC: Already refunded"
        );
        _;
    }

    modifier refundable(bytes32 _contractId) {
        require(
            !contracts[_contractId].withdrawn,
            "HTLC: Already withdrawn"
        );
        require(
            !contracts[_contractId].refunded,
            "HTLC: Already refunded"
        );
        require(
            block.timestamp > contracts[_contractId].timelock,
            "HTLC: Timelock not yet passed"
        );
        _;
    }

    /**
     * @notice Create a new HTLC for native HBAR
     * @param _receiver Address that can claim the funds with the preimage
     * @param _hashlock SHA256 hash of the secret preimage
     * @param _timelock Unix timestamp after which sender can refund
     * @return contractId Unique identifier for this HTLC
     */
    function createHTLCNative(
        address _receiver,
        bytes32 _hashlock,
        uint256 _timelock
    ) external payable returns (bytes32 contractId) {
        require(msg.value > 0, "HTLC: Amount must be greater than 0");
        require(_timelock > block.timestamp, "HTLC: Timelock must be in the future");
        require(_receiver != address(0), "HTLC: Receiver cannot be zero address");

        contractId = keccak256(
            abi.encodePacked(
                msg.sender,
                _receiver,
                address(0),
                msg.value,
                _hashlock,
                _timelock
            )
        );

        require(!hasContract(contractId), "HTLC: Contract already exists");

        contracts[contractId] = Contract({
            sender: msg.sender,
            receiver: _receiver,
            tokenAddress: address(0),
            amount: msg.value,
            hashlock: _hashlock,
            timelock: _timelock,
            withdrawn: false,
            refunded: false,
            preimage: bytes32(0)
        });

        emit HTLCCreated(
            contractId,
            msg.sender,
            _receiver,
            address(0),
            msg.value,
            _hashlock,
            _timelock
        );
    }

    /**
     * @notice Create a new HTLC for ERC20 tokens
     * @param _receiver Address that can claim the funds with the preimage
     * @param _hashlock SHA256 hash of the secret preimage
     * @param _timelock Unix timestamp after which sender can refund
     * @param _tokenAddress Address of the ERC20 token contract
     * @param _amount Amount of tokens to lock
     * @return contractId Unique identifier for this HTLC
     */
    function createHTLCToken(
        address _receiver,
        bytes32 _hashlock,
        uint256 _timelock,
        address _tokenAddress,
        uint256 _amount
    ) external returns (bytes32 contractId) {
        require(_amount > 0, "HTLC: Amount must be greater than 0");
        require(_timelock > block.timestamp, "HTLC: Timelock must be in the future");
        require(_receiver != address(0), "HTLC: Receiver cannot be zero address");
        require(_tokenAddress != address(0), "HTLC: Token address cannot be zero");

        contractId = keccak256(
            abi.encodePacked(
                msg.sender,
                _receiver,
                _tokenAddress,
                _amount,
                _hashlock,
                _timelock
            )
        );

        require(!hasContract(contractId), "HTLC: Contract already exists");

        contracts[contractId] = Contract({
            sender: msg.sender,
            receiver: _receiver,
            tokenAddress: _tokenAddress,
            amount: _amount,
            hashlock: _hashlock,
            timelock: _timelock,
            withdrawn: false,
            refunded: false,
            preimage: bytes32(0)
        });

        // Transfer tokens from sender to this contract
        IERC20(_tokenAddress).safeTransferFrom(msg.sender, address(this), _amount);

        emit HTLCCreated(
            contractId,
            msg.sender,
            _receiver,
            _tokenAddress,
            _amount,
            _hashlock,
            _timelock
        );
    }

    /**
     * @notice Claim funds by revealing the preimage
     * @dev Can be called by anyone (Vincent agent) on behalf of the receiver
     * @param _contractId The HTLC contract identifier
     * @param _preimage The secret that hashes to the hashlock
     */
    function claim(bytes32 _contractId, bytes32 _preimage)
        external
        nonReentrant
        contractExists(_contractId)
        hashlockMatches(_contractId, _preimage)
        withdrawable(_contractId)
    {
        Contract storage c = contracts[_contractId];
        
        c.withdrawn = true;
        c.preimage = _preimage;

        if (c.tokenAddress == address(0)) {
            // Native HBAR transfer
            (bool success, ) = c.receiver.call{value: c.amount}("");
            require(success, "HTLC: Native transfer failed");
        } else {
            // ERC20 token transfer
            IERC20(c.tokenAddress).safeTransfer(c.receiver, c.amount);
        }

        emit HTLCClaimed(_contractId, c.receiver, _preimage);
    }

    /**
     * @notice Refund locked funds after timelock expires
     * @dev Can be called by anyone (Vincent agent for auto-refund)
     * @param _contractId The HTLC contract identifier
     */
    function refund(bytes32 _contractId)
        external
        nonReentrant
        contractExists(_contractId)
        refundable(_contractId)
    {
        Contract storage c = contracts[_contractId];
        
        c.refunded = true;

        if (c.tokenAddress == address(0)) {
            // Native HBAR transfer
            (bool success, ) = c.sender.call{value: c.amount}("");
            require(success, "HTLC: Native refund failed");
        } else {
            // ERC20 token transfer
            IERC20(c.tokenAddress).safeTransfer(c.sender, c.amount);
        }

        emit HTLCRefunded(_contractId, c.sender);
    }

    /**
     * @notice Check if a contract exists
     * @param _contractId The HTLC contract identifier
     * @return exists True if contract exists
     */
    function hasContract(bytes32 _contractId) public view returns (bool exists) {
        return contracts[_contractId].sender != address(0);
    }

    /**
     * @notice Get contract details
     * @param _contractId The HTLC contract identifier
     * @return Contract struct containing all details
     */
    function getContract(bytes32 _contractId)
        external
        view
        contractExists(_contractId)
        returns (Contract memory)
    {
        return contracts[_contractId];
    }

    /**
     * @notice Check if a contract is refundable (timelock expired)
     * @param _contractId The HTLC contract identifier
     * @return isRefundable True if contract can be refunded
     */
    function isRefundable(bytes32 _contractId)
        external
        view
        contractExists(_contractId)
        returns (bool isRefundable)
    {
        Contract memory c = contracts[_contractId];
        return !c.withdrawn && !c.refunded && block.timestamp > c.timelock;
    }

    /**
     * @notice Check if a contract is claimable (not expired)
     * @param _contractId The HTLC contract identifier
     * @return isClaimable True if contract can be claimed
     */
    function isClaimable(bytes32 _contractId)
        external
        view
        contractExists(_contractId)
        returns (bool isClaimable)
    {
        Contract memory c = contracts[_contractId];
        return !c.withdrawn && !c.refunded && block.timestamp <= c.timelock;
    }
}

