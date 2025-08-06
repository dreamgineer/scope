import type { Data } from ".";

export function secondary() {
    const ws = new WebSocket("ws://localhost:51234");
    ws.onmessage = msg => {
        console.log(msg.data);
    }
    ws.onclose = () => {
        console.log(JSON.stringify(<Data>{
            text: "Connecting...",
            tooltip: "Reconnecting to main widget..."
        }));
        setTimeout(secondary, 5000);
    }
}