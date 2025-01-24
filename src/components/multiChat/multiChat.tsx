import { useState } from "react";
import { receiveConnectionOffers } from "../../setupMultiRtc";
import CreateRoomButton from "./CreateRoomButton";

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
				<CreateRoomButton disabled={displayName.length === 0} />
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
