// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title CryptoRush — on-chain racing pool + garage
/// @notice Matches the ABI already shipped in src/contract/abi.json exactly,
/// so it's a drop-in backend for the existing frontend: same function
/// signatures, same events, same struct layouts. No external imports, so it
/// pastes straight into Remix with nothing else to resolve.
contract CryptoRush {
    struct Car {
        string name;
        uint256 price;
        uint16 topSpeed;
        uint16 acceleration;
        uint16 handling;
        uint16 brake;
        bool exists;
    }

    struct RaceResult {
        uint256 raceId;
        address winner;
        uint256 prize;
        uint256 playerCount;
        uint256 timestamp;
    }

    address public owner;
    uint256 public entryFee = 0.01 ether;
    uint8 public minPlayers = 2;
    uint8 public maxPlayers = 8;
    uint16 public ownerFeeBps = 500; // 5% house cut of each prize pool

    uint256 public currentRaceId = 1;
    address[] public currentPlayers;
    mapping(address => bool) public isInCurrentRace;

    Car[] public cars;
    mapping(address => mapping(uint256 => bool)) public unlockedCars;

    mapping(address => uint256) public wins;
    mapping(address => uint256) public racesJoined;
    mapping(address => uint256) public pendingRewards;

    RaceResult[] public raceHistory;

    event CarAdded(uint256 indexed carId, string name, uint256 price);
    event CarUnlocked(address indexed player, uint256 indexed carId, uint256 pricePaid);
    event EntryFeeUpdated(uint256 newFee);
    event PlayerJoined(uint256 indexed raceId, address indexed player, uint256 playersInRace);
    event RaceStarted(uint256 indexed raceId, uint256 playerCount, uint256 prizePool);
    event RewardClaimed(address indexed player, uint256 amount);
    event WinnerPicked(uint256 indexed raceId, address indexed winner, uint256 prize);
    event Withdraw(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;

        // Seed a small starter roster so the garage isn't empty on first
        // deploy. Car 0 must stay free/exists=true — the frontend always
        // treats index 0 as owned-by-default.
        _addCar("Magenta Bolt", 0, 50, 50, 50, 50);
        _addCar("Cyan Surge", 0.02 ether, 65, 60, 70, 60);
        _addCar("Violet Storm", 0.05 ether, 75, 80, 65, 70);
        _addCar("Gold Rush", 0.1 ether, 90, 85, 80, 85);
    }

    // ---------- Garage ----------

    function addCar(
        string calldata name,
        uint256 price,
        uint16 topSpeed,
        uint16 acceleration,
        uint16 handling,
        uint16 brake
    ) external onlyOwner {
        _addCar(name, price, topSpeed, acceleration, handling, brake);
    }

    function _addCar(
        string memory name,
        uint256 price,
        uint16 topSpeed,
        uint16 acceleration,
        uint16 handling,
        uint16 brake
    ) internal {
        cars.push(Car(name, price, topSpeed, acceleration, handling, brake, true));
        emit CarAdded(cars.length - 1, name, price);
    }

    function carCount() external view returns (uint256) {
        return cars.length;
    }

    function getAllCars() external view returns (Car[] memory) {
        return cars;
    }

    function buyCar(uint256 carId) external payable {
        require(carId < cars.length && cars[carId].exists, "no such car");
        require(!unlockedCars[msg.sender][carId], "already owned");
        require(msg.value == cars[carId].price, "wrong AVAX amount");
        unlockedCars[msg.sender][carId] = true;
        emit CarUnlocked(msg.sender, carId, msg.value);
    }

    function unlockCarWithRewards(uint256 carId) external {
        require(carId < cars.length && cars[carId].exists, "no such car");
        require(!unlockedCars[msg.sender][carId], "already owned");
        uint256 price = cars[carId].price;
        require(pendingRewards[msg.sender] >= price, "not enough winnings");
        pendingRewards[msg.sender] -= price;
        unlockedCars[msg.sender][carId] = true;
        emit CarUnlocked(msg.sender, carId, price);
    }

    // ---------- Race pool ----------

    function getCurrentPlayers() external view returns (address[] memory) {
        return currentPlayers;
    }

    function joinRace() external payable {
        require(msg.value == entryFee, "wrong entry fee");
        require(!isInCurrentRace[msg.sender], "already in race");
        require(currentPlayers.length < maxPlayers, "grid full");

        currentPlayers.push(msg.sender);
        isInCurrentRace[msg.sender] = true;
        racesJoined[msg.sender] += 1;

        emit PlayerJoined(currentRaceId, msg.sender, currentPlayers.length);
    }

    /// @notice Draws the winner and pays out in the same transaction.
    /// @dev Uses block data for randomness, not a VRF oracle — fine for a
    /// testnet demo, but a validator can in principle bias block.prevrandao,
    /// so don't treat this as cryptographically fair for real stakes.
    function startRace() external {
        uint256 playerCount = currentPlayers.length;
        require(playerCount >= minPlayers, "not enough players");

        uint256 prizePool = entryFee * playerCount;
        uint256 winnerIndex = uint256(
            keccak256(abi.encodePacked(block.timestamp, block.prevrandao, block.number, playerCount))
        ) % playerCount;
        address winner = currentPlayers[winnerIndex];

        uint256 houseCut = (prizePool * ownerFeeBps) / 10000;
        uint256 prize = prizePool - houseCut;

        wins[winner] += 1;
        pendingRewards[winner] += prize;
        raceHistory.push(RaceResult(currentRaceId, winner, prize, playerCount, block.timestamp));

        emit RaceStarted(currentRaceId, playerCount, prizePool);
        emit WinnerPicked(currentRaceId, winner, prize);

        for (uint256 i = 0; i < playerCount; i++) {
            isInCurrentRace[currentPlayers[i]] = false;
        }
        delete currentPlayers;
        currentRaceId += 1;
    }

    function getPlayerStats(address player)
        external
        view
        returns (uint256 winsCount, uint256 racesJoinedCount, uint256 claimable, bool inRace)
    {
        return (wins[player], racesJoined[player], pendingRewards[player], isInCurrentRace[player]);
    }

    function getRaceHistoryLength() external view returns (uint256) {
        return raceHistory.length;
    }

    /// @notice Most recent races first, capped at `count` (or however many exist).
    function getRecentRaces(uint256 count) external view returns (RaceResult[] memory) {
        uint256 total = raceHistory.length;
        uint256 n = count < total ? count : total;
        RaceResult[] memory result = new RaceResult[](n);
        for (uint256 i = 0; i < n; i++) {
            result[i] = raceHistory[total - 1 - i];
        }
        return result;
    }

    /// @notice Lets the contract accept plain AVAX transfers (e.g. topping
    /// up the house balance) without reverting. Funds land in the general
    /// balance, withdrawable by the owner via withdraw().
    receive() external payable {}

    // ---------- Rewards ----------

    function claimRewards() external {
        uint256 amount = pendingRewards[msg.sender];
        require(amount > 0, "nothing to claim");
        pendingRewards[msg.sender] = 0; // effects before interaction
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "transfer failed");
        emit RewardClaimed(msg.sender, amount);
    }

    // ---------- Admin ----------

    function setEntryFee(uint256 newFee) external onlyOwner {
        entryFee = newFee;
        emit EntryFeeUpdated(newFee);
    }

    function setOwnerFeeBps(uint16 newFeeBps) external onlyOwner {
        require(newFeeBps <= 10000, "over 100%");
        ownerFeeBps = newFeeBps;
    }

    function setRaceSize(uint8 newMin, uint8 newMax) external onlyOwner {
        require(newMin >= 1 && newMin <= newMax, "bad range");
        minPlayers = newMin;
        maxPlayers = newMax;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero address");
        owner = newOwner;
    }

    function withdraw(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "insufficient balance");
        (bool ok, ) = payable(owner).call{value: amount}("");
        require(ok, "transfer failed");
        emit Withdraw(owner, amount);
    }
}
