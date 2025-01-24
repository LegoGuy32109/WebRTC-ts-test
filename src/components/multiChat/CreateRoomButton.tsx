import { generateRoomConnections } from "../../setupMultiRtc";

interface CreateRoomButtonProps {
	disabled?: boolean;
}

export default function CreateRoomButton({
	disabled,
}: CreateRoomButtonProps) {
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={async () => {
				const peerConnections = await generateRoomConnections();
				console.log(peerConnections);
				console.log(
					JSON.stringify(peerConnections.map((pc) => pc.package)),
				);
			}}
		>
			Create Room
		</button>
	);
}
