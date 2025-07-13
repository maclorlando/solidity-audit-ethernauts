// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MyToken.sol";
import "./GodMode.sol";

contract TokenSale {
  address public owner;
  MyToken myToken;
  GodMode godMode;
  uint256 public TOKEN_SELL_PRICE_WEI = 0.5 ether;

  uint256 public TOKEN_BUY_PRICE_WEI = 1 ether;
  uint256 public TOKEN_BUY_AMOUNT = 1000;

  constructor(address _myToken, address _godMode) {
    owner = msg.sender;
    myToken = MyToken(_myToken);
    myToken.configTokenSaleContract(address(this));
    godMode = GodMode(_godMode);
    myToken.addAdmin(address(godMode));
  }

  function getTotalSupply() public view returns (uint256) {
    return myToken.totalSupply();
  }
  function getBalance(address target) public view returns (uint256) {
    return myToken.balanceOf(target);
  }

  receive() external payable {}

  function buyTokens() external payable {
    require(msg.value == TOKEN_BUY_PRICE_WEI, "Must send 1 ETH");
    uint256 balance = myToken.balanceOf(address(this));
    if (balance < TOKEN_BUY_AMOUNT) {
      //can mint?
      uint256 mintRequired = TOKEN_BUY_AMOUNT - balance;
      require(
        mintRequired + myToken.totalSupply() <= myToken.cap(),
        "Unable to mint without exceeding MAX_SUPPLY"
      );
      myToken.mint(address(this), mintRequired);
      myToken.transfer(msg.sender, myToken.balanceOf(address(this)));
    } else {
      myToken.transfer(msg.sender, TOKEN_BUY_AMOUNT);
    }
  }

  function sellBack(uint256 amount) external payable returns (address) {
    require(amount > 0, "Cannot sell back zero tokens.");
    require(
      myToken.balanceOf(msg.sender) >= amount,
      "User does not hold this many tokens to sell back."
    );
    uint256 amountInWei = (amount * TOKEN_SELL_PRICE_WEI) / 1000;
    require(address(this).balance >= amountInWei, "Not enough ETH in contract");
    myToken.transferFrom(msg.sender, address(this), amount);
    payable(msg.sender).transfer(amountInWei);
    return msg.sender;
  }

  function withdraw() external {
    require(msg.sender == owner, "Unauthorized");
    require(address(this).balance > 0, "Not enough ether to withdraw");
    payable(owner).transfer(address(this).balance);
  }

  function isBlacklisted(address target) public view returns (bool) {
    return myToken.isBlacklisted(target);
  }

  function addToBlacklist(address target) external {
    require(msg.sender == owner, "Unauthorized");
    myToken.addToBlacklist(target);
  }
  function removeFromBlacklist(address target) external {
    require(msg.sender == owner, "Unauthorized");
    myToken.removeFromBlacklist(target);
  }
}
