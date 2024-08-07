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

async function outputCurrentCandidates(
	description: RTCSessionDescription,
	candidates: RTCIceCandidate[],
	onPopupMsg: (message: string, seconds?: number) => void,
) {
	const stringOut = JSON.stringify({
		description,
		candidates,
	});
	console.log(stringOut);
	await navigator.clipboard
		.writeText(stringOut)
		.then(() => onPopupMsg("Copied to clipboard"))
		.catch(console.error);
}

export async function gather(
	onPcSet: (pc: RTCPeerConnection) => void,
	onChannelSet: (channel: RTCDataChannel) => void,
	onPopupMsg: (message: string, seconds?: number) => void,
) {
	const candidates: RTCIceCandidate[] = [];

	const newPc = new RTCPeerConnection(peerConnectionSettings);
	newPc.onicecandidate = (iceEvt) => {
		if (!iceEvt.candidate) {
			console.error("No candidate", iceEvt);
			return;
		}
		console.log("Candidate:", iceEvt.candidate);
		candidates.push(iceEvt.candidate);
	};
	newPc.onicegatheringstatechange = function (this: RTCPeerConnection) {
		console.log("Ice state change: ", this.iceGatheringState);
		if (
			!timeoutReached &&
			this.iceGatheringState === "complete" &&
			this.localDescription
		) {
			outputCurrentCandidates(
				this.localDescription,
				candidates,
				onPopupMsg,
			);
		}
	};
	newPc.onsignalingstatechange = function (this: RTCPeerConnection) {
		console.log("Signal state change: ", this.signalingState);
	};

	onPcSet(newPc);

	const masterChannel = newPc.createDataChannel("chat", {
		negotiated: true,
		id: 0,
	});
	masterChannel.onopen = (event) => {
		console.log(event);
		onPopupMsg("Data channel open");
	};
	masterChannel.onclose = (event) => {
		console.log(event);
		onPopupMsg("Data channel closed :(", 5);
	};
	masterChannel.onmessage = (msgEvt) => {
		console.log(msgEvt.data, msgEvt);
		onPopupMsg(msgEvt.data, 5);
	};
	masterChannel.onerror = (errEvt) => console.error(errEvt);

	onChannelSet(masterChannel);

	onPopupMsg(
		"Creating offer... keep window focused to access clipboard",
		10,
	);

	const offer = await newPc.createOffer();
	await newPc.setLocalDescription(offer);

	let timeoutReached = false;
	setTimeout(() => {
		timeoutReached = true;
		if (newPc?.localDescription) {
			outputCurrentCandidates(
				newPc.localDescription,
				candidates,
				onPopupMsg,
			);
		}
	}, 4000);
}

export async function recieve(
	onPcSet: (pc: RTCPeerConnection) => void,
	onChannelSet: (channel: RTCDataChannel) => void,
	onPopupMsg: (message: string, seconds?: number) => void,
) {
	const offerMsg = await navigator.clipboard.readText();
	let offerCandidates: RTCIceCandidate[];

	let offer: RTCSessionDescriptionInit;
	if (offerMsg) {
		const offerObj = JSON.parse(offerMsg);
		if (!(offerObj?.candidates && offerObj?.description)) {
			alert("Invalid offer message in clipboard");
			return;
		}
		offerCandidates = offerObj.candidates;
		offer = offerObj.description;
	} else {
		alert("Invalid offer message in clipboard");
		return;
	}

	onPopupMsg("Read offer from clipboard", 1);

	const candidates: RTCIceCandidate[] = [];
	const newPc = new RTCPeerConnection(peerConnectionSettings);

	let timeoutReached = false;
	setTimeout(() => {
		timeoutReached = true;
		if (newPc.localDescription) {
			outputCurrentCandidates(
				newPc.localDescription,
				candidates,
				onPopupMsg,
			);
		}
	}, 4000);

	newPc.onicecandidate = (iceEvt) => {
		if (!iceEvt.candidate) {
			console.error("No candidate", iceEvt);
			return;
		}
		console.log("Candidate:", iceEvt.candidate);
		candidates.push(iceEvt.candidate);
	};
	newPc.onicegatheringstatechange = function (this: RTCPeerConnection) {
		console.log("Ice state change: ", this.iceGatheringState);
		if (
			!timeoutReached &&
			this.iceGatheringState === "complete" &&
			this.localDescription
		) {
			outputCurrentCandidates(
				this.localDescription,
				candidates,
				onPopupMsg,
			);
		}
	};
	newPc.onsignalingstatechange = function (this: RTCPeerConnection) {
		console.log("Signal state change: ", this.signalingState);
	};

	newPc.setRemoteDescription(offer);

	const masterChannel = newPc.createDataChannel("chat", {
		negotiated: true,
		id: 0,
	});
	masterChannel.onopen = (event) => {
		console.log(event);
		onPopupMsg("Data channel open");
	};
	masterChannel.onclose = (event) => {
		console.log(event);
		onPopupMsg("Data channel closed :(", 5);
	};
	masterChannel.onmessage = (msgEvt) => {
		console.log(msgEvt.data, msgEvt);
		onPopupMsg(msgEvt.data, 5);
	};
	masterChannel.onerror = (errEvt) => console.error(errEvt);
	onChannelSet(masterChannel);
	onPcSet(newPc);

	const answer = await newPc.createAnswer();
	await newPc.setLocalDescription(answer);

	for (const candidate of [...offerCandidates, undefined]) {
		await newPc.addIceCandidate(candidate);
	}
}

export async function accept(
	pc: RTCPeerConnection,
	onPopupMsg: (message: string, seconds?: number) => void,
) {
	const answerMsg = await navigator.clipboard.readText();
	let answerCandidates: RTCIceCandidate[];
	let answer: RTCSessionDescriptionInit;
	if (answerMsg) {
		const offerObj = JSON.parse(answerMsg);
		if (!(offerObj?.candidates && offerObj?.description)) {
			alert("Invalid answer message");
			return;
		}
		answerCandidates = offerObj.candidates;
		answer = offerObj.description;
	} else {
		alert("Invalid answer message");
		return;
	}

	onPopupMsg("Read answer from clipboard", 1);

	pc.setRemoteDescription(answer);
	for (const candidate of [...answerCandidates, undefined]) {
		await pc.addIceCandidate(candidate);
	}
}
