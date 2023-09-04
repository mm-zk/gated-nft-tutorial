import { expect } from "chai";
import { Wallet, Provider, Contract, types } from "zksync-web3";
import * as hre from "hardhat";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

// load env file
import dotenv from "dotenv";
import { BigNumber, Signer, ethers } from "ethers";
import { HttpNetworkConfig } from "hardhat/types";
import { getGeneralPaymasterInput, getPaymasterParams } from "zksync-web3/build/src/paymaster-utils";
dotenv.config();

const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || "";

if (!PRIVATE_KEY)
  throw "⛔️ Private key not detected! Add it to the .env file!";

async function deployGreeter(deployer: Deployer): Promise<Contract> {
  const artifact = await deployer.loadArtifact("Greeter");
  return await deployer.deploy(artifact, ["Hi"]);
}

async function deployNFT(deployer: Deployer): Promise<Contract> {
  const artifact = await deployer.loadArtifact("InfinityStones");
  return await deployer.deploy(artifact);
}

async function deployPaymaster(deployer: Deployer, nft_address: string): Promise<Contract> {
  const artifact = await deployer.loadArtifact("ERC721GatedPaymaster");
  return await deployer.deploy(artifact, [nft_address]);
}

async function deployVoter(deployer: Deployer, nft_address: string): Promise<Contract> {
  const artifact = await deployer.loadArtifact("Voter");
  return await deployer.deploy(artifact, [nft_address]);
}

class GeneralPaymasterInputImplementation {
  type: 'General' = 'General';
  innerInput;

  constructor(innerInput) {
    this.innerInput = innerInput;
  }
}

const RICH_WALLET_1_ADDRESS = "0xa61464658AfeAf65CccaaFD3a512b69A83B77618";
const RICH_WALLET_1_KEY = "0xac1e735be8536c6534bb4f17f06f6afc73b2b5ba84ac2cfb12f7461b20c0bbe3";
const RICH_WALLET_2_ADDRESS = "0x0D43eB5B8a47bA8900d84AA36656c92024e9772e";
const RICH_WALLET_2_KEY = "0xd293c684d884d56f8d6abd64fc76757d3664904e309a0645baf8522ab6366d9e";
const RICH_WALLET_4_ADDRESS = "0x8002cD98Cfb563492A6fB3E7C8243b7B9Ad4cc92";
const RICH_WALLET_4_KEY = "0xf12e28c0eb1ef4ff90478f6805b68d63737b7f33abfa091601140805da450d93";



describe("NFT Paymaster tests", function () {
  it("Voting for NFT only", async function () {
    const hreProvider = new Provider((hre.network.config as HttpNetworkConfig).url);


    const richWallet1 = new Wallet(RICH_WALLET_1_KEY, hreProvider);
    const richWallet2 = new Wallet(RICH_WALLET_2_KEY, hreProvider);
    const richWallet4 = new Wallet(RICH_WALLET_4_KEY, hreProvider);

    const deployer = new Deployer(hre, richWallet1);


    const nft = await deployNFT(deployer);
    const voter = await deployVoter(deployer, nft.address);

    await (await nft.mint(RICH_WALLET_1_ADDRESS, "Space Stone")).wait();
    // Mint 1-st NFT to the second rich wallet.
    await (await nft.mint(RICH_WALLET_2_ADDRESS, "Soul Stone")).wait();
    await (await nft.mint(RICH_WALLET_1_ADDRESS, "Power Stone")).wait();
    const question = "Is it raining?"



    await (await voter.addQuestion(question)).wait();

    // TODO: chai matchers didn't work - the 'revertedWith' is not compared correctly.
    expect(voter.connect(richWallet4).addQuestion("Should not work")).to.be.revertedWith("User XX does not hold the required NFT asset");

    await (await voter.vote(question, 0, true)).wait();
    await (await voter.connect(richWallet2).vote(question, 1, false)).wait();
    expect(voter.vote(question, 1, false)).to.be.revertedWith("Sender is not owner of this token");
    // First wallet has two NFTs - so it can vote twice.
    await (await voter.vote(question, 2, true)).wait();

    expect(voter.vote(question, 256, true)).to.be.revertedWith("Token id too large");


    let votes = await voter.getVotes(question);
    // Votes for - 101
    expect(votes[0]).to.be.equal(5);
    // Votes against - 010
    expect(votes[1]).to.be.equal(2);
  });

  it("Account with no tokens, uses paymaster.", async function () {
    Error.stackTraceLimit = Infinity;

    const hreProvider = new Provider((hre.network.config as HttpNetworkConfig).url);

    // Random empty account (will be used to check if paymaster works)
    const emptyAccountKey = "0x5affc2c7d869026d4676e3d72207f68b6f01dc1c16c475d3fc6804f0da873912";
    const emptyAccountAddress = "0x3Dae7faa4B98464D115fE80ce220482fff9A6727";
    const emptyAccountWallet = new Wallet(emptyAccountKey, hreProvider);

    const richWallet1 = new Wallet(RICH_WALLET_1_KEY, hreProvider);
    const wallet = new Wallet(PRIVATE_KEY, hreProvider);
    const deployer = new Deployer(hre, wallet);

    // Deploy the contracts: NFT, Paymaster and Greeter.
    const nft = await deployNFT(deployer);
    const paymaster = await deployPaymaster(deployer, nft.address);
    const greeter = await deployGreeter(deployer);


    // Transfer some ETH to the paymaster address (so that it has enough tokens to pay for gas).
    await ((await richWallet1.transfer({ to: paymaster.address, amount: ethers.utils.parseUnits("1000", 18) }))).wait();

    // Mint the 0-th NFT to the first rich wallet.
    await (await nft.mint(RICH_WALLET_1_ADDRESS, "Space Stone")).wait();
    // Mint 1-st NFT to the second rich wallet.
    await (await nft.mint(RICH_WALLET_2_ADDRESS, "Soul Stone")).wait();

    // Mint the 2-nd NFT to the emptyAccount.
    await (await nft.mint(emptyAccountAddress, "Power Stone")).wait();

    expect(await nft.ownerOf(2)).to.eq(emptyAccountAddress);
    expect(await nft.ownerOf(1)).to.eq(RICH_WALLET_2_ADDRESS);
    expect(await nft.ownerOf(0)).to.eq(RICH_WALLET_1_ADDRESS);


    let transferTx = await nft.connect(richWallet1).transferFrom(RICH_WALLET_1_ADDRESS, RICH_WALLET_4_ADDRESS, 0);
    await transferTx.wait();

    expect(await nft.ownerOf(0)).to.eq(RICH_WALLET_4_ADDRESS);


    // Double-check that empty account still has no money.
    expect((await emptyAccountWallet.getBalance()).eq(BigNumber.from(0))).to.eq(true);

    expect(await greeter.greet()).to.eq("Hi");

    const GAS_LIMIT = 6000000;
    const gasPrice = await hreProvider.getGasPrice();


    // Of course fails -- we have to use the paymaster...
    // TODO: better error when you pass a wrong field in cust.
    // TODO: don't require all the fields.

    const paymasterParams = getPaymasterParams(paymaster.address, new GeneralPaymasterInputImplementation("0x00"));

    const setGreetingTx = await greeter.connect(emptyAccountWallet).setGreeting("Hola, mundo!", {
      gasLimit: GAS_LIMIT,
      maxPriorityFeePerGas: ethers.BigNumber.from(0),
      maxFeePerGas: gasPrice,
      customData: {
        gasPerPubdata: 5000,
        paymasterParams: paymasterParams
      }
    });
    // wait until the transaction is mined
    await setGreetingTx.wait();

    expect(await greeter.greet()).to.equal("Hola, mundo!");

    expect(await greeter.last_sender()).to.equal(emptyAccountAddress);

    const otherEmptyAccountWallet = new Wallet("0x03dd0144f47d2927112f3d5368d4630dd1f4c040a7fa91ac751e0d51ab6d1837", hreProvider);


    expect(greeter.connect(otherEmptyAccountWallet).setGreeting("Hey!", {
      gasLimit: GAS_LIMIT,
      maxPriorityFeePerGas: ethers.BigNumber.from(0),
      maxFeePerGas: gasPrice,
      customData: {
        gasPerPubdata: 5000,
        paymasterParams: paymasterParams
      }
    })).to.be.revertedWithPanic;

    expect(await greeter.greet()).to.equal("Hola, mundo!");
  });
});
