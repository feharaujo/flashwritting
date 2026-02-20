<script lang="ts">
  export let data: { cards: { question: string; answer: string; example: string; exampleTranslation: string }[] }

  let setup = true
  let wordCount = 25
  let order: number[] = []
  let current = 0
  let input = ''
  let correctCount = 0
  let showResult = ''
  let showExample = ''
  let showExampleTranslation = ''
  let completed = false
  type ResultItem = { question: string; user: string; correct: string; example: string; exampleTranslation: string; isCorrect: boolean; index: number }
  let results: ResultItem[] = []

  $: total = data.cards.length
  $: clampedCount = Math.min(Math.max(1, wordCount), total)

  function shuffle(n: number) {
    const arr = [...Array(n).keys()]
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  function start() {
    order = shuffle(total).slice(0, clampedCount)
    current = 0
    correctCount = 0
    completed = false
    input = ''
    showResult = ''
    showExample = ''
    showExampleTranslation = ''
    results = []
    setup = false
  }

  function submit() {
    const card = data.cards[order[current]]
    const expected = card.answer.trim().toLowerCase()
    const value = input.trim().toLowerCase()
    const ok = value === expected
    results = [
      ...results,
      {
        question: card.question,
        user: input.trim(),
        correct: card.answer,
        example: card.example,
        exampleTranslation: card.exampleTranslation,
        isCorrect: ok,
        index: order[current]
      }
    ]
    showExample = card.example
    showExampleTranslation = card.exampleTranslation
    if (ok) {
      correctCount += 1
      showResult = 'Correct'
    } else {
      showResult = 'Incorrect'
    }
    if (current < order.length - 1) {
      current += 1
      input = ''
    } else {
      completed = true
    }
  }

  function reveal() {
    const card = data.cards[order[current]]
    showResult = card.answer
    showExample = card.example
    showExampleTranslation = card.exampleTranslation
  }

  function reset() {
    setup = true
    order = []
    current = 0
    input = ''
    correctCount = 0
    showResult = ''
    showExample = ''
    showExampleTranslation = ''
    completed = false
    results = []
  }

  function retryWrong() {
    const wrong = results.filter((r) => !r.isCorrect).map((r) => r.index)
    if (wrong.length === 0) return
    order = shuffle(wrong.length).map((i) => wrong[i])
    current = 0
    input = ''
    correctCount = 0
    showResult = ''
    showExample = ''
    showExampleTranslation = ''
    completed = false
    results = []
  }

  $: pct = Math.round((correctCount / order.length) * 100)
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;1,9..144,400&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet" />
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
        <p class="question">{data.cards[order[current]].question}</p>
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
              <span class="result-q">{r.question}</span>
              {#if r.isCorrect}
                <span class="result-ans ans-correct">{r.correct}</span>
              {:else}
                <span class="result-ans ans-wrong">You: <em>{r.user || '(empty)'}</em></span>
                <span class="result-ans ans-correct">Correct: <strong>{r.correct}</strong></span>
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
    --bg:          #F8F4EE;
    --card:        #FFFEFA;
    --text:        #261A0E;
    --muted:       #9B8878;
    --border:      #E4D6C4;
    --accent:      #C86D38;
    --accent-dark: #A5561E;
    --success:     #27774A;
    --success-bg:  #EBF7F1;
    --error:       #B83030;
    --error-bg:    #FDF0F0;
    --reveal-bg:   #F3EDE3;
    --shadow:      0 2px 12px rgba(150, 90, 40, 0.08), 0 1px 3px rgba(150, 90, 40, 0.06);
    --shadow-lg:   0 8px 32px rgba(150, 90, 40, 0.12), 0 2px 8px rgba(150, 90, 40, 0.08);
    --font-disp:   'Fraunces', Georgia, serif;
    --font-ui:     'DM Sans', system-ui, sans-serif;
    --radius:      16px;
    color-scheme: light dark;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg:          #191310;
      --card:        #221A14;
      --text:        #EDE5D8;
      --muted:       #8A7868;
      --border:      #3A2C20;
      --accent:      #D97C42;
      --accent-dark: #E8905A;
      --success:     #38A063;
      --success-bg:  #0D2118;
      --error:       #C84040;
      --error-bg:    #280E0E;
      --reveal-bg:   #28201A;
      --shadow:      0 2px 12px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15);
      --shadow-lg:   0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2);
    }
  }

  /* ── Reset ───────────────────────────────────────────── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :global(body) {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-ui);
    min-height: 100vh;
  }

  /* ── Setup screen ────────────────────────────────────── */
  .setup-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 2.5rem 2rem 2rem;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    text-align: center;
  }

  .setup-title {
    font-family: var(--font-disp);
    font-size: 2rem;
    font-weight: 700;
    color: var(--text);
    line-height: 1.15;
  }

  .setup-sub {
    font-size: 0.82rem;
    color: var(--muted);
    margin-bottom: 0.75rem;
  }

  .setup-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
    margin-bottom: 1.25rem;
  }

  .setup-range {
    flex: 1;
    accent-color: var(--accent);
    height: 4px;
    cursor: pointer;
  }

  .setup-number {
    width: 68px;
    padding: 0.45rem 0.6rem;
    border: 1.5px solid var(--border);
    border-radius: 9px;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-ui);
    font-size: 1rem;
    font-weight: 600;
    text-align: center;
    outline: none;
    transition: border-color 0.2s;
  }

  .setup-number:focus {
    border-color: var(--accent);
  }

  .btn-start {
    width: 100%;
    padding: 0.7rem 1rem;
    font-size: 1rem;
  }

  /* ── Layout ──────────────────────────────────────────── */
  .app {
    max-width: 580px;
    margin: 0 auto;
    padding: 2rem 1.25rem 5rem;
  }

  /* ── Header ──────────────────────────────────────────── */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.75rem;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .logo-gem {
    font-size: 1.3rem;
    color: var(--accent);
    line-height: 1;
  }

  .logo-text {
    font-family: var(--font-disp);
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.01em;
  }

  .icon-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: 1.5px solid var(--border);
    border-radius: 50%;
    color: var(--muted);
    font-size: 1.1rem;
    cursor: pointer;
    transition: color 0.2s, border-color 0.2s, background 0.2s;
  }

  .icon-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--card);
  }

  /* ── Progress ────────────────────────────────────────── */
  .progress-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .progress-track {
    flex: 1;
    height: 5px;
    background: var(--border);
    border-radius: 99px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 99px;
    transition: width 0.45s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .progress-label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--muted);
    white-space: nowrap;
    min-width: 40px;
    text-align: right;
  }

  .progress-sep { font-weight: 400; }

  /* ── Card ────────────────────────────────────────────── */
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 2rem 1.75rem 1.5rem;
    box-shadow: var(--shadow);
  }

  .question {
    font-family: var(--font-disp);
    font-size: 1.55rem;
    font-weight: 400;
    line-height: 1.38;
    color: var(--text);
    margin-bottom: 1.4rem;
    animation: slideDown 0.28s cubic-bezier(0.4, 0, 0.2, 1) both;
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .answer-input {
    display: block;
    width: 100%;
    padding: 0.7rem 1rem;
    border: 1.5px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-ui);
    font-size: 1rem;
    outline: none;
    margin-bottom: 0.9rem;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .answer-input::placeholder { color: var(--muted); opacity: 0.65; }

  .answer-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
  }

  /* ── Buttons ─────────────────────────────────────────── */
  .card-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-primary {
    padding: 0.55rem 1.4rem;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 9px;
    font-family: var(--font-ui);
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.18s, transform 0.1s;
  }

  .btn-primary:hover  { background: var(--accent-dark); }
  .btn-primary:active { transform: scale(0.97); }

  .btn-ghost {
    padding: 0.55rem 1.1rem;
    background: transparent;
    color: var(--muted);
    border: 1.5px solid var(--border);
    border-radius: 9px;
    font-family: var(--font-ui);
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.18s, border-color 0.18s, background 0.18s;
  }

  .btn-ghost:hover {
    color: var(--text);
    border-color: var(--muted);
    background: var(--bg);
  }

  .btn-ghost:disabled {
    opacity: 0.38;
    cursor: not-allowed;
  }

  /* ── Feedback ────────────────────────────────────────── */
  .feedback {
    margin-top: 1.1rem;
    padding: 0.9rem 1.1rem;
    border-radius: 11px;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    animation: riseIn 0.22s ease both;
  }

  @keyframes riseIn {
    from { opacity: 0; transform: translateY(5px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .feedback-correct { background: var(--success-bg); }
  .feedback-wrong   { background: var(--error-bg); }
  .feedback-reveal  { background: var(--reveal-bg); }

  .feedback-pill {
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 0.15rem 0.5rem;
    border-radius: 99px;
    width: fit-content;
  }

  .pill-correct { background: var(--success); color: #fff; }
  .pill-wrong   { background: var(--error);   color: #fff; }
  .pill-reveal  { background: var(--accent);  color: #fff; }

  .feedback-detail {
    font-size: 1rem;
    color: var(--text);
  }

  .example-quote {
    font-family: var(--font-disp);
    font-style: italic;
    font-size: 0.92rem;
    color: var(--muted);
    border-left: 2px solid var(--border);
    padding-left: 0.7rem;
    margin-top: 0.15rem;
    line-height: 1.55;
  }

  .example-translation {
    font-size: 0.82rem;
    color: var(--muted);
    opacity: 0.7;
    padding-left: 0.7rem;
    line-height: 1.5;
    margin-top: 0.1rem;
  }

  /* ── Session score ───────────────────────────────────── */
  .session-score {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.35rem;
    margin-top: 1.5rem;
  }

  .score-num {
    font-family: var(--font-disp);
    font-size: 2.2rem;
    font-weight: 700;
    color: var(--accent);
    line-height: 1;
  }

  .score-word {
    font-size: 0.85rem;
    color: var(--muted);
    font-weight: 500;
  }

  /* ── Results page ────────────────────────────────────── */
  .results { padding-top: 0.5rem; }

  .results-hero {
    text-align: center;
    margin-bottom: 2.5rem;
  }

  .results-eyebrow {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 0.4rem;
  }

  .results-title {
    font-family: var(--font-disp);
    font-size: 2.4rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 1.25rem;
    line-height: 1.1;
  }

  .score-ring {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 110px;
    height: 110px;
    border-radius: 50%;
    border: 3px solid var(--accent);
    background: var(--card);
    box-shadow: var(--shadow-lg);
  }

  .ring-pct {
    font-family: var(--font-disp);
    font-size: 1.9rem;
    font-weight: 700;
    color: var(--accent);
    line-height: 1;
  }

  .ring-pct em { font-style: normal; font-size: 1.15rem; }

  .ring-frac {
    font-size: 0.75rem;
    color: var(--muted);
    font-weight: 500;
    margin-top: 0.1rem;
  }

  /* ── Review list ─────────────────────────────────────── */
  .section-label {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 0.6rem;
  }

  .result-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    margin-bottom: 2rem;
  }

  .result-item {
    display: flex;
    align-items: flex-start;
    gap: 0.7rem;
    padding: 0.85rem 1rem;
    border-radius: 12px;
    background: var(--card);
    border: 1px solid var(--border);
  }

  .result-icon {
    font-size: 0.8rem;
    font-weight: 700;
    flex-shrink: 0;
    margin-top: 0.15rem;
  }

  .result-ok  .result-icon { color: var(--success); }
  .result-bad .result-icon { color: var(--error); }

  .result-body {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .result-q {
    font-size: 0.93rem;
    font-weight: 600;
    color: var(--text);
  }

  .result-ans { font-size: 0.86rem; }
  .ans-correct { color: var(--success); }
  .ans-wrong   { color: var(--error); }

  .result-example {
    font-family: var(--font-disp);
    font-style: italic;
    font-size: 0.82rem;
    color: var(--muted);
    margin-top: 0.1rem;
  }

  .result-example-translation {
    font-size: 0.78rem;
    color: var(--muted);
    opacity: 0.65;
  }

  /* ── Results actions ─────────────────────────────────── */
  .results-actions {
    display: flex;
    gap: 0.6rem;
    justify-content: center;
  }
</style>
