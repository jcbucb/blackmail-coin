// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AccountabilityPact} from "../src/AccountabilityPact.sol";

contract Deploy is Script {
    // USDC on Base mainnet
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    // USDC on Base Sepolia (testnet)
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external {
        address usdcAddress = block.chainid == 8453 ? USDC_BASE : USDC_BASE_SEPOLIA;
        address oracleAddress = vm.envAddress("ORACLE_ADDRESS");

        console.log("Chain ID:", block.chainid);
        console.log("USDC:", usdcAddress);
        console.log("Oracle:", oracleAddress);

        vm.startBroadcast();

        AccountabilityPact contractInstance = new AccountabilityPact(usdcAddress, oracleAddress);

        console.log("AccountabilityPact deployed at:", address(contractInstance));

        vm.stopBroadcast();
    }
}
