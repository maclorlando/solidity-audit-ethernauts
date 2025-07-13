// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract My1155 is ERC1155, Ownable {
  using Strings for uint256;

  uint256 public constant TOKEN_0 = 0;
  uint256 public constant TOKEN_1 = 1;
  uint256 public constant TOKEN_2 = 2;
  uint256 public constant TOKEN_3 = 3;
  uint256 public constant TOKEN_4 = 4;
  uint256 public constant TOKEN_5 = 5;
  uint256 public constant TOKEN_6 = 6;
  uint256 public FREE_MINT_COOLDOWN_SECS = 60;

  string public mdBaseUri;
  mapping(address => uint256) public lastMintTime;
  address public forgeContract;

  constructor(string memory _baseUri) ERC1155("") Ownable(msg.sender) {
    mdBaseUri = _baseUri;
  }

  function setBaseUri(string memory _baseUri) external onlyOwner {
    mdBaseUri = _baseUri;
  }

  function uri(uint256 id) public view override returns (string memory) {
    return string(abi.encodePacked(mdBaseUri, id.toString(), ".json"));
  }

  function setForgeContract(address _forge) external onlyOwner {
    require(forgeContract == address(0), "Forge already set");
    forgeContract = _forge;
  }

  function mintFree(uint256 id) external {
    require(id >= 0 && id <= 2, "Invalid token ID");
    require(
      block.timestamp >= lastMintTime[msg.sender] + FREE_MINT_COOLDOWN_SECS,
      "Cooldown: Wait 1 min"
    );

    lastMintTime[msg.sender] = block.timestamp;
    _mint(msg.sender, id, 1, "");
  }

  function forgeMint(address to, uint256 id, uint256 amount) external {
    require(msg.sender == forgeContract, "Only forge contract");
    require(id >= 0 && id <= 6, "Invalid token ID");
    _mint(to, id, amount, "");
  }

  function burn(address from, uint256 id, uint256 amount) external {
    require(msg.sender == from || isApprovedForAll(from, msg.sender), "Not authorized");
    _burn(from, id, amount);
  }
}
