<script lang="ts">
  export let data: { cards: { question: string; answer: string }[] }

  let order: number[] = []
  let current = 0
  let input = ''
  let correctCount = 0
  let showResult = ''
  let completed = false
  type ResultItem = { question: string; user: string; correct: string; isCorrect: boolean; index: number }
  let results: ResultItem[] = []

  function shuffle(n: number) {
    const arr = [...Array(n).keys()]
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  $: if (order.length === 0 && data.cards.length > 0) {
    order = shuffle(data.cards.length)
    current = 0
    correctCount = 0
    completed = false
    input = ''
    showResult = ''
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
        isCorrect: ok,
        index: order[current]
      }
    ]
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
  }

  function reset() {
    order = shuffle(data.cards.length)
    current = 0
    input = ''
    correctCount = 0
    showResult = ''
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
    completed = false
    results = []
  }
</script>

<main class="container">
  {#if !completed}
    <h1>Flashcards</h1>
    <p class="muted">Card {current + 1} of {order.length}</p>
    <div class="card">
      <div class="question">{data.cards[order[current]].question}</div>
      <input class="answer" bind:value={input} placeholder="Type answer" on:keydown={(e) => e.key === 'Enter' && submit()} />
      <div class="actions">
        <button class="primary" on:click={submit}>Submit</button>
        <button on:click={reveal}>Reveal</button>
      </div>
      {#if showResult}
        <div class="status" class:ok={showResult === 'Correct'} class:bad={showResult === 'Incorrect'}>
          {showResult}
          {#if showResult === 'Incorrect' && results.length > 0}
            — Correct: <strong>{results[results.length - 1].correct}</strong>
          {/if}
        </div>
      {/if}
    </div>
    <div class="footer">
      <span>Score: {correctCount}</span>
      <button on:click={reset}>Shuffle</button>
    </div>
  {:else}
    <h2>Finished</h2>
    <p class="muted">Score: {correctCount} / {order.length}</p>
    <h3>Results</h3>
    <ul class="result-list">
      {#each results as r}
        <li class:correct={r.isCorrect} class:wrong={!r.isCorrect}>
          <strong>{r.question}</strong>
          {#if r.isCorrect}
            — {r.correct}
          {:else}
            — Your: {r.user || '(empty)'} • Correct: <strong>{r.correct}</strong>
          {/if}
        </li>
      {/each}
    </ul>
    <div class="footer">
      <div style="display:flex; gap:0.5rem">
        <button on:click={reset}>Restart</button>
        <button on:click={retryWrong} disabled={results.every((r) => r.isCorrect)}>Retry wrong only</button>
      </div>
    </div>
  {/if}
</main>

<style>
  :root { color-scheme: light dark; }
  .container { max-width: 720px; margin: 2rem auto; padding: 1rem; font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; }
  .muted { color: #6b7280; }
  .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04); }
  @media (prefers-color-scheme: dark) { .card { background: #111827; border-color: #1f2937; box-shadow: none; } .muted { color: #9ca3af; } }
  .question { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
  .answer { padding: 0.6rem 0.75rem; width: 100%; margin: 0.5rem 0; border: 1px solid #d1d5db; border-radius: 8px; background: transparent; }
  .actions { display: flex; gap: 0.5rem; margin-top: 0.25rem; }
  button { appearance: none; border: 1px solid #d1d5db; background: #f9fafb; color: #111827; border-radius: 8px; padding: 0.5rem 0.9rem; cursor: pointer; }
  button.primary { background: #2563eb; border-color: #1d4ed8; color: #fff; }
  button:hover { filter: brightness(0.98); }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  .status { margin-top: 0.5rem; font-weight: 600; }
  .status.ok { color: #0a7a27; }
  .status.bad { color: #b00020; }
  .footer { display: flex; align-items: center; justify-content: space-between; margin-top: 0.75rem; }
  .result-list { list-style: none; padding: 0; margin: 0.5rem 0 1rem; }
  .result-list li { padding: 0.35rem 0; }
  .result-list li.correct { color: #0a7a27; }
  .result-list li.wrong { color: #b00020; }
</style>