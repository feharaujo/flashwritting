<script lang="ts">
  export let data: { cards: { question: string; answer: string; example: string; exampleTranslation: string }[]; tracker: Record<string, number> }

  let tracker: Record<string, number> = data.tracker ?? {}

  let setup = true
  let wordCount = 25
  let mixLanguages = false
  let autoPlayDutch = false
  let order: number[] = []
  let reversed: boolean[] = []
  let current = 0
  let input = ''
  let correctCount = 0
  let showResult = ''
  let showExample = ''
  let showExampleTranslation = ''
  let showDutchWord = ''
  let completed = false
  type ResultItem = { question: string; user: string; correct: string; example: string; exampleTranslation: string; isCorrect: boolean; index: number; reversed: boolean }
  let results: ResultItem[] = []

  $: total = data.cards.length
  $: clampedCount = Math.min(Math.max(1, wordCount), total)

  function speak(text: string) {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'nl-NL'
    utterance.rate = 0.85
    window.speechSynthesis.speak(utterance)
  }

  function maybeAutoPlay() {
    if (!autoPlayDutch || completed) return
    if (reversed[current]) speak(data.cards[order[current]].answer)
  }

  function shuffle(n: number) {
    const arr = [...Array(n).keys()]
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  function makeReversed(len: number) {
    return Array.from({ length: len }, () => mixLanguages && Math.random() < 0.5)
  }

  // Weighted shuffle: words failed more often get a higher random score and
  // are more likely to appear near the top. Uses log scale to prevent runaway dominance.
  function weightedShuffle(): number[] {
    return Array.from({ length: total }, (_, i) => i)
      .map(i => ({ idx: i, score: Math.random() * (1 + Math.log1p(tracker[data.cards[i].question] ?? 0) * 2) }))
      .sort((a, b) => b.score - a.score)
      .map(x => x.idx)
  }

  function start() {
    order = weightedShuffle().slice(0, clampedCount)
    reversed = makeReversed(order.length)
    current = 0
    correctCount = 0
    completed = false
    input = ''
    showResult = ''
    showExample = ''
    showExampleTranslation = ''
    showDutchWord = ''
    results = []
    setup = false
    maybeAutoPlay()
  }

  function submit() {
    const card = data.cards[order[current]]
    const isReversed = reversed[current]
    const variants = (isReversed ? card.question : card.answer)
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .split('/')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
    const value = input.trim().toLowerCase()
    const ok = variants.includes(value)
    results = [
      ...results,
      {
        question: isReversed ? card.answer : card.question,
        user: input.trim(),
        correct: isReversed ? card.question : card.answer,
        example: card.example,
        exampleTranslation: card.exampleTranslation,
        isCorrect: ok,
        index: order[current],
        reversed: isReversed
      }
    ]
    showExample = card.example
    showExampleTranslation = card.exampleTranslation
    showDutchWord = card.answer
    if (ok) {
      correctCount += 1
      showResult = 'Correct'
    } else {
      showResult = 'Incorrect'
      const key = card.question
      tracker = { ...tracker, [key]: (tracker[key] ?? 0) + 1 }
      fetch('/api/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([key])
      }).catch(() => {})
    }
    if (current < order.length - 1) {
      current += 1
      input = ''
      maybeAutoPlay()
    } else {
      completed = true
    }
  }

  function reveal() {
    const card = data.cards[order[current]]
    const isReversed = reversed[current]
    showResult = isReversed ? card.question : card.answer
    showExample = card.example
    showExampleTranslation = card.exampleTranslation
    showDutchWord = card.answer
  }

  function reset() {
    setup = true
    order = []
    reversed = []
    current = 0
    input = ''
    correctCount = 0
    showResult = ''
    showExample = ''
    showExampleTranslation = ''
    showDutchWord = ''
    completed = false
    results = []
  }

  function retryWrong() {
    const wrong = results.filter((r) => !r.isCorrect).map((r) => r.index)
    if (wrong.length === 0) return
    order = shuffle(wrong.length).map((i) => wrong[i])
    reversed = makeReversed(order.length)
    current = 0
    input = ''
    correctCount = 0
    showResult = ''
    showExample = ''
    showExampleTranslation = ''
    showDutchWord = ''
    completed = false
    results = []
    maybeAutoPlay()
  }

  $: pct = Math.round((correctCount / order.length) * 100)
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
</svelte:head>

<main class="app">
  {#if setup}
    <!-- Setup screen -->
    <header class="header">
      <div class="logo">
        <span class="logo-gem">◈</span>
        <span class="logo-text">Flashcards</span>
      </div>
    </header>

    <div class="setup-card">
      <h2 class="setup-title">How many words?</h2>
      <p class="setup-sub">{total} words available</p>

      <div class="setup-controls">
        <input
          class="setup-range"
          type="range"
          min="1"
          max={total}
          bind:value={wordCount}
        />
        <input
          class="setup-number"
          type="number"
          min="1"
          max={total}
          bind:value={wordCount}
        />
      </div>

      <label class="setup-toggle">
        <input type="checkbox" bind:checked={mixLanguages} />
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
        <span class="toggle-label">Mix languages <span class="toggle-flag">🇳🇱</span> ↔ 🇬🇧</span>
      </label>

      <label class="setup-toggle">
        <input type="checkbox" bind:checked={autoPlayDutch} />
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
        <span class="toggle-label">Auto-play Dutch pronunciation 🔊</span>
      </label>

      <button class="btn-primary btn-start" on:click={start}>
        Start — {clampedCount} word{clampedCount === 1 ? '' : 's'}
      </button>
    </div>

  {:else if !completed}
    <!-- Header -->
    <header class="header">
      <div class="logo">
        <span class="logo-gem">◈</span>
        <span class="logo-text">Flashcards</span>
      </div>
      <button class="icon-btn" on:click={reset} title="Shuffle & restart">↺</button>
    </header>

    <!-- Progress -->
    <div class="progress-row">
      <div class="progress-track">
        <div class="progress-fill" style="width: {(current / order.length) * 100}%"></div>
      </div>
      <span class="progress-label">{current + 1}<span class="progress-sep"> / </span>{order.length}</span>
    </div>

    <!-- Card -->
    <div class="card">
      {#key current}
        {#if reversed[current]}
          <p class="question">
            <span class="question-flag">🇳🇱</span>{data.cards[order[current]].answer}<button class="speak-btn" on:click={() => speak(data.cards[order[current]].answer)}>🔊</button>
          </p>
        {:else}
          <p class="question">{data.cards[order[current]].question}</p>
        {/if}
      {/key}

      <input
        class="answer-input"
        bind:value={input}
        placeholder="Type your answer…"
        on:keydown={(e) => e.key === 'Enter' && submit()}
      />

      <div class="card-actions">
        <button class="btn-primary" on:click={submit}>Submit</button>
        <button class="btn-ghost" on:click={reveal}>Reveal</button>
      </div>

      {#if showResult}
        <div
          class="feedback"
          class:feedback-correct={showResult === 'Correct'}
          class:feedback-wrong={showResult === 'Incorrect'}
          class:feedback-reveal={showResult !== 'Correct' && showResult !== 'Incorrect'}
        >
          {#if showResult === 'Correct'}
            <span class="feedback-pill pill-correct">✓ Correct</span>
          {:else if showResult === 'Incorrect'}
            <span class="feedback-pill pill-wrong">✗ Incorrect</span>
            <span class="feedback-detail">Correct answer: <strong>{results[results.length - 1].correct}</strong></span>
          {:else}
            <span class="feedback-pill pill-reveal">→ Answer</span>
            <strong class="feedback-detail">{showResult}</strong>
          {/if}
          {#if showDutchWord}
            <button class="speak-btn speak-btn-feedback" on:click={() => speak(showDutchWord)}>🔊 Hear Dutch</button>
          {/if}
          {#if showExample}
            <blockquote class="example-quote">"{showExample}"</blockquote>
            {#if showExampleTranslation}
              <p class="example-translation">"{showExampleTranslation}"</p>
            {/if}
          {/if}
        </div>
      {/if}
    </div>

    <!-- Score -->
    <div class="session-score">
      <span class="score-num">{correctCount}</span>
      <span class="score-word">correct so far</span>
    </div>

  {:else}
    <!-- Results page -->
    <div class="results">
      <div class="results-hero">
        <p class="results-eyebrow">Session complete</p>
        <h2 class="results-title">
          {#if pct >= 80}Great job!
          {:else if pct >= 50}Keep it up!
          {:else}Keep practicing!{/if}
        </h2>
        <div class="score-ring">
          <span class="ring-pct">{pct}<em>%</em></span>
          <span class="ring-frac">{correctCount} / {order.length}</span>
        </div>
      </div>

      <h3 class="section-label">Review</h3>
      <ul class="result-list">
        {#each results as r}
          <li class="result-item" class:result-ok={r.isCorrect} class:result-bad={!r.isCorrect}>
            <span class="result-icon">{r.isCorrect ? '✓' : '✗'}</span>
            <div class="result-body">
              <span class="result-q">{#if r.reversed}<span class="result-flag">🇳🇱</span>{/if}{r.question}</span>
              {#if r.isCorrect}
                <span class="result-ans ans-correct">
                  {r.correct}
                  <button class="speak-btn-sm" on:click={() => speak(r.reversed ? r.question : r.correct)}>🔊</button>
                </span>
              {:else}
                <span class="result-ans ans-wrong">You: <em>{r.user || '(empty)'}</em></span>
                <span class="result-ans ans-correct">
                  Correct: <strong>{r.correct}</strong>
                  <button class="speak-btn-sm" on:click={() => speak(r.reversed ? r.question : r.correct)}>🔊</button>
                </span>
              {/if}
              <em class="result-example">"{r.example}"</em>
              {#if r.exampleTranslation}
                <span class="result-example-translation">"{r.exampleTranslation}"</span>
              {/if}
            </div>
          </li>
        {/each}
      </ul>

      <div class="results-actions">
        <button class="btn-primary" on:click={reset}>Start over</button>
        <button class="btn-ghost" on:click={retryWrong} disabled={results.every((r) => r.isCorrect)}>
          Retry mistakes
        </button>
      </div>
    </div>
  {/if}
</main>

<style>
  /* ── Tokens ─────────────────────────────────────────── */
  :root {
    --bg-base:          #fdfbf7;
    --bg-gradient:      linear-gradient(135deg, #fdfbf7 0%, #f4f0fa 50%, #eef5ff 100%);
    --card:             rgba(255, 255, 255, 0.7);
    --card-border:      rgba(255, 255, 255, 0.8);
    --text:             #1e1b26;
    --muted:            #6c6875;
    --border:           rgba(0, 0, 0, 0.08);
    --accent:           #7C3AED;      /* Vivid Purple */
    --accent-dark:      #5B21B6;
    --accent-glow:      rgba(124, 58, 237, 0.3);
    --success:          #10B981;      /* Vibrant Green */
    --success-bg:       rgba(16, 185, 129, 0.1);
    --error:            #EF4444;      /* Vibrant Red */
    --error-bg:         rgba(239, 68, 68, 0.1);
    --reveal-bg:        rgba(124, 58, 237, 0.08);
    --shadow:           0 8px 32px rgba(31, 38, 135, 0.08);
    --shadow-lg:        0 12px 48px rgba(31, 38, 135, 0.12);
    --font-disp:        'Outfit', system-ui, sans-serif;
    --font-ui:          'Inter', system-ui, sans-serif;
    --radius:           24px;
    --blur:             16px;
    color-scheme: light dark;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg-base:          #0f0d14;
      --bg-gradient:      linear-gradient(135deg, #0f0d14 0%, #1a1625 50%, #151b2b 100%);
      --card:             rgba(30, 27, 40, 0.6);
      --card-border:      rgba(255, 255, 255, 0.05);
      --text:             #f8f7fa;
      --muted:            #9ca3af;
      --border:           rgba(255, 255, 255, 0.1);
      --accent:           #8B5CF6;
      --accent-dark:      #A78BFA;
      --accent-glow:      rgba(139, 92, 246, 0.4);
      --success:          #34D399;
      --success-bg:       rgba(52, 211, 153, 0.15);
      --error:            #F87171;
      --error-bg:         rgba(248, 113, 113, 0.15);
      --reveal-bg:        rgba(139, 92, 246, 0.15);
      --shadow:           0 8px 32px rgba(0, 0, 0, 0.4);
      --shadow-lg:        0 12px 48px rgba(0, 0, 0, 0.5);
    }
  }

  /* ── Reset ───────────────────────────────────────────── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :global(body) {
    background: var(--bg-base);
    background-image: var(--bg-gradient);
    background-attachment: fixed;
    color: var(--text);
    font-family: var(--font-ui);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }

  /* Background Orbs for extra "funcy" feel */
  :global(body)::before,
  :global(body)::after {
    content: '';
    position: fixed;
    border-radius: 50%;
    filter: blur(120px);
    z-index: -1;
    pointer-events: none;
    opacity: 0.6;
    animation: floatOrb 20s infinite alternate ease-in-out;
  }
  
  :global(body)::before {
    top: -10%;
    left: -10%;
    width: 60vmin;
    height: 60vmin;
    background: var(--accent-glow);
  }

  :global(body)::after {
    bottom: -10%;
    right: -10%;
    width: 50vmin;
    height: 50vmin;
    background: rgba(56, 189, 248, 0.2);
    animation-delay: -10s;
  }

  @keyframes floatOrb {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(10%, 10%) scale(1.1); }
  }


  /* ── Setup screen ────────────────────────────────────── */
  .setup-card {
    background: var(--card);
    backdrop-filter: blur(var(--blur));
    -webkit-backdrop-filter: blur(var(--blur));
    border: 1px solid var(--card-border);
    border-radius: var(--radius);
    padding: 3rem 2.5rem;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    text-align: center;
    animation: fadeInScale 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  @keyframes fadeInScale {
    from { opacity: 0; transform: scale(0.95) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .setup-title {
    font-family: var(--font-disp);
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--text);
    line-height: 1.15;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, var(--text), var(--accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .setup-sub {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--muted);
    margin-bottom: 1rem;
  }

  .setup-controls {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    width: 100%;
    margin-bottom: 1.5rem;
  }

  .setup-range {
    flex: 1;
    accent-color: var(--accent);
    height: 6px;
    border-radius: 4px;
    cursor: pointer;
    background: var(--border);
    outline: none;
    transition: all 0.2s;
  }
  .setup-range:hover {
      filter: brightness(1.2);
  }

  .setup-number {
    width: 80px;
    padding: 0.5rem 0.75rem;
    border: 2px solid var(--border);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.5);
    color: var(--text);
    font-family: var(--font-disp);
    font-size: 1.25rem;
    font-weight: 700;
    text-align: center;
    outline: none;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  @media (prefers-color-scheme: dark) {
      .setup-number { background: rgba(0,0,0,0.3); }
  }

  .setup-number:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 4px var(--accent-glow);
    transform: translateY(-2px);
  }

  .btn-start {
    width: 100%;
    padding: 1rem 1.5rem;
    font-size: 1.1rem;
    margin-top: 1rem;
    background: linear-gradient(135deg, var(--accent), var(--accent-dark));
    box-shadow: 0 4px 15px var(--accent-glow);
  }

  .setup-toggle {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    cursor: pointer;
    user-select: none;
    margin-bottom: 0.75rem;
    padding: 0.5rem;
    border-radius: 12px;
    transition: background 0.2s;
  }
  .setup-toggle:hover {
      background: var(--border);
  }

  .setup-toggle input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-track {
    position: relative;
    width: 48px;
    height: 26px;
    background: var(--border);
    border-radius: 99px;
    flex-shrink: 0;
    transition: background 0.3s ease, box-shadow 0.3s ease;
  }

  .setup-toggle input:checked ~ .toggle-track {
    background: var(--accent);
    box-shadow: 0 2px 10px var(--accent-glow);
  }

  .toggle-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    background: #fff;
    border-radius: 50%;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  }

  .setup-toggle input:checked ~ .toggle-track .toggle-thumb {
    transform: translateX(22px);
  }

  .toggle-label {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text);
  }

  .toggle-flag { font-style: normal; font-size: 1.1em; }

  .question-flag {
    margin-right: 0.5rem;
    font-style: normal;
  }

  .result-flag {
    margin-right: 0.4rem;
    font-style: normal;
  }

  /* ── Layout ──────────────────────────────────────────── */
  .app {
    max-width: 600px;
    margin: 0 auto;
    padding: 3rem 1.5rem 6rem;
  }

  /* ── Header ──────────────────────────────────────────── */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .logo-gem {
    font-size: 1.5rem;
    color: var(--accent);
    line-height: 1;
    filter: drop-shadow(0 0 8px var(--accent-glow));
    animation: pulse 3s infinite ease-in-out;
  }
  
  @keyframes pulse {
      0%, 100% { transform: scale(1); filter: drop-shadow(0 0 8px var(--accent-glow)); }
      50% { transform: scale(1.1); filter: drop-shadow(0 0 12px var(--accent)); }
  }

  .logo-text {
    font-family: var(--font-disp);
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.02em;
  }

  .icon-btn {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--card);
    backdrop-filter: blur(var(--blur));
    border: 1px solid var(--border);
    border-radius: 50%;
    color: var(--muted);
    font-size: 1.2rem;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .icon-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
    transform: rotate(45deg) scale(1.1);
    box-shadow: 0 4px 15px var(--accent-glow);
  }
  .icon-btn:active {
      transform: rotate(90deg) scale(0.95);
  }

  /* ── Progress ────────────────────────────────────────── */
  .progress-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .progress-track {
    flex: 1;
    height: 8px;
    background: var(--border);
    border-radius: 99px;
    overflow: hidden;
    position: relative;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), #38bdf8);
    border-radius: 99px;
    transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    overflow: hidden;
  }
  
  .progress-fill::after {
      content: '';
      position: absolute;
      top: 0; left: 0; bottom: 0; right: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
      animation: shimmer 1.5s infinite linear;
  }

  @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
  }


  .progress-label {
    font-family: var(--font-disp);
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--muted);
    white-space: nowrap;
    min-width: 48px;
    text-align: right;
  }

  .progress-sep { font-weight: 400; opacity: 0.5; }

  /* ── Card ────────────────────────────────────────────── */
  .card {
    background: var(--card);
    backdrop-filter: blur(var(--blur));
    -webkit-backdrop-filter: blur(var(--blur));
    border: 1px solid var(--card-border);
    border-radius: var(--radius);
    padding: 2.5rem 2rem 2rem;
    box-shadow: var(--shadow);
    position: relative;
    overflow: hidden;
  }

  .card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; width: 100%; height: 4px;
      background: linear-gradient(90deg, var(--accent), #38bdf8);
      opacity: 0.8;
  }

  .question {
    font-family: var(--font-disp);
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.3;
    color: var(--text);
    margin-bottom: 2rem;
    text-align: center;
    animation: slideDownFade 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
  }

  @keyframes slideDownFade {
    from { opacity: 0; transform: translateY(-20px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .answer-input {
    display: block;
    width: 100%;
    padding: 1rem 1.25rem;
    border: 2px solid var(--border);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.4);
    color: var(--text);
    font-family: var(--font-ui);
    font-size: 1.1rem;
    font-weight: 500;
    outline: none;
    margin-bottom: 1.25rem;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  @media (prefers-color-scheme: dark) {
      .answer-input { background: rgba(0,0,0,0.2); }
  }

  .answer-input::placeholder { color: var(--muted); opacity: 0.6; font-weight: 400; }

  .answer-input:focus {
    border-color: var(--accent);
    background: rgba(255, 255, 255, 0.8);
    box-shadow: 0 0 0 4px var(--accent-glow), 0 4px 15px rgba(0,0,0,0.05);
    transform: translateY(-2px);
  }
  @media (prefers-color-scheme: dark) {
      .answer-input:focus { background: rgba(0,0,0,0.4); }
  }

  /* ── Buttons ─────────────────────────────────────────── */
  .card-actions {
    display: flex;
    gap: 0.75rem;
  }

  .btn-primary {
    flex: 1;
    padding: 0.85rem 1.5rem;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 14px;
    font-family: var(--font-ui);
    font-size: 1.05rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px var(--accent-glow);
  }

  .btn-primary:hover  { 
      background: var(--accent-dark); 
      transform: translateY(-2px);
      box-shadow: 0 6px 16px var(--accent-glow);
  }
  .btn-primary:active { 
      transform: scale(0.96) translateY(0); 
      box-shadow: 0 2px 8px var(--accent-glow);
  }

  .btn-ghost {
    flex: 1;
    padding: 0.85rem 1.25rem;
    background: rgba(255, 255, 255, 0.2);
    color: var(--text);
    border: 2px solid var(--border);
    border-radius: 14px;
    font-family: var(--font-ui);
    font-size: 1.05rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .btn-ghost:hover {
    border-color: var(--muted);
    background: var(--border);
    transform: translateY(-2px);
  }

  .btn-ghost:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  /* ── Speak buttons ───────────────────────────────────── */
  .speak-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--card);
    border: 1px solid var(--border);
    padding: 0.4rem;
    border-radius: 50%;
    margin-left: 0.75rem;
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
    color: var(--text);
    vertical-align: middle;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  }

  .speak-btn:hover { 
      color: var(--accent);
      border-color: var(--accent);
      transform: translateY(-2px) scale(1.1); 
      box-shadow: 0 4px 10px var(--accent-glow);
  }
  .speak-btn:active { transform: scale(0.9); }

  .speak-btn-feedback {
    font-family: var(--font-ui);
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.4rem 0.8rem;
    border: 1.5px solid var(--border);
    border-radius: 99px;
    color: var(--text);
    background: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    align-self: flex-start;
    gap: 0.4rem;
    transition: all 0.2s;
  }
  @media (prefers-color-scheme: dark) {
      .speak-btn-feedback { background: rgba(0,0,0,0.3); }
  }

  .speak-btn-feedback:hover {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--bg-base);
    transform: translateY(-1px);
    box-shadow: 0 3px 8px var(--accent-glow);
  }

  .speak-btn-sm {
    display: inline-flex;
    align-items: center;
    background: none;
    border: none;
    padding: 0 0 0 0.4rem;
    font-size: 0.9rem;
    line-height: 1;
    cursor: pointer;
    color: var(--muted);
    vertical-align: middle;
    opacity: 0.8;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .speak-btn-sm:hover { color: var(--accent); opacity: 1; transform: scale(1.2); }
  .speak-btn-sm:active { transform: scale(0.9); }

  /* ── Feedback ────────────────────────────────────────── */
  .feedback {
    margin-top: 1.5rem;
    padding: 1.25rem;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    animation: bounceIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    position: relative;
    overflow: hidden;
  }

  @keyframes bounceIn {
    from { opacity: 0; transform: translateY(15px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .feedback-correct { 
      background: var(--success-bg); 
      border: 1px solid rgba(16, 185, 129, 0.3);
      box-shadow: 0 4px 20px rgba(16, 185, 129, 0.1);
  }
  .feedback-wrong { 
      background: var(--error-bg); 
      border: 1px solid rgba(239, 68, 68, 0.3);
      box-shadow: 0 4px 20px rgba(239, 68, 68, 0.1);
  }
  .feedback-reveal { 
      background: var(--reveal-bg); 
      border: 1px solid rgba(124, 58, 237, 0.3);
  }

  .feedback-pill {
    display: inline-block;
    font-family: var(--font-disp);
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.25rem 0.75rem;
    border-radius: 99px;
    width: fit-content;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .pill-correct { background: var(--success); color: #fff; }
  .pill-wrong   { background: var(--error);   color: #fff; }
  .pill-reveal  { background: var(--accent);  color: #fff; }

  .feedback-detail {
    font-size: 1.1rem;
    color: var(--text);
    font-weight: 500;
  }
  .feedback-detail strong {
      font-weight: 700;
      color: inherit;
  }
  
  .feedback-wrong .feedback-detail strong { color: var(--error); }
  .feedback-reveal .feedback-detail strong { color: var(--accent); }

  .example-quote {
    font-family: var(--font-disp);
    font-style: italic;
    font-size: 1.05rem;
    color: var(--text);
    border-left: 3px solid var(--accent);
    padding-left: 1rem;
    margin-top: 0.5rem;
    line-height: 1.6;
    background: rgba(255,255,255,0.3);
    padding: 0.5rem 1rem;
    border-radius: 0 8px 8px 0;
  }
  @media (prefers-color-scheme: dark) {
      .example-quote { background: rgba(0,0,0,0.2); }
  }

  .example-translation {
    font-size: 0.9rem;
    color: var(--text);
    opacity: 0.8;
    padding-left: 1rem;
    line-height: 1.5;
    margin-top: 0.25rem;
  }

  /* ── Session score ───────────────────────────────────── */
  .session-score {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 2rem;
    padding: 1rem;
    border-radius: 16px;
    background: var(--card);
    backdrop-filter: blur(var(--blur));
    border: 1px solid var(--card-border);
    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  }

  .score-num {
    font-family: var(--font-disp);
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--accent);
    line-height: 1;
    text-shadow: 0 2px 10px var(--accent-glow);
  }

  .score-word {
    font-size: 0.95rem;
    color: var(--muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* ── Results page ────────────────────────────────────── */
  .results { padding-top: 1rem; }

  .results-hero {
    text-align: center;
    margin-bottom: 3rem;
    background: var(--card);
    backdrop-filter: blur(var(--blur));
    border: 1px solid var(--card-border);
    border-radius: var(--radius);
    padding: 3rem 2rem;
    box-shadow: var(--shadow);
    animation: fadeInScale 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .results-eyebrow {
    font-family: var(--font-disp);
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 0.75rem;
  }

  .results-title {
    font-family: var(--font-disp);
    font-size: 3rem;
    font-weight: 800;
    color: var(--text);
    margin-bottom: 2rem;
    line-height: 1.1;
    letter-spacing: -0.02em;
  }

  .score-ring {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 140px;
    height: 140px;
    border-radius: 50%;
    border: 4px solid var(--accent);
    background: var(--bg-base);
    box-shadow: 0 0 30px var(--accent-glow), inset 0 0 20px rgba(0,0,0,0.05);
    position: relative;
  }
  
  .score-ring::before {
      content: '';
      position: absolute;
      top: -8px; left: -8px; right: -8px; bottom: -8px;
      border: 2px dashed rgba(124, 58, 237, 0.3);
      border-radius: 50%;
      animation: rotate 20s linear infinite;
  }

  @keyframes rotate {
      100% { transform: rotate(360deg); }
  }

  .ring-pct {
    font-family: var(--font-disp);
    font-size: 2.8rem;
    font-weight: 800;
    color: var(--text);
    line-height: 1;
  }

  .ring-pct em { font-style: normal; font-size: 1.4rem; color: var(--accent); }

  .ring-frac {
    font-size: 0.9rem;
    color: var(--muted);
    font-weight: 600;
    margin-top: 0.25rem;
    background: rgba(0,0,0,0.05);
    padding: 2px 8px;
    border-radius: 8px;
  }
  @media (prefers-color-scheme: dark) {
      .ring-frac { background: rgba(255,255,255,0.1); }
  }

  /* ── Review list ─────────────────────────────────────── */
  .section-label {
    font-family: var(--font-disp);
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    color: var(--text);
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .section-label::after {
      content: '';
      flex: 1;
      height: 2px;
      background: var(--border);
      border-radius: 2px;
  }

  .result-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 2.5rem;
  }

  .result-item {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.25rem;
    border-radius: 16px;
    background: var(--card);
    backdrop-filter: blur(var(--blur));
    border: 1px solid var(--border);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .result-item:hover {
      transform: translateY(-2px) scale(1.01);
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  }

  .result-ok { border-left: 4px solid var(--success); }
  .result-bad { border-left: 4px solid var(--error); }

  .result-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    font-size: 0.9rem;
    font-weight: 800;
    flex-shrink: 0;
    color: white;
  }

  .result-ok  .result-icon { background: var(--success); box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4); }
  .result-bad .result-icon { background: var(--error); box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4); }

  .result-body {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .result-q {
    font-family: var(--font-disp);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 0.25rem;
  }

  .result-ans { font-size: 0.95rem; font-weight: 500; }
  .ans-correct { color: var(--success); }
  .ans-wrong   { color: var(--error); }
  .ans-wrong em { font-style: normal; text-decoration: line-through; opacity: 0.8; }

  .result-example {
    font-family: var(--font-disp);
    font-style: italic;
    font-size: 0.9rem;
    color: var(--muted);
    margin-top: 0.5rem;
    background: rgba(0,0,0,0.03);
    padding: 0.4rem 0.75rem;
    border-radius: 8px;
  }
  @media (prefers-color-scheme: dark) {
      .result-example { background: rgba(255,255,255,0.05); }
  }

  .result-example-translation {
    font-size: 0.85rem;
    color: var(--muted);
    opacity: 0.8;
    padding-left: 0.75rem;
  }

  /* ── Results actions ─────────────────────────────────── */
  .results-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    position: sticky;
    bottom: 1rem;
    z-index: 10;
    background: var(--card);
    backdrop-filter: blur(20px);
    padding: 1rem;
    border-radius: 20px;
    border: 1px solid var(--card-border);
    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
  }
</style>
