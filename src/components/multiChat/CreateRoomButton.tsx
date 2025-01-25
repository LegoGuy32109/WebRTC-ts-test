import { Room_State } from "./multiChat";

interface CreateRoomButtonProps {
	roomState: Room_State;
	disabled?: boolean;
	onCreateRoom: (value: unknown) => void;
	onAcceptAnswer: (value: unknown) => void;
}

export default function CreateRoomButton({
	disabled: externalDisable,
	roomState,
	onCreateRoom,
	onAcceptAnswer,
}: CreateRoomButtonProps) {
	function getButtonState(roomState: Room_State) {
		switch (roomState) {
			case Room_State.DEFAULT:
				return {
					label: "Create Room",
					onClick: onCreateRoom,
					title: "Will copy room offer to clipboard",
				};
			case Room_State.HOST_EMPTY:
			case Room_State.HOST_FILLING:
				return {
					label: "Accept Answer",
					onClick: onAcceptAnswer,
					title: "Shift + Click to copy room offer",
				};
			case Room_State.HOST_FULL:
				return { label: "Room Full", disabled: true };
			case Room_State.GUEST_JOINING:
			case Room_State.GUEST_IN:
				return { label: "Create Room", disabled: true };
		}
	}

	const { disabled, label, title, onClick } = getButtonState(roomState);
	return (
		<button
			type="button"
			disabled={disabled || externalDisable}
			onClick={onClick}
			title={title}
		>
			{label}
		</button>
	);
}
