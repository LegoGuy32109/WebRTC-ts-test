import { useState } from "react";
import {
	generateRoomConnections,
	receiveConnectionOffers,
	acceptAnswer,
	type RoomConnection,
} from "../../setupMultiRtc";
import CreateRoomButton from "./CreateRoomButton";
import ChatWindow from "./ChatWindow";

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

interface User {
	id: string;
	name: string;
}

interface Message {
	userId: string;
	data: string;
}

export interface RoomInfo {
	state: Room_State;
	host: User;
	guests: User[];
	messages: Message[];
}

export default function MultiChat() {
	// save offer text to be shared again if button shift clicked
	const [offerText, setOfferText] = useState("");

	const [displayName, setDisplayName] = useState("");
	const [roomInfo, setRoomInfo] = useState<RoomInfo>({
		state: Room_State.DEFAULT,
		host: {} as User,
		guests: [] as User[],
		messages: [] as Message[],
	});
	const [roomConnections, setRoomConnections] = useState<
		RoomConnection[]
	>([]);

	const [guestChannel, setGuestChannel] = useState<
		RTCDataChannel | undefined
	>(undefined);

	function onNewConnections(connections: RoomConnection[]) {
		// close all connections to terminate unused channels
		setRoomConnections((prevConnections) => {
			for (const room of prevConnections) {
				room.peerConnection.close();
			}

			return connections;
		});
	}

	// I have to pass in state variable for room connections cause closure
	function sendMessageToGuests(
		msg: string,
		roomConnections: RoomConnection[],
	) {
		let sentMsg = false;

		for (const rc of roomConnections) {
			if (rc.channel?.readyState === "open") {
				rc.channel.send(msg);
				sentMsg = true;
			}
		}

		if (!sentMsg) {
			console.error("No open channels to send message: ", msg);
		}
	}

	function onMessageGetAsGuest(_: RTCDataChannel, event: MessageEvent) {
		// Check if message includes a server command
		// example: `#ROOM_INFO# {"host": {"name": bilbo", ...`
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
					if (!validRoomInfo.host.name || !validRoomInfo.guests) {
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
		// should only be recieving server commands, messages are communicated through the room info
	}

	// pass in room connections state variable or the state is lost from closure
	function onMessageGetAsHost(
		channel: RTCDataChannel,
		event: MessageEvent,
		roomConnections: RoomConnection[],
	) {
		// try to determine where connection message came from
		const connectionThatSentMsg = roomConnections.find(
			(rc) => rc.channel === channel,
		);
		if (!connectionThatSentMsg?.package?.id) {
			console.error("Origin of message could not be determined", event);
			return;
		}

		// Check if message includes a server command
		// example: `#ROOM_INFO# {"host": {"name": "bilbo", ...`
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

						// checked earlier, but checked again here for typescript
						if (!connectionThatSentMsg.package?.id) {
							return info;
						}
						const newInfo = {
							...info,
							guests: [
								...info.guests,
								{
									id: connectionThatSentMsg.package.id,
									name: guestName,
								},
							],
						};

						sendMessageToGuests(
							`${Server_Command.ROOM_INFO} ${JSON.stringify(newInfo)}`,
							roomConnections,
						);
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
		// display this message in chat interface storing in messages
		setRoomInfo((info) => {
			// checked earlier, but checked again here for typescript
			if (!connectionThatSentMsg.package?.id) {
				return info;
			}

			const newInfo = {
				...info,
				messages: [
					{
						userId: connectionThatSentMsg.package.id,
						data: event.data,
					},
					...info.messages,
				],
			};
			// share update to the room information to guests
			sendMessageToGuests(
				`${Server_Command.ROOM_INFO} ${JSON.stringify(newInfo)}`,
				roomConnections,
			);
			return newInfo;
		});
	}

	async function onCreateRoom() {
		const roomConnections = await generateRoomConnections();
		onNewConnections(roomConnections);
		const offerPackage = JSON.stringify(
			roomConnections.map((pc) => pc.package),
		);
		setOfferText(offerPackage);
		await navigator.clipboard
			.writeText(offerPackage)
			.catch(console.error);

		setRoomInfo((info) => ({
			...info,
			host: { name: displayName, id: crypto.randomUUID() },
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
				// TODO: disable functions
				// trigger state update
				console.log(event);
			};
			connection.channel.onmessage = function (
				this: RTCDataChannel,
				event: MessageEvent,
			) {
				onMessageGetAsHost(this, event, roomConnections);
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
				this.send(`${Server_Command.ENTER} ${displayName}`);
				setGuestChannel(this);

				// clean up other answers generated
				for (const connectionToDelete of roomConnections) {
					// use package id to not delete the channel just opened
					if (
						connection.package?.id !== connectionToDelete.package?.id
					) {
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

	function onChatMessage(message: string) {
		if (guestChannel) {
			guestChannel.send(message);
			return;
		}
		// otherwise we are a host sending a message
		setRoomInfo((info) => {
			const newInfo = {
				...info,
				messages: [
					{ userId: info.host.id, data: message },
					...info.messages,
				],
			};

			sendMessageToGuests(
				`${Server_Command.ROOM_INFO} ${JSON.stringify(newInfo)}`,
				roomConnections,
			);
			return newInfo;
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
			<ChatWindow onChatMessage={onChatMessage} roomInfo={roomInfo} />
		</>
	);
}
