import React, { useEffect, useRef, useState } from "react";
import TopNavigationBar from "../../Dashboard/TopNavigationBar";
import { useAuth } from "../../../Context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet";

const VoiceAssistantRent = () => {
  // Ready sound for mic
  const readySound = useRef(new Audio("/MicSound.mp3"));
  const playReadySound = () => {
    if (readySound.current) {
      readySound.current.currentTime = 0;
      readySound.current
        .play()
        .catch((err) => console.warn("Sound play failed:", err));
    }
  };

  // Ensure page is scrolled to top when this screen/component loads
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.scrollTo) {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
    } catch (e) {
      /* ignore */
    }
  }, []);

  const [sessionId, setSessionId] = useState(null);
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState([]);
  const [waveform, setWaveform] = useState(Array(40).fill(0));
  const [isMobile, setIsMobile] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [conversationState, setConversationState] = useState("idle"); // idle, speaking, listening, processing

  const recognitionRef = useRef(null);
  const isRecognizingRef = useRef(false);
  const speakingRef = useRef(false);
  const isBotSpeakingRef = useRef(false);
  const messagesEndRef = useRef(null);
  const waveIntervalRef = useRef(null);
  const collectedPrefsRef = useRef([]);

   const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Conversation questions for rental preferences
  const questions = [
    "Hello! I'm Aria, your AI rental assistant. Let's find your ideal rental property. First, which sector are you interested in?",
    "What is your budget range for the rent?",
    "How many bedrooms or what property size do you prefer?",
    "Are there any specific amenities or features you want?",
    "Thank you for sharing all the details. I'll save your preferences now.",
  ];

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // Hybrid authentication: get user token from localStorage
  const userToken = localStorage.getItem("accessToken");

  // Quick suggestions based on current question
  const quickSuggestions = [
    ["Sector 45", "DLF Phase 2", "Gurgaon Central", "Near Metro"],
    ["₹10K-15K", "₹15K-20K", "₹20K-25K", "₹25K-30K"],
    ["1 BHK", "2 BHK", "3 BHK", "Studio Apartment"],
    ["Swimming Pool", "Gym", "Parking", "Security", "Park"]
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  

  const navItems = [
    "For Buyers",
    "For Tenants",
    "For Owners",
    "For Dealers / Builders",
    "Insights",
  ];

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (listening) {
      waveIntervalRef.current = setInterval(() => {
        setWaveform(
          Array(40)
            .fill(0)
            .map(() => Math.random() * 100)
        );
      }, 100);
    } else {
      if (waveIntervalRef.current) clearInterval(waveIntervalRef.current);
      setWaveform(Array(40).fill(0));
    }
    return () => {
      if (waveIntervalRef.current) clearInterval(waveIntervalRef.current);
    };
  }, [listening]);

  // Initialize speech recognition
  useEffect(() => {
    if (!sessionId) return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser!");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      isRecognizingRef.current = true;
      setListening(true);
      setConversationState("listening");
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      setListening(false);
      setConversationState("idle");
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      isRecognizingRef.current = false;
      setListening(false);
      setConversationState("idle");
    };

    recognition.onresult = async (event) => {
      if (speakingRef.current || isBotSpeakingRef.current) return;
      
      try {
        const userSpeech = event.results[0][0].transcript.trim();
        console.log("🎤 Recognized speech:", userSpeech);
        
        await processUserResponse(userSpeech);
      } catch (err) {
        console.error("Speech result error:", err);
      }
    };

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [sessionId]);

  // Process user response (both voice and text)
// Process user response (both voice and text)
const processUserResponse = async (userResponse) => {
  const botQuestion = questions[currentQuestionIdx];

  // Normalize text for similarity checks
  const normalizedUser = userResponse.toLowerCase().replace(/[^a-z0-9 ]/g, "");
  const normalizedQuestion = botQuestion.toLowerCase().replace(/[^a-z0-9 ]/g, "");

  // Compute overlap ratio (naive word overlap)
  let overlap = 0;
  const wordsUser = new Set(normalizedUser.split(" ").filter(Boolean));
  const wordsBot = new Set(normalizedQuestion.split(" ").filter(Boolean));
  for (const word of wordsUser) if (wordsBot.has(word)) overlap++;
  const ratio = overlap / Math.max(wordsBot.size, 1);

  // Allow numeric or short property answers even if overlapping
  const hasNumericAnswer =
    /\d+|₹|rs\b|k\b|bhk\b|studio\b|one\b|two\b|three\b/.test(normalizedUser);

  // If user repeats the bot's question → ignore EXCEPT when numeric answer is detected
  if (
    (ratio > 0.6 ||
      normalizedUser.includes("how many") ||
      normalizedUser.includes("what is your budget") ||
      normalizedUser.includes("which location") ||
      normalizedUser.includes("amenities") ||
      normalizedUser.includes("are you looking")) &&
    !hasNumericAnswer
  ) {
    console.log("⚠️ Ignoring repeated input:", userResponse, {
      ratio,
      hasNumericAnswer,
    });

    setMessages((prev) => [
      ...prev,
      {
        type: "bot",
        text: "Please answer the question so I can continue.",
      },
    ]);
    speak("Please answer the question so I can continue.");
    return;
  }

  // Save user answer
  collectedPrefsRef.current.push(userResponse);
  console.log("🧩 Collected responses:", collectedPrefsRef.current);

  setMessages((prev) => [...prev, { type: "user", text: userResponse }]);
  setConversationState("processing");

  // Move to next question
  setTimeout(() => {
    const nextIdx = currentQuestionIdx + 1;
    setCurrentQuestionIdx(nextIdx);

    if (nextIdx === questions.length - 1) {
      // Last question → save preferences
      handleSavePreferences();
    } else if (nextIdx < questions.length) {
      setMessages((prev) => [
        ...prev,
        { type: "bot", text: questions[nextIdx] },
      ]);

      speak(questions[nextIdx]);
      setSuggestions(quickSuggestions[nextIdx] || []);
    }
  }, 1000);
};

  // Handle saving preferences to backend
  const handleSavePreferences = async () => {
    const orderedPrefs = {
      location: collectedPrefsRef.current[0] || "",
      budget: collectedPrefsRef.current[1] || "",
      size: collectedPrefsRef.current[2] || "",
      amenities: collectedPrefsRef.current[3] ? [collectedPrefsRef.current[3]] : [],
      furnishing: "",
      propertyType: "",
    };

    const searchQuery = encodeURIComponent(
      `${orderedPrefs.size || ""} in ${orderedPrefs.location}`.trim()
    );

    // Show thank you message
    setMessages((prev) => [
      ...prev,
      { type: "bot", text: questions[questions.length - 1] },
    ]);
    speak(questions[questions.length - 1]);

    // Save to backend
    try {
      const resp = await fetch(
        process.env.REACT_APP_RENTAL_PROPERTY_PREFERENCE_ARIA,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
          },
          body: JSON.stringify({
            email: user?.email || null,
            assistantType: "rental",
            preferences: orderedPrefs,
          }),
          credentials: "include",
        }
      );
      
      if (resp.ok) {
        const result = await resp.json().catch(() => ({}));
        console.log("✅ Preferences saved successfully!");
        // Navigate to search page after a delay
        setTimeout(() => {
          navigate(`/search/${searchQuery}`);
        }, 3000);
      }
    } catch (err) {
      console.error("❌ Error saving preferences:", err);
    }
  };

  // Text to Speech function
  const speak = (text) => {
    try {
      window.speechSynthesis.cancel();
      isBotSpeakingRef.current = true;
      speakingRef.current = true;
      setConversationState("speaking");
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-IN";
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find((v) => v.name.includes("Google UK English Female")) ||
        voices.find((v) => v.name.includes("Google US English")) ||
        voices.find((v) => v.name.includes("Microsoft")) ||
        voices.find((v) => v.lang === "en-IN") ||
        voices[0];
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        isBotSpeakingRef.current = false;
        speakingRef.current = false;
        setConversationState("idle");
      };

      utterance.onerror = () => {
        isBotSpeakingRef.current = false;
        speakingRef.current = false;
        setConversationState("idle");
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech synthesis error:", e);
      speakingRef.current = false;
      setConversationState("idle");
    }
  };

  // Manual mic control
  const handleMicToggle = () => {
    if (listening) {
      // Stop listening
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      // Start listening
      if (recognitionRef.current && !isRecognizingRef.current) {
        playReadySound();
        recognitionRef.current.start();
      }
    }
  };

  // Handle text input submission
  const handleTextSubmit = () => {
    if (textInput.trim()) {
      processUserResponse(textInput.trim());
      setTextInput("");
      setShowTextInput(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    processUserResponse(suggestion);
  };

  // Repeat current question
  const handleRepeatQuestion = () => {
    speak(questions[currentQuestionIdx]);
  };

  // Skip current question
  const handleSkipQuestion = () => {
    collectedPrefsRef.current.push("Skipped");
    const nextIdx = currentQuestionIdx + 1;
    setCurrentQuestionIdx(nextIdx);
    
    if (nextIdx < questions.length) {
      setMessages((prev) => [
        ...prev,
        { type: "bot", text: questions[nextIdx] },
      ]);
      speak(questions[nextIdx]);
      setSuggestions(quickSuggestions[nextIdx] || []);
    }
  };

  // Start conversation when session begins
  useEffect(() => {
    if (sessionId) {
      setCurrentQuestionIdx(0);
      setMessages([{ type: "bot", text: questions[0] }]);
      speak(questions[0]);
      setSuggestions(quickSuggestions[0] || []);
    }
  }, [sessionId]);

  // Initialize voices
  useEffect(() => {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        window.speechSynthesis.cancel();
      } catch {}
    };
  }, []);

  return (
    <>
      <Helmet>
  <title>ARIA — AI Rental Assistant | GgnHome</title>

  <meta
    name="description"
    content="ARIA is GgnHome's AI-powered rental assistant. Search Gurgaon rental properties using your voice — choose sectors, set your budget, specify BHK size, and get instant personalized property recommendations."
  />

  <meta
    name="keywords"
    content="AI rental assistant, Gurgaon rental search, voice property search, ARIA AI, GgnHome rentals, 2BHK Gurgaon, property assistant Gurgaon, sector-based rent search"
  />

  {/* Open Graph (for WhatsApp, Facebook, LinkedIn) */}
  <meta property="og:title" content="ARIA — AI Rental Assistant | GgnHome" />
  <meta
    property="og:description"
    content="Speak to ARIA to discover the best rental properties in Gurgaon. Sector-based results, budget-based filtering, and AI-powered recommendations."
  />
  <meta property="og:image" content="https://ggnhome.in/logo192.png" />
  <meta property="og:url" content="https://ggnhome.in/AIassistant-Rent" />
  <meta property="og:type" content="website" />

  {/* Twitter Cards */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="ARIA — AI Rental Assistant | GgnHome" />
  <meta
    name="twitter:description"
    content="Find Gurgaon rental properties hands-free with ARIA, your AI voice assistant."
  />
  <meta name="twitter:image" content="https://ggnhome.in/logo192.png" />

  {/* SEO Essentials */}
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://ggnhome.in/AIassistant-Rent" />
</Helmet>
      {/* Top Navigation Bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          zIndex: 999,
          backgroundColor: "#FFFFFF",
        }}
      >
        <TopNavigationBar
          
          navItems={navItems}
        />
      </div>

      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #000814 0%, #001d3d 50%, #003566 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: isMobile ? "10px" : "20px",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          position: "relative",
          overflow: "hidden",
          paddingTop: "70px",
          paddingBottom: isMobile ? "120px" : "140px",
        }}
      >
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
          @keyframes ripple {
            0% { transform: scale(0.8); opacity: 0.8; }
            100% { transform: scale(2.5); opacity: 0; }
          }
          @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px rgba(34, 211, 238, 0.5); }
            50% { box-shadow: 0 0 40px rgba(34, 211, 238, 0.8); }
          }
        `}</style>

        {/* Animated background particles */}
        {[...Array(isMobile ? 8 : 15)].map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: "6px",
              height: "6px",
              background: i % 2 === 0 ? "#22D3EE" : "#00A79D",
              borderRadius: "50%",
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${6 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
              opacity: 0.6,
            }}
          />
        ))}

        <div
          style={{
            width: "100%",
            maxWidth: "800px",
            background: "rgba(0, 13, 26, 0.9)",
            borderRadius: "24px",
            padding: isMobile ? "20px" : "30px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(34, 211, 238, 0.3)",
            position: "relative",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
              <div style={{
                width: "50px",
                height: "50px",
                background: "linear-gradient(135deg, #00A79D, #22D3EE)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "pulse 2s ease-in-out infinite",
              }}>
                <span style={{ color: "white", fontSize: "24px" }}>🎙️</span>
              </div>
              <h1 style={{
                color: "#22D3EE",
                fontSize: isMobile ? "28px" : "36px",
                fontWeight: "800",
                margin: 0,
                background: "linear-gradient(135deg, #22D3EE, #00A79D)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                ARIA
              </h1>
            </div>
            <p style={{
              color: "#F4F7F9",
              fontSize: isMobile ? "12px" : "14px",
              margin: 0,
              opacity: 0.8,
            }}>
              AI Rental Assistant
            </p>
          </div>

          {!sessionId ? (
            // Start Session Screen
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{
                width: "120px",
                height: "120px",
                margin: "0 auto 30px",
                animation: "float 4s ease-in-out infinite",
              }}>
                <div style={{
                  position: "absolute",
                  inset: "0",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(0, 167, 157, 0.3), rgba(34, 211, 238, 0.3))",
                  animation: "ripple 2s ease-out infinite",
                }} />
                <div style={{
                  position: "absolute",
                  inset: "15px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #00A79D, #22D3EE)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 10px 40px rgba(34, 211, 238, 0.5)",
                }}>
                  <span style={{ color: "white", fontSize: "40px" }}>🏠</span>
                </div>
              </div>
              
              <button
                onClick={() => setSessionId(`user_${Math.random().toString(36).substr(2, 9)}`)}
                style={{
                  padding: "16px 40px",
                  background: "linear-gradient(135deg, #00A79D, #22D3EE)",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "25px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "700",
                  boxShadow: "0 10px 30px rgba(0, 167, 157, 0.4)",
                  transition: "all 0.3s ease",
                }}
              >
                Start Conversation
              </button>
            </div>
          ) : (
            // Chat Interface
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Messages Container */}
              <div style={{
                background: "rgba(0, 29, 61, 0.6)",
                borderRadius: "20px",
                padding: "20px",
                height: isMobile ? "300px" : "400px",
                overflowY: "auto",
                border: "1px solid rgba(34, 211, 238, 0.2)",
              }}>
                {messages.map((msg, idx) => (
                  <div key={idx} style={{
                    marginBottom: "16px",
                    display: "flex",
                    justifyContent: msg.type === "user" ? "flex-end" : "flex-start",
                  }}>
                    <div style={{
                      maxWidth: "80%",
                      padding: "12px 18px",
                      borderRadius: msg.type === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      background: msg.type === "user" 
                        ? "linear-gradient(135deg, #22D3EE, #00A79D)"
                        : "rgba(74, 106, 138, 0.3)",
                      color: "#FFFFFF",
                      fontSize: "14px",
                      lineHeight: "1.5",
                    }}>
                      <div style={{ fontSize: "10px", opacity: 0.8, marginBottom: "4px" }}>
                        {msg.type === "user" ? "YOU" : "ARIA"}
                      </div>
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestions */}
              {suggestions.length > 0 && (
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  justifyContent: "center",
                }}>
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      style={{
                        padding: "10px 16px",
                        background: "rgba(34, 211, 238, 0.1)",
                        border: "1px solid rgba(34, 211, 238, 0.3)",
                        borderRadius: "20px",
                        color: "#22D3EE",
                        fontSize: "12px",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = "rgba(34, 211, 238, 0.2)";
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = "rgba(34, 211, 238, 0.1)";
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Text Input */}
              {showTextInput && (
                <div style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                }}>
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type your answer..."
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(34, 211, 238, 0.3)",
                      borderRadius: "20px",
                      color: "white",
                      fontSize: "14px",
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
                  />
                  <button
                    onClick={handleTextSubmit}
                    style={{
                      padding: "12px 20px",
                      background: "linear-gradient(135deg, #00A79D, #22D3EE)",
                      border: "none",
                      borderRadius: "20px",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Send
                  </button>
                </div>
              )}

              {/* Control Buttons */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px",
                marginBottom: "10px",
              }}>
                <button
                  onClick={handleRepeatQuestion}
                  disabled={conversationState === "speaking"}
                  style={{
                    padding: "12px",
                    background: "rgba(74, 106, 138, 0.3)",
                    border: "1px solid rgba(74, 106, 138, 0.5)",
                    borderRadius: "15px",
                    color: "#F4F7F9",
                    cursor: "pointer",
                    fontSize: "12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    opacity: conversationState === "speaking" ? 0.5 : 1,
                  }}
                >
                  <span>🔊</span>
                  <span>Repeat</span>
                </button>

                <button
                  onClick={handleSkipQuestion}
                  style={{
                    padding: "12px",
                    background: "rgba(255, 165, 0, 0.2)",
                    border: "1px solid rgba(255, 165, 0, 0.5)",
                    borderRadius: "15px",
                    color: "#FFA500",
                    cursor: "pointer",
                    fontSize: "12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span>⏭️</span>
                  <span>Skip</span>
                </button>

                <button
                  onClick={() => setShowTextInput(!showTextInput)}
                  style={{
                    padding: "12px",
                    background: "rgba(34, 211, 238, 0.1)",
                    border: "1px solid rgba(34, 211, 238, 0.3)",
                    borderRadius: "15px",
                    color: "#22D3EE",
                    cursor: "pointer",
                    fontSize: "12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span>⌨️</span>
                  <span>Type</span>
                </button>
              </div>

              {/* Main Mic Button */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  onClick={handleMicToggle}
                  disabled={conversationState === "speaking"}
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    background: listening 
                      ? "linear-gradient(135deg, #ff6b6b, #ee5a52)"
                      : "linear-gradient(135deg, #00A79D, #22D3EE)",
                    border: "none",
                    color: "white",
                    fontSize: "24px",
                    cursor: conversationState === "speaking" ? "not-allowed" : "pointer",
                    boxShadow: listening 
                      ? "0 0 0 10px rgba(255, 107, 107, 0.3)" 
                      : "0 10px 30px rgba(0, 167, 157, 0.4)",
                    transition: "all 0.3s ease",
                    opacity: conversationState === "speaking" ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {listening ? "⏹️" : "🎙️"}
                </button>
              </div>

              {/* Status Indicator */}
              <div style={{
                textAlign: "center",
                color: conversationState === "speaking" ? "#00A79D" : 
                       conversationState === "listening" ? "#22D3EE" : "#4A6A8A",
                fontSize: "12px",
                fontWeight: "600",
              }}>
                {conversationState === "speaking" ? "Aria is speaking..." :
                 conversationState === "listening" ? "Listening... Speak now" :
                 conversationState === "processing" ? "Processing your response..." :
                 "Ready - Tap mic to speak"}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default VoiceAssistantRent;