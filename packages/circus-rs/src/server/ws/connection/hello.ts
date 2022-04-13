import WebSocketConnectionHandler from "./WebSocketConnectionHandler";

const hello: WebSocketConnectionHandler = (ws) => {
    console.log('Connect to websocket /ws/hello');
    ws.send('Connect to websocket /ws/hello');
    setTimeout(() => void (ws.send('5')), 1000);
    setTimeout(() => void (ws.send('4')), 2000);
    setTimeout(() => void (ws.send('3')), 3000);
    setTimeout(() => void (ws.send('2')), 4000);
    setTimeout(() => void (ws.send('1')), 5000);
    setTimeout(() => {
        ws.send('bye');
        ws.close();
    }, 6000);
};

export default hello;

