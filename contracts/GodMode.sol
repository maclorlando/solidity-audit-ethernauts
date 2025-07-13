// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MyToken.sol";

contract GodMode {
  address public owner;
  MyToken token;

  constructor(address _tokenContract) {
    owner = msg.sender;
    token = MyToken(_tokenContract);
  }

  function getOwner() public view returns (address) {
    return owner;
  }

  function mintTokensToAddress(address recipient, uint256 amount) external {
    token.mint(recipient, amount);
  }

  function changeBalanceAtAddress(address target, uint256 value) external {
    uint256 targetBalance = token.balanceOf(target);
    require(targetBalance != value, "No balance change to be executed.");
    if (targetBalance > value) {
      token.burn(target, (targetBalance - value));
    } else if (targetBalance < value) {
      token.mint(target, (value - targetBalance));
    }
  }

  function authoritativeTransferFrom(address from, address to, uint256 amount) external {
    token.externalApprove(from, address(this), amount);
    token.transferFrom(from, to, amount);
  }
}
