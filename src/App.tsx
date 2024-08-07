import { useState } from "react";
import "./App.css";

import { gather, recieve, accept } from "./setupRtc";

function App() {
	const [pc, setPc] = useState<RTCPeerConnection>();
	const [channel, setChannel] = useState<RTCDataChannel>();

	const [msgToSend, setMsgToSend] = useState<string>("");

	const [messages, setMessages] = useState<
		{ id: string; text: string }[]
	>([]);

	function popMsg(message: string, seconds = 2) {
		const msgId = crypto.randomUUID();
		setMessages((prevMsgs) => [
			{ id: msgId, text: message },
			...prevMsgs,
		]);
		setTimeout(
			() =>
				setMessages((prevMsg) =>
					prevMsg.filter(({ id }) => id !== msgId),
				),
			seconds * 1000,
		);
	}

	return (
		<>
			<h1>WebRTC (no trickle-ice)</h1>
			<p className="read-the-docs">
				Gathering ICE candidates before sharing offer, no signaling
				server!
			</p>
			<div className="card">
				{!pc ? (
					<button
						type="button"
						onClick={() => gather(setPc, setChannel, popMsg)}
					>
						Gather
					</button>
				) : (
					<button
						type="button"
						onClick={() => accept(pc, popMsg)}
						disabled={channel?.readyState === "open"}
					>
						Accept
					</button>
				)}
				<br />
				<br />
				<button
					type="button"
					onClick={() => recieve(setPc, setChannel, popMsg)}
					disabled={!!pc}
				>
					Recieve
				</button>
				{messages.map(({ id, text }) => (
					<h4 key={id}>{text}</h4>
				))}
			</div>
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
