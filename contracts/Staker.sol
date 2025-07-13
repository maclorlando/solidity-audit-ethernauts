// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "./MyToken2.sol";
import "./MyNFT.sol";

contract Staker is ERC721Holder {
  address private owner;
  MyToken private myToken;
  MyNFT private myNFT;
  struct StakeInfo {
    address owner;
    uint256 timestamp;
  }
  mapping(uint256 => StakeInfo) public stakedNFTs;
  uint256 private REWARD_RATE = 10; // 10 tokens per 24h
  uint256 private NFT_PRICE_IN_TOKENS = 10; //10 tokens per NFT

  constructor(address _myToken, address _myNFT) {
    owner = msg.sender;
    myToken = MyToken(_myToken);
    myNFT = MyNFT(_myNFT);
    myToken.configMintingContract(address(this));
    myNFT.configStakingContract(address(this));
  }

  function stake(uint256 tokenId) external {
    myNFT.transferFrom(msg.sender, address(this), tokenId);
    stakedNFTs[tokenId] = StakeInfo({owner: msg.sender, timestamp: block.timestamp});
  }

  function claim(uint256 tokenId) external {
    StakeInfo storage info = stakedNFTs[tokenId];
    require(info.owner != address(0), "Token is not staked");
    require(
      (info.owner == msg.sender || msg.sender == address(this)),
      "Not owner or managing contract"
    );

    uint256 stakedTime = block.timestamp - info.timestamp;
    require(stakedTime >= 1 days, "Claim available every 24h");

    uint256 daysPassed = stakedTime / 1 days;
    uint256 rewardAmount = REWARD_RATE * daysPassed;

    myToken.mint(msg.sender, rewardAmount);
    info.timestamp = block.timestamp; // Reset timer
  }

  function unstake(uint256 tokenId) external {
    StakeInfo storage info = stakedNFTs[tokenId];
    require(info.owner != address(0), "Token is not staked");
    require(info.owner == msg.sender, "Access denied - Not original owner");

    //force a final reward claim if the timer allows it?
    if (block.timestamp - info.timestamp >= 1 days) {
      this.claim(tokenId);
    }
    delete stakedNFTs[tokenId];
    myNFT.transferFrom(address(this), msg.sender, tokenId);
  }

  // Admin mint access
  function mintNFT(address to) external {
    require(msg.sender == owner, "Only the owner contract may mint");
    MyNFT(address(myNFT)).mintTo(to);
  }

  function mintReward(address to, uint256 amount) external {
    require(msg.sender == owner, "Only the owner contract may mint");
    myToken.mint(to, amount);
  }

  function buyNFTWithTokens() external {
    //Transfer 10 tokens from user to this contract
    require(myToken.transferFrom(msg.sender, address(this), NFT_PRICE_IN_TOKENS), "Payment failed");
    //Mint NFT to this contract
    uint256 tokenId = myNFT.mintTo(address(this));
    //Transfer NFT to user
    myNFT.safeTransferFrom(address(this), msg.sender, tokenId);
    //burn received ERC20 tokens
    myToken.burn(address(this), NFT_PRICE_IN_TOKENS);
  }
}
