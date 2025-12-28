"use client";

import { useState } from "react";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

const systemPrompt = `
Você é um professor de japonês para iniciantes (JLPT N5).

REGRAS IMPORTANTES:
- Fale SEMPRE em português.
- Explique tudo em português.
- Peça para o aluno responder em japonês.
- O aluno pode responder em hiragana, katakana, kanji simples ou romaji.
- Seja paciente, amigável e motivador.

FORMATO OBRIGATÓRIO DA RESPOSTA:

[Explicação]
Explique em português o que será praticado.

[Correção]
Corrija o erro do aluno (se houver), em português.

[Forma correta]
Mostre a frase correta em japonês.

[Tradução]
Traduza a frase para português.

[Pratique]
Peça para o aluno responder em japonês.

REGRAS EXTRAS:
- Se o aluno disser que não entende japonês, explique tudo em português.
- Use japonês simples (nível N5).
- Uma pergunta por vez.
`;

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [exerciseMode, setExerciseMode] = useState(true);
  const [alphabetMode, setAlphabetMode] = useState<
    "hiragana" | "katakana" | "kanji"
  >("hiragana");
  
  function renderAssistantMessage(text: string) {
  return <span>{text}</span>;
  }

  /* 🎤 Fala → Texto */
  function startVoice() {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Reconhecimento de voz não suportado");
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onerror = () => {
      alert("Erro no reconhecimento de voz");
    };

    recognition.start();
  }

  /* 🔊 Texto → Voz */
  function speakJapanese(text: string) {
    if (!("speechSynthesis" in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  }

  function alphabetInstruction() {
  if (alphabetMode === "hiragana")
    return "Responda usando APENAS hiragana.";

  if (alphabetMode === "katakana")
    return "Responda usando katakana. Se necessário, mostre hiragana entre parênteses.";

  if (alphabetMode === "kanji")
    return "Use kanji N5, sempre mostrando hiragana (furigana) entre parênteses.";

  return "";
  }

  async function sendMessage() {
    if (!input.trim()) return;

    const activePrompt = systemPrompt;

    const userMessage: Message = { role: "user", content: input };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: `${activePrompt}\n${alphabetInstruction()}` },
            ...messages,
            userMessage,
          ],
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);

      speakJapanese(data.reply); // ✅ VOZ VOLTOU
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Erro ao conectar com o professor." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="appWrapper">
      <main className="app">

        {/* HEADER */}
        <header className="header">
          <h1>🇯🇵 Japonês Conversacional</h1>

          <div className="headerRow">
            <span className="badge">N5</span>

            <span className={`badge ${exerciseMode ? "active" : "free"}`}>
              {exerciseMode ? "Exercício" : "Livre"}
            </span>

            <button
              className="modeButton"
              onClick={() => setExerciseMode(!exerciseMode)}
            >
              {exerciseMode ? "→ Modo Livre" : "→ Modo Exercício"}
            </button>
          </div>
        </header>

        <div className="chat-layout">
          {/* SIDEBAR ALFABETO */}
          <div className="alphabet-sidebar">
            <button
              className={`alphabet-btn ${alphabetMode === "hiragana" ? "active" : ""}`}
              onClick={() => setAlphabetMode("hiragana")}
            >
              あ
            </button>
            <button
              className={`alphabet-btn ${alphabetMode === "katakana" ? "active" : ""}`}
              onClick={() => setAlphabetMode("katakana")}
            >
              ア
            </button>
            <button
              className={`alphabet-btn ${alphabetMode === "kanji" ? "active" : ""}`}
              onClick={() => setAlphabetMode("kanji")}
            >
              漢
            </button>
          </div>

          {/* CHAT */}
          <section className="chat">
            
            <div className="chatModeHint">
              Modo de escrita: {alphabetMode}
            </div>

            {messages
              .filter((m) => m.role !== "system")
              .map((m, i) => (
                <div
                  key={i}
                  className={m.role === "user" ? "bubble user" : "bubble assistant"}
                >
                  {m.role === "assistant"
                    ? renderAssistantMessage(m.content)
                    : m.content}
                </div>
              ))}

            {loading && (
              <div className="bubble assistant typing">
                Professor está digitando…
              </div>
            )}
          </section>
        </div>

        {/* INPUT */}
        <footer className="inputBar">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Fale ou escreva em japonês…"
          />
          <button onClick={startVoice}>🎤</button>
          <button onClick={sendMessage}>Enviar</button>
        </footer>

      </main>
    </div>
  );
}
