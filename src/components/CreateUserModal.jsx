import React from 'react'

const avatarOptions = [
  '👨‍💼', '👩‍💼', '👨‍💻', '👩‍💻', '👨‍🎨', '👩‍🎨',
  '👨‍🔧', '👩‍🔧', '👨‍⚕️', '👩‍⚕️', '👨‍🏫', '👩‍🏫',
  '🧑‍💼', '🧑‍💻', '🧑‍🎨', '🧑‍🔧', '🧑‍⚕️', '🧑‍🏫',
  '😎', '🤓', '😊', '🤔', '😴', '🤯', '🥳', '🤠',
  '🐱', '🐶', '🐼', '🦊', '🐸', '🐧', '🦉', '🐨',
  '🦁', '🐯', '🐵', '🐺', '🦄', '🐙', '🦖', '🐢',
  '🍕', '🍔', '🌮', '🍩', '🧀', '🥑', '🍎', '🍌',
  '☕', '🍺', '🍷', '🥤', '🍪', '🥨', '🥯', '🧁',
  '💻', '📱', '⌚', '🖥️', '⌨️', '🖱️', '💾', '📀',
  '📎', '📌', '✂️', '📏', '📐', '🔍', '💡', '🔋',
  '🚀', '⭐', '🎯', '💎', '🏆', '🎪', '🎭', '🎨',
  '🎸', '🎺', '🎲', '🎮', '🎳', '⚽', '🏀', '🎾',
  '🌱', '🌸', '🌺', '🌻', '🌙', '☀️', '⚡', '🌈',
  '🔥', '💧', '🌪️', '❄️', '🌊', '🏔️', '🌋', '🌍',
  '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑',
  '✈️', '🚁', '🚂', '🚇', '🛸', '🚲', '🛴', '⛵'
]

const userColors = [
  'blue', 'red', 'green', 'purple', 'orange', 'cyan', 'pink', 'yellow'
]

export function CreateUserModal({ open, onCreateUser, onCancel }) {
  if (!open) return null

  return (
    <div className="modal-overlay">
      <div className="modal create-user-modal">
        <h2>🧱 Criar Usuário BrickFlow</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const pin = formData.get('pin')
            const confirmPin = formData.get('confirmPin')
            if (pin !== confirmPin) {
              alert('PINs não coincidem!')
              return
            }
            const selectedAvatar = formData.get('avatar')
            const selectedColor = formData.get('color')
            if (!selectedAvatar || !selectedColor) {
              alert('Selecione um avatar e uma cor!')
              return
            }
            onCreateUser({
              username: formData.get('username'),
              displayName: formData.get('displayName'),
              pin,
              avatar: selectedAvatar,
              color: selectedColor
            })
          }}
        >
          <div className="form-group">
            <label>Nome de Usuário (código):</label>
            <input
              type="text"
              name="username"
              placeholder="Ex: JOAO, MARIA_ADM"
              required
            />
          </div>
          <div className="form-group">
            <label>Nome de Exibição:</label>
            <input
              type="text"
              name="displayName"
              placeholder="Ex: João Silva, Maria Admin"
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
          <div className="form-group">
            <label>Confirmar PIN:</label>
            <input
              type="password"
              name="confirmPin"
              placeholder="1234"
              maxLength="4"
              pattern="[0-9]{4}"
              required
            />
          </div>

          <div className="form-group">
            <label>Escolha seu Avatar:</label>
            <div className="avatar-grid">
              {avatarOptions.map((avatar, index) => (
                <label key={index} className="avatar-option">
                  <input type="radio" name="avatar" value={avatar} required />
                  <span className="avatar-display">{avatar}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Escolha sua Cor:</label>
            <div className="color-grid">
              {userColors.map((color, index) => (
                <label key={index} className="color-option">
                  <input type="radio" name="color" value={color} required />
                  <span className={`color-display color-${color}`}></span>
                </label>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary">Criar Usuário</button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
            >
              Voltar ao Login
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateUserModal
