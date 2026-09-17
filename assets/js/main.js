/* ==========================================================================
   ROPlabs — site script
   Three small things: drifting petals, code highlighting, image lightbox.
   ========================================================================== */
(function () {
  "use strict";

  /* --- header hairline on scroll ------------------------------------------ */
  var top = document.querySelector(".top");

  if (top) {
    var onScroll = function () {
      if (window.scrollY > 6) top.setAttribute("data-scrolled", "");
      else top.removeAttribute("data-scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* --- drifting petals ---------------------------------------------------- */
  var layer = document.querySelector(".petals");
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (layer && !still) {
    var spawn = function () {
      var w = window.innerWidth;
      var count = Math.max(5, Math.min(16, Math.round(w / 90)));
      layer.textContent = "";

      for (var i = 0; i < count; i++) {
        var petal = document.createElement("i");
        petal.className = "petal";
        petal.style.left = Math.random() * 100 + "vw";
        petal.style.setProperty("--size", (6 + Math.random() * 7).toFixed(1) + "px");
        petal.style.setProperty("--drift", (Math.random() * 180 - 90).toFixed(0) + "px");
        petal.style.setProperty("--dur", (16 + Math.random() * 16).toFixed(1) + "s");
        petal.style.setProperty("--delay", (-Math.random() * 30).toFixed(1) + "s");
        petal.style.setProperty("--alpha", (0.22 + Math.random() * 0.38).toFixed(2));
        layer.appendChild(petal);
      }
    };

    spawn();

    var timer;
    window.addEventListener("resize", function () {
      clearTimeout(timer);
      timer = setTimeout(spawn, 400);
    });
  }

  /* --- syntax highlighting ------------------------------------------------ */
  var WORDS = {
    javascript:
      "as async await break case catch class const continue default delete do else export extends finally for " +
      "from function get if import in instanceof let new of return set static super switch this throw try typeof " +
      "var void while with yield true false null undefined interface type enum public private readonly",
    python:
      "and as assert async await break class continue def del elif else except finally for from global if import " +
      "in is lambda nonlocal not or pass raise return try while with yield True False None self match case",
    bash:
      "if then else elif fi for while do done case esac in function return local export declare set echo cd rm cp mv " +
      "cat grep sed awk curl wget git docker make sudo exit python3 patchelf checksec",
    json: "true false null"
  };

  /* Languages share one scanner; only these knobs differ. */
  var LANG = {
    javascript: { line: "//", block: true, quotes: '"\u0027`', cpp: true, words: WORDS.javascript },
    typescript: { line: "//", block: true, quotes: '"\u0027`', cpp: true, words: WORDS.javascript },
    python: { line: "#", quotes: '"\u0027', triple: true, words: WORDS.python },
    bash: { line: "#", quotes: '"\u0027', words: WORDS.bash },
    css: { block: true, quotes: '"\u0027', dashed: true, colon: true },
    json: { quotes: '"', colon: true, words: WORDS.json },
    html: { markup: true },
    clike: { line: "//", block: true, quotes: '"\u0027', words: "int char float double long short unsigned signed void struct union enum typedef sizeof static extern const volatile return if else for while do switch case break continue default goto class namespace public private protected virtual override new delete template typename using try catch throw this nullptr true false bool constexpr auto fn let mut impl pub use mod match trait where async await dyn ref move unsafe loop defer go chan map range select interface var nil package func" },
    plain: {}
  };

  var ALIAS = {
    js: "javascript", jsx: "javascript", mjs: "javascript", node: "javascript",
    ts: "typescript", tsx: "typescript",
    py: "python",
    sh: "bash", shell: "bash", zsh: "bash", console: "bash",
    scss: "css", less: "css",
    htm: "html", xml: "html", svg: "html",
    c: "clike", h: "clike", cpp: "clike", "c++": "clike", hpp: "clike", cc: "clike",
    java: "clike", rust: "clike", rs: "clike", go: "clike", golang: "clike",
    php: "clike", swift: "clike", kotlin: "clike", cs: "clike", csharp: "clike",
    diff: "plain", text: "plain", txt: "plain", plaintext: "plain"
  };

  function escapeHtml(text) {
    return text.replace(/[&<>]/g, function (c) {
      return c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;";
    });
  }

  function wordSet(words) {
    var set = Object.create(null);
    (words || "").split(/\s+/).forEach(function (word) {
      if (word) set[word] = true;
    });
    return set;
  }

  var sets = Object.create(null);

  function scan(src, lang) {
    var cfg = LANG[lang];
    var words = sets[lang] || (sets[lang] = wordSet(cfg.words));
    var out = [];
    var n = src.length;
    var i = 0;

    while (i < n) {
      var c = src[i];

      if (cfg.line && src.startsWith(cfg.line, i)) {
        var eol = src.indexOf("\n", i);
        if (eol < 0) eol = n;
        out.push(["cmt", src.slice(i, eol)]);
        i = eol;
        continue;
      }

      if (cfg.block && src.startsWith("/*", i)) {
        var close = src.indexOf("*/", i + 2);
        close = close < 0 ? n : close + 2;
        out.push(["cmt", src.slice(i, close)]);
        i = close;
        continue;
      }

      if (cfg.triple && (src.startsWith('"""', i) || src.startsWith("'''", i))) {
        var fence = src.slice(i, i + 3);
        var end = src.indexOf(fence, i + 3);
        end = end < 0 ? n : end + 3;
        out.push(["str", src.slice(i, end)]);
        i = end;
        continue;
      }

      if (cfg.quotes && cfg.quotes.indexOf(c) > -1) {
        var q = i + 1;
        while (q < n) {
          if (src[q] === "\\") { q += 2; continue; }
          if (src[q] === c) { q++; break; }
          if (src[q] === "\n" && c !== "`") break;
          q++;
        }
        out.push(["str", src.slice(i, q)]);
        i = q;
        continue;
      }

      if (c >= "0" && c <= "9") {
        var d = i;
        while (d < n && /[0-9a-fA-FxXoObB._]/.test(src[d])) d++;
        out.push(["num", src.slice(i, d)]);
        i = d;
        continue;
      }

      if (/[A-Za-z_$@]/.test(c)) {
        var w = i;
        var allowed = cfg.dashed ? /[\w$-]/ : /[\w$]/;
        while (w < n && allowed.test(src[w])) w++;
        var word = src.slice(i, w);
        var next = w;
        while (next < n && (src[next] === " " || src[next] === "\t")) next++;
        var cls = null;
        if (word.charAt(0) === "@" || words[word]) cls = "key";
        else if (cfg.colon && src[next] === ":") cls = "att";
        else if (src[next] === "(") cls = "fun";
        out.push([cls, word]);
        i = w;
        continue;
      }

      if (/\s/.test(c)) {
        var s = i;
        while (s < n && /\s/.test(src[s])) s++;
        out.push([null, src.slice(i, s)]);
        i = s;
        continue;
      }

      out.push(["pun", c]);
      i++;
    }

    return out;
  }

  function scanMarkup(src) {
    var out = [];
    var n = src.length;
    var i = 0;

    while (i < n) {
      if (src.startsWith("<!--", i)) {
        var end = src.indexOf("-->", i);
        end = end < 0 ? n : end + 3;
        out.push(["cmt", src.slice(i, end)]);
        i = end;
        continue;
      }

      if (src[i] === "<") {
        var gt = src.indexOf(">", i);
        gt = gt < 0 ? n : gt + 1;
        var chunk = src.slice(i, gt);
        var open = chunk.match(/^<\/?[A-Za-z][\w:.-]*/);
        var at = 0;

        if (open) {
          out.push(["pun", "<" + (open[0].charAt(1) === "/" ? "/" : "")]);
          out.push(["key", open[0].replace(/^<\/?/, "")]);
          at = open[0].length;
        }

        while (at < chunk.length) {
          var c = chunk[at];
          if (c === '"' || c === "'") {
            var q = at + 1;
            while (q < chunk.length && chunk[q] !== c) q++;
            q = Math.min(q + 1, chunk.length);
            out.push(["str", chunk.slice(at, q)]);
            at = q;
          } else if (/[\w:.-]/.test(c)) {
            var w = at;
            while (w < chunk.length && /[\w:.-]/.test(chunk[w])) w++;
            out.push(["att", chunk.slice(at, w)]);
            at = w;
          } else {
            out.push(["pun", c]);
            at++;
          }
        }

        i = gt;
        continue;
      }

      var textEnd = src.indexOf("<", i);
      if (textEnd < 0) textEnd = n;
      out.push([null, src.slice(i, textEnd)]);
      i = textEnd;
    }

    return out;
  }

  /* Split tokens on newlines so every source line becomes its own numbered row. */
  function toLines(tokens) {
    var lines = [[]];
    tokens.forEach(function (token) {
      token[1].split("\n").forEach(function (part, index) {
        if (index) lines.push([]);
        if (part) lines[lines.length - 1].push([token[0], part]);
      });
    });
    return lines;
  }

  function markup(tokens) {
    var html = "";
    tokens.forEach(function (token) {
      var text = escapeHtml(token[1]);
      html += token[0] ? '<span class="' + token[0] + '">' + text + "</span>" : text;
    });
    return html;
  }

  document.querySelectorAll(".code").forEach(function (block) {
    var code = block.querySelector("code");
    if (!code) return;

    var source = code.textContent.replace(/\n+$/, "");
    var name = (block.getAttribute("data-lang") || "plain").toLowerCase();
    var lang = LANG[ALIAS[name]] ? ALIAS[name] : LANG[name] ? name : "clike";
    var tokens = lang === "html" ? scanMarkup(source) : scan(source, lang);

    code.innerHTML = toLines(tokens)
      .map(function (line) {
        return '<span class="ln">' + markup(line) + "</span>";
      })
      .join("");

    var copy = block.querySelector(".code__copy");
    if (!copy) return;

    if (!navigator.clipboard) {
      copy.remove();
      return;
    }

    copy.addEventListener("click", function () {
      navigator.clipboard.writeText(source).then(function () {
        copy.textContent = "Copied";
        copy.setAttribute("data-copied", "");
        setTimeout(function () {
          copy.textContent = "Copy";
          copy.removeAttribute("data-copied");
        }, 1500);
      });
    });
  });

  /* --- lightbox ----------------------------------------------------------- */
  var zoomables = document.querySelectorAll("img[data-lightbox]");
  if (!zoomables.length) return;

  var box = document.createElement("div");
  box.className = "lightbox";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", "Enlarged image");

  var big = document.createElement("img");
  big.alt = "";
  box.appendChild(big);
  document.body.appendChild(box);

  var close = function () {
    box.removeAttribute("data-open");
    document.body.style.removeProperty("overflow");
    big.removeAttribute("src");
  };

  Array.prototype.forEach.call(zoomables, function (image) {
    image.addEventListener("click", function () {
      big.src = image.currentSrc || image.src;
      big.alt = image.alt;
      box.setAttribute("data-open", "");
      document.body.style.overflow = "hidden";
    });
  });

  box.addEventListener("click", close);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") close();
  });
})();
