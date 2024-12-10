const API_URL = "【GASのURL】";
const encounteredSpeakers = new Set(); // これで初回登場チェック

document.addEventListener("DOMContentLoaded", () => {
  loadMessage("1");
  
  const sendBtn = document.getElementById("send-btn");
  const userInput = document.getElementById("user-input");
  
  sendBtn.addEventListener("click", () => {
    const text = userInput.value.trim();
    if (text) {
      addMessage(text, false);
      userInput.value = "";
    }
  });
});

async function loadMessage(currentId, choiceIndex) {
  let url = `${API_URL}?currentId=${currentId}`;
  if (choiceIndex !== undefined) {
    url += `&choiceIndex=${choiceIndex}`;
  }

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    addMessage("エラーが発生しました: " + data.error, true);
    return;
  }

  const isSystemMessage = data.speaker && data.speaker.trim() !== "";

  if (data.speaker && data.speaker.trim() !== "") {
    // 初登場スピーカーなら左リストに追加
    if (!encounteredSpeakers.has(data.speaker)) {
      encounteredSpeakers.add(data.speaker);
      addSpeakerToList(data.speaker);
    }

    addSpeakerName(data.speaker);
  }

  addMessage(data.message, isSystemMessage);
  clearChoices();

  if (data.choices && data.choices.length > 0) {
    showChoices(data.currentId, data.choices);
  } else {
    // 分岐なしの場合、自動で次IDへなどのロジック入れてもOK
    // const nextId = parseInt(currentId, 10)+1;
    // await new Promise(r => setTimeout(r, 500));
    // loadMessage(nextId.toString());
  }
}

function addMessage(text, isSystem) {
  const chatMessages = document.getElementById("chat-messages");
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");
  msgDiv.classList.add(isSystem ? "system-message" : "user-message");
  msgDiv.innerText = text;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addSpeakerName(name) {
  // 発言者名を上に表示するならここで
  const chatMessages = document.getElementById("chat-messages");
  const speakerDiv = document.createElement("div");
  speakerDiv.classList.add("speaker-name");
  speakerDiv.innerText = name;
  chatMessages.appendChild(speakerDiv);
}

function showChoices(currentId, choices) {
  const chatMessages = document.getElementById("chat-messages");
  const choicesDiv = document.createElement("div");
  choicesDiv.classList.add("choices");

  choices.forEach((choice, index) => {
    const btn = document.createElement("button");
    btn.classList.add("choice-btn");
    btn.innerText = choice;
    btn.addEventListener("click", () => {
      addMessage(choice, false);
      choicesDiv.remove();
      loadMessage(currentId, index);
    });
    choicesDiv.appendChild(btn);
  });

  chatMessages.appendChild(choicesDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function clearChoices() {
  const chatMessages = document.getElementById("chat-messages");
  const existingChoices = chatMessages.querySelectorAll(".choices");
  existingChoices.forEach(c => c.remove());
}

function addSpeakerToList(speakerName) {
  const speakerList = document.getElementById("speaker-list");
  const li = document.createElement("li");
  li.innerText = speakerName;
  speakerList.appendChild(li);
}
