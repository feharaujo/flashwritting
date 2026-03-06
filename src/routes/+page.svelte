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
  let streak = 0
  let bestStreak = 0
  type ResultItem = { question: string; user: string; correct: string; example: string; exampleTranslation: string; isCorrect: boolean; index: number; reversed: boolean }
  let results: ResultItem[] = []
  let cardFlip = false
  let confettiActive = false
  let celebrateGlow = false

  // Phrase Builder mode state
  let mode: 'cards' | 'phrases' = 'cards'
  let tenses = { present: true, past: false, future: false }
  let currentTense = 'present'
  type PhraseValidation = { correct: boolean; phrase: string; explanation: string }
  let phraseResult: PhraseValidation | null = null
  let phraseLoading = false
  let phraseInput = ''
  type PhraseResultItem = { word: string; wordTranslation: string; tense: string; userPhrase: string; validation: PhraseValidation | null; isCorrect: boolean; index: number }
  let phraseResults: PhraseResultItem[] = []
  let phraseCorrectCount = 0
  let phraseWaitingNext = false

  function pickTense(): string {
    const selected = Object.entries(tenses).filter(([, v]) => v).map(([k]) => k)
    return selected[Math.floor(Math.random() * selected.length)]
  }

  function startPhrases() {
    order = weightedShuffle().slice(0, clampedCount)
    current = 0
    correctCount = 0
    phraseCorrectCount = 0
    streak = 0
    bestStreak = 0
    completed = false
    phraseInput = ''
    phraseResult = null
    phraseLoading = false
    phraseResults = []
    phraseWaitingNext = false
    currentTense = pickTense()
    setup = false
  }

  async function submitPhrase() {
    if (phraseLoading || !phraseInput.trim()) return
    phraseLoading = true
    phraseResult = null
    const card = data.cards[order[current]]
    try {
      const res = await fetch('/api/validate-phrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: card.answer,
          wordTranslation: card.question,
          phrase: phraseInput.trim(),
          tense: currentTense
        })
      })
      const result: PhraseValidation = await res.json()
      phraseResult = result
      const ok = result.correct
      phraseResults = [...phraseResults, {
        word: card.answer,
        wordTranslation: card.question,
        tense: currentTense,
        userPhrase: phraseInput.trim(),
        validation: result,
        isCorrect: ok,
        index: order[current]
      }]
      if (ok) {
        phraseCorrectCount += 1
        correctCount += 1
        streak += 1
        if (streak > bestStreak) bestStreak = streak
        if (streak >= 3) triggerConfetti()
        fetch('/api/tracker', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([card.question]) })
          .then(r => r.json()).then(t => { tracker = t })
          .catch(() => {})
      } else {
        streak = 0
        const key = card.question
        tracker = { ...tracker, [key]: (tracker[key] ?? 0) + 1 }
        fetch('/api/tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([key])
        }).catch(() => {})
      }
      phraseWaitingNext = true
    } catch {
      phraseResult = { correct: false, phrase: '', explanation: 'Failed to validate. Please try again.' }
    } finally {
      phraseLoading = false
    }
  }

  function nextPhrase() {
    if (current < order.length - 1) {
      current += 1
      phraseInput = ''
      phraseResult = null
      phraseWaitingNext = false
      currentTense = pickTense()
    } else {
      completed = true
    }
  }

  function skipPhrase() {
    if (phraseLoading) return
    const card = data.cards[order[current]]
    phraseResults = [...phraseResults, {
      word: card.answer,
      wordTranslation: card.question,
      tense: currentTense,
      userPhrase: '(skipped)',
      validation: null,
      isCorrect: false,
      index: order[current]
    }]
    streak = 0
    nextPhrase()
  }

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

  function weightedShuffle(): number[] {
    return Array.from({ length: total }, (_, i) => i)
      .map(i => ({ idx: i, score: Math.random() * (1 + Math.min(Math.log1p(tracker[data.cards[i].question] ?? 0) * 2, 2)) }))
      .sort((a, b) => b.score - a.score)
      .map(x => x.idx)
  }

  function start() {
    order = weightedShuffle().slice(0, clampedCount)
    reversed = makeReversed(order.length)
    current = 0
    correctCount = 0
    streak = 0
    bestStreak = 0
    completed = false
    input = ''
    showResult = ''
    showExample = ''
    showExampleTranslation = ''
    showDutchWord = ''
    results = []
    setup = false
    cardFlip = false
    maybeAutoPlay()
  }

  function triggerConfetti() {
    confettiActive = true
    celebrateGlow = true
    setTimeout(() => confettiActive = false, 2500)
    setTimeout(() => celebrateGlow = false, 1500)
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
      streak += 1
      if (streak > bestStreak) bestStreak = streak
      showResult = 'Correct'
      fetch('/api/tracker', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([card.question]) })
        .then(r => r.json()).then(t => { tracker = t })
        .catch(() => {})
      if (streak >= 3) triggerConfetti()
    } else {
      showResult = 'Incorrect'
      streak = 0
      const key = card.question
      tracker = { ...tracker, [key]: (tracker[key] ?? 0) + 1 }
      fetch('/api/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([key])
      }).catch(() => {})
    }
    if (current < order.length - 1) {
      cardFlip = true
      setTimeout(() => {
        current += 1
        input = ''
        cardFlip = false
        maybeAutoPlay()
      }, 100)
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
    streak = 0
    bestStreak = 0
    showResult = ''
    showExample = ''
    showExampleTranslation = ''
    showDutchWord = ''
    completed = false
    results = []
    phraseInput = ''
    phraseResult = null
    phraseResults = []
    phraseCorrectCount = 0
    phraseWaitingNext = false
    phraseLoading = false
  }

  function retryWrong() {
    const wrong = results.filter((r) => !r.isCorrect).map((r) => r.index)
    if (wrong.length === 0) return
    order = shuffle(wrong.length).map((i) => wrong[i])
    reversed = makeReversed(order.length)
    current = 0
    input = ''
    correctCount = 0
    streak = 0
    bestStreak = 0
    showResult = ''
    showExample = ''
    showExampleTranslation = ''
    showDutchWord = ''
    completed = false
    results = []
    maybeAutoPlay()
  }

  $: pct = order.length > 0 ? Math.round((correctCount / order.length) * 100) : 0
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<main class="app">
  <!-- Ambient background shapes -->
  <div class="bg-grain"></div>

  {#if setup}
    <!-- ━━━ SETUP SCREEN ━━━ -->
    <div class="setup-layout">
      <div class="setup-hero">
        <div class="brand">
          <div class="brand-icon">
            <span class="brand-nl">NL</span>
          </div>
          <h1 class="brand-name">Flash<span class="brand-accent">Dutch</span></h1>
        </div>
        <p class="hero-tagline">Master Dutch vocabulary,<br/>one card at a time</p>
      </div>

      <div class="setup-card">
        <div class="setup-card-inner">
          <!-- Mode selector -->
          <div class="mode-selector">
            <button class="mode-pill" class:mode-active={mode === 'cards'} on:click={() => mode = 'cards'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              Flash Cards
            </button>
            <button class="mode-pill" class:mode-active={mode === 'phrases'} on:click={() => mode = 'phrases'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Phrase Builder
            </button>
          </div>

          <div class="setup-section">
            <label class="setup-label" for="word-slider">Words per session</label>
            <div class="word-picker">
              <input
                id="word-slider"
                class="range-input"
                type="range"
                min="1"
                max={total}
                bind:value={wordCount}
              />
              <div class="word-count-badge">
                <input
                  class="count-input"
                  type="number"
                  min="1"
                  max={total}
                  bind:value={wordCount}
                />
                <span class="count-total">/ {total}</span>
              </div>
            </div>
          </div>

          {#if mode === 'cards'}
            <div class="setup-options">
              <label class="option-row">
                <input type="checkbox" bind:checked={mixLanguages} />
                <span class="option-switch"><span class="option-knob"></span></span>
                <span class="option-content">
                  <span class="option-title">Mix directions</span>
                  <span class="option-desc">Practice NL → EN and EN → NL</span>
                </span>
              </label>

              <label class="option-row">
                <input type="checkbox" bind:checked={autoPlayDutch} />
                <span class="option-switch"><span class="option-knob"></span></span>
                <span class="option-content">
                  <span class="option-title">Auto-play audio</span>
                  <span class="option-desc">Hear Dutch pronunciation automatically</span>
                </span>
              </label>
            </div>
          {:else}
            <div class="setup-section">
              <label class="setup-label">Tense</label>
              <div class="tense-options">
                <label class="tense-chip" class:tense-active={tenses.present}>
                  <input type="checkbox" bind:checked={tenses.present} />
                  Present
                </label>
                <label class="tense-chip" class:tense-active={tenses.past}>
                  <input type="checkbox" bind:checked={tenses.past} />
                  Past
                </label>
                <label class="tense-chip" class:tense-active={tenses.future}>
                  <input type="checkbox" bind:checked={tenses.future} />
                  Future
                </label>
              </div>
            </div>
          {/if}

          {#if mode === 'cards'}
            <button class="btn-go" on:click={start}>
              <span class="btn-go-text">Start learning</span>
              <span class="btn-go-count">{clampedCount} words</span>
              <span class="btn-go-arrow">→</span>
            </button>
          {:else}
            <button class="btn-go" on:click={startPhrases} disabled={!tenses.present && !tenses.past && !tenses.future}>
              <span class="btn-go-text">Start practicing</span>
              <span class="btn-go-count">{clampedCount} words</span>
              <span class="btn-go-arrow">→</span>
            </button>
          {/if}
        </div>
      </div>
    </div>

  {:else if !completed && mode === 'phrases'}
    <!-- ━━━ PHRASE BUILDER SCREEN ━━━ -->
    <header class="quiz-header">
      <div class="brand-mini">
        <div class="brand-icon-sm">
          <span class="brand-nl-sm">NL</span>
        </div>
        <span class="brand-name-sm">FlashDutch</span>
      </div>
      <div class="header-right">
        {#if streak >= 2}
          <div class="streak-badge">
            <span class="streak-fire">🔥</span>
            <span class="streak-num">{streak}</span>
          </div>
        {/if}
        <button class="btn-reset" on:click={reset} title="Back to setup">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        </button>
      </div>
    </header>

    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" style="width: {(current / order.length) * 100}%"></div>
      </div>
      <div class="progress-info">
        <span class="progress-current">{current + 1}</span>
        <span class="progress-divider">/</span>
        <span class="progress-total">{order.length}</span>
      </div>
    </div>

    {#if confettiActive}
      <div class="confetti-container">
        {#each Array(50) as _, i}
          {@const angle = (i / 50) * Math.PI * 2 + (Math.random() - 0.5) * 0.5}
          {@const dist = 150 + Math.random() * 350}
          {@const tx = Math.cos(angle) * dist}
          {@const ty = Math.sin(angle) * dist * 0.7 - 80}
          <div class="confetti-piece" style="--tx:{tx}px;--ty:{ty}px;--delay:{Math.random() * 0.25}s;--r:{Math.random() * 720 - 360}deg;--size:{8 + Math.random() * 8}px"></div>
        {/each}
      </div>
    {/if}

    <div class="quiz-card" class:card-celebrate={celebrateGlow}>
      <div class="card-category">
        <span class="lang-tag lang-nl">Phrase Builder</span>
        <span class="tense-tag tense-tag-{currentTense}">{currentTense}</span>
      </div>

      {#key current}
        <div class="card-word">
          <span class="word-text">{data.cards[order[current]].answer}</span>
          <button class="btn-speak" on:click={() => speak(data.cards[order[current]].answer)} title="Listen">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
          </button>
        </div>
        <p class="phrase-translation">{data.cards[order[current]].question}</p>
      {/key}

      <div class="input-group">
        <textarea
          class="answer-field phrase-field"
          bind:value={phraseInput}
          placeholder="Write a Dutch sentence using this word…"
          on:keydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (phraseWaitingNext) nextPhrase(); else submitPhrase(); } }}
          autocomplete="off"
          spellcheck="false"
          rows="3"
          disabled={phraseLoading || phraseWaitingNext}
        ></textarea>
        <div class="input-hint">{phraseWaitingNext ? 'Press Enter for next word' : 'Press Enter to submit'}</div>
      </div>

      <div class="card-buttons">
        {#if phraseWaitingNext}
          <button class="btn-submit" on:click={nextPhrase}>
            {current < order.length - 1 ? 'Next' : 'Finish'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        {:else}
          <button class="btn-submit" on:click={submitPhrase} disabled={phraseLoading || !phraseInput.trim()}>
            {#if phraseLoading}
              <span class="spinner"></span> Checking…
            {:else}
              Check
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            {/if}
          </button>
          <button class="btn-reveal" on:click={skipPhrase} disabled={phraseLoading}>
            Skip
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
          </button>
        {/if}
      </div>

      {#if phraseResult}
        <div
          class="feedback-block"
          class:fb-correct={phraseResult.correct}
          class:fb-wrong={!phraseResult.correct}
        >
          {#if phraseResult.correct}
            <div class="fb-header">
              <span class="fb-badge fb-badge-correct">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Correct
              </span>
              {#if streak >= 2}
                <span class="fb-streak">🔥 {streak} streak!</span>
              {/if}
            </div>
            {#if phraseResult.phrase}
              <p class="fb-answer">{phraseResult.phrase}</p>
            {/if}
          {:else}
            <div class="fb-header">
              <span class="fb-badge fb-badge-wrong">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Needs improvement
              </span>
            </div>
            {#if phraseResult.phrase}
              <p class="fb-corrected"><strong>{phraseResult.phrase}</strong></p>
            {/if}
            {#if phraseResult.explanation}
              <p class="fb-explanation">{phraseResult.explanation}</p>
            {/if}
          {/if}
        </div>
      {/if}
    </div>

    <div class="score-pill">
      <span class="score-correct">{correctCount}</span>
      <span class="score-label">correct</span>
      <span class="score-divider">·</span>
      <span class="score-remaining">{order.length - current - (phraseResult ? 0 : 1)} left</span>
    </div>

  {:else if !completed}
    <!-- ━━━ QUIZ SCREEN ━━━ -->
    <header class="quiz-header">
      <div class="brand-mini">
        <div class="brand-icon-sm">
          <span class="brand-nl-sm">NL</span>
        </div>
        <span class="brand-name-sm">FlashDutch</span>
      </div>
      <div class="header-right">
        {#if streak >= 2}
          <div class="streak-badge">
            <span class="streak-fire">🔥</span>
            <span class="streak-num">{streak}</span>
          </div>
        {/if}
        <button class="btn-reset" on:click={reset} title="Back to setup">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        </button>
      </div>
    </header>

    <!-- Progress bar -->
    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" style="width: {(current / order.length) * 100}%"></div>
      </div>
      <div class="progress-info">
        <span class="progress-current">{current + 1}</span>
        <span class="progress-divider">/</span>
        <span class="progress-total">{order.length}</span>
      </div>
    </div>

    <!-- Confetti -->
    {#if confettiActive}
      <div class="confetti-container">
        {#each Array(50) as _, i}
          {@const angle = (i / 50) * Math.PI * 2 + (Math.random() - 0.5) * 0.5}
          {@const dist = 150 + Math.random() * 350}
          {@const tx = Math.cos(angle) * dist}
          {@const ty = Math.sin(angle) * dist * 0.7 - 80}
          <div class="confetti-piece" style="--tx:{tx}px;--ty:{ty}px;--delay:{Math.random() * 0.25}s;--r:{Math.random() * 720 - 360}deg;--size:{8 + Math.random() * 8}px"></div>
        {/each}
      </div>
    {/if}

    <!-- The card -->
    <div class="quiz-card" class:card-exit={cardFlip} class:card-celebrate={celebrateGlow}>
      <div class="card-category">
        {#if reversed[current]}
          <span class="lang-tag lang-nl">NL → EN</span>
        {:else}
          <span class="lang-tag lang-en">EN → NL</span>
        {/if}
      </div>

      {#key current}
        <div class="card-word">
          {#if reversed[current]}
            <span class="word-text">{data.cards[order[current]].answer}</span>
            <button class="btn-speak" on:click={() => speak(data.cards[order[current]].answer)} title="Listen">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            </button>
          {:else}
            <span class="word-text">{data.cards[order[current]].question}</span>
          {/if}
        </div>
      {/key}

      <div class="input-group">
        <input
          class="answer-field"
          bind:value={input}
          placeholder="Type the translation…"
          on:keydown={(e) => e.key === 'Enter' && submit()}
          autocomplete="off"
          spellcheck="false"
        />
        <div class="input-hint">Press Enter to submit</div>
      </div>

      <div class="card-buttons">
        <button class="btn-submit" on:click={submit}>
          Check
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button class="btn-reveal" on:click={reveal}>
          Show answer
        </button>
      </div>

      {#if showResult}
        <div
          class="feedback-block"
          class:fb-correct={showResult === 'Correct'}
          class:fb-wrong={showResult === 'Incorrect'}
          class:fb-reveal={showResult !== 'Correct' && showResult !== 'Incorrect'}
        >
          {#if showResult === 'Correct'}
            <div class="fb-header">
              <span class="fb-badge fb-badge-correct">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Correct
              </span>
              {#if streak >= 2}
                <span class="fb-streak">🔥 {streak} streak!</span>
              {/if}
            </div>
          {:else if showResult === 'Incorrect'}
            <div class="fb-header">
              <span class="fb-badge fb-badge-wrong">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Incorrect
              </span>
            </div>
            <p class="fb-answer">The answer is <strong>{results[results.length - 1].correct}</strong></p>
          {:else}
            <div class="fb-header">
              <span class="fb-badge fb-badge-reveal">Answer</span>
            </div>
            <p class="fb-answer"><strong>{showResult}</strong></p>
          {/if}

          {#if showDutchWord}
            <button class="btn-hear" on:click={() => speak(showDutchWord)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              Hear Dutch
            </button>
          {/if}

          {#if showExample}
            <div class="fb-example">
              <p class="fb-example-nl">{showExample}</p>
              {#if showExampleTranslation}
                <p class="fb-example-en">{showExampleTranslation}</p>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Score pill -->
    <div class="score-pill">
      <span class="score-correct">{correctCount}</span>
      <span class="score-label">correct</span>
      <span class="score-divider">·</span>
      <span class="score-remaining">{order.length - current - (showResult ? 0 : 1)} left</span>
    </div>

  {:else}
    <!-- ━━━ RESULTS SCREEN ━━━ -->
    <div class="results-screen">
      <div class="results-header">
        <p class="results-eyebrow">Session complete</p>
        <h2 class="results-title">
          {#if pct >= 80}Geweldig! 🎉
          {:else if pct >= 50}Goed bezig! 💪
          {:else}Oefening baart kunst! 📚{/if}
        </h2>

        <div class="score-display">
          <div class="score-circle" style="--pct:{pct}">
            <svg viewBox="0 0 120 120" class="score-svg">
              <circle cx="60" cy="60" r="52" class="score-track"/>
              <circle cx="60" cy="60" r="52" class="score-fill" style="stroke-dashoffset: {326.7 - (326.7 * pct / 100)}"/>
            </svg>
            <div class="score-inner">
              <span class="score-pct">{pct}<small>%</small></span>
            </div>
          </div>
          <div class="score-stats">
            <div class="stat">
              <span class="stat-value">{correctCount}</span>
              <span class="stat-label">Correct</span>
            </div>
            <div class="stat">
              <span class="stat-value">{order.length - correctCount}</span>
              <span class="stat-label">Mistakes</span>
            </div>
            {#if bestStreak > 1}
              <div class="stat">
                <span class="stat-value">🔥 {bestStreak}</span>
                <span class="stat-label">Best streak</span>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <div class="review-section">
        <h3 class="review-title">Review</h3>
        {#if mode === 'phrases'}
          <ul class="review-list">
            {#each phraseResults as r}
              <li class="review-item" class:review-ok={r.isCorrect} class:review-fail={!r.isCorrect}>
                <div class="review-status">
                  {#if r.isCorrect}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {:else}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  {/if}
                </div>
                <div class="review-content">
                  <div class="review-word">
                    {r.word}
                    <span class="review-flag">{r.tense}</span>
                  </div>
                  <div class="review-phrase">{r.userPhrase}</div>
                  {#if !r.isCorrect && r.validation}
                    <div class="review-correction">
                      <strong>{r.validation.phrase}</strong>
                    </div>
                    {#if r.validation.explanation}
                      <div class="review-explanation">{r.validation.explanation}</div>
                    {/if}
                  {/if}
                </div>
              </li>
            {/each}
          </ul>
        {:else}
          <ul class="review-list">
            {#each results as r, i}
              <li class="review-item" class:review-ok={r.isCorrect} class:review-fail={!r.isCorrect}>
                <div class="review-status">
                  {#if r.isCorrect}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {:else}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  {/if}
                </div>
                <div class="review-content">
                  <div class="review-word">
                    {#if r.reversed}<span class="review-flag">NL</span>{/if}
                    {r.question}
                  </div>
                  {#if r.isCorrect}
                    <div class="review-answer review-answer-ok">{r.correct}
                      <button class="btn-speak-sm" on:click={() => speak(r.reversed ? r.question : r.correct)} aria-label="Listen to pronunciation">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                      </button>
                    </div>
                  {:else}
                    <div class="review-answer review-answer-wrong">
                      <span class="review-yours">{r.user || '—'}</span>
                      <span class="review-arrow">→</span>
                      <strong>{r.correct}</strong>
                      <button class="btn-speak-sm" on:click={() => speak(r.reversed ? r.question : r.correct)} aria-label="Listen to pronunciation">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                      </button>
                    </div>
                  {/if}
                  <div class="review-example">{r.example}</div>
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <div class="results-actions">
        <button class="btn-go" on:click={reset}>
          <span class="btn-go-text">New session</span>
          <span class="btn-go-arrow">→</span>
        </button>
        {#if mode === 'cards'}
          <button class="btn-retry" on:click={retryWrong} disabled={results.every((r) => r.isCorrect)}>
            Retry {results.filter(r => !r.isCorrect).length} mistakes
          </button>
        {/if}
      </div>
    </div>
  {/if}
</main>

<style>
  /* ━━━━━━━━━━ DESIGN TOKENS ━━━━━━━━━━ */
  :root {
    --navy: #0B1222;
    --navy-light: #1A2540;
    --navy-mid: #243352;
    --surface: #F7F8FC;
    --surface-raised: #FFFFFF;
    --text-primary: #0B1222;
    --text-secondary: #5A6478;
    --text-muted: #8E95A7;
    --orange: #FF6B2C;
    --orange-dark: #E85A1E;
    --orange-glow: rgba(255, 107, 44, 0.25);
    --orange-subtle: rgba(255, 107, 44, 0.08);
    --green: #00C853;
    --green-bg: rgba(0, 200, 83, 0.08);
    --green-border: rgba(0, 200, 83, 0.2);
    --red: #FF3B5C;
    --red-bg: rgba(255, 59, 92, 0.08);
    --red-border: rgba(255, 59, 92, 0.2);
    --blue: #4C8BF5;
    --blue-bg: rgba(76, 139, 245, 0.08);
    --blue-border: rgba(76, 139, 245, 0.2);
    --border: rgba(0, 0, 0, 0.06);
    --shadow-sm: 0 1px 3px rgba(11, 18, 34, 0.04);
    --shadow-md: 0 4px 16px rgba(11, 18, 34, 0.06);
    --shadow-lg: 0 12px 40px rgba(11, 18, 34, 0.08);
    --shadow-xl: 0 20px 60px rgba(11, 18, 34, 0.1);
    --radius-sm: 10px;
    --radius-md: 16px;
    --radius-lg: 24px;
    --radius-xl: 32px;
    --font-display: 'Space Grotesk', system-ui, sans-serif;
    --font-body: 'Inter', system-ui, sans-serif;
    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
    --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --surface: #0B1222;
      --surface-raised: #1A2540;
      --text-primary: #F0F2F7;
      --text-secondary: #8E95A7;
      --text-muted: #5A6478;
      --border: rgba(255, 255, 255, 0.08);
      --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.2);
      --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.3);
      --shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.4);
      --shadow-xl: 0 20px 60px rgba(0, 0, 0, 0.5);
      --green-bg: rgba(0, 200, 83, 0.12);
      --red-bg: rgba(255, 59, 92, 0.12);
      --blue-bg: rgba(76, 139, 245, 0.12);
      --orange-subtle: rgba(255, 107, 44, 0.12);
    }
  }

  /* ━━━━━━━━━━ RESET ━━━━━━━━━━ */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :global(body) {
    background: var(--surface);
    color: var(--text-primary);
    font-family: var(--font-body);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }

  /* Subtle noise grain */
  .bg-grain {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    opacity: 0.03;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    background-size: 256px 256px;
  }

  .app {
    position: relative;
    z-index: 1;
    max-width: 560px;
    margin: 0 auto;
    padding: 2rem 1.25rem 4rem;
    min-height: 100vh;
  }

  /* ━━━━━━━━━━ BRAND ━━━━━━━━━━ */
  .brand {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .brand-icon {
    width: 52px;
    height: 52px;
    background: var(--navy);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 20px rgba(11, 18, 34, 0.3);
    position: relative;
    overflow: hidden;
  }

  .brand-icon::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 50%;
    background: linear-gradient(to bottom, rgba(255,255,255,0.1), transparent);
    border-radius: 14px 14px 0 0;
  }

  @media (prefers-color-scheme: dark) {
    .brand-icon {
      background: var(--orange);
      box-shadow: 0 4px 20px var(--orange-glow);
    }
    .brand-nl { color: #fff !important; }
  }

  .brand-nl {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--orange);
    letter-spacing: 0.02em;
  }

  .brand-name {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.03em;
  }

  .brand-accent { color: var(--orange); }

  .hero-tagline {
    font-size: 1.15rem;
    color: var(--text-secondary);
    line-height: 1.6;
    font-weight: 400;
  }

  /* ━━━━━━━━━━ SETUP SCREEN ━━━━━━━━━━ */
  .setup-layout {
    padding-top: 3rem;
    animation: fadeUp 0.6s var(--ease-out) both;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .setup-hero {
    margin-bottom: 2.5rem;
  }

  .setup-card {
    background: var(--surface-raised);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
  }

  .setup-card-inner {
    padding: 2rem;
  }

  .setup-section {
    margin-bottom: 2rem;
  }

  .setup-label {
    display: block;
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 1rem;
  }

  .word-picker {
    display: flex;
    align-items: center;
    gap: 1.25rem;
  }

  .range-input {
    flex: 1;
    appearance: none;
    -webkit-appearance: none;
    height: 6px;
    background: var(--border);
    border-radius: 99px;
    cursor: pointer;
    outline: none;
  }

  .range-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 22px;
    height: 22px;
    background: var(--orange);
    border-radius: 50%;
    border: 3px solid var(--surface-raised);
    box-shadow: 0 2px 8px var(--orange-glow);
    cursor: grab;
    transition: transform 0.2s var(--ease-spring), box-shadow 0.2s;
  }

  .range-input::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 4px 16px var(--orange-glow);
  }

  .range-input::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.1); }

  .word-count-badge {
    display: flex;
    align-items: baseline;
    gap: 0.3rem;
    background: var(--orange-subtle);
    padding: 0.5rem 0.85rem;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(255, 107, 44, 0.15);
  }

  .count-input {
    width: 40px;
    background: none;
    border: none;
    font-family: var(--font-display);
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--orange);
    text-align: right;
    outline: none;
    -moz-appearance: textfield;
  }
  .count-input::-webkit-outer-spin-button,
  .count-input::-webkit-inner-spin-button { -webkit-appearance: none; }

  .count-total {
    font-size: 0.85rem;
    color: var(--text-muted);
    font-weight: 500;
  }

  /* ━━━ Options ━━━ */
  .setup-options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 2rem;
  }

  .option-row {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.85rem 1rem;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background 0.2s;
    user-select: none;
  }

  .option-row:hover { background: var(--border); }
  .option-row input[type="checkbox"] { position: absolute; opacity: 0; width: 0; height: 0; }

  .option-switch {
    position: relative;
    width: 44px;
    height: 24px;
    background: var(--border);
    border-radius: 99px;
    flex-shrink: 0;
    transition: background 0.3s, box-shadow 0.3s;
  }

  .option-row input:checked ~ .option-switch {
    background: var(--orange);
    box-shadow: 0 2px 8px var(--orange-glow);
  }

  .option-knob {
    position: absolute;
    top: 2px; left: 2px;
    width: 20px; height: 20px;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    transition: transform 0.3s var(--ease-spring);
  }

  .option-row input:checked ~ .option-switch .option-knob {
    transform: translateX(20px);
  }

  .option-content { display: flex; flex-direction: column; gap: 0.1rem; }
  .option-title { font-size: 0.95rem; font-weight: 600; color: var(--text-primary); }
  .option-desc { font-size: 0.8rem; color: var(--text-muted); }

  /* ━━━ Start button ━━━ */
  .btn-go {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 1.1rem 2rem;
    background: var(--navy);
    color: #fff;
    border: none;
    border-radius: var(--radius-md);
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.25s var(--ease-out);
    box-shadow: 0 4px 20px rgba(11, 18, 34, 0.2);
    position: relative;
    overflow: hidden;
  }

  @media (prefers-color-scheme: dark) {
    .btn-go { background: var(--orange); box-shadow: 0 4px 20px var(--orange-glow); }
    .btn-go:hover { background: var(--orange-dark); }
  }

  .btn-go::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 50%;
    background: linear-gradient(to bottom, rgba(255,255,255,0.08), transparent);
  }

  .btn-go:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(11, 18, 34, 0.25);
  }

  .btn-go:active { transform: translateY(0) scale(0.98); }

  .btn-go-text { font-weight: 700; }
  .btn-go-count {
    background: rgba(255,255,255,0.15);
    padding: 0.2rem 0.6rem;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
  }
  .btn-go-arrow {
    font-size: 1.2rem;
    transition: transform 0.3s var(--ease-spring);
  }
  .btn-go:hover .btn-go-arrow { transform: translateX(4px); }

  /* ━━━━━━━━━━ QUIZ SCREEN ━━━━━━━━━━ */
  .quiz-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
    animation: fadeUp 0.4s var(--ease-out) both;
  }

  .brand-mini { display: flex; align-items: center; gap: 0.6rem; }

  .brand-icon-sm {
    width: 36px; height: 36px;
    background: var(--navy);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 8px rgba(11, 18, 34, 0.2);
  }

  @media (prefers-color-scheme: dark) {
    .brand-icon-sm { background: var(--orange); box-shadow: 0 2px 8px var(--orange-glow); }
    .brand-nl-sm { color: #fff !important; }
  }

  .brand-nl-sm {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 0.75rem;
    color: var(--orange);
  }

  .brand-name-sm {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.02em;
  }

  .header-right { display: flex; align-items: center; gap: 0.6rem; }

  .streak-badge {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: var(--orange-subtle);
    border: 1px solid rgba(255, 107, 44, 0.2);
    padding: 0.3rem 0.65rem;
    border-radius: 99px;
    animation: popIn 0.4s var(--ease-spring) both;
  }

  @keyframes popIn {
    from { opacity: 0; transform: scale(0.7); }
    to { opacity: 1; transform: scale(1); }
  }

  .streak-fire { font-size: 0.85rem; }
  .streak-num {
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--orange);
  }

  .btn-reset {
    width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center;
    background: var(--surface-raised);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-reset:hover {
    color: var(--orange);
    border-color: rgba(255, 107, 44, 0.3);
    background: var(--orange-subtle);
  }

  /* ━━━ Progress ━━━ */
  .progress-container {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .progress-bar {
    flex: 1;
    height: 5px;
    background: var(--border);
    border-radius: 99px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--orange), #FF9B6A);
    border-radius: 99px;
    transition: width 0.5s var(--ease-out);
  }

  .progress-info { display: flex; align-items: baseline; gap: 0.15rem; }
  .progress-current {
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary);
  }
  .progress-divider { color: var(--text-muted); font-size: 0.8rem; }
  .progress-total { font-size: 0.8rem; color: var(--text-muted); font-weight: 500; }

  /* ━━━ Confetti ━━━ */
  .confetti-container {
    position: fixed;
    top: 50%; left: 50%;
    width: 0; height: 0;
    pointer-events: none;
    z-index: 100;
  }

  .confetti-piece {
    position: absolute;
    width: var(--size); height: var(--size);
    background: var(--orange);
    border-radius: 2px;
    opacity: 0;
    animation: confettiBurst 2.5s var(--delay) ease-out forwards;
  }

  .confetti-piece:nth-child(4n)   { background: #FF6B2C; border-radius: 50%; }
  .confetti-piece:nth-child(4n+1) { background: #00C853; border-radius: 1px; }
  .confetti-piece:nth-child(4n+2) { background: #4C8BF5; border-radius: 50%; }
  .confetti-piece:nth-child(4n+3) { background: #FFD700; border-radius: 2px; }
  .confetti-piece:nth-child(7n)   { background: #FF3B5C; }
  .confetti-piece:nth-child(11n)  { background: #A855F7; border-radius: 50%; }

  @keyframes confettiBurst {
    0% {
      transform: translate(0, 0) rotate(0deg) scale(0);
      opacity: 1;
    }
    5% {
      opacity: 1;
      transform: translate(0, 0) rotate(0deg) scale(1.5);
    }
    20% {
      opacity: 1;
      transform: translate(calc(var(--tx) * 0.4), calc(var(--ty) * 0.3)) rotate(calc(var(--r) * 0.2)) scale(1.1);
    }
    55% {
      opacity: 0.9;
      transform: translate(calc(var(--tx) * 0.85), calc(var(--ty) * 0.7)) rotate(calc(var(--r) * 0.7)) scale(0.9);
    }
    100% {
      transform: translate(var(--tx), calc(var(--ty) + 300px)) rotate(var(--r)) scale(0.15);
      opacity: 0;
    }
  }

  /* ━━━ Quiz Card ━━━ */
  .quiz-card {
    background: var(--surface-raised);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: 2rem 1.75rem 1.75rem;
    box-shadow: var(--shadow-lg);
    transition: transform 0.15s, opacity 0.15s, box-shadow 0.4s;
  }

  .card-exit { opacity: 0.7; transform: scale(0.97); }

  .card-celebrate {
    animation: celebratePulse 1.5s ease-out forwards;
  }

  @keyframes celebratePulse {
    0% { box-shadow: 0 0 0 0px var(--orange), var(--shadow-lg), 0 0 0px var(--orange-glow); }
    20% { box-shadow: 0 0 0 6px var(--orange), var(--shadow-lg), 0 0 60px var(--orange-glow); }
    100% { box-shadow: var(--shadow-lg); }
  }

  .card-category { margin-bottom: 1.25rem; }

  .lang-tag {
    display: inline-flex;
    padding: 0.3rem 0.7rem;
    border-radius: 6px;
    font-family: var(--font-display);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .lang-en { background: var(--blue-bg); color: var(--blue); border: 1px solid var(--blue-border); }
  .lang-nl { background: var(--orange-subtle); color: var(--orange); border: 1px solid rgba(255,107,44,0.2); }

  .card-word {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 2rem;
    min-height: 60px;
    animation: wordEnter 0.5s var(--ease-spring) both;
  }

  @keyframes wordEnter {
    from { opacity: 0; transform: translateY(-16px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .word-text {
    font-family: var(--font-display);
    font-size: 2.4rem;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.03em;
    line-height: 1.2;
    text-align: center;
  }

  .btn-speak {
    width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s;
  }
  .btn-speak:hover {
    color: var(--orange);
    border-color: rgba(255,107,44,0.3);
    background: var(--orange-subtle);
  }

  /* ━━━ Input ━━━ */
  .input-group { margin-bottom: 1.25rem; }

  .answer-field {
    display: block;
    width: 100%;
    padding: 1rem 1.1rem;
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 1.05rem;
    font-weight: 500;
    outline: none;
    transition: all 0.25s var(--ease-out);
  }

  .answer-field::placeholder { color: var(--text-muted); font-weight: 400; }

  .answer-field:focus {
    border-color: var(--orange);
    box-shadow: 0 0 0 4px var(--orange-glow);
  }

  .input-hint {
    margin-top: 0.4rem;
    font-size: 0.75rem;
    color: var(--text-muted);
    text-align: right;
  }

  /* ━━━ Card buttons ━━━ */
  .card-buttons { display: flex; gap: 0.6rem; }

  .btn-submit {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.9rem 1.5rem;
    background: var(--navy);
    color: #fff;
    border: none;
    border-radius: var(--radius-md);
    font-family: var(--font-body);
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s var(--ease-out);
    box-shadow: 0 2px 10px rgba(11, 18, 34, 0.15);
  }

  @media (prefers-color-scheme: dark) {
    .btn-submit { background: var(--orange); box-shadow: 0 2px 10px var(--orange-glow); }
    .btn-submit:hover { background: var(--orange-dark); }
  }

  .btn-submit:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(11, 18, 34, 0.2); }
  .btn-submit:active { transform: translateY(0) scale(0.98); }

  .btn-reveal {
    padding: 0.9rem 1.25rem;
    background: transparent;
    color: var(--text-secondary);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    font-family: var(--font-body);
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-reveal:hover { border-color: var(--text-muted); color: var(--text-primary); }

  /* ━━━ Feedback ━━━ */
  .feedback-block {
    margin-top: 1.5rem;
    padding: 1.25rem;
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    animation: slideUp 0.4s var(--ease-spring) both;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .fb-correct { background: var(--green-bg); border: 1px solid var(--green-border); }
  .fb-wrong { background: var(--red-bg); border: 1px solid var(--red-border); }
  .fb-reveal { background: var(--blue-bg); border: 1px solid var(--blue-border); }

  .fb-header { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }

  .fb-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-family: var(--font-display);
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 0.3rem 0.7rem;
    border-radius: 6px;
    color: #fff;
  }
  .fb-badge-correct { background: var(--green); }
  .fb-badge-wrong { background: var(--red); }
  .fb-badge-reveal { background: var(--blue); }

  .fb-streak {
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--orange);
  }

  .fb-answer {
    font-size: 1rem;
    color: var(--text-primary);
    font-weight: 500;
  }
  .fb-answer strong { font-weight: 700; }

  .btn-hear {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.75rem;
    background: var(--surface-raised);
    border: 1px solid var(--border);
    border-radius: 99px;
    font-family: var(--font-body);
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    align-self: flex-start;
    transition: all 0.2s;
  }
  .btn-hear:hover { color: var(--orange); border-color: rgba(255,107,44,0.3); }

  .fb-example {
    margin-top: 0.25rem;
    padding: 0.65rem 0.85rem;
    background: rgba(255,255,255,0.5);
    border-radius: var(--radius-sm);
    border-left: 3px solid var(--orange);
  }
  @media (prefers-color-scheme: dark) { .fb-example { background: rgba(0,0,0,0.15); } }

  .fb-example-nl {
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--text-primary);
    font-style: italic;
    line-height: 1.5;
  }

  .fb-example-en {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-top: 0.2rem;
  }

  /* ━━━ Score pill ━━━ */
  .score-pill {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 1.5rem;
    padding: 0.75rem 1.25rem;
    background: var(--surface-raised);
    border: 1px solid var(--border);
    border-radius: 99px;
    box-shadow: var(--shadow-sm);
    animation: fadeUp 0.5s var(--ease-out) both;
    animation-delay: 0.2s;
  }

  .score-correct {
    font-family: var(--font-display);
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--green);
  }
  .score-label { font-size: 0.85rem; color: var(--text-secondary); font-weight: 500; }
  .score-divider { color: var(--border); font-size: 1.2rem; }
  .score-remaining { font-size: 0.85rem; color: var(--text-muted); font-weight: 500; }

  /* ━━━━━━━━━━ RESULTS SCREEN ━━━━━━━━━━ */
  .results-screen {
    animation: fadeUp 0.6s var(--ease-out) both;
  }

  .results-header {
    text-align: center;
    padding: 2.5rem 2rem;
    background: var(--surface-raised);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    margin-bottom: 2rem;
  }

  .results-eyebrow {
    font-family: var(--font-display);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 0.5rem;
  }

  .results-title {
    font-family: var(--font-display);
    font-size: 2.2rem;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.03em;
    margin-bottom: 2rem;
  }

  .score-display {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .score-circle {
    position: relative;
    width: 120px;
    height: 120px;
  }

  .score-svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .score-track {
    fill: none;
    stroke: var(--border);
    stroke-width: 8;
  }

  .score-fill {
    fill: none;
    stroke: var(--orange);
    stroke-width: 8;
    stroke-linecap: round;
    stroke-dasharray: 326.7;
    transition: stroke-dashoffset 1.5s var(--ease-out);
  }

  .score-inner {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .score-pct {
    font-family: var(--font-display);
    font-size: 2.2rem;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
  }
  .score-pct small { font-size: 1rem; color: var(--orange); font-weight: 600; }

  .score-stats {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    text-align: left;
  }

  .stat { display: flex; flex-direction: column; }
  .stat-value {
    font-family: var(--font-display);
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--text-primary);
  }
  .stat-label { font-size: 0.8rem; color: var(--text-muted); font-weight: 500; }

  /* ━━━ Review list ━━━ */
  .review-section { margin-bottom: 2rem; }

  .review-title {
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .review-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  .review-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .review-item {
    display: flex;
    align-items: flex-start;
    gap: 0.85rem;
    padding: 1rem 1.15rem;
    background: var(--surface-raised);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .review-item:hover { transform: translateY(-1px); box-shadow: var(--shadow-md); }

  .review-status {
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%;
    flex-shrink: 0;
    color: #fff;
  }
  .review-ok .review-status { background: var(--green); }
  .review-fail .review-status { background: var(--red); }

  .review-content { flex: 1; display: flex; flex-direction: column; gap: 0.3rem; }

  .review-word {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .review-flag {
    font-family: var(--font-display);
    font-size: 0.6rem;
    font-weight: 700;
    background: var(--orange-subtle);
    color: var(--orange);
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    letter-spacing: 0.04em;
  }

  .review-answer { font-size: 0.9rem; font-weight: 500; display: flex; align-items: center; gap: 0.35rem; }
  .review-answer-ok { color: var(--green); }
  .review-answer-wrong { color: var(--text-secondary); }
  .review-answer-wrong strong { color: var(--green); }
  .review-yours { color: var(--red); text-decoration: line-through; opacity: 0.8; }
  .review-arrow { color: var(--text-muted); font-size: 0.8rem; }

  .btn-speak-sm {
    display: inline-flex;
    background: none;
    border: none;
    padding: 0.15rem;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.2s;
  }
  .btn-speak-sm:hover { color: var(--orange); }

  .review-example {
    font-size: 0.82rem;
    color: var(--text-muted);
    font-style: italic;
    margin-top: 0.15rem;
  }

  /* ━━━ Results actions ━━━ */
  .results-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    position: sticky;
    bottom: 1rem;
    z-index: 10;
    background: var(--surface-raised);
    padding: 1.25rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-xl);
  }

  .btn-retry {
    width: 100%;
    padding: 0.85rem;
    background: transparent;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-retry:hover:not(:disabled) { border-color: var(--orange); color: var(--orange); }
  .btn-retry:disabled { opacity: 0.35; cursor: not-allowed; }

  /* ━━━━━━━━━━ MODE SELECTOR ━━━━━━━━━━ */
  .mode-selector {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
    background: var(--surface);
    padding: 0.3rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
  }

  .mode-pill {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.7rem 1rem;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.25s var(--ease-out);
  }

  .mode-pill:hover { color: var(--text-secondary); }

  .mode-active {
    background: var(--surface-raised);
    color: var(--text-primary);
    box-shadow: var(--shadow-sm);
  }

  /* ━━━ Tense selector ━━━ */
  .tense-options {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 2rem;
  }

  .tense-chip {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.6rem 1.1rem;
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: 99px;
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    user-select: none;
    transition: all 0.2s var(--ease-out);
  }

  .tense-chip input[type="checkbox"] { position: absolute; opacity: 0; width: 0; height: 0; }

  .tense-chip:hover { border-color: var(--text-muted); }

  .tense-active {
    background: var(--orange-subtle);
    border-color: var(--orange);
    color: var(--orange);
  }

  /* ━━━ Tense tag in card ━━━ */
  .tense-tag {
    display: inline-flex;
    padding: 0.3rem 0.7rem;
    border-radius: 6px;
    font-family: var(--font-display);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-left: 0.5rem;
  }

  .tense-tag-present { background: var(--green-bg); color: var(--green); border: 1px solid var(--green-border); }
  .tense-tag-past { background: var(--blue-bg); color: var(--blue); border: 1px solid var(--blue-border); }
  .tense-tag-future { background: rgba(168, 85, 247, 0.08); color: #A855F7; border: 1px solid rgba(168, 85, 247, 0.2); }

  /* ━━━ Phrase Builder card extras ━━━ */
  .phrase-translation {
    text-align: center;
    font-size: 0.95rem;
    color: var(--text-secondary);
    margin-top: -1.25rem;
    margin-bottom: 1.5rem;
    font-weight: 500;
  }

  .phrase-field {
    resize: vertical;
    min-height: 80px;
    line-height: 1.6;
    font-family: var(--font-body);
  }

  /* ━━━ Spinner ━━━ */
  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ━━━ Phrase feedback extras ━━━ */
  .fb-corrected {
    font-size: 1rem;
    color: var(--green);
    font-weight: 500;
    line-height: 1.5;
  }
  .fb-corrected strong { font-weight: 700; }

  .fb-explanation {
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.5;
    font-style: italic;
  }

  /* ━━━ Phrase review items ━━━ */
  .review-phrase {
    font-size: 0.9rem;
    color: var(--text-primary);
    font-weight: 500;
    line-height: 1.5;
  }

  .review-correction {
    font-size: 0.88rem;
    color: var(--green);
    font-weight: 500;
    line-height: 1.5;
  }

  .review-explanation {
    font-size: 0.82rem;
    color: var(--text-muted);
    font-style: italic;
    line-height: 1.5;
  }

  /* ━━━ Mobile tweaks ━━━ */
  @media (max-width: 480px) {
    .app { padding: 1.25rem 1rem 3rem; }
    .brand-name { font-size: 1.6rem; }
    .word-text { font-size: 1.8rem; }
    .results-title { font-size: 1.8rem; }
    .setup-card-inner { padding: 1.5rem; }
  }
</style>
