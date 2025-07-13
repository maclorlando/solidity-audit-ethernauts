// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
  address private owner;
  address private mintingContract;

  constructor() ERC20("MyToken", "MTK") {
    owner = msg.sender;
  }

  function mint(address to, uint256 amount) external {
    require(
      (msg.sender == owner || msg.sender == mintingContract),
      "Only the deployer or priviledged contract may mint"
    );
    _mint(to, amount);
  }

  function configMintingContract(address _mintingContract) external {
    require(mintingContract == address(0), "Minting contract already configured");
    mintingContract = _mintingContract;
  }

  function burn(address account, uint256 amount) external {
    require(
      msg.sender == owner || msg.sender == mintingContract,
      "Only the deployer or priviledged contract may burn"
    );
    _burn(account, amount);
  }
}
