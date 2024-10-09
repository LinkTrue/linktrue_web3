// SPDX-License-Identifier: GPL
pragma solidity ^0.8.17;

import "./ILinkTrue.sol";

// import "hardhat/console.sol";

/**
 * @title LinkTrue: Managing user profiles and links on the blockchain
 * @author Milad
 * @notice This contract allows users to manage a profile tied to their wallet address, associating multiple key-value pairs (e.g., addresses and links).
 * @dev The smart contract handles user registration, modification, and transfer of usernames. Profile data is stored in key-value pairs.
 */
contract LinkTrue is ILinkTrue {
    // Maximum number of items a user can store in their profile
    uint8 constant MAX_ITEM_PER_PROFILE = 51;

    // Maximum length for a username
    uint8 constant MAX_USERNAME_LENGTH = 30;

    // Array to hold reserved prefixes that cannot be used as usernames
    string[] public reservedPrefixes = [
        "admin",
        "administrator",
        "root",
        "system",
        "support",
        "helpdesk",
        "superuser",
        "service",
        "token",
        "wallet",
        "exchange",
        "staking",
        "nft",
        "swap",
        "linktrue", // Project branding reserved
        "link__true",
        "link_true",
        "eth",
        "polygon",
        "ethereum",
        "defi"
    ];

    // Mapping to store profile data (key-value pairs) for each address
    mapping(address => mapping(string => string)) private profileValue;

    // Mapping to store all keys associated with a profile for easy access and modification
    mapping(address => string[]) private profileItems;

    // Mapping to ensure usernames are unique
    mapping(string => address) private usernameToAddress;

    // Mapping to track the username associated with each address
    mapping(address => string) private addressToUsername;

    /**
     * @notice Register a new profile for the user.
     * @param username The chosen unique username for the wallet address.
     * @param keys Profile item keys (e.g., 'ETH_ADDRESS', 'GITHUB_USERNAME').
     * @param values Corresponding values for each key (e.g., '0x...', 'https://github.com/...').
     * @dev Username must be unique, and the number of keys and values must match.
     */
    function registerUserProfile(
        string calldata username,
        string[] calldata keys,
        string[] calldata values
    ) external override {
        require(
            bytes(addressToUsername[msg.sender]).length == 0,
            "Wallet already registered!"
        );

        _saveUsername(username); // Save the user's unique username
        _saveItems(keys, values); // Save the user's profile items (links)

        emit Registered(username); // Emit event after successful registration
    }

    /**
     * @notice Change the username associated with the caller's wallet.
     * @param newUsername The new username to be assigned.
     * @dev Username must still follow all validation rules and be unique.
     */
    function changeUsername(string calldata newUsername) external {
        _saveUsername(newUsername); // Update username mapping
        emit UsernameChanged(newUsername); // Emit event for username change
    }

    /**
     * @notice Transfer the username and associated profile from the caller's wallet to another address.
     * @param newAddress The address to transfer the username and profile to.
     * @dev Ensures the new address does not already have a username, and profile data is transferred.
     */
    function transferUsername(address newAddress) external override {
        require(newAddress != address(0), "Invalid new address!");
        require(
            bytes(addressToUsername[msg.sender]).length > 0,
            "No username to transfer"
        );
        require(
            bytes(addressToUsername[newAddress]).length == 0,
            "New address already has a username"
        );

        // Transfer username and profile items
        string memory currentUsername = addressToUsername[msg.sender];
        string[] memory userKeys = profileItems[msg.sender];

        // Clear profile from old address and assign to new
        delete profileItems[msg.sender];
        for (uint256 i = 0; i < userKeys.length; i++) {
            profileValue[newAddress][userKeys[i]] = profileValue[msg.sender][
                userKeys[i]
            ];
            delete profileValue[msg.sender][userKeys[i]];
        }
        profileItems[newAddress] = userKeys;

        // Update username mappings
        delete usernameToAddress[currentUsername];
        delete addressToUsername[msg.sender];

        usernameToAddress[currentUsername] = newAddress;
        addressToUsername[newAddress] = currentUsername;

        emit UsernameTransferred(currentUsername, newAddress); // Emit event for username transfer
    }

    /**
     * @notice Retrieve a user's profile based on their username.
     * @param username The username to look up.
     * @return An array of strings representing the keys and values of the profile.
     */
    function getProfile(
        string calldata username
    ) external view returns (string[] memory) {
        address userAddress = usernameToAddress[username];
        require(userAddress != address(0), "Username does not exist");

        return _getProfileByAddress(userAddress); // Delegate logic to a helper function
    }

    /**
     * @notice Retrieve a user's profile based on their wallet address.
     * @param userAddress The address to look up.
     * @return An array of strings representing the keys and values of the profile.
     */
    function getProfile(
        address userAddress
    ) external view returns (string[] memory) {
        require(userAddress != address(0), "Address does not exist");
        return _getProfileByAddress(userAddress);
    }

    /**
     * @notice Add new key-value items to the user's profile.
     * @param keys The profile item keys.
     * @param values The corresponding values for each key.
     */
    function addItems(
        string[] calldata keys,
        string[] calldata values
    ) external override {
        _saveItems(keys, values); // Save new items to the profile
    }

    /**
     * @notice Modify an existing item in the profile.
     * @param key The key of the item to modify.
     * @param newValue The new value to assign to the item.
     * @dev The key must exist, and the new value cannot be empty.
     */
    function editItem(
        string calldata key,
        string calldata newValue
    ) external override {
        require(_keyExists(key), "Key not found");
        require(bytes(newValue).length > 0, "New value cannot be empty!");

        // Update the item in profile
        profileValue[msg.sender][key] = newValue;
        emit ProfileUpdated(key, newValue); // Emit event for item update
    }

    /**
     * @notice Remove an item from the user's profile.
     * @param key The key of the item to remove.
     * @dev The key must exist in the profile.
     */
    function removeItem(string calldata key) external override {
        _delete(key);
    }

    function removeItems(string[] calldata keys) external {
        for (uint8 i = 0; i < keys.length; i++) {
            _delete(keys[i]);
        }
    }

    function _delete(string calldata key) private {
        require(_keyExists(key), "Key not found");

        // Remove the item from profile
        delete profileValue[msg.sender][key];
        _removeKey(key);

        emit ProfileUpdated(key, ""); // Emit event for item removal
    }

    /**
     * @dev Save or update the user's username.
     * @param username The new username to assign to the caller.
     * @dev Enforces uniqueness, reserved prefixes, and character validation.
     */
    function _saveUsername(string calldata username) private {
        require(bytes(username).length > 0, "Username cannot be empty");
        require(
            bytes(username).length <= MAX_USERNAME_LENGTH,
            "Username max length is 30 characters!"
        );
        require(
            _isValidCharacter(username),
            "Username must only contain lowercase letters a-z, numbers 0-9, and underscores (_)"
        );
        require(
            usernameToAddress[username] == address(0),
            "Username already taken"
        );
        require(
            !_isReserved(username),
            "Username is reserved or contains a reserved prefix"
        );

        // Update mappings to remove old username and save the new one
        string memory currentUsername = addressToUsername[msg.sender];
        if (bytes(currentUsername).length > 0) {
            usernameToAddress[currentUsername] = address(0);
        }

        usernameToAddress[username] = msg.sender;
        addressToUsername[msg.sender] = username;
    }

    /**
     * @dev Save key-value items to the user's profile.
     * @param keys The keys to store.
     * @param values The corresponding values to store.
     * @dev Checks that input arrays are valid and keys do not already exist.
     */
    function _saveItems(
        string[] calldata keys,
        string[] calldata values
    ) private {
        require(
            keys.length == values.length,
            "Invalid input! Keys and values must match in length."
        );
        require(
            keys.length < MAX_ITEM_PER_PROFILE,
            "Max allowed items are 50!"
        );

        for (uint8 i = 0; i < keys.length; i++) {
            require(bytes(keys[i]).length > 0, "Key cannot be empty!");
            require(bytes(values[i]).length > 0, "Value cannot be empty!");
            require(!_keyExists(keys[i]), "Duplicate key found!");

            profileItems[msg.sender].push(keys[i]);
            profileValue[msg.sender][keys[i]] = values[i];

            emit ProfileUpdated(keys[i], values[i]); // Emit event for each key-value pair added
        }
    }

    /**
     * @dev Check if a key already exists in the profile.
     * @param key The key to check.
     * @return A boolean indicating if the key exists.
     */
    function _keyExists(string calldata key) private view returns (bool) {
        string[] memory userKeys = profileItems[msg.sender];

        for (uint256 i = 0; i < userKeys.length; i++) {
            if (keccak256(bytes(userKeys[i])) == keccak256(bytes(key))) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Remove a key from the profile's item list.
     * @param key The key to remove.
     * @dev Iterates over the profile items to find and remove the key.
     */
    function _removeKey(string calldata key) private {
        string[] storage userKeys = profileItems[msg.sender];
        uint8 length = uint8(userKeys.length);
        for (uint8 i = 0; i < length; i++) {
            if (keccak256(bytes(userKeys[i])) == keccak256(bytes(key))) {
                // Remove the key by replacing it with the last element and popping
                userKeys[i] = userKeys[userKeys.length - 1];
                userKeys.pop();
                break;
            }
        }
    }

    /**
     * @dev Retrieve the profile data associated with a wallet address.
     * @param userAddress The address of the user.
     * @return An array containing the keys and values of the profile.
     */
    function _getProfileByAddress(
        address userAddress
    ) private view returns (string[] memory) {
        string[] memory keys = profileItems[userAddress];
        uint length = (keys.length * 2) + 1; // key values and username.
        string[] memory results = new string[](length);

        for (uint256 i = 0; i < keys.length; i++) {
            results[i * 2] = keys[i];
            results[i * 2 + 1] = profileValue[userAddress][keys[i]];
        }
        results[length - 1] = addressToUsername[userAddress];

        return results; // Return the profile's keys and values as an array
    }

    /**
     * @dev Check if a username contains only valid characters (lowercase letters, numbers, underscores).
     * @param username The username to validate.
     * @return A boolean indicating if the username is valid.
     */
    function _isValidCharacter(
        string calldata username
    ) private pure returns (bool) {
        bytes memory usernameBytes = bytes(username);

        for (uint256 i = 0; i < usernameBytes.length; i++) {
            bytes1 char = usernameBytes[i];
            if (
                !(char >= 0x61 && char <= 0x7A) && // a - z
                !(char >= 0x30 && char <= 0x39) && // 0 - 9
                !(char == 0x5F) // underscore (_)
            ) return false;
        }
        return true;
    }

    /**
     * @dev Check if a username contains reserved prefixes.
     * @param username The username to check.
     * @return A boolean indicating if the username is reserved.
     */
    function _isReserved(string calldata username) private view returns (bool) {
        for (uint256 i = 0; i < reservedPrefixes.length; i++) {
            if (
                bytes(username).length >= bytes(reservedPrefixes[i]).length &&
                keccak256(
                    abi.encodePacked(
                        _substring(
                            username,
                            0,
                            bytes(reservedPrefixes[i]).length
                        )
                    )
                ) ==
                keccak256(abi.encodePacked(reservedPrefixes[i]))
            ) return true;
        }
        return false;
    }

    /**
     * @dev Utility function to extract a substring from a string.
     * @param str The input string.
     * @param startIndex The start index for the substring.
     * @param endIndex The end index for the substring.
     * @return The resulting substring.
     */
    function _substring(
        string memory str,
        uint256 startIndex,
        uint256 endIndex
    ) private pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        bytes memory result = new bytes(endIndex - startIndex);
        for (uint256 i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = strBytes[i];
        }
        return string(result);
    }
}
