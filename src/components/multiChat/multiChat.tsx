import { useState } from "react";
import {
	generateRoomConnections,
	receiveConnectionOffers,
	acceptAnswer,
	type RoomConnection,
} from "../../setupMultiRtc";
import CreateRoomButton from "./CreateRoomButton";

const MAX_USERNAME_LENGTH = 21;
export const ROOM_SIZE = 4;

enum Server_Command {
	ROOM_INFO = "#ROOM_INFO#",
	ENTER = "#ENTER#",
}

export enum Room_State {
	DEFAULT = 0,
	HOST_EMPTY = 1,
	HOST_FILLING = 2,
	HOST_FULL = 3,
	GUEST_JOINING = 4,
	GUEST_IN = 5,
}

export default function MultiChat() {
	// save offer text to be shared again if button shift clicked
	const [offerText, setOfferText] = useState("");

	const [displayName, setDisplayName] = useState("");
	const [roomInfo, setRoomInfo] = useState({
		state: Room_State.DEFAULT,
		hostName: "",
		guests: [] as string[],
		messages: [] as string[],
	});
	const [roomConnections, setRoomConnections] = useState(
		[] as RoomConnection[],
	);
	const [guestChannel, setGuestChannel] = useState<
		RTCDataChannel | undefined
	>(undefined);
	const [msgToSend, setMsgToSend] = useState("");

	function onNewConnections(connections: RoomConnection[]) {
		// close all connections to terminate unused channels
		setRoomConnections((prevConnections) => {
			for (const room of prevConnections) {
				room.peerConnection.close();
			}

			return connections;
		});
	}

	function onMessageGetAsGuest(
		channel: RTCDataChannel,
		event: MessageEvent,
	) {
		console.log(event.data);
		// Check if message includes a server command
		// example: `#ROOM_INFO# {"hostName": "bilbo", ...}`
		// WARN: This feels inefficent, fix splitting everything
		const tokens: string[] = event.data
			.split(" ")
			.filter((word: string) => word);
		if (
			Object.values(Server_Command).includes(
				(tokens.at(0) ?? "") as Server_Command,
			)
		) {
			const [serverCommand, ...commandTokens] = tokens;

			switch (serverCommand) {
				case Server_Command.ROOM_INFO: {
					const roomInfo = JSON.parse(commandTokens.join(" "));
					// remove state param, as a guest state is different from host
					const { state, ...validRoomInfo } = roomInfo;
					if (!validRoomInfo.hostName || !validRoomInfo.guests) {
						console.error(
							"Issue parsing ROOM_INFO command",
							roomInfo,
						);
						return;
					}
					setRoomInfo((room) => ({ ...room, ...validRoomInfo }));
					return;
				}
				default:
					console.error("Server Command Unknown: ", serverCommand);
			}
			return;
		}

		// message does not contain a server command
		// TODO: display message in chat interface
		setRoomInfo((prevInfo) => {
			const newInfo = {
				...prevInfo,
				messages: [event.data, ...prevInfo.messages],
			};
			const stringifiedInfo = JSON.stringify(newInfo);
			channel.send(`${Server_Command.ROOM_INFO} ${stringifiedInfo}`);

			return newInfo;
		});
	}

	function onMessageGetAsHost(_: RTCDataChannel, event: MessageEvent) {
		console.log(event.data);
		// Check if message includes a server command
		// example: `#ROOM_INFO# {"hostName": "bilbo", ...}`
		// WARN: This feels inefficent, fix splitting everything
		const tokens: string[] = event.data
			.split(" ")
			.filter((word: string) => word);
		if (
			Object.values(Server_Command).includes(
				(tokens.at(0) ?? "") as Server_Command,
			)
		) {
			const [serverCommand, ...commandTokens] = tokens;

			switch (serverCommand) {
				case Server_Command.ENTER: {
					const guestName = commandTokens.join(" ");
					setRoomInfo((info) => {
						// don't allow another guest if we hit the room size
						if (info.guests.length === ROOM_SIZE) {
							console.error(
								`${guestName} tried to join, but the Room already full`,
							);
							return info;
						}
						const newInfo = {
							...info,
							guests: [...info.guests, guestName],
						};
						return newInfo;
					});
					return;
				}
				default:
					console.error("Server Command Unknown: ", serverCommand);
			}
			return;
		}

		// message does not contain a server command
		// TODO: display message in chat interface
	}

	async function onCreateRoom() {
		const roomConnections = await generateRoomConnections();
		onNewConnections(roomConnections);
		console.log(roomConnections);
		const offerPackage = JSON.stringify(
			roomConnections.map((pc) => pc.package),
		);
		console.log(offerPackage);
		setOfferText(offerPackage);
		await navigator.clipboard
			.writeText(offerPackage)
			.catch(console.error);

		setRoomInfo((info) => ({
			...info,
			hostName: displayName,
			state: Room_State.HOST_EMPTY,
		}));

		for (const connection of roomConnections) {
			if (!connection.channel) {
				continue;
			}

			// on channel open as HOST
			connection.channel.onopen = function (
				this: RTCDataChannel,
				event: Event,
			) {
				console.log(event);
			};
			connection.channel.onmessage = function (
				this: RTCDataChannel,
				event: MessageEvent,
			) {
				onMessageGetAsHost(this, event);
			};
		}
	}

	async function onJoinRoom() {
		// const offerPackage = JSON.parse(prompt("Paste in offer") ?? "");
		const offerPackage =
			JSON.parse(await navigator.clipboard.readText()) ?? [];
		const roomConnections = await receiveConnectionOffers(offerPackage);
		if (!roomConnections) {
			console.error("Issue receiving connection offers");
			return;
		}

		// successfully generated answers to offers
		setRoomInfo((room) => ({
			...room,
			state: Room_State.GUEST_JOINING,
		}));
		console.log(roomConnections);
		const answerPackage = JSON.stringify(
			roomConnections.map((answer) => answer.package),
		);
		console.log(answerPackage);
		await navigator.clipboard.writeText(answerPackage);

		// attach channel listeners
		for (const connection of roomConnections) {
			if (!connection.channel) {
				continue;
			}

			// on channel open as GUEST
			connection.channel.onopen = function (
				this: RTCDataChannel,
				event: Event,
			) {
				console.log(event);
				this.send(`${Server_Command.ENTER} ${displayName}`);
				setGuestChannel(this);

				// clean up other answers generated
				for (const connectionToDelete of roomConnections) {
					// use package id to not delete the channel just opened
					if (
						connection.package?.id !== connectionToDelete.package?.id
					) {
						console.log("closing", connectionToDelete);
						connectionToDelete.peerConnection.close();
					}
				}
			};
			connection.channel.onmessage = function (
				this: RTCDataChannel,
				event: MessageEvent,
			) {
				onMessageGetAsGuest(this, event);
			};
		}
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
					roomState={roomInfo.state}
					disabled={displayName.length === 0}
					onCreateRoom={onCreateRoom}
					onAcceptAnswer={async (event) => {
						// recopy the initial offer if shift clicked to share with others
						const mouseEvt = event as MouseEvent;
						if (mouseEvt.shiftKey) {
							await navigator.clipboard.writeText(offerText);
							return;
						}

						const answerPackage = JSON.parse(
							// prompt("Paste in answer") ?? "",
							await navigator.clipboard.readText(),
						);
						await acceptAnswer(roomConnections, answerPackage);
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
					disabled={
						displayName.length === 0 ||
						[
							Room_State.HOST_EMPTY,
							Room_State.HOST_FILLING,
							Room_State.HOST_FULL,
						].includes(roomInfo.state)
					}
					onClick={onJoinRoom}
				>
					Join Room
				</button>
			</nav>
			<div>
				<form>
					<input
						type="text"
						value={msgToSend}
						onChange={(evt) => setMsgToSend(evt.target.value)}
						style={{
							fontSize: "1em",
							fontFamily: "monospace",
						}}
					/>
					<button
						type="submit"
						onClick={(event) => {
							event.preventDefault();
							setMsgToSend("");

							if (guestChannel) {
								guestChannel.send(msgToSend);
							}
						}}
					>
						Send
					</button>
				</form>
			</div>
		</>
	);
}
