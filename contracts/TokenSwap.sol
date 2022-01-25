// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenSwap {

    address payable owner;

    IERC20 public rumbleToken;
    uint256 public rumblePrice;

    IERC20 public fishToken;
    uint256 public fishPrice;

    constructor(IERC20 token1, uint256 price1, IERC20 token2, uint256 price2) {
        owner = payable(msg.sender);
        rumbleToken = IERC20(token1);
        fishToken = IERC20(token2);
        rumblePrice = price1;
        fishPrice = price2;
    }

    function updatePrice(IERC20 token, uint256 newPrice) public {
        require(msg.sender == owner, "Only owner can update the price");
        require(token == rumbleToken || token == fishToken, "Deposited token not identified by the contract");
        if (token == rumbleToken) {
            rumblePrice = newPrice;
        } else {
            fishPrice = newPrice;
        }
    }

    function deposit(IERC20 token, uint256 amount) public {
        require(msg.sender == owner, "Only owner can deposit tokens");
        require(token == rumbleToken || token == fishToken, "Deposited token not identified by the contract");
        require(
            token.allowance(owner, address(this)) >= amount,
            "Token allowance too low"
        );
        IERC20(token).transferFrom(owner, address(this), amount);
    }
    
    function exchange(IERC20 token, uint256 amount) external {
        require(token == rumbleToken || token == fishToken, "Deposited token not identified by the contract");
        require(
            token.allowance(msg.sender, address(this)) >= amount,
            "Token allowance too low"
        );
        if (token == rumbleToken) {
            IERC20(rumbleToken).transferFrom(msg.sender, address(this), amount);

            uint256 receivedValue = amount * rumblePrice;
            uint256 exchangeRate = receivedValue / fishPrice;
            require(IERC20(fishToken).balanceOf(address(this)) >= exchangeRate, "Not enough liquidity to perform the swap");
            IERC20(fishToken).transfer(msg.sender, exchangeRate);
        } else {
            IERC20(fishToken).transferFrom(msg.sender, address(this), amount);

            uint256 receivedValue = amount * fishPrice;
            uint256 exchangeRate = receivedValue / rumblePrice;
            require(IERC20(rumbleToken).balanceOf(address(this)) >= exchangeRate, "Not enough liquidity to perform the swap");
            IERC20(rumbleToken).transfer(msg.sender, exchangeRate);
        }
    }
}