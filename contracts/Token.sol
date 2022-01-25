// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {

    constructor(string memory _name, string memory _symbol, uint256 totalSupply) ERC20(_name, _symbol) {
        _mint(msg.sender, totalSupply * (10 ** uint256(decimals())));
    }
    
}
