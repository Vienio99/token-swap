const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenSwap", function () {
  let rumbleToken;
  let fishToken;
  let tokenSwap;
  let owner;
  let user;

  // Tworzymy instancje tokenów A i B (użyć biblioteki openZepplin i zrobić te tokeny Mintable).
  // Właściciel tokenów tworzy sobie jakąś ich dużą ilość.
  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");

    rumbleToken = await Token.deploy("RumbleToken", "RTN", 10000);
    await rumbleToken.deployed();

    fishToken = await Token.deploy("FishToken", "FTN", 10000);
    await fishToken.deployed();

    const TokenSwap = await ethers.getContractFactory("TokenSwap");
    tokenSwap = await TokenSwap.deploy(
      rumbleToken.address,
      2,
      fishToken.address,
      1
    );
    await tokenSwap.deployed();
  });

  it("Should update token price", async function () {
    await tokenSwap.updatePrice(rumbleToken.address, 5);
    await tokenSwap.updatePrice(fishToken.address, 2);

    expect(await tokenSwap.rumblePrice()).to.equal(5);
    expect(await tokenSwap.fishPrice()).to.equal(2);
  });

  it("Should revert if regular user tries to update the price or deposit funds", async function () {
    // Deposit case
    await expect(
      tokenSwap
        .connect(user)
        .deposit(rumbleToken.address, ethers.utils.parseEther("10"))
    ).to.be.revertedWith("Only owner can deposit tokens");

    // Exchange case
    await expect(
      tokenSwap.connect(user).updatePrice(rumbleToken.address, 5)
    ).to.be.revertedWith("Only owner can update the price");
  });

  it("Should revert if token allowance is too low", async function () {
    // Deposit case
    await expect(
      tokenSwap
        .connect(owner)
        .deposit(rumbleToken.address, ethers.utils.parseEther("10"))
    ).to.be.revertedWith("Token allowance too low");

    // Exchange case
    await expect(
      tokenSwap
        .connect(user)
        .exchange(rumbleToken.address, ethers.utils.parseEther("10"))
    ).to.be.revertedWith("Token allowance too low");
  });

  it("Should revert if token address is wrong", async function () {
    const WrongToken = await ethers.getContractFactory("Token");
    const wrongToken = await WrongToken.deploy("WrongToken", "WTN", 10000);
    await wrongToken.deployed();

    await wrongToken
      .connect(owner)
      .approve(tokenSwap.address, ethers.utils.parseEther("10"));

    // Update price case
    await expect(
      tokenSwap.updatePrice(wrongToken.address, 5)
    ).to.be.revertedWith("Token not identified by the contract");

    // Deposit case
    await expect(
      tokenSwap.deposit(wrongToken.address, ethers.utils.parseEther("5"))
    ).to.be.revertedWith("Deposited token not identified by the contract");

    // Exchange case
    await wrongToken.transfer(user.address, ethers.utils.parseEther("5"));
    await expect(
      tokenSwap
        .connect(user)
        .exchange(wrongToken.address, ethers.utils.parseEther("2"))
    ).to.be.revertedWith("Deposited token not identified by the contract");
  });

  it("Should revert if contract does not have enough liquidity", async function () {
    await rumbleToken
      .connect(owner)
      .approve(tokenSwap.address, ethers.utils.parseEther("10"));
    await rumbleToken.transfer(user.address, ethers.utils.parseEther("5"));

    await rumbleToken
      .connect(user)
      .approve(tokenSwap.address, ethers.utils.parseEther("10"));

    await expect(
      tokenSwap
        .connect(user)
        .exchange(rumbleToken.address, ethers.utils.parseEther("2"))
    ).to.be.revertedWith("Not enough liquidity to perform the swap");
  });

  it("Should exchange tokens", async function () {
    // Właściciel ustawia allowance na obu tokenach.
    await rumbleToken
      .connect(owner)
      .approve(tokenSwap.address, ethers.utils.parseEther("10"));
    await fishToken
      .connect(owner)
      .approve(tokenSwap.address, ethers.utils.parseEther("10"));

    // Woła funkcje deposit dla tokenu B
    await tokenSwap.deposit(fishToken.address, ethers.utils.parseEther("5"));

    // Właściciel wysyła jakąś ilość tokenu A do innego adresu (nazywany dalej User)
    await rumbleToken.transfer(user.address, ethers.utils.parseEther("5"));

    // User ustawia allowance na token A
    await rumbleToken
      .connect(user)
      .approve(tokenSwap.address, ethers.utils.parseEther("10"));

    // User woła exchange z token A
    await tokenSwap
      .connect(user)
      .exchange(rumbleToken.address, ethers.utils.parseEther("2"));

    // Testujemy że dostanie odpowiednią liczbę tokenu B
    const userBalance = await fishToken.balanceOf(user.address);
    expect(ethers.utils.formatEther(userBalance)).to.equal("4.0");
  });
});
