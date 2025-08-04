import React, { useState } from 'react'

const initialPuzzle = [
  ['5', '3', '', '', '7', '', '', '', ''],
  ['6', '', '', '1', '9', '5', '', '', ''],
  ['', '9', '8', '', '', '', '', '6', ''],
  ['8', '', '', '', '6', '', '', '', '3'],
  ['4', '', '', '8', '', '3', '', '', '1'],
  ['7', '', '', '', '2', '', '', '', '6'],
  ['', '6', '', '', '', '', '2', '8', ''],
  ['', '', '', '4', '1', '9', '', '', '5'],
  ['', '', '', '', '8', '', '', '7', '9']
]

const fixedCells = initialPuzzle.map(row => row.map(cell => cell !== ''))

function SudokuGame() {
  const [board, setBoard] = useState(initialPuzzle.map(row => [...row]))
  const [showOverlay, setShowOverlay] = useState(false)
  const [showGame, setShowGame] = useState(true)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [showFinalOverlay, setShowFinalOverlay] = useState(false)

  const handleFirstInteraction = e => {
    if (!hasInteracted) {
      e.preventDefault()
      setShowOverlay(true)
      setHasInteracted(true)
    }
  }

  const handleChange = (row, col, value) => {
    if (!hasInteracted || showOverlay || showFinalOverlay) return
    const val = value.replace(/[^1-9]/g, '')
    if (fixedCells[row][col]) return

    const emptyCells = board.flat().filter(cell => cell === '').length
    if (emptyCells === 1 && val !== '') {
      setShowFinalOverlay(true)
      return
    }

    setBoard(prev => {
      const newBoard = prev.map(r => [...r])
      newBoard[row][col] = val
      return newBoard
    })
  }

  const restart = () => {
    setBoard(initialPuzzle.map(row => [...row]))
  }

  const isCellValid = (board, row, col) => {
    const val = board[row][col]
    if (!val) return true
    for (let i = 0; i < 9; i++) {
      if (i !== row && board[i][col] === val) return false
      if (i !== col && board[row][i] === val) return false
    }
    const startRow = Math.floor(row / 3) * 3
    const startCol = Math.floor(col / 3) * 3
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const rr = startRow + r
        const cc = startCol + c
        if ((rr !== row || cc !== col) && board[rr][cc] === val) return false
      }
    }
    return true
  }

  return (
    <div className="sudoku-box" data-testid="sudoku-game">
      {showOverlay && (
        <div className="sudoku-overlay" data-testid="sudoku-warning">
          <div className="sudoku-overlay-content">
            <p>
              O trabalho chama, mas o Sudoku é muito mais divertido. Qual é a sua
              escolha?
            </p>
            <div className="sudoku-overlay-actions">
              <button className="btn-primary" onClick={() => setShowOverlay(false)}>
                Estou ciente que preciso trabalhar, mas escolho jogar
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowGame(false)
                  setShowOverlay(false)
                }}
              >
                Obrigado por me lembrar, prefiro trabalhar a jogar
              </button>
            </div>
          </div>
        </div>
      )}

      {showFinalOverlay && (
        <div className="sudoku-overlay" data-testid="sudoku-final">
          <div className="sudoku-overlay-content">
            <p>
              Fracassar tão perto do sucesso é uma arte. Parabéns, você é um artista
              incompreendido! Mas vamos lembrar que aqui não é lugar para joguinhos.
            </p>
          </div>
        </div>
      )}

      {showGame ? (
        <>
          <h3>🧩 Sudoku</h3>
          <div className="sudoku-grid" onMouseDown={handleFirstInteraction}>
            {board.map((row, r) =>
              row.map((cell, c) => (
                <input
                  key={`${r}-${c}`}
                  className={`sudoku-cell${
                    fixedCells[r][c] ? ' prefilled' : ''
                  }${isCellValid(board, r, c) ? '' : ' invalid'}`}
                  value={cell}
                  onChange={e => handleChange(r, c, e.target.value)}
                  maxLength={1}
                  inputMode="numeric"
                  readOnly={fixedCells[r][c]}
                />
              ))
            )}
          </div>
          <button className="btn-primary" onClick={restart}>
            Reiniciar
          </button>
        </>
      ) : (
        <div data-testid="work-message">Procrastinação derrotada! De volta ao batente! 💪</div>
      )}
    </div>
  )
}

export default SudokuGame
