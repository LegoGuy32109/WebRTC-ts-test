import "./App.css";
import SimpleChat from "./simpleChat";
import MultiChat from "./multiChat";
import { useState } from "react";

enum Tab {
	SIMPLE_CHAT = 0,
	MULTI_CHAT = 1,
}

function NavTabs({
	currentTab,
	onNewTab,
}: { currentTab: Tab; onNewTab: (value: Tab) => void }) {
	function makeTabTitle(string: string) {
		return string
			.toLocaleLowerCase()
			.replace("_", " ")
			.split(" ")
			.map((string) =>
				string
					.substring(0, 1)
					.toUpperCase()
					.concat(string.substring(1)),
			)
			.join(" ");
	}

	const tabButtons = Object.entries(Tab).reduce((acc, [key, value]) => {
		if (typeof value === "string") {
			acc.push(
				<button
					type="button"
					onClick={() => onNewTab(Tab[value as keyof typeof Tab])}
					key={value}
					disabled={+key === currentTab}
				>
					{makeTabTitle(value)}
				</button>,
			);
		}
		return acc;
	}, [] as JSX.Element[]);

	return <nav>{...tabButtons}</nav>;
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
				<NavTabs onNewTab={setCurrentTab} currentTab={currentTab} />
			</nav>
			<View />
		</div>
	);
}

export default App;
