const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQOpH43k0f6Cc0Qn1gzXsnJNDybSce7CTW1hOWBgvTJIfTPuaZsEpcbO1u9E7CIQSSGzAHa4ZST7fFw/pub?output=csv";

let conversations = [];
let speakerFirstAppearance = {}; 
let displayedSpeakers = [];
let currentSpeaker = null;
let currentId = null;
let typingIndicatorDiv = null;
let typingIndicatorInterval = null;

const messageContainer = document.getElementById("messageContainer");
const talkList = document.getElementById("talkList");
const inputArea = document.getElementById("inputArea");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const choicesArea = document.getElementById("choicesArea");

window.addEventListener("load", async () => {
  messageContainer.textContent = "データ取得中...";

  try {
    const response = await fetch(SPREADSHEET_URL);
    const csvText = await response.text();
    const rows = csvText.split("\n").map(r => r.split(","));

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 3 || !row[0]) continue;
      let obj = {
        id: parseInt(row[0], 10),
        speaker: row[1].trim(),
        message: row[2],
        input: row[3] || "",
        answer: row[4] || "",
        TrueId: row[5] || "",
        NGid: row[6] || "",
        choice1: row[7] || "",
        choice2: row[8] || "",
        choice3: row[9] || "",
        nextId1: row[10] || "",
        nextId2: row[11] || "",
        nextId3: row[12] || ""
      };
      conversations.push(obj);
    }

    messageContainer.textContent = "";

    const firstSpeakerLine = conversations.find(c => c.speaker !== "");
    if (firstSpeakerLine) {
      speakerFirstAppearance[firstSpeakerLine.speaker] = firstSpeakerLine.id;
      addSpeakerToList(firstSpeakerLine.speaker, true);
    }

  } catch (err) {
    console.error(err);
    messageContainer.textContent = "データ取得失敗。URLや公開設定を確認してください。";
  }
});

function addSpeakerToList(speaker, unread = true) {
  if (displayedSpeakers.includes(speaker)) return;
  displayedSpeakers.push(speaker);

  const item = document.createElement("div");
  item.className = "talk-item";

  const nameDiv = document.createElement("div");
  nameDiv.className = "talk-item-name";
  nameDiv.textContent = speaker;
  item.appendChild(nameDiv);

  if (unread) {
    const unreadIcon = document.createElement("div");
    unreadIcon.className = "unread-icon";
    item.appendChild(unreadIcon);
  }

  item.addEventListener("click", () => {
    const icon = item.querySelector(".unread-icon");
    if (icon) icon.remove();
    startConversation(speaker);
  });

  talkList.appendChild(item);
}

async function startConversation(speaker) {
  if (currentSpeaker === speaker) return;
  currentSpeaker = speaker;
  messageContainer.innerHTML = "";
  inputArea.style.display = "none";
  choicesArea.style.display = "none";
  userInput.value = "";

  const startId = speakerFirstAppearance[speaker];
  if (!startId) return;

  currentId = startId;
  await displayFromId(currentId);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 2文字で0.1秒 → 1文字50ms
function getDelayForMessage(msg) {
  const perCharTime = 50; // 1文字0.05秒
  const randomMin = 1.0;
  const randomMax = 1.5; // 前より狭める
  const length = msg.length;
  const base = length * perCharTime;
  const factor = Math.random() * (randomMax - randomMin) + randomMin;
  return Math.floor(base * factor);
}

function showTypingIndicator() {
  hideTypingIndicator();
  typingIndicatorDiv = document.createElement("div");
  typingIndicatorDiv.className = "message-row message-left";
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.innerHTML = `.`; 
  typingIndicatorDiv.appendChild(bubble);
  messageContainer.appendChild(typingIndicatorDiv);
  messageContainer.scrollTop = messageContainer.scrollHeight;

  let states = [".","..","..."];
  let cycleCount = 0;
  let stateIndex = 0;

  typingIndicatorInterval = setInterval(() => {
    stateIndex++;
    if (stateIndex >= states.length) {
      stateIndex = 0;
      cycleCount++;
    }
    bubble.innerHTML = states[stateIndex];

    if (cycleCount >= 2 && stateIndex === states.length - 1) {
      clearInterval(typingIndicatorInterval);
      typingIndicatorInterval = null;
    }
    messageContainer.scrollTop = messageContainer.scrollHeight;
  }, 500);
}

function hideTypingIndicator() {
  if (typingIndicatorInterval) {
    clearInterval(typingIndicatorInterval);
    typingIndicatorInterval = null;
  }
  if (typingIndicatorDiv && typingIndicatorDiv.parentNode) {
    typingIndicatorDiv.parentNode.removeChild(typingIndicatorDiv);
    typingIndicatorDiv = null;
  }
}

function getTypingWaitTime() {
  const min = 1000; // 1〜2秒でさらに短縮
  const max = 2000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function displayFromId(startId) {
  let index = conversations.findIndex(c => c.id === startId);
  if (index === -1) return;

  let currentRow = conversations[index];
  let currentSp = currentRow.speaker;

  while (true) {
    if (!currentRow) break;

    if (currentRow.speaker !== "" && currentRow.speaker === currentSp) {
      // 相手メッセージ表示
      addMessageToChat(currentRow.speaker, currentRow.message);
      currentId = currentRow.id;
      
      await sleep(getDelayForMessage(currentRow.message));

      let next = conversations.find(c => c.id === currentRow.id + 1);

      if (!next) {
        break;
      }

      if (next.speaker === currentSp) {
        // 連続メッセージ: 即...表示
        showTypingIndicator();
        await sleep(getTypingWaitTime());
        hideTypingIndicator();
        currentRow = next;
      } else if (next.speaker === "") {
        await handleUserTurn(next);
        break;
      } else {
        if (!speakerFirstAppearance[next.speaker]) {
          speakerFirstAppearance[next.speaker] = next.id;
          addSpeakerToList(next.speaker, true);
        }
        break;
      }

    } else if (currentRow.speaker === "") {
      await handleUserTurn(currentRow);
      break;

    } else {
      if (!speakerFirstAppearance[currentRow.speaker]) {
        speakerFirstAppearance[currentRow.speaker] = currentRow.id;
        addSpeakerToList(currentRow.speaker, true);
      }
      break;
    }
  }
}

async function handleUserTurn(row) {
  const {input, answer, TrueId, NGid, choice1, choice2, choice3, nextId1, nextId2, nextId3} = row;

  inputArea.style.display = "none";
  choicesArea.style.display = "none";

  if (choice1 || choice2 || choice3) {
    // 選択肢
    choicesArea.innerHTML = "";
    choicesArea.style.display = "block";

    const choices = [];
    if (choice1) choices.push({text: choice1, nextId: nextId1});
    if (choice2) choices.push({text: choice2, nextId: nextId2});
    if (choice3) choices.push({text: choice3, nextId: nextId3});

    await new Promise(resolve => {
      choices.forEach(ch => {
        const btn = document.createElement("button");
        btn.textContent = ch.text;
        btn.onclick = async () => {
          addMessageToChat("あなた", ch.text);
          choicesArea.style.display = "none";
          // ユーザー後は1秒待機(前は2秒だったが全体的に速く)
          await sleep(1000);
          showTypingIndicator();
          await sleep(getTypingWaitTime());
          hideTypingIndicator();

          if (ch.nextId) {
            await displayFromId(parseInt(ch.nextId,10));
          }
          resolve();
        };
        choicesArea.appendChild(btn);
      });
    });

  } else if (input && input.includes("自由入力")) {
    // 自由入力
    inputArea.style.display = "flex";
    const originalOnclick = sendBtn.onclick;
    sendBtn.onclick = async () => {
      const userText = userInput.value.trim();
      if (!userText) return;
      addMessageToChat("あなた", userText);
      userInput.value = "";
      await sleep(500);
      sendBtn.onclick = originalOnclick;

      // ユーザー後は1秒待機に短縮
      await sleep(1000);
      showTypingIndicator();
      await sleep(getTypingWaitTime());
      hideTypingIndicator();

      if (userText === answer && TrueId) {
        await displayFromId(parseInt(TrueId,10));
      } else if (NGid) {
        await displayFromId(parseInt(NGid,10));
      }
    };

  } else {
    // 選択肢も自由入力もなし
  }
}

function addMessageToChat(speaker, text) {
  const rowDiv = document.createElement("div");
  rowDiv.className = "message-row " + (speaker === "あなた" ? "message-right" : "message-left");

  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "message-bubble";
  
  const safeText = text.replace(/\n/g, "<br>");
  bubbleDiv.innerHTML = `${safeText}`;

  rowDiv.appendChild(bubbleDiv);
  messageContainer.appendChild(rowDiv);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}
