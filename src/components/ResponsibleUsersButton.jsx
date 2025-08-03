import React, { useState } from 'react'

export default function ResponsibleUsersButton({ users = [], getUserInfo }) {
  if (!users || users.length === 0) return null
  const [open, setOpen] = useState(false)

  const toggle = (e) => {
    e.stopPropagation()
    setOpen(prev => !prev)
  }

  return (
    <div className="responsible-users-button">
      <button onClick={toggle} className="responsible-toggle-btn">
        👤 {users.length}
      </button>
      {open && (
        <div className="task-responsible">
          {users.map(user => (
            <div key={user}>
              👤 {getUserInfo ? (getUserInfo(user)?.displayName || user) : user}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
