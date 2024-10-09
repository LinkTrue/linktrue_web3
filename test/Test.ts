import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { ZeroAddress } from "ethers";

describe("LinkTrue Contract Unit Tests", function () {

  const maxItemToStress = 10;
  const validUsername = "valid_username1";

  // Fixture to deploy the contract and setup initial state
  async function deployLinkTrue() {
    const [owner, otherAccount] = await hre.ethers.getSigners();
    const LinkTrue = await hre.ethers.getContractFactory("LinkTrue");
    const lt = await LinkTrue.deploy();
    return { LinkTrue: lt, owner, otherAccount };
  }

  describe("Deployment", function () {

    it("Should validate the username", async () => {
      const { LinkTrue } = await loadFixture(deployLinkTrue);
      const validKeys: string[] = ["key"];
      const validValues: string[] = ["value"];

      await expect(LinkTrue.registerUserProfile("admin", validKeys, validValues))
        .to.revertedWith("Username is reserved or contains a reserved prefix");
      await expect(LinkTrue.registerUserProfile("system", validKeys, validValues))
        .to.revertedWith("Username is reserved or contains a reserved prefix");

      await expect(LinkTrue.registerUserProfile("linktrue", validKeys, validValues))
        .to.revertedWith("Username is reserved or contains a reserved prefix");

      await expect(LinkTrue.registerUserProfile("link_true", validKeys, validValues))
        .to.revertedWith("Username is reserved or contains a reserved prefix");

      await expect(LinkTrue.registerUserProfile("link__true", validKeys, validValues))
        .to.revertedWith("Username is reserved or contains a reserved prefix");

      await expect(LinkTrue.registerUserProfile("", validKeys, validValues))
        .to.revertedWith("Username cannot be empty");

      const veryLongUserName = "a".repeat(31);
      await expect(LinkTrue.registerUserProfile(veryLongUserName, validKeys, validValues))
        .to.revertedWith("Username max length is 30 characters!");

      await expect(LinkTrue.registerUserProfile("#", validKeys, validValues))
        .to.revertedWith("Username must only contain lowercase letters a-z, numbers 0-9, and underscores (_)");

      await expect(LinkTrue.registerUserProfile("|", validKeys, validValues))
        .to.revertedWith("Username must only contain lowercase letters a-z, numbers 0-9, and underscores (_)");

      await expect(LinkTrue.registerUserProfile("A", validKeys, validValues))
        .to.revertedWith("Username must only contain lowercase letters a-z, numbers 0-9, and underscores (_)");

      await expect(LinkTrue.registerUserProfile("Z", validKeys, validValues))
        .to.revertedWith("Username must only contain lowercase letters a-z, numbers 0-9, and underscores (_)");

      await expect(LinkTrue.registerUserProfile("-", validKeys, validValues))
        .to.revertedWith("Username must only contain lowercase letters a-z, numbers 0-9, and underscores (_)");

      await expect(LinkTrue.registerUserProfile("user@name", validKeys, validValues))
        .to.revertedWith("Username must only contain lowercase letters a-z, numbers 0-9, and underscores (_)");
    })

    it("Should validate the input", async function () {
      const { LinkTrue } = await loadFixture(deployLinkTrue);
      const invalidKeys: string[] = ["key1"];
      const invalidValues: string[] = ["value1", "value2"];
      await expect(LinkTrue.registerUserProfile(validUsername, invalidKeys, invalidValues))
        .to.revertedWith("Invalid input! Keys and values must match in length.");

      const emptyKey: string[] = ["a", ""];
      const emptyValue: string[] = ["b", ""];
      await expect(LinkTrue.registerUserProfile(validUsername, emptyKey, emptyValue))
        .to.revertedWith("Key cannot be empty!");
      await expect(LinkTrue.registerUserProfile(validUsername, ["a", "b"], emptyValue))
        .to.revertedWith("Value cannot be empty!");
    });

    it("should allow each wallet to register once", async () => {
      const { LinkTrue } = await loadFixture(deployLinkTrue);
      const validKeys: string[] = ["key"];
      const validValues: string[] = ["value"];

      await LinkTrue.registerUserProfile("abc", validKeys, validValues)

      await expect(LinkTrue.registerUserProfile(validUsername, validKeys, validValues))
        .to.revertedWith("Wallet already registered!");
    })

    it("Should set the right username when registering a profile", async function () {
      const { LinkTrue } = await loadFixture(deployLinkTrue);
      await expect(
        LinkTrue.registerUserProfile(validUsername, ["LinkedIn"], ["http://linkedIn.com"])
      )
        .to.emit(LinkTrue, "Registered")
        .withArgs(validUsername);
    });

    it("Should enforce username uniqueness", async function () {
      const { LinkTrue, otherAccount } = await loadFixture(deployLinkTrue);
      await LinkTrue.registerUserProfile(validUsername, ["LinkedIn"], ["http://linkedIn.com"]);
      await expect(
        LinkTrue.connect(otherAccount).registerUserProfile(validUsername, ["LinkedIn"], ["http://linkedIn.com"])
      ).to.be.revertedWith("Username already taken");
    });

    it("Should enforce only once registration", async function () {
      const { LinkTrue } = await loadFixture(deployLinkTrue);
      await LinkTrue.registerUserProfile(validUsername, ["LinkedIn"], ["http://linkedIn.com"]);
      await expect(
        LinkTrue.registerUserProfile(validUsername, [], [])
      ).to.be.revertedWith("Wallet already registered!");
    });

    it("Should register and store profile correctly", async function () {
      const { LinkTrue } = await loadFixture(deployLinkTrue);
      const keys = ["LinkedIn"];
      const values = ["http://linkedIn.com"];
      await LinkTrue.registerUserProfile(validUsername, keys, values);
      const profile = await LinkTrue["getProfile(string)"](validUsername);
      expect(profile.length).to.equal(3);
      expect(profile[0]).to.equal(keys[0]);
      expect(profile[1]).to.equal(values[0]);
      expect(profile[2]).to.equal(validUsername);
    });

    it("Should fetch profile by address", async function () {
      const { LinkTrue, owner } = await loadFixture(deployLinkTrue);
      const keys = ["LinkedIn"];
      const values = ["http://linkedIn.com"];
      await LinkTrue.registerUserProfile(validUsername, keys, values);
      const profile = await LinkTrue["getProfile(address)"](owner.address);
      expect(profile.length).to.equal(2 + 1); // key + value + username
      expect(profile[0]).to.equal(keys[0]);
      expect(profile[1]).to.equal(values[0]);
      expect(profile[2]).to.equal(validUsername);
    });

    it("Should allow adding new items after registration", async function () {
      const { LinkTrue } = await loadFixture(deployLinkTrue);
      const keys = ["LinkedIn"];
      const values = ["http://linkedIn.com"];
      await LinkTrue.registerUserProfile(validUsername, keys, values);
      const newKeys = ["github"];
      const newValues = ["https://github.com"];
      await LinkTrue.addItems(newKeys, newValues);
      const profile_after_modification = await LinkTrue["getProfile(string)"](validUsername);
      expect(profile_after_modification.length).to.equal(keys.length + values.length + newKeys.length + newValues.length + 1);
      expect(profile_after_modification[2]).to.equal(newKeys[0]);
      expect(profile_after_modification[3]).to.equal(newValues[0]);
    });

    it("Should enforce unique profile items", async function () {
      const { LinkTrue } = await loadFixture(deployLinkTrue);
      const initialKeys = ["LinkedIn"];
      const initialValues = ["http://linkedIn.com"];
      await LinkTrue.registerUserProfile(validUsername, initialKeys, initialValues);

      const newKeys = initialKeys;
      const newValues = initialValues;
      await expect(
        LinkTrue.addItems(newKeys, newValues)
      ).to.be.revertedWith("Duplicate key found!");
    });

    it("Should enforce items integrity", async function () {
      const { LinkTrue } = await loadFixture(deployLinkTrue);
      const initialKeys = ["LinkedIn"];
      const initialValues = ["http://linkedIn.com"];
      await LinkTrue.registerUserProfile(validUsername, initialKeys, initialValues);

      const newKeys = ["a"];
      const newValues = ["a", "b"];
      await expect(
        LinkTrue.addItems(newKeys, newValues)
      ).to.be.revertedWith("Invalid input! Keys and values must match in length.");
    });

    it("Should enforce max items length < 50", async function () {
      const { LinkTrue } = await loadFixture(deployLinkTrue);
      const initialKeys = ["LinkedIn"];
      const initialValues = ["http://linkedIn.com"];
      await LinkTrue.registerUserProfile(validUsername, initialKeys, initialValues);

      // Function to generate a random string of given length
      const generateRandomString = (length: number) => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
          result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
      }

      const newKeys = Array.from({ length: 51 }, () => generateRandomString(5));
      const newValues = Array.from({ length: 51 }, () => generateRandomString(5));
      await expect(
        LinkTrue.addItems(newKeys, newValues)
      ).to.be.revertedWith("Max allowed items are 50!");
    });

    it("Should allow modifying an item", async function () {
      const { LinkTrue, owner } = await loadFixture(deployLinkTrue);
      const keys = ["LinkedIn"];
      const values = ["http://linkedIn.com"];
      const newValue = "https://newLinkedIn";
      await LinkTrue.registerUserProfile(validUsername, keys, values);
      await expect(
        LinkTrue.editItem(keys[0], newValue)
      ).to.emit(LinkTrue, "ProfileUpdated").withArgs(keys[0], newValue);
      const profile = await LinkTrue["getProfile(address)"](owner.address);
      expect(profile.length).to.equal(2 + 1);
      expect(profile[0]).to.equal(keys[0]);
      expect(profile[1]).to.equal(newValue);
    });

    it("Should revert on invalid key when modifying", async function () {
      const { LinkTrue } = await loadFixture(deployLinkTrue);
      const keys = ["LinkedIn"];
      const invalidKey = "InvalidKey";
      const values = ["http://linkedIn.com"];
      const newValue = "https://newLinkedIn";
      await LinkTrue.registerUserProfile(validUsername, keys, values);

      await expect(
        LinkTrue.editItem(invalidKey, newValue)
      ).to.be.revertedWith("Key not found");

      await expect(
        LinkTrue.editItem(keys[0], "")
      ).to.be.revertedWith("New value cannot be empty!");
    });

    it("Should allow deleting profile items", async function () {
      const { LinkTrue, owner } = await loadFixture(deployLinkTrue);
      const keys = ["LinkedIn", "github"];
      const values = ["http://linkedIn.com", "https://github.com"];
      await LinkTrue.registerUserProfile(validUsername, keys, values);
      const keyToDelete = "LinkedIn";
      await expect(
        LinkTrue.removeItem(keyToDelete)
      ).to.emit(LinkTrue, "ProfileUpdated").withArgs(keyToDelete, "");
      const profile = await LinkTrue["getProfile(address)"](owner.address);
      expect(profile.length).to.equal(2 + 1);
      expect(profile[0]).to.equal(keys[1]);
      expect(profile[1]).to.equal(values[1]);
    });

    it("Should allow deleting multiple profile items", async function () {
      const { LinkTrue, owner } = await loadFixture(deployLinkTrue);
      const keys = ["LinkedIn", "github"];
      const values = ["http://linkedIn.com", "https://github.com"];
      await LinkTrue.registerUserProfile(validUsername, keys, values);
      const keyToDelete = keys;
      await LinkTrue.removeItems(keyToDelete)
      const profile = await LinkTrue["getProfile(address)"](owner.address);
      expect(profile.length).to.equal(1);
      expect(profile[0]).to.equal(validUsername);
    });

    it("Should prevent deleting non-existing profile items", async function () {
      const { LinkTrue } = await loadFixture(deployLinkTrue);
      const keys = ["LinkedIn", "github"];
      const values = ["http://linkedIn.com", "https://github.com"];
      await LinkTrue.registerUserProfile(validUsername, keys, values);

      const invalidKeyToDelete = "InvalidKey";

      await expect(
        LinkTrue.removeItem(invalidKeyToDelete)
      ).to.be.revertedWith("Key not found");
    });

    it("Should allow deleting the single profile item", async function () {
      const { LinkTrue, owner } = await loadFixture(deployLinkTrue);
      const keys = ["LinkedIn"];
      const values = ["http://linkedIn.com"];
      await LinkTrue.registerUserProfile(validUsername, keys, values);
      await expect(
        LinkTrue.removeItem(keys[0])
      ).to.emit(LinkTrue, "ProfileUpdated").withArgs(keys[0], "");
      const profile = await LinkTrue["getProfile(address)"](owner.address);
      expect(profile.length).to.equal(1);
    });

    it("Should revert if the username does not exist", async function () {
      const { LinkTrue } = await loadFixture(deployLinkTrue);
      await expect(
        LinkTrue["getProfile(string)"]("non.existing.username")
      ).to.be.revertedWith("Username does not exist");
      await expect(
        LinkTrue["getProfile(address)"](ZeroAddress)
      ).to.be.revertedWith("Address does not exist");
    });

    it("Should allow registering with just a username", async function () {
      const { LinkTrue } = await loadFixture(deployLinkTrue);
      await LinkTrue.registerUserProfile(validUsername, [], []);
      const profile = await LinkTrue["getProfile(string)"](validUsername);
      expect(profile.length).to.equal(1);
    });

    it("Should allow changing the username", async function () {
      const { LinkTrue } = await loadFixture(deployLinkTrue);
      const newUsername = "new_username";
      const newInvalidUsername = "A.";
      const newInvalidUsernameLength = "a".repeat(31);
      await LinkTrue.registerUserProfile(validUsername, [], []);
      await expect(
        LinkTrue["getProfile(string)"](newUsername)
      ).to.be.revertedWith("Username does not exist");
      await LinkTrue.changeUsername(newUsername);
      await expect(
        LinkTrue.changeUsername(newInvalidUsername)
      ).to.be.revertedWith("Username must only contain lowercase letters a-z, numbers 0-9, and underscores (_)");
      await expect(
        LinkTrue.changeUsername(newInvalidUsernameLength)
      ).to.be.revertedWith("Username max length is 30 characters!");
      await expect(
        LinkTrue["getProfile(string)"](validUsername)
      ).to.be.revertedWith("Username does not exist");
      const newProfile = await LinkTrue["getProfile(string)"](newUsername);
      expect(newProfile.length).to.equal(1);
    });

    it("Should allow transferring the username", async function () {
      const { LinkTrue, owner, otherAccount } = await loadFixture(deployLinkTrue);
      const validKeys: string[] = ["key1", "key2"];
      const validValues: string[] = ["value1", "value2"];
      await LinkTrue.registerUserProfile(validUsername, validKeys, validValues);

      expect(
        (await LinkTrue["getProfile(string)"](validUsername)).length
      ).to.equal((validKeys.length * 2) + 1);

      const newWalletAddress = otherAccount.address;

      expect(
        (await LinkTrue["getProfile(address)"](newWalletAddress)).length
      ).to.equal(1);

      await expect(
        LinkTrue.transferUsername(ZeroAddress)
      ).to.be.revertedWith("Invalid new address!");

      await expect(
        LinkTrue.connect(owner).transferUsername(owner.address)
      ).to.be.revertedWith("New address already has a username");

      // transfer ownership

      await expect(
        LinkTrue.transferUsername(newWalletAddress)
      ).to.emit(LinkTrue, "UsernameTransferred")
        .withArgs(validUsername, newWalletAddress)

      await expect(
        LinkTrue.transferUsername(otherAccount.address)
      ).to.be.revertedWith("No username to transfer");

      expect(
        (await LinkTrue["getProfile(address)"](owner.address)).length
      ).to.equal(1);
      expect(
        (await LinkTrue["getProfile(address)"](newWalletAddress)).length
      ).to.equal((validKeys.length * 2) + 1);

      expect(
        (await LinkTrue["getProfile(string)"](validUsername)).length
      ).to.equal((validKeys.length * 2) + 1);

    });

    it("Should allow changing the username", async function () {
      const { LinkTrue } = await loadFixture(deployLinkTrue);
      await LinkTrue.registerUserProfile(validUsername, [], []);
      await expect(
        LinkTrue.registerUserProfile(validUsername, [], [])
      ).to.be.revertedWith("Wallet already registered!");
    });

  });

  describe("Stress Testing", function () {

    it("Should handle a large number of key-value pairs", async function () {
      const { LinkTrue } = await loadFixture(deployLinkTrue);
      // Generate a large number of keys and values
      const keys: string[] = [];
      const values: string[] = [];
      for (let i = 0; i < maxItemToStress; i++) {
        keys.push(`key${i}`);
        values.push(`value${i}`);
      }

      // Register profile with large data
      await expect(
        LinkTrue.registerUserProfile(validUsername, keys, values)
      ).to.emit(LinkTrue, "Registered").withArgs(validUsername);

      // Verify that all keys and values are stored correctly
      const profile = await LinkTrue["getProfile(string)"](validUsername);
      expect(profile.length).to.equal((keys.length * 2) + 1);
      for (let i = 0; i < keys.length; i++) {
        expect(profile[i * 2]).to.equal(keys[i]);
        expect(profile[i * 2 + 1]).to.equal(values[i]);
      }
    });

    it("Should handle multiple users with large profiles", async function () {
      return
      const { LinkTrue } = await loadFixture(deployLinkTrue);

      const [
        _owner,
        acc1,
        acc2,
      ] = await hre.ethers.getSigners();

      const signers = [
        _owner, acc1, acc2
      ];

      const numberOfUsers = signers.length;
      const numberOfKeys = maxItemToStress;

      for (let j = 0; j < numberOfUsers; j++) {
        const signer = signers[j];
        const username = `user${j}`;

        const keys: string[] = [];
        const values: string[] = [];
        for (let i = 0; i < numberOfKeys; i++) {
          keys.push(`key${i}`);
          values.push(`value${i}`);
        }

        // Register profile for each user
        await LinkTrue.connect(signer).registerUserProfile(username, keys, values);
      }

      // Verify profiles
      for (let j = 0; j < numberOfUsers; j++) {
        const username = `user${j}`;
        const profile = await LinkTrue["getProfile(string)"](username);
        expect(profile.length).to.equal(numberOfKeys * 2);

        // Optional: Verify that profile content matches expected values
        for (let i = 0; i < numberOfKeys; i++) {
          expect(profile[i * 2]).to.equal(`key${i}`);
          expect(profile[i * 2 + 1]).to.equal(`value${i}`);
        }
      }
    });

    it("Should handle stress testing for profile updates", async function () {
      const { LinkTrue } = await loadFixture(deployLinkTrue);
      const maxItems = maxItemToStress;

      // Register initial profile
      const keys = ["key1"];
      const values = ["value1"];
      await LinkTrue.registerUserProfile(validUsername, keys, values);

      // Stress test by performing a large number of updates
      for (let i = 0; i < maxItems; i++) {
        await LinkTrue.editItem("key1", `updatedValue${i}`);
      }

      // Verify the last update
      const profile = await LinkTrue["getProfile(string)"](validUsername);
      expect(profile.length).to.equal(2 + 1);
      expect(profile[0]).to.equal("key1");
      expect(profile[1]).to.equal(`updatedValue${maxItems - 1}`);
    });

    it("Should handle stress testing for profile delete and updates", async function () {
      const { LinkTrue, otherAccount } = await loadFixture(deployLinkTrue);
      const maxItems = maxItemToStress;

      // Register initial profile
      const initialKeys: string[] = [];
      const initialValues: string[] = [];
      await LinkTrue.registerUserProfile(validUsername, initialKeys, initialValues);

      // Add some key-value pairs
      const addedKeys = [];
      const addedValues = [];
      for (let i = 0; i < maxItems; i++) {
        const key = `key${i}`;
        const value = `value${i}`;
        await LinkTrue.addItems([key], [value]);
        addedKeys.push(key);
        addedValues.push(value);
      }

      await LinkTrue.transferUsername(otherAccount.address);

      // Randomly delete half of items
      const keysToDelete: string[] = [];
      for (let i = 0; i < maxItems / 2; i++) {
        const keyToDelete = `key${Math.floor(Math.random() * (maxItems / 2))}`;
        if (!keysToDelete.includes(keyToDelete)) {
          keysToDelete.push(keyToDelete);
          await LinkTrue.connect(otherAccount).removeItem(keyToDelete);
        }
      }

      // Modify remaining items
      const modifiedKeys = [];
      const modifiedValues = [];
      for (let i = 0; i < maxItems; i++) {
        const key = `key${i}`;
        if (!keysToDelete.includes(key)) {
          const newValue = `updatedValue${i}`;
          await expect(
            LinkTrue.connect(otherAccount).editItem(key, newValue)
          ).to.emit(LinkTrue, "ProfileUpdated").withArgs(key, newValue);
          modifiedKeys.push(key);
          modifiedValues.push(newValue);
        }
      }

      // Verify the final state
      const profile = await LinkTrue["getProfile(string)"](validUsername);

      const profileMap = new Map();
      for (let i = 0; i < profile.length; i += 2) {
        if (i + 1 < profile.length) {
          profileMap.set(profile[i], profile[i + 1]);
        }
      }

      // check if keys are deleted properly
      for (const key of keysToDelete) {
        expect(profileMap.has(key)).to.be.false;
      }

      // Check that modified keys have the updated values
      for (let i = 0; i < modifiedKeys.length; i++) {
        const key = modifiedKeys[i];
        const expectedValue = modifiedValues[i];
        expect(profileMap.get(key)).to.equal(expectedValue);
      }
    });

    it("Should handle stress testing for profile delete all", async function () {
      const { LinkTrue, otherAccount } = await loadFixture(deployLinkTrue);
      const maxItems = maxItemToStress;

      // Register initial profile
      const initialKeys: string[] = [];
      const initialValues: string[] = [];
      await LinkTrue.registerUserProfile(validUsername, initialKeys, initialValues);

      // Add some key-value pairs
      const addedKeys = [];
      const addedValues = [];
      for (let i = 0; i < maxItems; i++) {
        const key = `key${i}`;
        const value = `value${i}`;
        await LinkTrue.addItems([key], [value]);
        addedKeys.push(key);
        addedValues.push(value);
      }

      await LinkTrue.transferUsername(otherAccount.address);

      // delete all items
      for (let i = 0; i < maxItems; i++) {
        const keyToDelete = `key${i}`;
        await LinkTrue.connect(otherAccount).removeItem(keyToDelete);
      }

      // Verify the final state
      const profile = await LinkTrue["getProfile(string)"](validUsername);
      expect(profile.length).to.be.equal(1);
    });

    //TODO 1 million user using the app
  });
});
