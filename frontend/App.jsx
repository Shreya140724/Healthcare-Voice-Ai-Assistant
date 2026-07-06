import { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  FaMicrophone,
  FaPaperPlane,
  FaFileAlt
} from "react-icons/fa";

import "./App.css";

function App() {

  // =====================================
  // States
  // =====================================

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");

  // =====================================
  // Refs
  // =====================================

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const chatEndRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const welcomePlayed = useRef(false);

  // =====================================
  // Auto Scroll
  // =====================================

  useEffect(() => {

    chatEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });

  }, [messages]);

  // =====================================
  // Send Message
  // =====================================

  const sendMessage = async (
    text = message
  ) => {

    if (!text.trim()) return;

    const userMessage = {
      role: "user",
      text
    };

    setMessages(prev => [
      ...prev,
      userMessage
    ]);

    try {

      setLoading(true);

      const response =
        await axios.post(
          "http://127.0.0.1:8000/chat",
          {
            message: text
          }
        );

      const botText =
        response.data.response;

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          text: botText
        }
      ]);

      await playTTS(botText);

      setMessage("");

    } catch (error) {

      console.error(error);

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          text: "Backend Error"
        }
      ]);

    } finally {

      setLoading(false);

    }

  };

  // =====================================
  // Start Recording
  // =====================================

  const startRecording = async () => {

    try {

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true
        });

      const recorder =
        new MediaRecorder(stream);

      mediaRecorderRef.current =
        recorder;

      audioChunksRef.current = [];

      recorder.ondataavailable =
        (event) => {

          if (event.data.size > 0) {

            audioChunksRef.current.push(
              event.data
            );

          }

        };

      recorder.onstop =
        async () => {

          const blob =
            new Blob(
              audioChunksRef.current,
              {
                type: "audio/wav"
              }
            );

          await transcribeAudio(blob);

        };

      recorder.start();

      setRecording(true);

    } catch {

      alert(
        "Microphone permission denied."
      );

    }

  };

  // =====================================
  // Stop Recording
  // =====================================

  const stopRecording = () => {

    mediaRecorderRef.current.stop();

    setRecording(false);

  };

  // =====================================
  // Speech To Text
  // =====================================

  const transcribeAudio =
    async (audioBlob) => {

      const formData =
        new FormData();

      formData.append(
        "file",
        audioBlob,
        "recording.wav"
      );

      try {

        const response =
          await axios.post(
            "http://127.0.0.1:8000/transcribe",
            formData
          );

        const text =
          response.data.text;

        sendMessage(text);

      } catch (error) {

        console.error(error);

      }

    };
      // =====================================
  // Text To Speech
  // =====================================

  const playTTS = async (text) => {

    try {

      // Stop previous audio if still playing
      if (audioRef.current) {

        audioRef.current.pause();
        audioRef.current.currentTime = 0;

      }

      const response =
        await axios.post(
          "http://127.0.0.1:8000/tts",
          { text },
          {
            responseType: "blob"
          }
        );

      const audioUrl =
        URL.createObjectURL(response.data);

      audioRef.current =
        new Audio(audioUrl);

      const audio =
        audioRef.current;

      // Avatar starts speaking
      setSpeaking(true);

      if (videoRef.current) {

        videoRef.current.currentTime = 0;
        videoRef.current.play();

      }

      audio.onended = () => {

        setSpeaking(false);

        if (videoRef.current) {

          videoRef.current.pause();
          videoRef.current.currentTime = 0;

        }

        // Free memory
        URL.revokeObjectURL(audioUrl);

      };

      await audio.play();

    } catch (error) {

      console.error(error);

      setSpeaking(false);

    }

  };

  // =====================================
  // Welcome Message
  // =====================================

  useEffect(() => {

    if (welcomePlayed.current) return;

    welcomePlayed.current = true;

    const welcomeMessage =
        "Hello! Welcome to Healthcare Voice AI Assistant. " +
        "You can ask me to show available slots, " +
        "book an appointment, " +
        "view your appointments, " +
        "cancel an appointment, " +
        "or modify an existing appointment. " +
        "How may I assist you today?";

    setMessages([
        {
            role: "assistant",
            text: welcomeMessage
        }
    ]);

    playTTS(welcomeMessage);

}, []);

  // =====================================
  // Generate Summary
  // =====================================

  const generateSummary =
    async () => {

      try {

        const history =
          messages.map(
            msg => ({
              role: msg.role,
              content: msg.text
            })
          );

        const response =
          await axios.post(
            "http://127.0.0.1:8000/summary",
            {
              conversation_history: history,
              phone: "9876543210"
            }
          );

        setSummary(
          response.data.summary
        );

      } catch (error) {

        console.error(error);

      }

    };
  // =====================================
  // UI
  // =====================================

  return (

    <div className="container">

      <h1>🏥 Healthcare Voice AI Assistant</h1>

      <div className="dashboard">

        {/* LEFT PANEL */}

        <div className="left-panel">

          <div className="avatar-card">

            <video
              ref={videoRef}
              className="avatar-video"
              muted
              loop
              playsInline
            >
              <source
                src="/Speaking-Avatar.mp4"
                type="video/mp4"
              />
            </video>

            <div className="status">

              {
                recording
                  ? "🎤 Listening..."
                  : loading
                  ? "🤖 Thinking..."
                  : speaking
                  ? "🔊 Speaking..."
                  : "🟢 Ready"
              }

            </div>

          </div>

        </div>

        {/* RIGHT PANEL */}

        <div className="right-panel">

          {/* CHAT */}

          <div className="chat-box">

            {
              messages.map((msg, index) => (

                <div
                  key={index}
                  className={
                    msg.role === "user"
                      ? "message-row user-row"
                      : "message-row bot-row"
                  }
                >

                  <div
                    className={
                      msg.role === "user"
                        ? "user-message"
                        : "bot-message"
                    }
                  >
                    {msg.text}
                  </div>

                </div>

              ))
            }

            <div ref={chatEndRef}></div>

          </div>

          {/* INPUT */}

          <textarea
            rows="3"
            value={message}
            placeholder="Type your message..."
            onChange={(e) =>
              setMessage(e.target.value)
            }
            disabled={loading}
          />

          {/* BUTTONS */}

          <div className="buttons">

            <button
              onClick={() => sendMessage()}
              disabled={loading}
            >
              <FaPaperPlane />
              Send
            </button>

            {
              !recording ? (

                <button
                  onClick={startRecording}
                  disabled={loading || speaking}
                >
                  <FaMicrophone />
                  Voice
                </button>

              ) : (

                <button
                  onClick={stopRecording}
                >
                  Stop
                </button>

              )
            }

            <button
              onClick={generateSummary}
              disabled={loading || messages.length === 0}
            >
              <FaFileAlt />
              Generate Medical Summary
            </button>

          </div>

          {/* SUMMARY */}

          {
            summary && (

              <details
                className="summary-card"
                open
              >

                <summary>
                  Conversation Summary
                </summary>

                <pre>
                  {summary}
                </pre>

              </details>

            )
          }

        </div>

      </div>

    </div>

  );

}

export default App;
