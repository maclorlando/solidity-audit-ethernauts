// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

contract CoinFlip {
    uint256 public consecutiveWins;
    uint256 lastHash;
    uint256 FACTOR = 57896044618658097711785492504343953926634992332820282019728792003956564819968;

    event FlipResult(uint256 blockValue, bool actualSide, bool playerGuess, bool success, uint256 newWins);


    constructor() {
        consecutiveWins = 0;
    }

    function flip(bool _guess) public returns (bool) {
    uint256 blockValue = uint256(blockhash(block.number - 1));

    if (lastHash == blockValue) {
        revert();
    }

    lastHash = blockValue;
    uint256 coinFlip = blockValue / FACTOR;
    bool side = coinFlip == 1;

    bool success;
    if (side == _guess) {
        consecutiveWins++;
        success = true;
    } else {
        consecutiveWins = 0;
        success = false;
    }

    emit FlipResult(blockValue, side, _guess, success, consecutiveWins);
    return success;
}

}