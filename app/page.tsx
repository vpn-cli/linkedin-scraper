"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

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
        let cls = "color: #f78c6c"; // number
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "color: #82aaff; font-weight: 500"; // key
          } else {
            cls = "color: #addb67"; // string
          }
        } else if (/true|false/.test(match)) {
          cls = "color: #ff5874"; // boolean
        } else if (/null/.test(match)) {
          cls = "color: #c4ce3b"; // null
        }
        return '<span style="' + cls + '">' + match + "</span>";
      },
    );
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.1, ease: "easeOut", duration: 0.5 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 200, damping: 20 },
    },
  };

  const shakeAnimation = {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4 },
  };

  return (
    <div className="app-wrapper">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="header-accent">
          <h1 className="title">LinkedIn Extractor</h1>
          <p className="subtitle">
            Gather professional experience and education seamlessly from public
            profiles.
          </p>

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
            <motion.button
              type="submit"
              className="button"
              disabled={loading || !url}
              whileHover={loading || !url ? {} : { scale: 1.05 }}
              whileTap={loading || !url ? {} : { scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Extract Profile
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </form>

          <AnimatePresence>
            {error && (
              <motion.div animate={shakeAnimation} className="error-message">
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence>
        {data && (
          <motion.div
            variants={containerVariants as any}
            initial="hidden"
            animate="show"
            className="results-container"
          >
            {data.experience && data.experience.length > 0 && (
              <>
                <h2 className="section-header">Experience</h2>
                <div className="bento-grid">
                  {data.experience.map((exp: any, i: number) => (
                    <motion.div
                      key={i}
                      variants={cardVariants as any}
                      className="bento-card"
                    >
                      <span className="badge">Employment</span>
                      <h3 className="bento-title">
                        {exp.title || "Unknown Role"}
                      </h3>
                      <div className="bento-subtitle">
                        {exp.companyName || "Unknown Company"}
                      </div>
                      <div className="bento-meta">
                        {exp.timePeriod?.startDate} —{" "}
                        {exp.timePeriod?.endDate || "Present"}
                      </div>
                      {exp.description && exp.description.length < 200 && (
                        <p className="bento-desc">{exp.description}</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {data.education && data.education.length > 0 && (
              <>
                <h2 className="section-header">Education</h2>
                <div className="bento-grid">
                  {data.education.map((edu: any, i: number) => (
                    <motion.div
                      key={i}
                      variants={cardVariants as any}
                      className="bento-card"
                    >
                      <span className="badge">Academic</span>
                      <h3 className="bento-title">
                        {edu.schoolName || "Unknown School"}
                      </h3>
                      <div className="bento-subtitle">
                        {edu.degreeName}{" "}
                        {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ""}
                      </div>
                      <div className="bento-meta">
                        {edu.timePeriod?.startDate} — {edu.timePeriod?.endDate}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            <>
              <h2 className="section-header">Raw API Payload</h2>
              <motion.div
                variants={cardVariants as any}
                style={{
                  background: "#1e1e1e",
                  borderRadius: "1rem",
                  padding: "1.5rem",
                  overflow: "auto",
                }}
              >
                <pre
                  style={{
                    fontFamily: "monospace",
                    fontSize: "0.85rem",
                    color: "#abb2bf",
                    margin: 0,
                  }}
                  dangerouslySetInnerHTML={{ __html: syntaxHighlight(data) }}
                />
              </motion.div>
            </>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
