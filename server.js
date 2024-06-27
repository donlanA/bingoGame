//-----------------websocket訊息區域-----------------
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });

let rooms = {};

//各種case統整
wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'join':
                handleJoinRoom(ws, data.room, data.name);
                break;
            case 'ready':
                handleReady(ws, data.room, data.name);
                break;
            case 'select':
                handleSelectNumber(ws, data.room, data.name, data.number);
                break;
            case 'win':
                handleWin(ws, data.room, data.name);
                break;
            case 'restart':
                handleRestart(ws, data.room, data.name);
                break;
            default:
                console.log('這啥啊？', data.type);
        }
    });

    ws.on('close', () => {
        handleDisconnect(ws);
    });
});

//-----------------函式區域-----------------

//新玩家加入房間
function handleJoinRoom(ws, roomNumber, name) {
    if (!rooms[roomNumber]) {
        console.log(`房間 ${roomNumber}：被創建`);
        rooms[roomNumber] = {
            clients: [],
            status: 'waiting',
            currentTurn: 0,
        };
        ws.send(JSON.stringify({
            type:'create',
            room: roomNumber,
            message:`${name} 建立了房間 ${roomNumber}`,
        }));
    }
    if(rooms[roomNumber].status == 'waiting'){
        rooms[roomNumber].clients.push(ws);
        ws.roomNumber = roomNumber;
        ws.playerName = name;

        broadcast(roomNumber, {
            type: 'join',
            name: name,
            total: rooms[roomNumber].clients.length,
            room: roomNumber,
            message:`${name} 成功加入房間了`,
        });

        console.log(`房間 ${roomNumber}：玩家 ${name} 加入了`);
        
    }else if(rooms[roomNumber].status == 'playing'){
        ws.send(JSON.stringify({
            type:'reject',
            room: roomNumber,
            message:`喔不，房間 ${roomNumber} 已經在遊戲中了`,
        }));
    }

}

//準備完畢
function handleReady(ws, roomNumber, name) {
    if (rooms[roomNumber]) {
        rooms[roomNumber].status = 'playing';
        broadcast(roomNumber, {
            type: 'ready',
            name: name,
            room: roomNumber,
            message:`${name} 開始了遊戲，現在是他的回合`,
        });
        console.log(`房間 ${roomNumber}：已由 ${name} 開始遊戲`);
    }
}

//玩家選擇數字
function handleSelectNumber(ws, roomNumber, name, number) {
    if (rooms[roomNumber]) {
        const currentTurn = rooms[roomNumber].currentTurn;
        const currentPlayer = rooms[roomNumber].clients[currentTurn];

        if (ws === currentPlayer) {
            broadcast(roomNumber, {
                type: 'select',
                name: name,
                room: roomNumber,
                number: number,
                message:`${name} 選擇了數字 ${number}`,
            });

            console.log(`房間 ${roomNumber}：玩家 ${name} 選擇了數字 ${number}`);
            
            // 更新為下一位玩家的回合
            rooms[roomNumber].currentTurn = (currentTurn + 1) % rooms[roomNumber].clients.length;

            broadcast(roomNumber, {
                type: 'turn',
                name: rooms[roomNumber].clients[rooms[roomNumber].currentTurn].playerName,
                room: roomNumber,
                message:`輪到 ${rooms[roomNumber].clients[rooms[roomNumber].currentTurn].playerName} 了`,
            });
        } else {
            broadcast(roomNumber, {
                type:'reject',
                room: roomNumber,
                message: `${name} 很急，叫 ${rooms[roomNumber].clients[currentTurn].playerName} 快一點`,
            });
        }
    }
}

//玩家勝利
function handleWin(ws, roomNumber, name) {
    if (rooms[roomNumber]) {
        broadcast(roomNumber, {
            type: 'win',
            name: name,
            room: roomNumber,
            message:`${name} 連成一條線了，恭喜`
        });
        console.log(`房間 ${roomNumber}：玩家 ${name} 已連成一條線`);
    }
}

//玩家退出房間
function handleDisconnect(ws) {
    const roomNumber = ws.roomNumber;
    if (rooms[roomNumber]) {
        rooms[roomNumber].clients = rooms[roomNumber].clients.filter(client => client !== ws);
        console.log(`房間 ${roomNumber}：一位玩家離開了`);

        if (rooms[roomNumber].clients.length === 0) {
            delete rooms[roomNumber];
            console.log(`房間 ${roomNumber}：沒有成員，已被刪除`);
        } else {
            broadcast(roomNumber, {
                type: 'leave',
                total: rooms[roomNumber].clients.length,
                room: roomNumber,
                message:`一位玩家離開了`,
            });
        }
    }
}

//玩家重新開始
function handleRestart(ws, roomNumber, name) {
    if (rooms[roomNumber]) {
        rooms[roomNumber].status = 'waiting';
        broadcast(roomNumber, {
            type: 'restart',
            name: name,
            room: roomNumber,
            message:`${name} 讓大家重新準備`,
        });
        console.log(`房間 ${roomNumber}：已由玩家 ${name} 重新開始遊戲`);
    }
}

//廣播給所有玩家
function broadcast(roomNumber, message) {
    if (rooms[roomNumber]) {
        rooms[roomNumber].clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
}

console.log('WebSocket server端已啟動，ip位址： ws://127.0.0.1:3000');
