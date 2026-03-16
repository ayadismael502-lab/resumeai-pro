import { useState, useRef, useCallback, useEffect } from "react";
import * as mammoth from "mammoth";

const ACCENT = "#6366f1";
const ACCENT_LIGHT = "#818cf8";
const BG_DARK = "#0f0d1a";
const BG_CARD = "#1a1730";
const BG_CARD2 = "#231f3e";
const TEXT_PRIMARY = "#f1f0f7";
const TEXT_SECONDARY = "#a5a2b8";
const SUCCESS = "#22c55e";
const WARNING = "#f59e0b";
const DANGER = "#ef4444";

const scoreColor = (s) => (s >= 75 ? SUCCESS : s >= 50 ? WARNING : DANGER);

const CircularScore = ({ score, size = 160, label }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  useEffect(() => {
    let frame;
    const start = performance.now();
    const animate = (now) => {
      const p = Math.min((now - start) / 1200, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimatedScore(Math.round(eased * score));
      if (p < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);
  const offset = circ - (animatedScore / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={BG_CARD2} strokeWidth={10} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={scoreColor(score)} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.1s linear" }}
        />
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
          fill={TEXT_PRIMARY} fontSize={size * 0.28} fontWeight="700"
          fontFamily="'DM Sans', sans-serif" style={{ transform: "rotate(90deg)", transformOrigin: "center" }}>
          {animatedScore}
        </text>
      </svg>
      {label && <span style={{ color: TEXT_SECONDARY, fontSize: 13, fontWeight: 500 }}>{label}</span>}
    </div>
  );
};

const CategoryBar = ({ label, score, delay = 0 }) => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), delay);
    return () => clearTimeout(t);
  }, [score, delay]);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ color: TEXT_PRIMARY, fontSize: 13, fontWeight: 500 }}>{label}</span>
        <span style={{ color: scoreColor(score), fontSize: 13, fontWeight: 600 }}>{score}/100</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: BG_CARD2, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${ACCENT}, ${scoreColor(score)})`,
          width: `${width}%`, transition: "width 1s cubic-bezier(0.4,0,0.2,1)"
        }} />
      </div>
    </div>
  );
};

const Badge = ({ text, type = "info" }) => {
  const colors = {
    strength: { bg: "#052e16", color: "#4ade80", border: "#166534" },
    weakness: { bg: "#2d0a0a", color: "#fca5a5", border: "#7f1d1d" },
    suggestion: { bg: "#1e1b4b", color: "#a5b4fc", border: "#3730a3" },
    info: { bg: "#172554", color: "#93c5fd", border: "#1e3a5f" },
  };
  const c = colors[type] || colors.info;
  return (
    <span style={{
      display: "inline-block", padding: "4px 12px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, background: c.bg, color: c.color,
      border: `1px solid ${c.border}`, marginRight: 6, marginBottom: 6,
    }}>{text}</span>
  );
};

const SectionCard = ({ icon, title, children, delay = 0 }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div style={{
      background: BG_CARD, borderRadius: 16, padding: "24px 28px", marginBottom: 16,
      border: `1px solid rgba(99,102,241,0.12)`,
      opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)",
      transition: "all 0.6s cubic-bezier(0.4,0,0.2,1)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h3 style={{ margin: 0, color: TEXT_PRIMARY, fontSize: 16, fontWeight: 600 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
};

export default function App() {
  const [screen, setScreen] = useState("upload");
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const fileRef = useRef();

  const loadingMessages = [
    "Reading your resume...",
    "Analyzing content structure...",
    "Evaluating keyword optimization...",
    "Checking ATS compatibility...",
    "Scoring each section...",
    "Generating improvement suggestions...",
    "Preparing your detailed report...",
  ];

  useEffect(() => {
    if (!loading) return;
    let i = 0;
    setLoadingMsg(loadingMessages[0]);
    const interval = setInterval(() => {
      i = (i + 1) % loadingMessages.length;
      setLoadingMsg(loadingMessages[i]);
    }, 2500);
    return () => clearInterval(interval);
  }, [loading]);

  const extractText = async (file) => {
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ""));
      return { type: "pdf", data: base64 };
    } else if (ext === "docx") {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return { type: "text", data: result.value };
    } else if (ext === "txt") {
      return { type: "text", data: await file.text() };
    }
    throw new Error("Unsupported file type. Please upload PDF, DOCX, or TXT.");
  };

  const analyzeResume = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setScreen("loading");

    try {
      const extracted = await extractText(file);
      const jobContext = jobTitle ? `The target job title is: "${jobTitle}". Evaluate the resume specifically for this role.` : "No specific job title provided. Give general analysis.";

      const userContent = extracted.type === "pdf"
        ? [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: extracted.data } },
            { type: "text", text: `Analyze this resume in detail. ${jobContext}\n\nReturn ONLY valid JSON (no markdown, no backticks, no explanation) in this exact format:\n{"overall_score":75,"categories":{"impact_and_achievements":70,"formatting_and_readability":80,"keyword_optimization":65,"experience_relevance":75,"education_and_skills":80,"ats_compatibility":70},"summary":"2-3 sentence executive summary","strengths":["strength1","strength2","strength3"],"weaknesses":["weakness1","weakness2","weakness3"],"suggestions":[{"section":"Section Name","issue":"What's wrong","fix":"Specific actionable fix"},{"section":"Section Name","issue":"What's wrong","fix":"Specific actionable fix"},{"section":"Section Name","issue":"What's wrong","fix":"Specific actionable fix"},{"section":"Section Name","issue":"What's wrong","fix":"Specific actionable fix"},{"section":"Section Name","issue":"What's wrong","fix":"Specific actionable fix"}],"missing_sections":["section1"],"power_words_found":["word1"],"power_words_missing":["word1","word2"],"ats_issues":["issue1"]}` }
          ]
        : `Analyze this resume in detail. ${jobContext}\n\nResume text:\n---\n${extracted.data}\n---\n\nReturn ONLY valid JSON (no markdown, no backticks, no explanation) in this exact format:\n{"overall_score":75,"categories":{"impact_and_achievements":70,"formatting_and_readability":80,"keyword_optimization":65,"experience_relevance":75,"education_and_skills":80,"ats_compatibility":70},"summary":"2-3 sentence executive summary","strengths":["strength1","strength2","strength3"],"weaknesses":["weakness1","weakness2","weakness3"],"suggestions":[{"section":"Section Name","issue":"What's wrong","fix":"Specific actionable fix"},{"section":"Section Name","issue":"What's wrong","fix":"Specific actionable fix"},{"section":"Section Name","issue":"What's wrong","fix":"Specific actionable fix"},{"section":"Section Name","issue":"What's wrong","fix":"Specific actionable fix"},{"section":"Section Name","issue":"What's wrong","fix":"Specific actionable fix"}],"missing_sections":["section1"],"power_words_found":["word1"],"power_words_missing":["word1","word2"],"ats_issues":["issue1"]}`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{ role: "user", content: userContent }],
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      const text = data.content.map((c) => c.text || "").join("");
      const clean = text.replace(/```json\s?|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setScreen("result");
    } catch (err) {
      setError(err.message || "Analysis failed. Please try again.");
      setScreen("upload");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setError(""); }
  }, []);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); setError(""); }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError("");
    setScreen("upload");
    setJobTitle("");
  };

  const catLabels = {
    impact_and_achievements: "Impact & Achievements",
    formatting_and_readability: "Formatting & Readability",
    keyword_optimization: "Keyword Optimization",
    experience_relevance: "Experience Relevance",
    education_and_skills: "Education & Skills",
    ats_compatibility: "ATS Compatibility",
  };

  return (
    <div style={{
      minHeight: "100vh", background: `linear-gradient(145deg, ${BG_DARK} 0%, #160f2e 50%, ${BG_DARK} 100%)`,
      fontFamily: "'DM Sans', sans-serif", color: TEXT_PRIMARY,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{
        padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(99,102,241,0.1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
            background: `linear-gradient(135deg, ${ACCENT}, #a855f7)`, fontSize: 20,
          }}>📄</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>ResumeAI Pro</h1>
            <p style={{ margin: 0, fontSize: 11, color: TEXT_SECONDARY }}>AI-Powered Resume Analyzer</p>
          </div>
        </div>
        {screen === "result" && (
          <button onClick={reset} style={{
            padding: "8px 20px", borderRadius: 10, border: `1px solid ${ACCENT}`, background: "transparent",
            color: ACCENT, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>New Analysis</button>
        )}
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 60px" }}>

        {/* UPLOAD SCREEN */}
        {screen === "upload" && (
          <div style={{ animation: "fadeIn 0.5s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, background: `linear-gradient(135deg, ${TEXT_PRIMARY}, ${ACCENT_LIGHT})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Analyze Your Resume with AI
              </h2>
              <p style={{ color: TEXT_SECONDARY, fontSize: 15, maxWidth: 480, margin: "0 auto" }}>
                Get an instant professional analysis with actionable feedback to land more interviews.
              </p>
            </div>

            {/* Upload zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragOver ? ACCENT : "rgba(99,102,241,0.3)"}`,
                borderRadius: 20, padding: "48px 24px", textAlign: "center", cursor: "pointer",
                background: dragOver ? "rgba(99,102,241,0.08)" : BG_CARD,
                transition: "all 0.3s ease", marginBottom: 20,
              }}
            >
              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" onChange={handleFile} style={{ display: "none" }} />
              <div style={{ fontSize: 48, marginBottom: 12, filter: dragOver ? "scale(1.1)" : "none", transition: "all 0.2s" }}>
                {file ? "✅" : "📎"}
              </div>
              {file ? (
                <>
                  <p style={{ color: TEXT_PRIMARY, fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>{file.name}</p>
                  <p style={{ color: TEXT_SECONDARY, fontSize: 13, margin: 0 }}>{(file.size / 1024).toFixed(0)} KB — Click to change file</p>
                </>
              ) : (
                <>
                  <p style={{ color: TEXT_PRIMARY, fontSize: 16, fontWeight: 500, margin: "0 0 4px" }}>Drop your resume here or click to browse</p>
                  <p style={{ color: TEXT_SECONDARY, fontSize: 13, margin: 0 }}>Supports PDF, DOCX, and TXT files</p>
                </>
              )}
            </div>

            {/* Job title input */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", color: TEXT_SECONDARY, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
                Target Job Title (optional — for tailored analysis)
              </label>
              <input
                type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Senior Product Manager, Data Scientist..."
                style={{
                  width: "100%", padding: "14px 18px", borderRadius: 12, border: `1px solid rgba(99,102,241,0.2)`,
                  background: BG_CARD, color: TEXT_PRIMARY, fontSize: 14, outline: "none",
                  boxSizing: "border-box",
                  transition: "border 0.2s",
                }}
                onFocus={(e) => e.target.style.borderColor = ACCENT}
                onBlur={(e) => e.target.style.borderColor = "rgba(99,102,241,0.2)"}
              />
            </div>

            {error && (
              <div style={{ padding: "12px 16px", borderRadius: 12, background: "#2d0a0a", border: "1px solid #7f1d1d", color: "#fca5a5", fontSize: 13, marginBottom: 20 }}>
                {error}
              </div>
            )}

            <button
              onClick={analyzeResume}
              disabled={!file}
              style={{
                width: "100%", padding: "16px", borderRadius: 14, border: "none", fontSize: 16, fontWeight: 600,
                cursor: file ? "pointer" : "not-allowed",
                background: file ? `linear-gradient(135deg, ${ACCENT}, #a855f7)` : BG_CARD2,
                color: file ? WHITE : TEXT_SECONDARY, transition: "all 0.3s",
                boxShadow: file ? "0 8px 32px rgba(99,102,241,0.3)" : "none",
              }}
            >
              🚀 Analyze My Resume
            </button>

            {/* Features */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 32 }}>
              {[
                { icon: "🎯", title: "ATS Score", desc: "Compatibility check" },
                { icon: "💡", title: "AI Suggestions", desc: "Actionable improvements" },
                { icon: "⚡", title: "Instant", desc: "Results in seconds" },
              ].map((f) => (
                <div key={f.title} style={{
                  background: BG_CARD, borderRadius: 14, padding: "18px 14px", textAlign: "center",
                  border: "1px solid rgba(99,102,241,0.08)",
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
                  <div style={{ color: TEXT_PRIMARY, fontSize: 13, fontWeight: 600 }}>{f.title}</div>
                  <div style={{ color: TEXT_SECONDARY, fontSize: 11 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LOADING SCREEN */}
        {screen === "loading" && (
          <div style={{ textAlign: "center", paddingTop: 80, animation: "fadeIn 0.4s ease" }}>
            <div style={{
              width: 80, height: 80, borderRadius: 20, margin: "0 auto 28px",
              background: `linear-gradient(135deg, ${ACCENT}, #a855f7)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "pulse 2s infinite",
            }}>
              <span style={{ fontSize: 36 }}>🔍</span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Analyzing Your Resume</h2>
            <p style={{ color: ACCENT_LIGHT, fontSize: 15, marginBottom: 32, minHeight: 24, transition: "all 0.3s" }}>{loadingMsg}</p>
            <div style={{ width: 200, height: 4, borderRadius: 2, background: BG_CARD2, margin: "0 auto", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2,
                background: `linear-gradient(90deg, ${ACCENT}, #a855f7)`,
                animation: "loading 2s infinite ease-in-out",
              }} />
            </div>
          </div>
        )}

        {/* RESULTS SCREEN */}
        {screen === "result" && result && (
          <div style={{ animation: "fadeIn 0.5s ease" }}>
            {/* Score Header */}
            <SectionCard icon="📊" title="Overall Resume Score" delay={0}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <CircularScore score={result.overall_score} size={180} />
                <p style={{ color: TEXT_SECONDARY, fontSize: 14, textAlign: "center", maxWidth: 500, lineHeight: 1.6, margin: 0 }}>
                  {result.summary}
                </p>
              </div>
            </SectionCard>

            {/* Category Breakdown */}
            <SectionCard icon="📈" title="Category Breakdown" delay={200}>
              {result.categories && Object.entries(result.categories).map(([key, val], i) => (
                <CategoryBar key={key} label={catLabels[key] || key} score={val} delay={i * 150} />
              ))}
            </SectionCard>

            {/* Strengths */}
            <SectionCard icon="💪" title="Strengths" delay={400}>
              {result.strengths?.map((s, i) => (
                <div key={i} style={{
                  display: "flex", gap: 12, padding: "10px 0",
                  borderBottom: i < result.strengths.length - 1 ? `1px solid rgba(255,255,255,0.05)` : "none",
                }}>
                  <span style={{ color: SUCCESS, fontSize: 16, flexShrink: 0 }}>✓</span>
                  <span style={{ color: TEXT_PRIMARY, fontSize: 13, lineHeight: 1.5 }}>{s}</span>
                </div>
              ))}
            </SectionCard>

            {/* Weaknesses */}
            <SectionCard icon="⚠️" title="Areas for Improvement" delay={600}>
              {result.weaknesses?.map((w, i) => (
                <div key={i} style={{
                  display: "flex", gap: 12, padding: "10px 0",
                  borderBottom: i < result.weaknesses.length - 1 ? `1px solid rgba(255,255,255,0.05)` : "none",
                }}>
                  <span style={{ color: WARNING, fontSize: 16, flexShrink: 0 }}>!</span>
                  <span style={{ color: TEXT_PRIMARY, fontSize: 13, lineHeight: 1.5 }}>{w}</span>
                </div>
              ))}
            </SectionCard>

            {/* Actionable Suggestions */}
            <SectionCard icon="🛠" title="Specific Improvements" delay={800}>
              {result.suggestions?.map((s, i) => (
                <div key={i} style={{
                  background: BG_CARD2, borderRadius: 12, padding: "16px 18px", marginBottom: 12,
                  borderLeft: `3px solid ${ACCENT}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Badge text={s.section} type="info" />
                  </div>
                  <p style={{ color: "#fca5a5", fontSize: 13, margin: "0 0 6px", fontWeight: 500 }}>
                    Issue: {s.issue}
                  </p>
                  <p style={{ color: "#a5f3c4", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                    Fix: {s.fix}
                  </p>
                </div>
              ))}
            </SectionCard>

            {/* ATS Issues */}
            {result.ats_issues?.length > 0 && (
              <SectionCard icon="🤖" title="ATS Compatibility Issues" delay={1000}>
                {result.ats_issues.map((issue, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 12, padding: "10px 0",
                    borderBottom: i < result.ats_issues.length - 1 ? `1px solid rgba(255,255,255,0.05)` : "none",
                  }}>
                    <span style={{ color: DANGER, fontSize: 14, flexShrink: 0 }}>✗</span>
                    <span style={{ color: TEXT_PRIMARY, fontSize: 13, lineHeight: 1.5 }}>{issue}</span>
                  </div>
                ))}
              </SectionCard>
            )}

            {/* Power Words */}
            <SectionCard icon="✨" title="Power Words Analysis" delay={1200}>
              {result.power_words_found?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ color: TEXT_SECONDARY, fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Found in your resume</p>
                  <div style={{ display: "flex", flexWrap: "wrap" }}>
                    {result.power_words_found.map((w) => <Badge key={w} text={w} type="strength" />)}
                  </div>
                </div>
              )}
              {result.power_words_missing?.length > 0 && (
                <div>
                  <p style={{ color: TEXT_SECONDARY, fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Consider adding</p>
                  <div style={{ display: "flex", flexWrap: "wrap" }}>
                    {result.power_words_missing.map((w) => <Badge key={w} text={w} type="suggestion" />)}
                  </div>
                </div>
              )}
            </SectionCard>

            {/* Missing Sections */}
            {result.missing_sections?.length > 0 && (
              <SectionCard icon="📋" title="Missing Sections" delay={1400}>
                {result.missing_sections.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0" }}>
                    <span style={{ color: WARNING }}>+</span>
                    <span style={{ color: TEXT_PRIMARY, fontSize: 13 }}>Add a <strong>{s}</strong> section to strengthen your resume</span>
                  </div>
                ))}
              </SectionCard>
            )}

            {/* CTA */}
            <div style={{
              textAlign: "center", marginTop: 24, padding: "28px 24px", borderRadius: 16,
              background: `linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1))`,
              border: "1px solid rgba(99,102,241,0.2)",
            }}>
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: TEXT_PRIMARY }}>
                Want to analyze another resume?
              </p>
              <button onClick={reset} style={{
                padding: "12px 32px", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg, ${ACCENT}, #a855f7)`, color: WHITE,
                fontSize: 14, fontWeight: 600, cursor: "pointer",
                boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
              }}>
                Upload New Resume
              </button>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes loading { 0% { width: 0; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0; margin-left: 100%; } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input::placeholder { color: ${TEXT_SECONDARY}; opacity: 0.6; }
        button:active { transform: scale(0.98); }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 3px; }
      `}</style>
    </div>
  );
}
