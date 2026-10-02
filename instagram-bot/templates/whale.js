// Teacher-whale mascot: a cartoon whale with arms and legs (glasses, bow tie) that stands beside the
// stats "blackboard", talks with its mouth following the real voiceover loudness, and swings a
// pointer stick to whichever stat the narration is describing at that moment.
//
// Plain browser script (no modules) so the data-reel template can <script src> it and the site-tour
// renderer can inject it into the live marketradarwhale.com page. Exposes window.MRWhale.
(function () {
  var SVG =
    '<svg viewBox="0 0 300 480" xmlns="http://www.w3.org/2000/svg">' +
    '<defs>' +
      '<linearGradient id="mrwBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55aaff"/><stop offset="1" stop-color="#2160d6"/></linearGradient>' +
      '<linearGradient id="mrwBelly" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0f8ff"/><stop offset="1" stop-color="#b9dcff"/></linearGradient>' +
      '<clipPath id="mrwMouthClip"><ellipse class="mrw-mclip" cx="150" cy="196" rx="30" ry="3"/></clipPath>' +
    '</defs>' +
    // floor shadow
    '<ellipse cx="150" cy="466" rx="120" ry="10" fill="#000" opacity="0.28"/>' +
    // water spout on top of the head
    '<g transform="translate(150 34)">' +
      '<path class="mrw-drop" d="M0,-14 C9,-2 11,5 0,11 C-11,5 -9,-2 0,-14 Z" fill="#c4ebff"/>' +
      '<path class="mrw-drop d2" transform="translate(-22 8)" d="M0,-14 C9,-2 11,5 0,11 C-11,5 -9,-2 0,-14 Z" fill="#c4ebff"/>' +
      '<path class="mrw-drop d3" transform="translate(22 8)" d="M0,-14 C9,-2 11,5 0,11 C-11,5 -9,-2 0,-14 Z" fill="#c4ebff"/>' +
    '</g>' +
    '<g class="mrw-bob">' +
      // tail, peeking out behind the body at the bottom right
      '<g class="mrw-tail">' +
        '<path d="M224 340 C268 350 292 322 292 286 C280 300 262 302 248 296 C258 316 244 330 220 330 Z" fill="#2a6ce0"/>' +
        '<path d="M246 300 C262 270 292 262 306 270 C300 292 278 308 250 308 Z" fill="#2160d6"/>' +
      '</g>' +
      // legs + shoes
      '<path d="M116 372 L116 436" stroke="#2160d6" stroke-width="38" stroke-linecap="round"/>' +
      '<path d="M184 372 L184 436" stroke="#2160d6" stroke-width="38" stroke-linecap="round"/>' +
      '<ellipse cx="104" cy="450" rx="36" ry="17" fill="#ff9f43"/>' +
      '<ellipse cx="196" cy="450" rx="36" ry="17" fill="#ff9f43"/>' +
      // body
      '<path d="M150 46 C236 46 270 124 266 218 C262 322 230 386 150 388 C70 386 38 322 34 218 C30 124 64 46 150 46 Z" fill="url(#mrwBody)"/>' +
      '<path d="M96 76 C132 54 190 54 222 84" stroke="#8ec8ff" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.5"/>' +
      // soft rim light + shine on the body
      '<path d="M52 150 C48 110 70 70 108 56" stroke="#bfe3ff" stroke-width="9" fill="none" stroke-linecap="round" opacity="0.55"/>' +
      '<ellipse cx="86" cy="104" rx="14" ry="26" fill="#ffffff" opacity="0.16" transform="rotate(-20 86 104)"/>' +
      // belly
      '<path d="M150 236 C218 236 240 290 226 338 C214 374 184 386 150 386 C116 386 86 374 74 338 C60 290 82 236 150 236 Z" fill="url(#mrwBelly)"/>' +
      '<path d="M96 300 C130 314 170 314 204 300" stroke="#8fc4f5" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<path d="M104 330 C134 342 166 342 196 330" stroke="#8fc4f5" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      // free arm (waves gently)
      '<g class="mrw-arm2"><path d="M246 250 C280 270 284 312 268 344" stroke="#2a6ce0" stroke-width="34" fill="none" stroke-linecap="round"/>' +
        '<circle cx="268" cy="346" r="20" fill="#3c93f5"/></g>' +
      // cheeks
      '<ellipse cx="72" cy="176" rx="17" ry="10" fill="#ff8fb0" opacity="0.7"/>' +
      '<ellipse cx="228" cy="176" rx="17" ry="10" fill="#ff8fb0" opacity="0.7"/>' +
      // eyes
      '<circle cx="110" cy="138" r="22" fill="#fff"/><circle cx="190" cy="138" r="22" fill="#fff"/>' +
      '<circle cx="104" cy="141" r="11" fill="#0b1428"/><circle cx="184" cy="141" r="11" fill="#0b1428"/>' +
      '<circle cx="99" cy="134" r="5" fill="#fff"/><circle cx="179" cy="134" r="5" fill="#fff"/><circle cx="112" cy="148" r="2.5" fill="#fff" opacity="0.8"/><circle cx="192" cy="148" r="2.5" fill="#fff" opacity="0.8"/>' +
      '<ellipse class="mrw-lid" cx="110" cy="138" rx="23" ry="0" fill="#3f9bff"/>' +
      '<ellipse class="mrw-lid" cx="190" cy="138" rx="23" ry="0" fill="#3f9bff"/>' +
      // friendly eyebrows
      '<path d="M88 100 Q108 90 128 98" stroke="#1b3d8f" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<path d="M172 98 Q192 90 212 100" stroke="#1b3d8f" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      // teacher glasses
      '<g fill="none" stroke="#2b1b0a" stroke-width="6" stroke-linecap="round">' +
        '<circle cx="110" cy="138" r="30"/><circle cx="190" cy="138" r="30"/>' +
        '<path d="M140 134 Q150 126 160 134"/><path d="M80 132 L48 122"/><path d="M220 132 L252 122"/>' +
      '</g>' +
      // mouth: smile when closed, opens with the voice
      '<path class="mrw-smile" d="M120 190 Q150 212 180 190" stroke="#0b1428" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<ellipse class="mrw-mouth" cx="150" cy="196" rx="30" ry="3" fill="#5b1230" opacity="0"/>' +
      '<g clip-path="url(#mrwMouthClip)"><ellipse class="mrw-tongue" cx="150" cy="200" rx="18" ry="0" fill="#ff7d9d"/></g>' +
      // bow tie
      '<path d="M150 246 L112 230 L112 262 Z" fill="#e8364a"/><path d="M150 246 L188 230 L188 262 Z" fill="#e8364a"/>' +
      '<rect x="140" y="236" width="20" height="20" rx="6" fill="#b81d30"/>' +
      // pointer arm (viewer's left): shoulder -> raised hand that holds the stick
      '<path class="mrw-parm" d="M56 252 C20 246 10 214 22 184" stroke="#2a6ce0" stroke-width="34" fill="none" stroke-linecap="round"/>' +
      '<circle class="mrw-hand" cx="22" cy="182" r="21" fill="#3c93f5"/>' +
    '</g>' +
    '</svg>';

  var MAX_OPEN = 1;

  function el(tag, cls, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }

  // The character faces the viewer with its pointer arm on the viewer's left. When it stands to the
  // LEFT of the board (RTL layouts), mirror it so the pointer arm reaches toward the board.
  function buildTeacher(parent, opts) {
    opts = opts || {};
    var wrap = el("div", "mrw-teacher", parent);
    wrap.style.width = (opts.width || 300) + "px";
    if (opts.flip) wrap.setAttribute("data-flip", "1");
    wrap.innerHTML = SVG;
    var q = function (s) { return wrap.querySelector(s); };
    var lids = wrap.querySelectorAll(".mrw-lid");
    (function blink() {
      lids.forEach(function (l) { l.setAttribute("ry", "23"); });
      setTimeout(function () {
        lids.forEach(function (l) { l.setAttribute("ry", "0"); });
        setTimeout(blink, 3200 + Math.random() * 2400);
      }, 130);
    })();
    return {
      el: wrap, hand: q(".mrw-hand"),
      mouth: q(".mrw-mouth"), clip: q(".mrw-mclip"), smile: q(".mrw-smile"), tongue: q(".mrw-tongue"),
    };
  }

  function setMouth(t, v) {
    v = Math.max(0, Math.min(MAX_OPEN, v));
    var ry = 3 + 24 * v;
    t.mouth.setAttribute("ry", ry.toFixed(1));
    t.clip.setAttribute("ry", ry.toFixed(1));
    t.tongue.setAttribute("ry", Math.max(0, ry * 0.42 - 1).toFixed(1));
    t.tongue.setAttribute("cy", (196 + ry * 0.55).toFixed(1));
    var open = v > 0.07;
    t.mouth.setAttribute("opacity", open ? "1" : "0");
    t.smile.setAttribute("opacity", open ? "0" : "1");
  }

  // Drives the jaw from a per-step loudness envelope (0..1) of the actual narration audio, so the mouth
  // opens on loud syllables and closes in the pauses; falls back to irregular chatter without one.
  // t=0 is the moment this is called (== the narration's first sample, because the renderer trims the
  // recording to start at this instant).
  function speak(t, opts) {
    var env = opts.envelope, step = opts.stepMs || 50, total = opts.durationMs || 0;
    var t0 = performance.now();
    function frame(now) {
      var dt = now - t0;
      if (dt >= total) { setMouth(t, 0); return; }
      var v;
      if (env && env.length) {
        var i = dt / step, a = env[Math.floor(i)] || 0, b = env[Math.floor(i) + 1] || 0;
        v = a + (b - a) * (i - Math.floor(i));
      } else {
        v = Math.max(0, 0.55 + 0.45 * Math.sin(dt / 85) * Math.sin(dt / 233 + 1));
      }
      setMouth(t, v);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function buildBubble(parent, opts) {
    opts = opts || {};
    var bubble = el("div", "mrw-bubble" + (opts.up ? " up" : ""), parent);
    bubble.style.fontSize = (opts.fontSize || 38) + "px";
    var text = el("span", "", bubble);
    return { bubble: bubble, text: text };
  }

  // chunks: [{startMs, endMs, text}] — one short phrase at a time in the bubble, timed to the voice.
  function captions(b, chunks) {
    (chunks || []).forEach(function (c) {
      setTimeout(function () { b.bubble.style.opacity = "1"; b.text.textContent = c.text; }, c.startMs);
    });
    if (chunks && chunks.length) {
      setTimeout(function () { b.bubble.style.opacity = "0"; }, chunks[chunks.length - 1].endMs + 250);
    }
  }

  // The pointer stick: a wooden rod gripped in the teacher's raised hand. pointAt(card) swings it so the
  // tip lands on the card's edge that faces the whale; rest() lifts it up again.
  function buildStick(container, teacher) {
    var stick = el("div", "mrw-stick", container);
    var lastTarget = null;
    function handPos() {
      var c = container.getBoundingClientRect(), h = teacher.hand.getBoundingClientRect();
      return { x: h.left + h.width / 2 - c.left, y: h.top + h.height / 2 - c.top, c: c };
    }
    function aim(tx, ty) {
      var p = handPos();
      var dx = tx - p.x, dy = ty - p.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / len, uy = dy / len, back = 46; // the hand grips the rod 46px from its end
      stick.style.left = (p.x - ux * back) + "px";
      stick.style.top = (p.y - uy * back) + "px";
      stick.style.width = (len + back) + "px";
      stick.style.transform = "rotate(" + Math.atan2(dy, dx) + "rad)";
    }
    return {
      el: stick,
      pointAt: function (card) {
        if (lastTarget) lastTarget.classList.remove("pointed");
        lastTarget = card;
        card.classList.add("pointed");
        var p = handPos(), r = card.getBoundingClientRect();
        var towardRight = r.left + r.width / 2 < p.c.left + p.x; // hand is to the right of the card
        var tx = (towardRight ? r.right - 16 : r.left + 16) - p.c.left;
        var ty = r.top + r.height / 2 - p.c.top;
        aim(tx, ty);
      },
      rest: function () {
        if (lastTarget) lastTarget.classList.remove("pointed");
        lastTarget = null;
        var p = handPos();
        // lift the rod up and out toward the board side
        var side = container.getAttribute("dir") === "rtl" ? 1 : -1;
        aim(p.x + side * 90, p.y - 190);
      },
    };
  }

  window.MRWhale = {
    buildTeacher: buildTeacher, buildBubble: buildBubble, buildStick: buildStick,
    setMouth: setMouth, speak: speak, captions: captions,
  };
})();
