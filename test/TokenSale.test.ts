import { ethers } from "hardhat";
import { expect } from "chai";

describe("TokenSale", function () {
  let token: any;
  let sale: any;
  let godmode: any;
  let owner: any;
  let buyer: any;
  let addr1: any;

  beforeEach(async function () {
    [owner, buyer, addr1] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("contracts/MyToken.sol:MyToken");
    token = await Token.deploy();
    await token.waitForDeployment();

    const GodMode = await ethers.getContractFactory("GodMode");
    godmode = await GodMode.deploy(token.target);
    await godmode.waitForDeployment();

    const TokenSale = await ethers.getContractFactory("TokenSale");
    sale = await TokenSale.deploy(token.target, godmode.target);
    await sale.waitForDeployment();

    await token.addAdmin(owner.address);
    await token.addAdmin(await sale.getAddress());
  });

  it("should have correct total supply from token", async function () {
    await token.mint(sale.getAddress(), 500);
    const total = await sale.getTotalSupply();
    expect(total).to.equal(500);
  });
  

  it("should allow token purchase with exact ETH", async function () {
    await sale.connect(buyer).buyTokens({ value: ethers.parseEther("1") });
    const balance = await token.balanceOf(buyer.address);
    expect(balance).to.equal(1000);
  });

  it("should fail if wrong ETH sent", async function () {
    await expect(sale.connect(buyer).buyTokens({ value: ethers.parseEther("0.1") }))
      .to.be.revertedWith("Must send 1 ETH");
  });

  it("should mint tokens if balance is too low", async function () {
    // Remove all 500 tokens from sale contract to force minting
    await token.transfer(owner.address, token.balanceOf(await sale.getAddress()));
  
    // Now call buyTokens — this should trigger mint
    await sale.connect(buyer).buyTokens({ value: ethers.parseEther("1") });
  
    const balance = await token.balanceOf(buyer.address);
    expect(balance).to.equal(1000);
  });
  

  it("should fail to mint if mint exceeds cap", async function () {
    // Remove all 500 tokens to force minting
    await token.transfer(owner.address, token.balanceOf(await sale.getAddress()));
  
    // Mint up to the cap elsewhere so there's no room left for minting 1000
    await token.mint(owner.address, 999_500); // cap is 1_000_000
  
    await expect(
      sale.connect(buyer).buyTokens({ value: ethers.parseEther("1") })
    ).to.be.revertedWith("Unable to mint without exceeding MAX_SUPPLY");
  });
  

  it("should allow refund and return ETH", async function () {
    await sale.connect(buyer).buyTokens({ value: ethers.parseEther("1") });

    await token.connect(buyer).approve(sale.getAddress(), 1000);
    const pre = await ethers.provider.getBalance(buyer.address);
    const tx = await sale.connect(buyer).sellBack(1000);
    const receipt = await tx.wait();

    const post = await ethers.provider.getBalance(buyer.address);
    const gasCost = BigInt(receipt.gasUsed.toString()) * BigInt(receipt.gasPrice?.toString() ?? "0");
    expect(await token.balanceOf(buyer.address)).to.equal(0n);
    expect(post).to.be.gt(pre - gasCost);
  });

  it("should fail to refund if user has no tokens", async function () {
    await expect(sale.connect(buyer).sellBack(1000)).to.be.revertedWith("User does not hold this many tokens to sell back.");
  });

  it("should fail refund if contract has no ETH", async function () {
    await sale.connect(buyer).buyTokens({ value: ethers.parseEther("1") });
    await sale.withdraw();

    await token.connect(buyer).approve(sale.getAddress(), 1000);
    await expect(sale.connect(buyer).sellBack(1000)).to.be.revertedWith("Not enough ETH in contract");
  });

  it("should allow owner to withdraw ETH", async function () {
    await sale.connect(buyer).buyTokens({ value: ethers.parseEther("1") });
    const balanceBefore = await ethers.provider.getBalance(owner.address);

    const tx = await sale.withdraw();
    const receipt = await tx.wait();
    const gasCost = BigInt(receipt.gasUsed.toString()) * BigInt(receipt.gasPrice?.toString() ?? "0");

    const balanceAfter = await ethers.provider.getBalance(owner.address);
    expect(balanceAfter).to.be.gt(balanceBefore - gasCost);
  });

  it("should fail if non-owner tries to withdraw", async function () {
    await expect(sale.connect(buyer).withdraw()).to.be.revertedWith("Unauthorized");
  });

  it("should return correct blacklist status", async function () {
    expect(await sale.isBlacklisted(buyer.address)).to.equal(false);
  });

  it("should allow owner to blacklist and remove", async function () {
    await sale.connect(owner).addToBlacklist(buyer.address);
    expect(await token.isBlacklisted(buyer.address)).to.be.true;
  
    await sale.connect(owner).removeFromBlacklist(buyer.address);
    expect(await token.isBlacklisted(buyer.address)).to.be.false;
  });
  

  it("should fail if non-owner tries to update blacklist", async function () {
    await expect(sale.connect(buyer).addToBlacklist(owner.address)).to.be.revertedWith("Unauthorized");
    await expect(sale.connect(buyer).removeFromBlacklist(owner.address)).to.be.revertedWith("Unauthorized");
  });

  it("should configure token sale in constructor", async function () {
    const Token = await ethers.getContractFactory("contracts/MyToken.sol:MyToken");
    const token = await Token.deploy();
    await token.waitForDeployment();
    const tokenAny = token as any;
  
    const GodMode = await ethers.getContractFactory("GodMode");
    const godmode = await GodMode.deploy(token.target);
    await godmode.waitForDeployment();
  
    const TokenSale = await ethers.getContractFactory("TokenSale");
    const sale = await TokenSale.deploy(token.target, godmode.target);
    await sale.waitForDeployment();
  
    // Should succeed: TokenSale was configured correctly (contract calls mint)
    await expect(sale.buyTokens({ value: ethers.parseEther("1") })).to.not.be.reverted;
  
    // Reconfiguring should fail (contract already configured itself)
    await expect(tokenAny.configTokenSaleContract(await sale.getAddress())).to.be.revertedWith(
      "TokenSale Contract already configured."
    );
  });


  it("should transfer pre-minted tokens from sale contract if balance is more than sufficient", async function () {
    // Mint more than needed to the sale contract
    await token.mint(await sale.getAddress(), 2000);
    
    const initialContractBalance = await token.balanceOf(await sale.getAddress());
  
    await sale.connect(buyer).buyTokens({ value: ethers.parseEther("1") });
  
    const finalContractBalance = await token.balanceOf(await sale.getAddress());
  
    expect(finalContractBalance).to.equal(initialContractBalance - 1000n);
  });

  
  it("should return correct balance from getTokenBalance", async function () {
    await token.mint(addr1.address, 1234);
    const balance = await sale.getBalance(addr1.address);
    expect(balance).to.equal(1234);
  });
  
  it("should revert sellBack with zero token balance", async function () {
    const [, user] = await ethers.getSigners();
    await expect(sale.connect(user).sellBack(0)).to.be.revertedWith("Cannot sell back zero tokens.");
  });
  
  it("should transfer tokens instead of minting when contract has enough balance", async function () {
    const [owner, buyer] = await ethers.getSigners();
  
    // Mint tokens to contract beforehand to trigger transferFrom path
    await token.mint(await sale.getAddress(), 1000);
  
    // Approve TokenSale contract to spend its own tokens (admin permission assumed)
    await token.connect(owner).approve(await sale.getAddress(), 1000);
  
    // Buyer sends 1 ETH to buy tokens
    await expect(() =>
      sale.connect(buyer).buyTokens({ value: ethers.parseEther("1.0") })
    ).to.changeTokenBalances(token, [buyer, sale], [1000, -1000]);
  });
  
  it("should revert sellBack if contract does not have enough ETH", async function () {
    const [owner, buyer] = await ethers.getSigners();
  
    // Mint and transfer tokens to buyer
    await token.mint(buyer.address, 1000);
    await token.connect(buyer).approve(sale.getAddress(), 1000);
  
    // Do NOT fund contract with ETH
    // This should fail when trying to refund
    await expect(sale.connect(buyer).sellBack(1000)).to.be.revertedWith("Not enough ETH in contract");
  });  

  it("should prevent TokenSale contract from buying tokens if blacklisted", async function () {
    // Blacklist the contract itself
    await token.connect(owner).addToBlacklist(sale.getAddress());
  
    // Try to buyTokens (contract triggers internal transferFrom)
    await expect(sale.connect(buyer).buyTokens({ value: ethers.parseEther("1") }))
      .to.be.revertedWith("Call is not authorized: blacklisted participants.");
  });

  it("should prevent blacklisted user from selling back tokens", async function () {
    // Fund the TokenSale contract with ETH
    await owner.sendTransaction({
      to: sale.getAddress(),
      value: ethers.parseEther("1") // any amount sufficient for refund
    });
  
    // Mint tokens to buyer and approve sale contract
    await token.mint(buyer.address, 1000);
    await token.connect(buyer).approve(sale.getAddress(), 1000);
  
    // Blacklist buyer
    await token.connect(owner).addToBlacklist(buyer.address);
  
    // Expect revert due to blacklist
    await expect(
      sale.connect(buyer).sellBack(500)
    ).to.be.revertedWith("Call is not authorized: blacklisted participants.");
  });  


  it("should revert buyTokens if ETH sent is less than the fixed price", async () => {
    await expect(
      sale.connect(buyer).buyTokens({ value: ethers.parseEther("0.5") })
    ).to.be.revertedWith("Must send 1 ETH");
  });
  
  it("should revert buyTokens if not enough tokens and minting would exceed max supply", async () => {
    const cap = await token.cap();
    const TOKEN_BUY_AMOUNT = 1000n;
  
    await token.connect(owner).addAdmin(owner.address);
  
    // Step 1: Mint just under the cap to the TokenSale contract
    await token.connect(owner).mint(sale.getAddress(), cap - 500n);
    await token.connect(owner).mint(owner.address, 500n); // total supply = cap
  
    // Step 2: Impersonate the TokenSale contract
    const saleAddress = await sale.getAddress();
    const saleSigner = await ethers.getImpersonatedSigner(saleAddress);
  
    // Step 3: Give it some ETH so it can pay gas
    await ethers.provider.send("hardhat_setBalance", [
      saleAddress,
      "0x1000000000000000000" // 1 ETH
    ]);
  
    // Step 4: Empty the TokenSale token balance
    await token.connect(saleSigner).transfer(owner.address, cap - 500n);
  
    // Step 5: buyer attempts to buy → triggers mint → exceeds cap → reverts
    await expect(
      sale.connect(buyer).buyTokens({ value: ethers.parseEther("1") })
    ).to.be.revertedWith("Unable to mint without exceeding MAX_SUPPLY");
  });
  
  
  
  
  
  it("should revert sellBack if user has less than the amount specified", async () => {
    await token.connect(owner).mint(buyer.address, 500);
    await token.connect(buyer).approve(sale.getAddress(), 1000);
    await expect(sale.connect(buyer).sellBack(1000)).to.be.revertedWith(
      "User does not hold this many tokens to sell back."
    );
  });
  
  it("should revert sellBack if contract has insufficient ETH", async () => {
    await token.connect(owner).mint(buyer.address, 1000);
    await token.connect(buyer).approve(sale.getAddress(), 1000);
    await expect(sale.connect(buyer).sellBack(1000)).to.be.revertedWith("Not enough ETH in contract");
  });
  
  it("should revert buyTokens if buyer is blacklisted", async () => {
    await token.connect(owner).addToBlacklist(buyer.address);
    await expect(
      sale.connect(buyer).buyTokens({ value: ethers.parseEther("1") })
    ).to.be.revertedWith("Call is not authorized: blacklisted participants.");
  });
  
  it("should revert withdraw if not called by owner", async () => {
    await expect(sale.connect(addr1).withdraw()).to.be.revertedWith("Unauthorized");
  });
  
  it("should revert addToBlacklist if not called by owner", async () => {
    await expect(sale.connect(addr1).addToBlacklist(buyer.address)).to.be.revertedWith("Unauthorized");
  });
  
  it("should revert removeFromBlacklist if not called by owner", async () => {
    await token.connect(owner).addToBlacklist(buyer.address);
    await expect(sale.connect(addr1).removeFromBlacklist(buyer.address)).to.be.revertedWith("Unauthorized");
  });
  
  it("should mint tokens and transfer to buyer if contract balance is insufficient", async () => {
    await sale.connect(buyer).buyTokens({ value: ethers.parseEther("1") });
    const balance = await token.balanceOf(buyer.address);
    expect(balance).to.equal(1000);
  });
  
  
  
});
