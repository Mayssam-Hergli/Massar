import { useState, useCallback } from 'react'
import { resolveNext, stepsToEnd, END } from '../data/diagnosticGraph'

/**
 * Client-side state for the dynamic (branching) questionnaire.
 *
 * - `answers`   : { nodeId: value } for every question actually answered
 * - `history`   : ordered stack of answered node ids (enables Back across branches)
 * - `currentId` : the question currently displayed (or END when finished)
 * - `done`      : true once the path reaches END
 *
 * Answering a question recomputes the next node from the graph, so the path
 * adapts live as the user clicks — no fixed step count.
 */
export function useDiagnosticFlow(graph) {
  const [answers, setAnswers] = useState({})
  const [history, setHistory] = useState([])
  const [currentId, setCurrentId] = useState(graph.start)

  const done = currentId === END

  // Answer the current question and advance to the resolved next node.
  const answer = useCallback((value) => {
    setCurrentId((cur) => {
      if (cur === END) return cur
      const nextAnswers = { ...answers, [cur]: value }
      setAnswers(nextAnswers)
      setHistory((h) => [...h, cur])
      return resolveNext(graph.nodes[cur], nextAnswers, value)
    })
  }, [answers, graph])

  // Step back to the previous answered question (its answer stays pre-selected).
  const back = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h
      setCurrentId(h[h.length - 1])
      return h.slice(0, -1)
    })
  }, [])

  const reset = useCallback(() => {
    setAnswers({})
    setHistory([])
    setCurrentId(graph.start)
  }, [graph])

  // Progress is approximate (branches vary length): answered / (answered + shortest remaining).
  const answered = history.length
  const remaining = done ? 0 : stepsToEnd(graph, currentId)
  const total = answered + remaining
  const progress = total ? Math.round((answered / total) * 100) : 0

  return { answers, history, currentId, done, answer, back, reset, answered, progress, canGoBack: history.length > 0 }
}
