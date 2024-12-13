const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQOpH43k0f6Cc0Qn1gzXsnJNDybSce7CTW1hOWBgvTJIfTPuaZsEpcbO1u9E7CIQSSGzAHa4ZST7fFw/pub?output=csv";

let conversations = [];
let speakerFirstAppearance = {}; // {speaker: startId}
let displayedSpeakers = [];
let currentSpeaker = null;
let currentId = null;

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

    // 最初に出てきたspeakerを特定
    const firstSpeakerLine = conversations.find(c => c.speaker !== "");
    if (firstSpeakerLine) {
      // 初登場スピーカーを記録
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
  if (!startId) return; // 万が一記録がない場合

  currentId = startId;
  await displayFromId(currentId);
}

async function displayFromId(startId) {
  let index = conversations.findIndex(c => c.id === startId);
  if (index === -1) return;

  let currentRow = conversations[index];
  let currentSp = currentRow.speaker;

  while (true) {
    if (!currentRow) break;

    if (currentRow.speaker !== "" && currentRow.speaker === currentSp) {
      // 同一スピーカーのメッセージ
      addMessageToChat(currentRow.speaker, currentRow.message);
      currentId = currentRow.id;
      await sleep(1000);

      let next = conversations.find(c => c.id === currentRow.id + 1);

      if (!next) {
        // もう次がない
        break;
      }

      if (next.speaker === currentSp) {
        // 同じspeaker続行
        currentRow = next;
      } else if (next.speaker === "") {
        // ユーザーターン
        await handleUserTurn(next);
        break;
      } else {
        // 新しいspeaker登場
        // 記録＆トーク一覧に追加（未読）、現在の会話ストップ
        if (!speakerFirstAppearance[next.speaker]) {
          speakerFirstAppearance[next.speaker] = next.id;
          addSpeakerToList(next.speaker, true);
        }
        break;
      }

    } else if (currentRow.speaker === "") {
      // ユーザー操作行
      await handleUserTurn(currentRow);
      break;

    } else {
      // 現在のスピーカーと異なる別スピーカーがいきなり出た場合
      // このケースは上で対処済みですが念のため
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
          await sleep(500);
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

      if (userText === answer && TrueId) {
        await displayFromId(parseInt(TrueId,10));
      } else if (NGid) {
        await displayFromId(parseInt(NGid,10));
      } else {
        // NGidなしか正解不正解分岐が成立しない場合は特に進行なし
      }
    };

  } else {
    // 選択肢も自由入力もなし
    // 何もせず終了
  }
}

function addMessageToChat(speaker, text) {
  const rowDiv = document.createElement("div");
  rowDiv.className = "message-row " + (speaker === "あなた" ? "message-right" : "message-left");

  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "message-bubble";
  const safeText = text.replace(/\n/g, "<br>");
  bubbleDiv.innerHTML = `<strong>${speaker}:</strong><br>${safeText}`;

  rowDiv.appendChild(bubbleDiv);
  messageContainer.appendChild(rowDiv);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
