import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

interface FundMessage {
  from: string;
  timestamp: BigNumber;
  name: string;
  message: string;
}

async function getBalance(address: string) {
  const balanceBigInt = await ethers.provider.getBalance(address);
  return ethers.utils.formatEther(balanceBigInt);
}

async function printBalances(addresses: string[]) {
  for (const [index, address] of addresses.entries()) {
    console.log(`Address' ${index} balance: `, await getBalance(address));
  }
}

async function printFundMessages(tipMessages: FundMessage[]) {
  for (const tipMessage of tipMessages) {
    const timestamp = tipMessage.timestamp;
    const donor = tipMessage.name;
    const donorAddress = tipMessage.from;
    const message = tipMessage.message;

    console.log(
      `At ${timestamp}, ${donor} (${donorAddress}) said: "${message}"`
    );
  }
}

async function main() {
  const [owner, funder, funder2, funder3] = await ethers.getSigners();

  const unlockDate = (await time.latest()) + 100;

  const FundRaising = await ethers.getContractFactory("FundRaising");
  const fundRaising = await FundRaising.deploy(
    unlockDate,
    "Lets safe the turtles!"
  );
  await fundRaising.deployed();
  console.log("FundRaising deployed to ", fundRaising.address);

  const addresses = [owner.address, funder.address, fundRaising.address];
  console.log("--start--");
  await printBalances(addresses);

  const tip = { value: ethers.utils.parseEther("1") };
  await fundRaising.connect(funder).fund("Ben", "Help those cuties!", tip);
  await fundRaising.connect(funder2).fund("Patrick", "I love turtles :)", tip);
  await fundRaising.connect(funder3).fund("Dennis", "Lets safe them!", tip);

  console.log("--funded--");
  await printBalances(addresses);

  await time.increaseTo(unlockDate);
  await fundRaising.withdrawFunds();
  console.log("--after withdrawl of funds--");
  await printBalances(addresses);

  console.log("--fund messages--");
  const fundMessages = await fundRaising.getFundMessages();
  printFundMessages(fundMessages);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
