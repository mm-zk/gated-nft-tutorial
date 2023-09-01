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
/*
describe("Greeter", function () {
  it("Should return the new greeting once it's changed", async function () {
    const provider = Provider.getDefaultProvider();

    const wallet = new Wallet(PRIVATE_KEY, provider);
    const deployer = new Deployer(hre, wallet);

    const greeter = await deployGreeter(deployer);

    expect(await greeter.greet()).to.eq("Hi");

    const setGreetingTx = await greeter.setGreeting("Hola, mundo!");
    // wait until the transaction is mined
    await setGreetingTx.wait();

    expect(await greeter.greet()).to.equal("Hola, mundo!");
  });
});*/

class GeneralPaymasterInputImplementation {
  type: 'General' = 'General';
  innerInput;

  constructor(innerInput) {
    this.innerInput = innerInput;
  }
}

describe("ERC", function () {
  it("Foobar", async function () {
    Error.stackTraceLimit = Infinity;

    const provider = Provider.getDefaultProvider();

    const hreProvider = new Provider((hre.network.config as HttpNetworkConfig).url);

    const emptyAccountKey = "0x5affc2c7d869026d4676e3d72207f68b6f01dc1c16c475d3fc6804f0da873912";
    const emptyAccountAddress = "0x3Dae7faa4B98464D115fE80ce220482fff9A6727";
    const emptyAccountWallet = new Wallet(emptyAccountKey, new Provider((hre.network.config as HttpNetworkConfig).url));

    const wallet = new Wallet(PRIVATE_KEY, provider);
    const otherWallet = new Wallet("0xac1e735be8536c6534bb4f17f06f6afc73b2b5ba84ac2cfb12f7461b20c0bbe3", new Provider((hre.network.config as HttpNetworkConfig).url));
    const deployer = new Deployer(hre, wallet);

    const thirdWallet = new Wallet("0xf12e28c0eb1ef4ff90478f6805b68d63737b7f33abfa091601140805da450d93", new Provider((hre.network.config as HttpNetworkConfig).url));

    const nft = await deployNFT(deployer);

    const mm = await nft.mint("0xa61464658AfeAf65CccaaFD3a512b69A83B77618", "Space Stone");
    await mm.wait();

    //const mm2 = await nft.mint("0x0D43eB5B8a47bA8900d84AA36656c92024e9772e", "other stone");
    //await mm2.wait();

    const mm3 = await nft.mint("0x0D43eB5B8a47bA8900d84AA36656c92024e9772e", "Soul Stone");
    await mm3.wait();

    const mm4 = await nft.mint(emptyAccountAddress, "Power Stone");
    await mm4.wait();

    expect(await nft.ownerOf(1)).to.eq("0x0D43eB5B8a47bA8900d84AA36656c92024e9772e")
    expect(await nft.ownerOf(0)).to.eq("0xa61464658AfeAf65CccaaFD3a512b69A83B77618")

    let transferTx = await nft.connect(otherWallet).transferFrom("0xa61464658AfeAf65CccaaFD3a512b69A83B77618", "0x8002cD98Cfb563492A6fB3E7C8243b7B9Ad4cc92", 0);
    await transferTx.wait();

    expect(await nft.ownerOf(0)).to.eq("0x8002cD98Cfb563492A6fB3E7C8243b7B9Ad4cc92")


    const paymaster = await deployPaymaster(deployer, nft.address);

    let transferTx2 = await otherWallet.transfer({ to: paymaster.address, amount: ethers.utils.parseUnits("1000", 18) });
    await transferTx2.wait();


    //expect(await thirdWallet.getBalance()).to.eq(BigNumber.from(0x0c9f2c9cd04674edea40000000));

    expect((await emptyAccountWallet.getBalance()).eq(BigNumber.from(0))).to.eq(true);
    expect(await nft.ownerOf(2)).to.eq(emptyAccountAddress)



    const greeter = await deployGreeter(deployer);


    expect(await greeter.greet()).to.eq("Hi");

    const GAS_LIMIT = 6000000;
    const gasPrice = await hreProvider.getGasPrice();

    console.log("gas price: " + gasPrice);

    // Of course fails -- we have to use the paymaster...
    // TODO: and add money to the paymaster account.
    // TODO: better error when you pass a wrong field in cust.
    // TODO: don't require all the fields.

    const paymasterParams = getPaymasterParams(paymaster.address, new GeneralPaymasterInputImplementation("0x00"));

    const setGreetingTx = await greeter.connect(emptyAccountWallet).setGreeting("Hola, mundo!", {
      gasLimit: GAS_LIMIT,
      maxPriorityFeePerGas: ethers.BigNumber.from(0),
      maxFeePerGas: gasPrice,
      customData: {
        gasPerPubdata: 5000,
        paymasterParams: paymasterParams /*{
          paymaster: paymaster.address,
          paymasterInput: "0x000102"
        }*/
      }
    });
    // wait until the transaction is mined
    await setGreetingTx.wait();

    expect(await greeter.greet()).to.equal("Hola, mundo!");





    /*
        expect(await nft.greet(mint)).to.eq("Hi");
    
        const setGreetingTx = await greeter.setGreeting("Hola, mundo!");
        // wait until the transaction is mined
        await setGreetingTx.wait();
    
        expect(await greeter.greet()).to.equal("Hola, mundo!");*/
  });
});
