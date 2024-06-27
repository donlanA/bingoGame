//-----------------資料讀取設定區域-----------------

//賓果卡的隨機號碼
const randomNumbersContainer = document.getElementById('cardCotainer');

//玩家選擇的開獎號碼
const bingoNumbersContainer = document.getElementById('bingoCotainer');

//按鈕狀態
const createRoomButton = document.getElementById('createRoom');
const joinRoomButton = document.getElementById('joinRoom');
const newNameButton = document.getElementById('newName');
const newCardButton = document.getElementById('newCard');
const readyButton = document.getElementById('ready');
const restartButton = document.getElementById('again');

//玩家名稱、房間號碼、在線人數、開獎號碼
const playerNameInput = document.getElementById('playerName');
const roomNumberInput = document.getElementById('roomNumber');
const nowPlayerInput = document.getElementById('playerNumber');
const nowNumberInput = document.getElementById('nowNumber');

//系統訊息
const serverLogArea = document.getElementById('serverLog');

//-----------------初始化區域-----------------
let checkDiv = [
    0,
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0
];
let checkLine = [
    //垂直
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15],
    [16, 17, 18, 19, 20],
    [21, 22, 23, 24, 25],
    //水平
    [1, 6, 11, 16, 21],
    [2, 7, 12, 17, 22],
    [3, 8, 13, 18, 23],
    [4, 9, 14, 19, 24],
    [5, 10, 15, 20, 25],
    //對角
    [1, 7, 13, 19, 25],
    [5, 9, 13, 17, 21]
];

function addText(message) {
    let newMessage = document.createElement('p');
    newMessage.textContent = '> ' + message;
    newMessage.style.fontsize = '10px';
    serverLogArea.appendChild(newMessage);
    serverLogArea.scrollTop = serverLogArea.scrollHeight;
}

//-----------------websocket訊息區域-----------------
let ws = new WebSocket('ws://127.0.0.1:3000');

ws.onmessage = event => {
    const data = JSON.parse(event.data);

    //檢查是否同房
    if (data.room == roomNumber) {

        switch (data.type) {

            case 'create':
            case 'reject':
            case 'turn':
            case 'error':
                //這些直接更新log就好
                break;

            case 'join':
                //新玩家加入
                //更新同房玩家數
                nowPlayerInput.value = data.total;
                //加入的是自己
                if (data.name == playerName) {
                    createRoomButton.disabled = true;
                    joinRoomButton.disabled = true;
                    newNameButton.disabled = true;
                    playerNameInput.disabled = true;
                    roomNumberInput.disabled = true;
                }
                break;

            case 'ready':
                //被開房者開始遊戲的加房玩家
                if (data.name != playerName) {
                    newCardButton.disabled = true;
                    readyButton.disabled = true;
                    restartButton.disabled = true;
                    const randomNumberElements = document.querySelectorAll('.randomNumber');
                    randomNumberElements.forEach(element => {
                        element.disabled = false;
                    });
                }
                break;

            case 'select':
                //更新開獎數字
                nowNumberInput.value = data.number;
                //在開獎區域產生該數字
                const bingoNumberElement = document.createElement('div');
                bingoNumberElement.textContent = data.number;
                bingoNumberElement.classList.add('bingoNumber');
                bingoNumbersContainer.appendChild(bingoNumberElement);
                bingoNumbersContainer.scrollLeft = bingoNumbersContainer.scrollWidth;
                //動畫效果
                setTimeout(() => {
                    const bingoNumberElements = document.querySelectorAll('.bingoNumber');
                    bingoNumberElements.forEach(element => {
                        element.classList.add('expand');
                        // element.disabled = true;
                    });
                }, 100);

                //檢查自己有沒有並選中
                const checkButtons = randomNumbersContainer.querySelectorAll('button');
                checkButtons.forEach(button => {
                    if (button.textContent == data.number) {
                        button.disabled = true;
                        button.classList.add('bg-blue');
                        checkDiv[button.id] = 1;
                    }
                });

                //檢查是否連成直線
                for (let i = 0; i < checkLine.length; i++) {
                    if (checkDiv[checkLine[i][0]] && checkDiv[checkLine[i][1]] && checkDiv[checkLine[i][2]] && checkDiv[checkLine[i][3]] && checkDiv[checkLine[i][4]]) {
                        ws.send(JSON.stringify({
                            type: 'win',
                            name: playerName,
                            room: roomNumber
                        }));
                    }
                }
                break;

            case 'win':
                //有人勝利
                console.log('他贏了：', data.name);
                const randomNumberElements = document.querySelectorAll('.randomNumber');
                randomNumberElements.forEach(element => {
                    element.disabled = true;
                });
                break;

            case 'leave':
                //有玩家離開
                nowPlayerInput.value = data.total;
                break;

            case 'restart':
                //重新開始
                for (let i = 0; i < 26; i++) checkDiv[i] = 0;
                generateBingoCard();
                newCardButton.disabled = false;
                nowNumberInput.value = '';
                if(data.name == playerName){
                    readyButton.disabled = false;
                    restartButton.disabled = true;                   
                }
                break;
                
            default:
                addText('沒看懂，兄弟');
                break;
        }
        addText(data.message);
    }
};
//斷線
ws.onclose = () => {
    addText('未連接至伺服器，請檢查或重開網頁');
};

//-----------------賓果卡區域-----------------
//取1~30隨機數字
let numbersPool = [];
for (let i = 1; i <= 30; i++) {
    numbersPool.push(i);
}

//隨機生成賓果卡號碼陣列
function generateUniqueRandomNumbers() {
    const uniqueNumbers = new Set();
    while (uniqueNumbers.size < 25) {
        const randomNumber = Math.floor(Math.random() * 30) + 1;
        uniqueNumbers.add(randomNumber);
    }
    return Array.from(uniqueNumbers);
}

//生成賓果卡
function generateBingoCard() {
    const randomNumbers = generateUniqueRandomNumbers();
    const formattedRandomNumbers = [];
    for (let i = 0; i < randomNumbers.length; i += 5) {
        formattedRandomNumbers.push(randomNumbers.slice(i, i + 5).join(' '));
    }
    displayRandomNumbers(formattedRandomNumbers);
}

//顯示賓果卡
function displayRandomNumbers(numbers) {
    //清空container
    randomNumbersContainer.innerHTML = '';
    bingoNumbersContainer.innerHTML = '';
    // 初始ID計數器
    let idCounter = 1;

    //共25個數字，5個一排
    numbers.forEach(numberRow => {
        const rowElement = document.createElement('div');

        numberRow.split(' ').forEach(number => {
            //設定數字，創建時禁止點擊(遊戲開始才可以點)
            const randomNumberElement = document.createElement('button');
            randomNumberElement.textContent = number;
            randomNumberElement.classList.add('randomNumber');
            randomNumberElement.disabled = true;

            // 添加ID編號
            randomNumberElement.setAttribute('id', idCounter);
            idCounter++;

            //號碼被點擊時的行為
            randomNumberElement.addEventListener('click', () => {

                if (!randomNumberElement.classList.contains('bg-blue')) {
                    //將點擊的數字傳送到server
                    const selectedNumber = randomNumberElement.textContent;
                    ws.send(JSON.stringify({
                        type: 'select',
                        name: playerName,
                        room: roomNumber,
                        number: selectedNumber
                    }));
                } else {
                    addText('這個號碼已經被選過了');
                }

            });
            rowElement.appendChild(randomNumberElement);
        });
        randomNumbersContainer.appendChild(rowElement);
    });
    //動畫效果
    setTimeout(() => {
        const randomNumberElements = document.querySelectorAll('.randomNumber');
        randomNumberElements.forEach(element => {
            element.classList.add('expand');
        });
    }, 100);
}

//初始產生一張賓果卡
generateBingoCard();

//-----------------按鈕觸發區域-----------------
let playerName;
let roomNumber;

//建立房間按鈕
createRoomButton.addEventListener('click', () => {
    playerName = playerNameInput.value;
    if (playerName) {
        //生成房間號碼
        roomNumber = Math.floor(1000 + Math.random() * 9000);
        roomNumberInput.value = roomNumber;

        createRoomButton.disabled = true;
        joinRoomButton.disabled = true;
        roomNumberInput.disabled = true;
        newNameButton.disabled = true;
        playerNameInput.disabled = true;
        readyButton.disabled = false;

        //傳送房號
        ws.send(JSON.stringify({
            type: 'join',
            name: playerName,
            total: 1,
            room: roomNumber
        }));
        console.log('已建立房間');
    } else {
        alert('請填入玩家姓名！');
    }
});

//加入房間按鈕
joinRoomButton.addEventListener('click', () => {
    playerName = playerNameInput.value;
    roomNumber = roomNumberInput.value;

    if (roomNumber) {
        if (playerName) {
            addText('正在與房間取得聯繫');
            //傳送房號
            ws.send(JSON.stringify({
                type: 'join',
                name: playerName,
                total: 1,
                room: roomNumber
            }));
        } else {
            alert('請填入玩家姓名！');
        }

    } else {
        alert('請填入房間編號！');
    }

});

//隨機生成名稱按鈕
let randomName = ['大香蕉', '兄弟你好香', '會贏喔', '確實', '動漫宅', '勇者欣美爾', '原神啟動', '這我'];
newNameButton.addEventListener('click', () => {
    playerNameInput.value = randomName[Math.floor(Math.random() * randomName.length)];
    addText('你隨機生成了名稱，你好，' + playerNameInput.value + '！');
});

//隨機生成賓果卡按鈕
newCardButton.addEventListener('click', () => {
    generateBingoCard();
    addText('你隨機生成了賓果卡，1d100=' + (Math.floor(Math.random() * 100) + 1));
});

//開始遊戲按鈕
readyButton.addEventListener('click', () => {
    newCardButton.disabled = true;
    readyButton.disabled = true;
    restartButton.disabled = false;
    const randomNumberElements = document.querySelectorAll('.randomNumber');
    randomNumberElements.forEach(element => {
        element.disabled = false;
    });
    ws.send(JSON.stringify({
        type: 'ready',
        name: playerName,
        room: roomNumber
    }));
});

//重新開始按鈕
restartButton.addEventListener('click', () => {
    ws.send(JSON.stringify({
        type: 'restart',
        name: playerName,
        room: roomNumber
    }));
});