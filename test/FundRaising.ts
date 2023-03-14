import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("FundRaising", function () {
  async function deployOneWeekFundRaisingFixture() {
    const ONE_WEEK = 7 * 24 * 60 * 60;

    const unlockDate = (await time.latest()) + ONE_WEEK;
    const fundPurpose = "Safe the turtles!";

    // Contracts are deployed using the first signer/account by default
    const [owner, funder, funder2, funder3] = await ethers.getSigners();

    const FundRaising = await ethers.getContractFactory("FundRaising");
    const fundRaising = await FundRaising.deploy(unlockDate, fundPurpose);

    return {
      fundRaising,
      unlockDate,
      fundPurpose,
      owner,
      funder,
      funder2,
      funder3,
    };
  }

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      const { fundRaising, unlockDate } = await loadFixture(
        deployOneWeekFundRaisingFixture
      );

      expect(await fundRaising.unlockTime()).to.equal(unlockDate);
    });

    it("Should set the right owner", async function () {
      const { fundRaising, owner } = await loadFixture(
        deployOneWeekFundRaisingFixture
      );

      expect(await fundRaising.owner()).to.equal(owner.address);
    });

    it("Should set the right message", async function () {
      const { fundRaising, fundPurpose } = await loadFixture(
        deployOneWeekFundRaisingFixture
      );

      expect(await fundRaising.fundingPurpose()).to.equal(fundPurpose);
    });

    it("Should fail if the unlockDate is not in the future", async function () {
      const latestTime = await time.latest();
      const FundRaising = await ethers.getContractFactory("FundRaising");
      await expect(
        FundRaising.deploy(latestTime, "Not saving anything")
      ).to.be.revertedWith("The date for unlocking should be in the future");
    });
  });

  describe("Funding", function () {
    it("Should fund properly and add funder to fundMessages Array", async function () {
      const { fundRaising, funder } = await loadFixture(
        deployOneWeekFundRaisingFixture
      );

      await fundRaising.connect(funder).fund("Ben", "Help those cuties!", {
        value: ethers.utils.parseEther("1"),
      });

      expect((await fundRaising.getFundMessages()).length).to.equal(1);
    });

    it("Should fund and emit a new event", async function () {
      const { fundRaising, funder } = await loadFixture(
        deployOneWeekFundRaisingFixture
      );

      const funding = fundRaising.fund("Ben", "Help those cuties!", {
        value: ethers.utils.parseEther("1"),
      });

      expect(await funding)
        .to.emit(fundRaising, "NewFundMessage")
        .withArgs(
          funder.getAddress(),
          await time.latest(),
          "Ben",
          "Help those cuties!"
        );
    });

    it("Should fail funding for not enough money", async function () {
      const { fundRaising } = await loadFixture(
        deployOneWeekFundRaisingFixture
      );

      fundRaising.fund("Ben", "Help those cuties!", {
        value: ethers.utils.parseEther("0"),
      });

      expect((await fundRaising.getFundMessages()).length).to.be.revertedWith(
        "0 is not enough for funding"
      );
    });
  });

  describe("Withdrawals", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called too soon", async function () {
        const { fundRaising } = await loadFixture(
          deployOneWeekFundRaisingFixture
        );

        await expect(fundRaising.withdrawFunds()).to.be.revertedWith(
          "You can't withdraw yet"
        );
      });

      it("Should revert with the right error if called from another account", async function () {
        const { fundRaising, unlockDate, funder } = await loadFixture(
          deployOneWeekFundRaisingFixture
        );

        // We can increase the time in Hardhat Network
        await time.increaseTo(unlockDate);

        // We use lock.connect() to send a transaction from another account
        await expect(
          fundRaising.connect(funder).withdrawFunds()
        ).to.be.revertedWith("You aren't the owner");
      });

      it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
        const { fundRaising, unlockDate } = await loadFixture(
          deployOneWeekFundRaisingFixture
        );

        // Transactions are sent using the first signer by default
        await time.increaseTo(unlockDate);

        await expect(fundRaising.withdrawFunds()).not.to.be.reverted;
      });
    });

    describe("Transfers", function () {
      it("Should transfer the funds to the owner", async function () {
        const { fundRaising, unlockDate, owner, funder } = await loadFixture(
          deployOneWeekFundRaisingFixture
        );

        await fundRaising.connect(funder).fund("Ben", "Help those cuties!", {
          value: ethers.utils.parseEther("1"),
        });
        await time.increaseTo(unlockDate);

        await expect(fundRaising.withdrawFunds()).to.changeEtherBalances(
          [owner, fundRaising],
          [ethers.utils.parseEther("1"), ethers.utils.parseEther("-1")]
        );
      });
    });
  });
});
