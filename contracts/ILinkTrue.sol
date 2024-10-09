// SPDX-License-Identifier: GPL
pragma solidity ^0.8.17;

interface ILinkTrue {
    event ProfileUpdated(string key, string value);
    event Registered(string username);
    event UsernameChanged(string username);
    event UsernameTransferred(
        string indexed username,
        address indexed newAddress
    );

    // Function to add a new link or update existing user's profile field
    function registerUserProfile(
        string calldata username,
        string[] calldata keys,
        string[] calldata values
    ) external;

    // Function to add link(s) to the user's profile
    function addItems(
        string[] calldata keys,
        string[] calldata values
    ) external;

    function editItem(string calldata key, string calldata newValue) external;

    // Function to remove link from the user's profile
    function removeItem(string calldata key) external;

    // Function to remove link(s) from the user's profile
    function removeItems(string[] calldata keys) external;

    // Get Profile by username
    function getProfile(
        string calldata username
    ) external view returns (string[] memory);

    // Get Profile by address
    function getProfile(
        address userAddress
    ) external view returns (string[] memory);

    // change username
    function changeUsername(string calldata newUsername) external;

    // Allow the owner to transfer his/her wallet address
    function transferUsername(address newAddress) external;
}
