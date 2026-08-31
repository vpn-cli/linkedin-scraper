"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import anime from "animejs/lib/anime.es.js";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);

  // Anime.js Button Hover/Click Effects
  useEffect(() => {
    if (buttonRef.current) {
      buttonRef.current.addEventListener("mouseenter", () => {
        if (!loading && url) {
          anime({
            targets: buttonRef.current,
            scale: 1.05,
            duration: 800,
            elasticity: 400,
          });
        }
      });
      buttonRef.current.addEventListener("mouseleave", () => {
        anime({
          targets: buttonRef.current,
          scale: 1,
          duration: 600,
          elasticity: 300,
        });
      });
    }
  }, [loading, url]);

  const triggerClickAnimation = () => {
    anime({
      targets: buttonRef.current,
      scale: [0.9, 1.05, 1],
      easing: "easeOutElastic(1, .8)",
      duration: 600,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    triggerClickAnimation();

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json.message || json.error || "Failed to fetch profile",
        );
      }

      setData(json);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");

      // Error shake animation
      anime({
        targets: ".error-message",
        translateX: [
          { value: -10, duration: 100 },
          { value: 10, duration: 100 },
          { value: -10, duration: 100 },
          { value: 10, duration: 100 },
          { value: 0, duration: 100 },
        ],
        easing: "easeInOutQuad",
      });
    } finally {
      setLoading(false);
    }
  };

  const syntaxHighlight = (json: any) => {
    if (!json) return "";
    let str = JSON.stringify(json, null, 2);
    str = str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return str.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      function (match) {
        let cls = "json-number";
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "json-key";
          } else {
            cls = "json-string";
          }
        } else if (/true|false/.test(match)) {
          cls = "json-boolean";
        } else if (/null/.test(match)) {
          cls = "json-null";
        }
        return '<span class="' + cls + '">' + match + "</span>";
      },
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <main className="container">
      <motion.div variants={containerVariants} initial="hidden" animate="show">
        <motion.div variants={itemVariants} className="header">
          <h1 className="title">LinkedIn Scraper API</h1>
          <p className="subtitle">Real-time profile extraction dashboard</p>
        </motion.div>

        <motion.div variants={itemVariants} className="card">
          <form onSubmit={handleSubmit} className="form-group">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.linkedin.com/in/username"
              className="input"
              required
              disabled={loading}
              autoComplete="off"
            />
            <button
              ref={buttonRef}
              type="submit"
              className="button"
              disabled={loading || !url}
              style={{ minWidth: "120px" }}
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="spinner"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="spinner"
                  />
                ) : (
                  <motion.span
                    key="text"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    Extract
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </form>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: "1rem" }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="error-message"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {data && (
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="card"
              style={{ padding: 0, overflow: "hidden" }}
            >
              <div
                style={{
                  padding: "1.5rem",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h2 className="section-title" style={{ margin: 0 }}>
                  Extraction Results
                </h2>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="badge"
                >
                  200 OK
                </motion.span>
              </div>
              <div
                style={{
                  padding: "1.5rem",
                  backgroundColor: "var(--bg-input)",
                }}
              >
                <pre
                  className="json-container"
                  dangerouslySetInnerHTML={{ __html: syntaxHighlight(data) }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}
