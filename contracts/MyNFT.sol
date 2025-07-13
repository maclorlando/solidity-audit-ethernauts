// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MyNFT is ERC721 {
  address private owner;
  uint256 public tokenCounter;
  address private stakingContract;
  string private mdBaseUri;

  constructor(string memory _mdBaseUri) ERC721("Shigga Dev. Reel: Edition 2", "SDR2") {
    owner = msg.sender;
    tokenCounter = 0;
    mdBaseUri = _mdBaseUri;
  }

  function configStakingContract(address _stakingContract) external {
    require(stakingContract == address(0), "Staking contract already configured");
    stakingContract = _stakingContract;
  }

  function mintTo(address to) external returns (uint256) {
    require((msg.sender == stakingContract), "Only the priviledged contract may mint");
    uint256 newItemId = tokenCounter;
    _safeMint(to, newItemId);
    tokenCounter++;
    return newItemId;
  }

  function _baseURI() internal view override returns (string memory) {
    return mdBaseUri;
  }

  function updateBaseURI(string calldata _newURI) external {
    require(msg.sender == owner, "Only the contract owner may update de BaseURI");
    mdBaseUri = _newURI;
  }
}
