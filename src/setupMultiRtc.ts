// import { useState } from "react";

// grab static turn credentials in global.xirsys.net/dashboard/services
const peerConnectionSettings = {
	iceServers: [
		{
			urls: [
				"stun:stun1.l.google.com:19302",
				"stun:stun3.l.google.com:19302",
			],
		},
	],
};

const ROOM_SIZE = 4;

export async function generateRoomConnections(): Promise<
	RoomConnection[]
> {
	// const [offersMade, setOffersMade] = useState(0);

	const connections = await Promise.all(
		Array.from({ length: ROOM_SIZE }, generateRoomConnection),
	);
	return connections;
}

interface Package {
	description: RTCSessionDescription;
	candidates: RTCIceCandidate[];
}

interface RoomConnection {
	peerConnection: RTCPeerConnection;
	// the channel to communicate UDP data might not be created yet
	channel?: RTCDataChannel;
	candidates: RTCIceCandidate[];
	// the package to send to peer might not be generated yet
	package?: Package;
}

async function generateRoomConnection(): Promise<RoomConnection> {
	const pc = new RTCPeerConnection(peerConnectionSettings);
	const output = {
		peerConnection: pc,
		channel: undefined,
		candidates: [],
		package: undefined,
	} as RoomConnection;

	// prepare a promise to be resolved when the ice candidates finished gathering
	let setIceGatheringComplete: (value: unknown) => void;
	const iceGatheringComplete = new Promise((resolve, reject) => {
		setIceGatheringComplete = resolve;
		// Will see error in console if a room failed to generate candidates
		setTimeout(() => reject("Failed after 5 seconds"), 5000);
	});

	pc.onicecandidate = ({ candidate }) =>
		candidate && output.candidates.push(candidate);

	// if gathering state changed to "complete" we can resolve the room connection
	pc.onicegatheringstatechange = function (this) {
		if (this.iceGatheringState === "complete" && this.localDescription) {
			output.package = {
				description: this.localDescription,
				candidates: output.candidates,
			};
			setIceGatheringComplete("Completed Gathering Candidates");
		}
	};

	// create channel in connection
	output.channel = pc.createDataChannel("chat", {
		negotiated: true,
		id: 0,
	});

	// create offer to start generating ice candidates
	const offer = await pc.createOffer();
	await pc.setLocalDescription(offer);

	// Wait for the ice candidate gathering to complete
	await iceGatheringComplete;

	return output;
}

export async function receiveConnectionOffers(offers: Package[]) {
	// determine if offers are valid
	if (!offers || offers.length === 0) {
		console.error("Error parsing offers: ", offers);
		return;
	}
	const validOffers = offers.filter(
		(offer) => offer.candidates && offer.description,
	);
	if (validOffers.length === 0) {
		console.error("No offers to parse: ", offers);
		return;
	}

	// we have valid offers,
	const answers = await Promise.all(
		validOffers.map(receiveConnectionOffer),
	);

	return answers;
}

async function receiveConnectionOffer(offer: Package) {
	const pc = new RTCPeerConnection(peerConnectionSettings);
	const output = {
		peerConnection: pc,
		channel: undefined,
		candidates: [],
		package: undefined,
	} as RoomConnection;

	pc.onicecandidate = ({ candidate }) =>
		candidate && output.candidates.push(candidate);

	// prepare a promise to be resolved when the ice candidates finished gathering
	let setIceGatheringComplete: (value: unknown) => void;
	const iceGatheringComplete = new Promise((resolve, reject) => {
		setIceGatheringComplete = resolve;
		// Will see error in console if a room failed to generate candidates
		setTimeout(() => reject("Failed after 5 seconds"), 5000);
	});

	pc.onicegatheringstatechange = function (this: RTCPeerConnection) {
		if (this.iceGatheringState === "complete" && this.localDescription) {
			output.package = {
				description: this.localDescription,
				candidates: output.candidates,
			};
			setIceGatheringComplete("Completed Gathering Candidates");
		}
	};

	pc.setRemoteDescription(offer.description);

	// create channel in connection
	output.channel = pc.createDataChannel("chat", {
		negotiated: true,
		id: 0,
	});

	const answer = await pc.createAnswer();
	await pc.setLocalDescription(answer);

	// add all the candidates in any order
	await Promise.all(
		offer.candidates.map((candidate) => pc.addIceCandidate(candidate)),
	);
	// To indicate the offer had no more candidates, pass in undefined
	await pc.addIceCandidate(undefined);

	// Wait for the ice candidate gathering to complete
	await iceGatheringComplete;

	return output;
}
