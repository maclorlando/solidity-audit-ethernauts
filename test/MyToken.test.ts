import { ethers } from "hardhat";
import { expect } from "chai";
import { MyToken } from "../typechain-types"; // adjust path if needed

describe("MyToken", function () {
  let token: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let buyer: any;
  let admin: any;

  beforeEach(async function () {
    [owner, addr1, addr2, buyer, admin] = await ethers.getSigners();
  
    const MyToken = await ethers.getContractFactory("contracts/MyToken.sol:MyToken");
  
    //Ensure 'owner' is used for deployment
    token = await MyToken.connect(owner).deploy();
    await token.waitForDeployment();
    await token.connect(owner).addAdmin(admin.address);
  });

  it("should set the correct owner", async function () {
    expect(await token.getOwner()).to.equal(owner.address);
  });

  it("should allow admin to call externalApprove", async function () {
    await expect(token.connect(admin).externalApprove(addr1.address, addr2.address, 500)).to.not.be.reverted;
  });

  it("should allow owner to call externalApprove directly", async function () {
    await expect(token.connect(owner).externalApprove(addr1.address, addr2.address, 500)).to.not.be.reverted;
  });
  

  it("should revert externalApprove if called by non-owner and non-admin", async function () {
    await expect(token.connect(addr1).externalApprove(addr1.address, addr2.address, 500)).to.be.revertedWith("Unauthorized");
  });
  
  
  

  it("should allow owner to configure TokenSale contract once", async function () {
    await token.configTokenSaleContract(addr1.address);
    await expect(token.configTokenSaleContract(addr2.address)).to.be.revertedWith("TokenSale Contract already configured.");
  });

  it("should allow owner to add an admin", async function () {
    await token.addAdmin(addr1.address);
    await token.connect(addr1).mint(addr2.address, 1000);
    expect(await token.balanceOf(addr2.address)).to.equal(1000);
  });

  it("should not allow non-owner to add admin", async function () {
    await expect(token.connect(addr1).addAdmin(addr2.address)).to.be.revertedWith("Unauthorized");
  });

  it("should not allow non-admin to mint", async function () {
    await expect(token.connect(addr1).mint(addr2.address, 1000)).to.be.revertedWith("Unauthorized");
  });

  it("should block blacklisted address from sending tokens", async function () {
    await token.addAdmin(owner.address);
    await token.mint(addr1.address, 1000);
    await token.addToBlacklist(addr1.address);
    await expect(token.connect(addr1).transfer(addr2.address, 100)).to.be.revertedWith("Call is not authorized: blacklisted participants.");
  });

  it("should block transfers to blacklisted address", async function () {
    await token.addAdmin(owner.address);
    await token.mint(addr1.address, 1000);
    await token.addToBlacklist(addr2.address);
    await expect(token.connect(addr1).transfer(addr2.address, 100)).to.be.revertedWith("Call is not authorized: blacklisted participants.");
  });

  it("should allow transfer after removing from blacklist", async function () {
    await token.addAdmin(owner.address);
    await token.mint(addr1.address, 1000);
    await token.addToBlacklist(addr2.address);
    await token.removeFromBlacklist(addr2.address);
    await token.connect(addr1).transfer(addr2.address, 100);
    expect(await token.balanceOf(addr2.address)).to.equal(100);
  });

  it("should return cap value", async function () {
    const cap = await token.cap();
    expect(cap).to.equal(1_000_000);
  });

  it("should correctly return blacklist status", async function () {
    await token.addToBlacklist(addr2.address);
    expect(await token.isBlacklisted(addr2.address)).to.equal(true);
    await token.removeFromBlacklist(addr2.address);
    expect(await token.isBlacklisted(addr2.address)).to.equal(false);
  });

  it("should fail to add admin with zero address", async function () {
    await expect(token.addAdmin(ethers.ZeroAddress)).to.be.revertedWith("Invalid address");
  });

  it("should revert minting from non-admin", async function () {
    const [_, notAdmin] = await ethers.getSigners();
    await expect(token.connect(notAdmin).mint(notAdmin.address, 100)).to.be.revertedWith("Unauthorized");
  });
  
  it("should return false for non-blacklisted address", async function () {
    const isBlacklisted = await token.isBlacklisted(buyer.address);
    expect(isBlacklisted).to.be.false;
  });

  it("should correctly blacklist and unblacklist an address", async function () {
    await token.connect(owner).addToBlacklist(buyer.address);
    expect(await token.isBlacklisted(buyer.address)).to.be.true;
  
    await token.connect(owner).removeFromBlacklist(buyer.address);
    expect(await token.isBlacklisted(buyer.address)).to.be.false;
  });
  
  it("should prevent blacklisted sender from transferring tokens", async function () {
    await token.addToBlacklist(owner.address);
    await expect(token.transfer(buyer.address, 1)).to.be.revertedWith("Call is not authorized: blacklisted participants.");
  });
  
  
  it("should prevent transferring to a blacklisted recipient", async function () {
    await token.addToBlacklist(buyer.address);
    await expect(token.transfer(buyer.address, 1)).to.be.revertedWith("Call is not authorized: blacklisted participants.");
  });
  

  it("should not allow reconfiguring TokenSale contract", async function () {
    const Token = await ethers.getContractFactory("contracts/MyToken.sol:MyToken");
    const token = (await Token.deploy()) as unknown as MyToken;
    await token.waitForDeployment();
  
    const TokenSale = await ethers.getContractFactory("TokenSale");
    const sale = await TokenSale.deploy(token.target, owner.address);
    await sale.waitForDeployment();
  
    await expect(token.configTokenSaleContract(sale.getAddress())).to.be.revertedWith("TokenSale Contract already configured.");
  });
  
  it("should allow tokenSale contract to mint", async function () {
    const Token = await ethers.getContractFactory("contracts/MyToken.sol:MyToken");
    const token = (await Token.deploy()) as unknown as MyToken;
    await token.waitForDeployment();
  
    const DummyGodMode = await ethers.getContractFactory("GodMode");
    const dummyGod = await DummyGodMode.deploy(token.getAddress());
    await dummyGod.waitForDeployment();
  
    const TokenSale = await ethers.getContractFactory("TokenSale");
    const sale = await TokenSale.deploy(token.getAddress(), dummyGod.getAddress());
    await sale.waitForDeployment();
  
    //Fund the impersonated TokenSale contract with 1 ETH
    await ethers.provider.send("hardhat_setBalance", [
      await sale.getAddress(),
      "0x1000000000000000000" // 1 ETH
    ]);
  
    const tokenWithSaleSigner = token.connect(
      await ethers.getImpersonatedSigner(await sale.getAddress())
    );
  
    await expect(tokenWithSaleSigner.mint(owner.address, 1234)).to.not.be.reverted;
  
    const balance = await token.balanceOf(owner.address);
    expect(balance).to.equal(1234);
  });
  
  

  it("should allow admin to add to blacklist", async function () {
    await token.addAdmin(addr1.address);
    await expect(token.connect(addr1).addToBlacklist(buyer.address)).to.not.be.reverted;
    expect(await token.isBlacklisted(buyer.address)).to.be.true;
  });
  
  it("should allow admin to remove from blacklist", async function () {
    await token.addAdmin(addr1.address);
    await token.addToBlacklist(buyer.address);
    expect(await token.isBlacklisted(buyer.address)).to.be.true;
  
    await expect(token.connect(addr1).removeFromBlacklist(buyer.address)).to.not.be.reverted;
    expect(await token.isBlacklisted(buyer.address)).to.be.false;
  });
  

  it("should store tokenSale contract address after config", async function () {
    const Token = await ethers.getContractFactory("contracts/MyToken.sol:MyToken");
    const token = (await Token.deploy()) as unknown as MyToken;
    await token.waitForDeployment();
  
    const DummyGodMode = await ethers.getContractFactory("GodMode");
    const dummyGod = await DummyGodMode.deploy(token.getAddress());
    await dummyGod.waitForDeployment();
  
    const TokenSale = await ethers.getContractFactory("TokenSale");
    const dummyTokenSale = await TokenSale.deploy(token.getAddress(), dummyGod.getAddress());
    await dummyTokenSale.waitForDeployment();
  
    // @ts-ignore
    const tokenSaleContract = await token.getTokenSaleContract();
    expect(tokenSaleContract).to.equal(await dummyTokenSale.getAddress());
  });
  
  
  it("should allow only admin to blacklist via token directly", async function () {
    await token.addAdmin(owner.address);
    await expect(token.connect(owner).addToBlacklist(buyer.address)).to.not.be.reverted;
  
    // Non-admin
    const [_, nonAdmin] = await ethers.getSigners();
    await expect(token.connect(nonAdmin).addToBlacklist(buyer.address)).to.be.revertedWith("Unauthorized");
  });  

  it("should allow owner to remove an admin", async function () {
    await token.addAdmin(admin.address);
    expect(await token.isAdmin(admin.address)).to.be.true;
  
    await token.removeAdmin(admin.address);
    expect(await token.isAdmin(admin.address)).to.be.false;
  });
  

  it("should allow admin to burn tokens", async function () {
    await token.addAdmin(addr1.address);
    await token.connect(addr1).mint(addr2.address, 500);
    expect(await token.balanceOf(addr2.address)).to.equal(500);
  
    await token.connect(addr1).burn(addr2.address, 200);
    expect(await token.balanceOf(addr2.address)).to.equal(300);
  });

  it("should revert externalApprove if caller is not admin or owner", async function () {
    await expect(token.connect(addr1).externalApprove(addr2.address, owner.address, 100))
      .to.be.revertedWith("Unauthorized");
  });

  it("should allow externalApprove by admin", async function () {
    await token.addAdmin(owner.address); // Make sure owner is admin
    await token.mint(addr1.address, 500);
    await token.addAdmin(addr2.address);
  
    await token.connect(addr2).externalApprove(addr1.address, owner.address, 250);
    expect(await token.allowance(addr1.address, owner.address)).to.equal(250);
  });
  
  it("should allow owner to call externalApprove", async function () {
    const [owner, spender] = await ethers.getSigners();
    await expect(token.connect(owner).externalApprove(addr1.address, spender.address, 500)).to.not.be.reverted;
  });
  
  it("should revert externalApprove from non-owner and non-admin", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const spender = addr2;
  
    // addr1 is NOT the owner and NOT an admin
    await expect(
      token.connect(addr1).externalApprove(addr1.address, spender.address, 100)
    ).to.be.revertedWith("Unauthorized");
  });

  it("should revert when adding zero address as admin", async function () {
    await expect(token.addAdmin(ethers.ZeroAddress)).to.be.revertedWith('Invalid address');
  });
  
  it("should revert transfer if sender is blacklisted", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
  
    // Add owner as admin (in case contract doesn't detect msg.sender correctly)
    await token.connect(owner).addAdmin(owner.address);
  
    // Mint to addr1 *before* blacklisting it
    await token.connect(owner).mint(addr1.address, 100);
  
    // Blacklist addr1 (as admin)
    await token.connect(owner).addToBlacklist(addr1.address);
  
    // Attempt transfer (should now revert properly)
    await expect(
      token.connect(addr1).transfer(addr2.address, 50)
    ).to.be.revertedWith("Call is not authorized: blacklisted participants.");
  });
  
  
  
  it("should revert transfer if recipient is blacklisted", async function () {
    // Make the owner an admin
    await token.addAdmin(owner.address);
  
    // Blacklist addr2 as the recipient
    await token.connect(owner).addToBlacklist(addr2.address);
  
    // Mint tokens to addr1 from owner
    await token.connect(owner).mint(addr1.address, 100);
  
    // Attempt to transfer to blacklisted addr2 -> should revert
    await expect(
      token.connect(addr1).transfer(addr2.address, 50)
    ).to.be.revertedWith("Call is not authorized: blacklisted participants.");
  });
  
  it("should allow transfer from non-admin to admin", async function () {
    await token.connect(owner).addAdmin(owner.address);
    await token.connect(owner).addAdmin(addr2.address);
    await token.connect(owner).mint(addr1.address, 100);
  
    await expect(token.connect(addr1).transfer(addr2.address, 50)).to.not.be.reverted;
  });
  
  it("should allow transfer between two admins", async function () {
    const [addr1, addr2, ...others] = await ethers.getSigners();
    const contractOwner = await token.getOwner();
    const realOwner = await ethers.getSigner(contractOwner);
  
    await token.connect(realOwner).addAdmin(addr1.address);
    await token.connect(realOwner).addAdmin(addr2.address);
    await token.connect(realOwner).mint(addr1.address, 100);
  
    await expect(token.connect(addr1).transfer(addr2.address, 50)).to.not.be.reverted;
  });

  it("should prevent transfer if recipient is blacklisted", async function () {
    // Owner adds addr2 to the blacklist
    await token.connect(owner).addToBlacklist(addr2.address);
    
    //making owner an admin so he can mint
    await token.connect(owner).addAdmin(owner.address);
  
    // Mint tokens to addr1
    await token.connect(owner).mint(addr1.address, 1000);
  
    // addr1 tries to transfer to addr2 (who is blacklisted)
    await expect(
      token.connect(addr1).transfer(addr2.address, 500)
    ).to.be.revertedWith("Call is not authorized: blacklisted participants.");
  });
  
  
});
