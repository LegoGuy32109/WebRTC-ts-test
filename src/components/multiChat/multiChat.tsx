import { useState } from "react";
import {
	generateRoomConnections,
	receiveConnectionOffers,
	acceptAnswer,
	type RoomConnection,
} from "../../setupMultiRtc";
import CreateRoomButton from "./CreateRoomButton";

const MAX_USERNAME_LENGTH = 21;

// HOST
// default
// room just created
// room has less than full players
// room is full
//
// GUEST
// default
// accepted room offer
// connected to room

export enum Room_State {
	DEFAULT = 0,
	HOST_EMPTY = 1,
	HOST_FILLING = 2,
	HOST_FULL = 3,
	GUEST_JOINING = 4,
	GUEST_IN = 5,
}

export default function MultiChat() {
	const [displayName, setDisplayName] = useState("");
	const [roomState, setRoomState] = useState(Room_State.DEFAULT);
	const [roomConnections, setRoomConnections] = useState(
		[] as RoomConnection[],
	);

	function onNewConnections(connections: RoomConnection[]) {
		// close all connections to terminate unused channels
		setRoomConnections((prevConnections) => {
			for (const room of prevConnections) {
				room.peerConnection.close();
			}

			return connections;
		});
	}

	return (
		<>
			<h1>Multi User Chat</h1>
			<nav
				style={{
					display: "flex",
					justifyContent: "space-between",
					width: "80vw",
				}}
			>
				<CreateRoomButton
					roomState={roomState}
					// disabled={displayName.length === 0}
					onCreateRoom={async () => {
						const peerConnections = await generateRoomConnections();
						onNewConnections(peerConnections);
						console.log(peerConnections);
						console.log(
							JSON.stringify(
								peerConnections.map((pc) => pc.package),
							),
						);
						setRoomState(Room_State.HOST_EMPTY);
					}}
					onAcceptAnswer={async () => {
						const answerPackage = JSON.parse(
							prompt("Paste in answer") ?? "",
						);
						await acceptAnswer(roomConnections, answerPackage);
						console.log(roomConnections);
					}}
				/>
				<input
					id="displayName"
					type="text"
					value={displayName}
					onChange={(event) =>
						event.target.value.length <= MAX_USERNAME_LENGTH &&
						setDisplayName(event.target.value)
					}
					placeholder="Display Name"
					style={{
						fontSize: "1.6em",
						fontFamily: "monospace",
					}}
				/>
				<button
					type="button"
					title="Have Room Offer in Clipboard"
					// disabled={displayName.length === 0}
					onClick={async () => {
						const offerPackage = JSON.parse(
							prompt("Paste in offer") ?? "",
						);
						const answers =
							await receiveConnectionOffers(offerPackage);
						if (!answers) {
							console.error("Issue receiving connection offers");
							return;
						}
						console.log(answers);
						console.log(
							JSON.stringify(
								answers.map((answer) => answer.package),
							),
						);
					}}
				>
					Join Room
				</button>
			</nav>
			<div>
				<form>
					<input
						type="text"
						// value={msgToSend}
						// onChange={(evt) => setMsgToSend(evt.target.value)}
						style={{
							fontSize: "1em",
							fontFamily: "monospace",
						}}
					/>
					<button
						type="submit"
						onClick={(event) => {
							event.preventDefault();
							// channel?.send(msgToSend);
							// setMsgToSend("");
						}}
					>
						Send
					</button>
				</form>
			</div>
		</>
	);
}
