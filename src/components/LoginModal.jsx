import React from 'react'

export function LoginModal({ open, onLogin, onShowCreateUser }) {
  if (!open) return null

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>🧱 Entrar no BrickFlow</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            onLogin(formData.get('username'), formData.get('pin'))
          }}
        >
          <div className="form-group">
            <label>Nome/Código:</label>
            <input
              type="text"
              name="username"
              placeholder="Ex: JOAO, MARIA_ADM"
              required
            />
          </div>
          <div className="form-group">
            <label>PIN (4 dígitos):</label>
            <input
              type="password"
              name="pin"
              placeholder="1234"
              maxLength="4"
              pattern="[0-9]{4}"
              required
            />
          </div>
          <div className="modal-actions">
            <button type="submit" className="btn-primary">Entrar</button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onShowCreateUser}
            >
              Criar Usuário
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginModal
