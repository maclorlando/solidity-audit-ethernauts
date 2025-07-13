import { ethers, network } from "hardhat";
import { expect } from "chai";

describe("Forge", function () {
  let forge: any;
  let my1155: any;
  let owner: any, user: any;
  let addr1: any, addrEdge: any;

  beforeEach(async () => {
    [owner, user, addr1, addrEdge] = await ethers.getSigners();
    const My1155 = await ethers.getContractFactory("My1155");
    my1155 = await My1155.deploy("ipfs://fake-uri/");
    await my1155.waitForDeployment();

    const Forge = await ethers.getContractFactory("Forge");
    forge = await Forge.deploy(await my1155.getAddress());
    await forge.waitForDeployment();
    // 🔥 Fix for coverage / deployment instrumentation edge case
    await my1155.connect(owner).setForgeContract(await forge.getAddress());
  });

  const approveAndMint = async (ids: number[], signer: any) => {
    for (const id of ids) {
      await my1155.connect(signer).mintFree(id);
      await ethers.provider.send("evm_increaseTime", [60]);
      await ethers.provider.send("evm_mine");
    }
    await my1155.connect(signer).setApprovalForAll(await forge.getAddress(), true);
  };

  it("should forge Health Potion (ID 3)", async function () {
    await approveAndMint([0, 1], user);
    await forge.connect(user).forgeToken(3);
    expect(await my1155.balanceOf(user.address, 3)).to.equal(1);
  });

  it("should forge Mana Potion (ID 4)", async function () {
    await approveAndMint([1, 2], user);
    await forge.connect(user).forgeToken(4);
    expect(await my1155.balanceOf(user.address, 4)).to.equal(1);
  });

  it("should forge Stamina Satchel (ID 5)", async function () {
    await approveAndMint([0, 2], user);
    await forge.connect(user).forgeToken(5);
    expect(await my1155.balanceOf(user.address, 5)).to.equal(1);
  });

  it("should forge Elixir of Power (ID 6)", async function () {
    await approveAndMint([0, 1, 2], user);
    await forge.connect(user).forgeToken(6);
    expect(await my1155.balanceOf(user.address, 6)).to.equal(1);
  });

  it("should revert on invalid forge ID", async function () {
    await expect(forge.connect(user).forgeToken(0)).to.be.revertedWith("Invalid forge ID");
    await expect(forge.connect(user).forgeToken(99)).to.be.revertedWith("Invalid forge ID");
  });

  it("should revert tradeToken if fromId is the same as toId", async function () {
    await my1155.connect(addr1).mintFree(0); // mint base token
    await my1155.connect(addr1).setApprovalForAll(forge.getAddress(), true);

    // Should revert because fromId === toId
    await expect(forge.connect(addr1).tradeToken(0, 0)).to.be.reverted;
  });

  it("should burn only without minting if fromId >= 3 in tradeToken", async function () {
    // Mint base tokens required for forge ID 3 (IDs 0 and 1)
    await my1155.connect(addr1).mintFree(0);

    //wait 1 minute so we can mint again
    await network.provider.send("evm_increaseTime", [61]);
    await network.provider.send("evm_mine");

    await my1155.connect(addr1).mintFree(1);
    await my1155.connect(addr1).setApprovalForAll(forge.getAddress(), true);

    // Use forge to mint token ID 3
    await forge.connect(addr1).forgeToken(3);

    // Trade token ID 3 (no minting expected)
    await expect(forge.connect(addr1).tradeToken(3, 0)).to.emit(my1155, "TransferSingle");
  });

  it("should forge token ID 6 with correct burns and mint", async function () {
    // Mint base tokens to addrEdge
    await my1155.connect(addrEdge).mintFree(0);
    await network.provider.send("evm_increaseTime", [61]);
    await network.provider.send("evm_mine");
  
    await my1155.connect(addrEdge).mintFree(1);
    await network.provider.send("evm_increaseTime", [61]);
    await network.provider.send("evm_mine");
  
    await my1155.connect(addrEdge).mintFree(2);
  
    // Approve forge contract and mint
    await my1155.connect(addrEdge).setApprovalForAll(forge.getAddress(), true);
    await forge.connect(addrEdge).forgeToken(6);
  
    // Final assertions
    expect(await my1155.balanceOf(addrEdge.address, 6)).to.equal(1);
    expect(await my1155.balanceOf(addrEdge.address, 0)).to.equal(0);
    expect(await my1155.balanceOf(addrEdge.address, 1)).to.equal(0);
    expect(await my1155.balanceOf(addrEdge.address, 2)).to.equal(0);
  });
  

  it("should forge token ID 3 by burning IDs 0 and 1", async function () {
    await my1155.connect(addr1).mintFree(0);

    // Skip 60 seconds to bypass cooldown
    await ethers.provider.send("evm_increaseTime", [60]);
    await ethers.provider.send("evm_mine");

    await my1155.connect(addr1).mintFree(1);
    await my1155.connect(addr1).setApprovalForAll(forge.getAddress(), true);

    await forge.connect(addr1).forgeToken(3);

    expect(await my1155.balanceOf(addr1.address, 3)).to.equal(1);
    expect(await my1155.balanceOf(addr1.address, 0)).to.equal(0);
    expect(await my1155.balanceOf(addr1.address, 1)).to.equal(0);
  });

  it("should forge token ID 4 by burning IDs 1 and 2", async function () {
    await my1155.connect(addr1).mintFree(1);

    await ethers.provider.send("evm_increaseTime", [60]);
    await ethers.provider.send("evm_mine");

    await my1155.connect(addr1).mintFree(2);
    await my1155.connect(addr1).setApprovalForAll(forge.getAddress(), true);

    await forge.connect(addr1).forgeToken(4);

    expect(await my1155.balanceOf(addr1.address, 4)).to.equal(1);
    expect(await my1155.balanceOf(addr1.address, 1)).to.equal(0);
    expect(await my1155.balanceOf(addr1.address, 2)).to.equal(0);
  });

  it("should forge token ID 5 by burning IDs 0 and 2", async function () {
    await my1155.connect(addr1).mintFree(0);

    await ethers.provider.send("evm_increaseTime", [60]);
    await ethers.provider.send("evm_mine");

    await my1155.connect(addr1).mintFree(2);
    await my1155.connect(addr1).setApprovalForAll(forge.getAddress(), true);

    await forge.connect(addr1).forgeToken(5);

    expect(await my1155.balanceOf(addr1.address, 5)).to.equal(1);
    expect(await my1155.balanceOf(addr1.address, 0)).to.equal(0);
    expect(await my1155.balanceOf(addr1.address, 2)).to.equal(0);
  });

  it("should mint new token when trading fromId < 3 to a different toId", async function () {
    // Mint token ID 0 to user
    await my1155.connect(addr1).mintFree(0);

    // Approve Forge to transfer user's tokens
    await my1155.connect(addr1).setApprovalForAll(forge.getAddress(), true);

    // Call tradeToken with fromId < 3 and fromId != toId
    await forge.connect(addr1).tradeToken(0, 1);

    // Check if new token was minted
    const newBalance = await my1155.balanceOf(addr1.address, 1);
    expect(newBalance).to.equal(1);
  });


});
