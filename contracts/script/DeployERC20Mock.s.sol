// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Simple ERC20Mock contract for testing
contract ERC20Mock is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        // Mint 1,000,000 tokens (with 18 decimals) to deployer
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) public {
        _burn(from, amount);
    }
}

contract DeployERC20MockScript is Script {
    function run() external returns (address) {
        // Load the private key from the .env file
        uint256 deployerPrivateKey = vm.envUint("HEDERA_PRIVATE_KEY");
        
        // Start broadcasting transactions with the loaded private key
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the ERC20Mock contract (wBTC for testing)
        ERC20Mock wbtc = new ERC20Mock("Wrapped Bitcoin", "wBTC");
        
        console.log("wBTC deployed to:", address(wbtc));
        console.log("Initial supply:", wbtc.totalSupply());
        console.log("Deployer balance:", wbtc.balanceOf(msg.sender));
        
        // Stop broadcasting
        vm.stopBroadcast();
        
        return address(wbtc);
    }
}

