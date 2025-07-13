// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./My1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Forge is Ownable {
  My1155 public my1155;

  constructor(address _my1155) Ownable(msg.sender) {
    my1155 = My1155(_my1155);
  }

  function forgeToken(uint256 targetId) external {
    require(targetId >= 3 && targetId <= 6, "Invalid forge ID");

    if (targetId == 3) {
        // Health Potion = Red Herb + Mysterious Solution
        my1155.burn(msg.sender, 0, 1);
        my1155.burn(msg.sender, 1, 1);
    } else if (targetId == 4) {
        // Mana Potion = Mysterious Solution + Magic Dust
        my1155.burn(msg.sender, 1, 1);
        my1155.burn(msg.sender, 2, 1);
    } else if (targetId == 5) {
        // Stamina Satchel = Red Herb + Magic Dust
        my1155.burn(msg.sender, 0, 1);
        my1155.burn(msg.sender, 2, 1);
    } else {
        // Elixir of Power (ID 6) = Red Herb + Mysterious Solution + Magic Dust
        my1155.burn(msg.sender, 0, 1);
        my1155.burn(msg.sender, 1, 1);
        my1155.burn(msg.sender, 2, 1);
    }

    my1155.forgeMint(msg.sender, targetId, 1);
}

  function tradeToken(uint256 fromId, uint256 toId) external {
    require(fromId != toId);
    my1155.burn(msg.sender, fromId, 1);
    if (fromId < 3) {
      my1155.forgeMint(msg.sender, toId, 1);
    }
  }
}
