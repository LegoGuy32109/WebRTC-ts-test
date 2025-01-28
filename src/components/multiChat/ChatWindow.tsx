import { useState } from "react";
import type { RoomInfo } from "./multiChat";

interface ChatWindowProps {
	onChatMessage: (message: string) => void;
	roomInfo: RoomInfo;
}

export default function ChatWindow({
	onChatMessage,
	roomInfo,
}: ChatWindowProps) {
	const [msgToSend, setMsgToSend] = useState("");
	const userMap = new Map();
	userMap.set(roomInfo.host.id, roomInfo.host.name);
	for (const user of roomInfo.guests) {
		userMap.set(user.id, user.name);
	}

	return (
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
						onChatMessage(msgToSend);
					}}
				>
					Send
				</button>
			</form>
			<ul>
				{roomInfo.messages.map((msg, index) => (
					<li key={index}>
						{userMap.get(msg.userId)}: {msg.data}
					</li>
				))}
			</ul>
		</div>
	);
}
