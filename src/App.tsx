// import { useState } from "react";
import "./App.css";

let pc: RTCPeerConnection;

function App() {
	// const [selfConnection, setSelfConnection] =
	// 	useState<RTCPeerConnection>();
	// const [descriptions, setDescriptions] = useState<{
	// 	local: null | object;
	// 	remote: null | object;
	// }>({
	// 	local: null,
	// 	remote: null,
	// });

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

		let timeoutReached = false;
		setTimeout(() => {
			timeoutReached = true;
			if (pc.localDescription) {
				outputCurrentCandidates(pc.localDescription, candidates);
			}
		}, 4000);

		pc = new RTCPeerConnection({
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
		pc.onicecandidate = (e) => {
			if (!e.candidate) {
				console.error("No candidate", e);
				return;
			}
			console.log("Candidate:", e.candidate);
			candidates.push(e.candidate);
		};
		pc.onicegatheringstatechange = function (this: RTCPeerConnection) {
			console.log("Ice state change: ", this.iceGatheringState);
			if (
				!timeoutReached &&
				this.iceGatheringState === "complete" &&
				this.localDescription
			) {
				outputCurrentCandidates(this.localDescription, candidates);
			}
		};
		pc.onsignalingstatechange = function (this: RTCPeerConnection) {
			console.log("Signal state change: ", this.signalingState);
		};

		pc.createDataChannel("josh-test");
		pc.createOffer().then((offer) => pc.setLocalDescription(offer));
	}

	async function recieve() {
		const offerMsg = prompt("Give offer and candidates");
		let offerCandidates: RTCIceCandidate[];

		let timeoutReached = false;
		setTimeout(() => {
			timeoutReached = true;
			if (pc.localDescription) {
				outputCurrentCandidates(pc.localDescription, candidates);
			}
		}, 4000);

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
		pc = new RTCPeerConnection({
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
		pc.onicecandidate = (e) => {
			if (!e.candidate) {
				console.error("No candidate", e);
				return;
			}
			console.log("Candidate:", e.candidate);
			candidates.push(e.candidate);
		};
		pc.onicegatheringstatechange = function (this: RTCPeerConnection) {
			console.log("Ice state change: ", this.iceGatheringState);
			if (
				!timeoutReached &&
				this.iceGatheringState === "complete" &&
				this.localDescription
			) {
				outputCurrentCandidates(this.localDescription, candidates);
			}
		};
		pc.onsignalingstatechange = function (this: RTCPeerConnection) {
			console.log("Signal state change: ", this.signalingState);
		};

		pc.setRemoteDescription(offer);
		pc.createDataChannel("josh-test");
		pc.createAnswer().then((answer) => pc.setLocalDescription(answer));
		for (const candidate of offerCandidates) {
			await pc.addIceCandidate(candidate);
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

		pc.setRemoteDescription(answer);
		for (const candidate of answerCandidates) {
			pc.addIceCandidate(candidate);
		}
	}

	return (
		<>
			<h1>WebRTC</h1>
			<div className="card">
				<button type="button" onClick={gather}>
					Gather
				</button>
				<br />
				<button type="button" onClick={recieve}>
					Recieve
				</button>
				<button type="button" onClick={accept}>
					Accept
				</button>
			</div>
			<p className="read-the-docs">Demo attempting to use WebRTC</p>
			<canvas
				style={{
					backgroundColor: "gray",
					width: "300px",
					height: "300px",
				}}
			/>
		</>
	);
}

export default App;
