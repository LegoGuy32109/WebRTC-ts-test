import "./App.css";
import SimpleChat from "./simpleChat";
import { useState } from "react";

enum Tab {
	SIMPLE_CHAT = 0,
	MULTI_CHAT = 1,
}

function NavTabs({
	currentTab,
	onNewTab,
}: { currentTab: Tab; onNewTab: (value: Tab) => void }) {
	const tabButtons = Object.values(Tab).reduce((acc, value) => {
		if (typeof value === "string") {
			acc.push(
				<button
					type="button"
					onClick={() => onNewTab(Tab[value as keyof typeof Tab])}
					key={value}
				>
					{value}
				</button>,
			);
		}
		return acc;
	}, [] as JSX.Element[]);

	return <nav>{...tabButtons}</nav>;
}

function MultiChat() {
	return <h1>Multi User Chat</h1>;
}

function App() {
	const [currentTab, setCurrentTab] = useState(Tab.SIMPLE_CHAT);

	function View() {
		switch (currentTab) {
			case Tab.SIMPLE_CHAT:
				return <SimpleChat />;
			case Tab.MULTI_CHAT:
				return <MultiChat />;
		}
	}
	return (
		<div>
			<nav>
				<NavTabs onTabIndexUpdate={setCurrentTab} />
			</nav>
			<View />
		</div>
	);
}

export default App;
