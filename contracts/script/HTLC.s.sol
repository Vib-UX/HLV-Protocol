// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {HTLC} from "../src/HTLC.sol";

contract HTLCScript is Script {
    function run() external returns (address) {
        // Load the private key from the .env file
        uint256 deployerPrivateKey = vm.envUint("HEDERA_PRIVATE_KEY");
        
        // Start broadcasting transactions with the loaded private key
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the HTLC contract
        HTLC htlc = new HTLC();
        
        // Stop broadcasting
        vm.stopBroadcast();
        
        console.log("HTLC deployed to:", address(htlc));
        return address(htlc);
    }
}

