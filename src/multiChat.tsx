import { useState } from "react";

const MAX_USERNAME_LENGTH = 21;

export default function MultiChat() {
	const [displayName, setDisplayName] = useState("");

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
				<button type="button" disabled={displayName.length === 0}>
					Create Room
				</button>
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
					disabled={displayName.length === 0}
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
