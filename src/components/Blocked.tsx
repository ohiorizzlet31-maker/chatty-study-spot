import { useEffect, useState } from "react";

/**
 * Default landing page — a near-pixel-perfect Securly "blocked page" clone.
 * Loads stylesheets from securly.com so it really looks like the real thing.
 * Eight-key easter-egg works the same as before (handled in routes/index.tsx).
 */
export function Blocked({ eightCount }: { eightCount: number }) {
  const [host, setHost] = useState("this site");
  const [now, setNow] = useState("");

  useEffect(() => {
    setHost(window.location.hostname || "this site");
    const d = new Date();
    setNow(
      d.toLocaleString("en-US", {
        weekday: "long",
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZoneName: "short",
      }).replace(",", "")
    );
  }, []);

  // Inject the Securly stylesheets ONLY while this page is mounted, so they
  // don't leak into the rest of the app.
  useEffect(() => {
    const sheets = [
      "https://www.securly.com/app/css/login-layouts.css",
      "https://www.securly.com/app/css/blocked.css",
    ];
    const links: HTMLLinkElement[] = sheets.map((href) => {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = href;
      l.dataset.securlyClone = "1";
      document.head.appendChild(l);
      return l;
    });
    return () => { links.forEach((l) => l.remove()); };
  }, []);

  // Editable fields (stay editable, no spellcheck squiggles)
  const editStyle: React.CSSProperties = {
    outline: "none",
    border: "1px solid transparent",
    transition: "border 0.2s ease",
  };

  return (
    <main>
      <div className="blocked-page businessbg">
        <div className="padding-wrapper">
          <div className="newGrid_container shadow-container">
            <div className="row">
              <h1 className="text-center heading">Looks like this page isn't allowed</h1>
              <div className="schlblockMessage mt-0 text-center">This page has been blocked.</div>
            </div>
            <div className="row">
              <div className="col-md-7 text-center">
                <div className="lhs-img-container">
                  <img
                    src="https://www.securly.com/app/images/blocking-animation.gif"
                    alt="Blocking animation"
                  />
                </div>
              </div>
              <div className="col-md-5">
                <section className="rhs-container">
                  <div id="blockDetails" className="block-details">
                    <h2 className="details-heading">Blocking details</h2>
                    <div className="regularBody">
                      <span>URL: </span>
                      <span id="blocked-site" className="medium">{host}</span>
                    </div>
                    <div className="regularBody">
                      <span>Reason: </span>
                      <span className="medium" contentEditable suppressContentEditableWarning spellCheck={false} style={editStyle}>
                        Anonymous Proxies
                      </span>
                    </div>
                    <div id="additional-details" style={{ display: "block", marginTop: 20, borderTop: "1px solid #eee", paddingTop: 10 }}>
                      <div className="details">
                        <span>Policy: </span>
                        <span contentEditable suppressContentEditableWarning spellCheck={false} style={editStyle}>Base/Default Policy</span>
                      </div>
                      <div className="details">
                        <span>Date and time: </span>
                        <span contentEditable suppressContentEditableWarning spellCheck={false} style={editStyle}>{now}</span>
                      </div>
                      <div className="details">
                        <span>External IP: </span>
                        <span contentEditable suppressContentEditableWarning spellCheck={false} style={editStyle}>your NOT getting my ip.</span>
                      </div>
                      <div className="details"><span>Filtering methods: </span><span>DNS</span></div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* secret 8-press counter (kept from old landing for the password gate) */}
      {eightCount > 0 && (
        <div style={{
          position: "fixed", bottom: 16, right: 16,
          background: "#000", color: "#fff", padding: "6px 12px",
          borderRadius: 999, fontFamily: "monospace", fontSize: 12,
          zIndex: 9999,
        }}>
          {"8".repeat(eightCount)}
        </div>
      )}
    </main>
  );
}
