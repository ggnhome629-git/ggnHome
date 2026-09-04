import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const ChatBot = () => {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  const userToken = localStorage.getItem("accessToken");

  useEffect(() => {
    // Fetch user info
    axios
      .get(`${process.env.REACT_APP_USER_ME_API}`, {
        withCredentials: true,
        headers: {
          ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
        },
      })
      .then((response) => {
        setUser(response.data);
      })
      .catch((error) => {
        console.error("Error fetching user info:", error);
      });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (input.trim() === "") return;
    const userMessage = { sender: "user", text: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");

    axios
      .post(
        `${process.env.REACT_APP_CHATBOT_API}`,
        { message: input },
        {
          withCredentials: true,
          headers: {
            ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
          },
        }
      )
      .then((response) => {
        const botMessage = { sender: "bot", text: response.data.reply };
        setMessages((prevMessages) => [...prevMessages, botMessage]);
      })
      .catch((error) => {
        console.error("Error sending message:", error);
      });
  };

  const handleLogout = () => {
    axios
      .post(
        `${process.env.REACT_APP_LOGOUT_API}`,
        {},
        {
          withCredentials: true,
          headers: {
            ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
          },
        }
      )
      .then(() => {
        setUser(null);
      })
      .catch((error) => {
        console.error("Error logging out:", error);
      });
  };

  return (
    <div className="chatbot-container">
      {user ? (
        <>
          <div className="chat-header">
            <h2>ChatBot</h2>
            <button onClick={handleLogout}>Logout</button>
          </div>
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`message ${msg.sender === "user" ? "user" : "bot"}`}
              >
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
            />
            <button onClick={handleSend}>Send</button>
          </div>
        </>
      ) : (
        <p>Please log in to chat.</p>
      )}
    </div>
  );
};

export default ChatBot;
