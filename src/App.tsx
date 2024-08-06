import { useState } from "react";
import "./App.css";

function App() {
	const [pc, setPc] = useState<RTCPeerConnection>();
	const [channel, setChannel] = useState<RTCDataChannel>();

	const [msgToSend, setMsgToSend] = useState<string>("");

	function outputCurrentCandidates(
		description: RTCSessionDescription,
		candidates: RTCIceCandidate[],
	) {
		const stringOut = JSON.stringify({
			description,
			candidates,
		});
		console.log(stringOut);
		window.alert(stringOut);
	}

	async function gather() {
		const candidates: RTCIceCandidate[] = [];

		const newPc = new RTCPeerConnection({
			iceCandidatePoolSize: 16,
			iceServers: [
				{
					urls: [
						"stun:stun1.l.google.com:19302",
						"stun:stun3.l.google.com:19302",
					],
				},
			],
		});
		newPc.onicecandidate = (iceEvt) => {
			if (!iceEvt.candidate) {
				console.error("No candidate", iceEvt);
				return;
			}
			console.log("Candidate:", iceEvt.candidate);
			candidates.push(iceEvt.candidate);
		};
		newPc.onicegatheringstatechange = function (
			this: RTCPeerConnection,
		) {
			console.log("Ice state change: ", this.iceGatheringState);
			if (
				!timeoutReached &&
				this.iceGatheringState === "complete" &&
				this.localDescription
			) {
				outputCurrentCandidates(this.localDescription, candidates);
			}
		};
		newPc.onsignalingstatechange = function (this: RTCPeerConnection) {
			console.log("Signal state change: ", this.signalingState);
		};
		newPc.ondatachannel = (channelEvt) => console.log(channelEvt);

		const masterChannel = newPc.createDataChannel("chat", {
			negotiated: true,
			id: 0,
		});
		masterChannel.onopen = (event) => {
			console.log(event);
			masterChannel.send("Hello from Host!");
		};
		masterChannel.onmessage = (msgEvt) => {
			console.log(msgEvt.data, msgEvt);
		};
		masterChannel.onerror = (errEvt) => console.error(errEvt);
		setChannel(masterChannel);

		const offer = await newPc.createOffer();
		await newPc.setLocalDescription(offer);

		let timeoutReached = false;
		setTimeout(() => {
			timeoutReached = true;
			if (newPc?.localDescription) {
				outputCurrentCandidates(newPc.localDescription, candidates);
			}
		}, 4000);

		setPc(newPc);
	}

	async function recieve() {
		const offerMsg = prompt("Give offer and candidates");
		let offerCandidates: RTCIceCandidate[];

		let offer: RTCSessionDescriptionInit;
		if (offerMsg) {
			const offerObj = JSON.parse(offerMsg);
			if (!(offerObj?.candidates && offerObj?.description)) {
				alert("Invalid offer message");
				return;
			}
			offerCandidates = offerObj.candidates;
			offer = offerObj.description;
		} else {
			alert("Invalid offer message");
			return;
		}

		const candidates: RTCIceCandidate[] = [];
		const newPc = new RTCPeerConnection({
			iceCandidatePoolSize: 16,
			iceServers: [
				{
					urls: [
						"stun:stun1.l.google.com:19302",
						"stun:stun3.l.google.com:19302",
					],
				},
			],
		});

		let timeoutReached = false;
		setTimeout(() => {
			timeoutReached = true;
			if (newPc.localDescription) {
				outputCurrentCandidates(newPc.localDescription, candidates);
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
		newPc.onicegatheringstatechange = function (
			this: RTCPeerConnection,
		) {
			console.log("Ice state change: ", this.iceGatheringState);
			if (
				!timeoutReached &&
				this.iceGatheringState === "complete" &&
				this.localDescription
			) {
				outputCurrentCandidates(this.localDescription, candidates);
			}
		};
		newPc.onsignalingstatechange = function (this: RTCPeerConnection) {
			console.log("Signal state change: ", this.signalingState);
		};

		newPc.setRemoteDescription(offer);
		newPc.ondatachannel = (channelEvt) => console.log(channelEvt);

		const masterChannel = newPc.createDataChannel("chat", {
			negotiated: true,
			id: 0,
		});
		masterChannel.onopen = (event) => {
			console.log(event);
			masterChannel.send("Hello from Peer!");
		};
		masterChannel.onmessage = (msgEvt) => {
			console.log(msgEvt.data, msgEvt);
		};
		masterChannel.onerror = (errEvt) => console.error(errEvt);
		setChannel(masterChannel);

		const answer = await newPc.createAnswer();
		await newPc.setLocalDescription(answer);
		setPc(newPc);
		for (const candidate of offerCandidates) {
			await newPc.addIceCandidate(candidate);
		}
	}

	async function accept() {
		const answerMsg = prompt("Give answer and candidates");
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

		pc?.setRemoteDescription(answer);
		for (const candidate of answerCandidates) {
			pc?.addIceCandidate(candidate);
		}
	}

	return (
		<>
			<h1>WebRTC</h1>
			<div className="card">
				<button type="button" onClick={gather}>
					Gather
				</button>
				<button type="button" onClick={accept} disabled={!pc}>
					Accept
				</button>
				<br />
				<button type="button" onClick={recieve}>
					Recieve
				</button>
			</div>
			<p className="read-the-docs">Demo attempting to use WebRTC</p>
			<div className="card">
				<form>
					<input
						type="text"
						value={msgToSend}
						onChange={(evt) => setMsgToSend(evt.target.value)}
					/>
					<button
						type="submit"
						onClick={(event) => {
							event.preventDefault();
							channel?.send(msgToSend);
							setMsgToSend("");
						}}
					>
						Send
					</button>
				</form>
			</div>
			{/*<canvas
				style={{
					backgroundColor: "gray",
					width: "300px",
					height: "300px",
				}}
			/> */}
		</>
	);
}

export default App;
