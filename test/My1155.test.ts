import { ethers, network } from "hardhat";
import { expect } from "chai";

describe("My1155", function () {
  let my1155: any;
  let owner: any, user: any;
  let addr1: any, addr2: any;

  beforeEach(async () => {
    [owner, user, addr1, addr2] = await ethers.getSigners();
    const My1155 = await ethers.getContractFactory("My1155");
    my1155 = await My1155.deploy("ipfs://fake-uri/");
    await my1155.waitForDeployment();
  });

  it("should mint free tokens with cooldown", async function () {
    await my1155.connect(user).mintFree(0);
    expect(await my1155.balanceOf(user.address, 0)).to.equal(1);

    await expect(my1155.connect(user).mintFree(0)).to.be.revertedWith("Cooldown: Wait 1 min");

    await ethers.provider.send("evm_increaseTime", [60]);
    await ethers.provider.send("evm_mine");

    await my1155.connect(user).mintFree(0);
    expect(await my1155.balanceOf(user.address, 0)).to.equal(2);
  });

  it("should allow forge contract to mint via forgeMint", async function () {
    await my1155.setForgeContract(owner.address);
    await my1155.connect(owner).forgeMint(user.address, 3, 1);
    expect(await my1155.balanceOf(user.address, 3)).to.equal(1);
  });

  it("should reject forgeMint from non-forge contract", async function () {
    await expect(my1155.connect(user).forgeMint(user.address, 3, 1)).to.be.revertedWith("Only forge contract");
  });

  it("should allow forge contract to burn tokens", async function () {
    const My1155 = await ethers.getContractFactory("My1155");
    const my1155 = await My1155.deploy("ipfs://fake-uri/");
    await my1155.waitForDeployment();
  
    const Forge = await ethers.getContractFactory("Forge");
    const forge = await Forge.deploy(await my1155.getAddress());
    await forge.waitForDeployment();
  
    // 🔥 Set the forge contract in My1155 explicitly
    await my1155.setForgeContract(await forge.getAddress());
  
    await my1155.connect(user).mintFree(0);
    await my1155.connect(user).setApprovalForAll(await forge.getAddress(), true);
  
    await forge.connect(user).tradeToken(0, 1); // triggers burn and forgeMint
  
    expect(await my1155.balanceOf(user.address, 0)).to.equal(0);
  });
  

  it("should allow user to burn their own tokens directly", async function () {
    await my1155.connect(user).mintFree(0);
    await my1155.connect(user).burn(user.address, 0, 1);
    expect(await my1155.balanceOf(user.address, 0)).to.equal(0);
  });
  
  

  it("should reject burn from non-forge contract", async function () {
    await expect(my1155.connect(user).burn(user.address, 0, 1)).to.be.reverted;
  });

  it("should return correct uri for token ID", async function () {
    expect(await my1155.uri(0)).to.equal("ipfs://fake-uri/0.json");
  });

  it("should return correct URI even for high ID", async function () {
    expect(await my1155.uri(99)).to.equal("ipfs://fake-uri/99.json");
  });


  it("should revert if forgeContract is already set", async function () {
    await my1155.connect(owner).setForgeContract(addr1.address);
    await expect(
      my1155.connect(owner).setForgeContract(addr2.address)
    ).to.be.revertedWith("Forge already set");
  });

  it("should allow the owner to set base URI", async function () {
    await expect(my1155.connect(owner).setBaseUri("ipfs://new-base-uri/")).to.not.be.reverted;
  });

  it("should revert setBaseUri if called by non-owner", async function () {
    await expect(my1155.connect(user).setBaseUri("ipfs://fake/"))
      .to.be.revertedWithCustomError(my1155, "OwnableUnauthorizedAccount")
      .withArgs(user.address);
  });

  it("should allow mintFree exactly after cooldown time passes", async function () {
    await my1155.connect(user).mintFree(0);
  
    // Advance time by exactly 60 seconds (cooldown)
    await network.provider.send("evm_increaseTime", [60]);
    await network.provider.send("evm_mine");
  
    await expect(my1155.connect(user).mintFree(1)).to.not.be.reverted;
  });

  it("should correctly mint the specified amount and token ID via forgeMint", async function () {
    await my1155.setForgeContract(owner.address);
    
    const to = user.address;
    const tokenId = 3;
    const amount = 5;
  
    await my1155.forgeMint(to, tokenId, amount);
  
    const balance = await my1155.balanceOf(to, tokenId);
    expect(balance).to.equal(amount);
  });

  it("should revert mintFree with invalid token ID", async function () {
    await expect(my1155.connect(user).mintFree(3)).to.be.revertedWith("Invalid token ID");
  });
  

  it("should return the correct token URI", async function () {
    const expectedUri = "ipfs://fake-uri/1.json";
    expect(await my1155.uri(1)).to.equal(expectedUri);
  });
  
  it("should revert burn if not owner or approved", async function () {
    await my1155.connect(user).mintFree(0);
    // Do NOT approve
    await expect(
      my1155.connect(addr1).burn(user.address, 0, 1)
    ).to.be.revertedWith("Not authorized");
  });
  

});
