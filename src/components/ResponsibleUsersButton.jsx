import React, { useState } from 'react'
import PropTypes from 'prop-types'

export default function ResponsibleUsersButton({ users, getUserInfo }) {
  const [open, setOpen] = useState(false)
  if (!users || users.length === 0) return null

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

ResponsibleUsersButton.propTypes = {
  users: PropTypes.arrayOf(PropTypes.string),
  getUserInfo: PropTypes.func,
}

ResponsibleUsersButton.defaultProps = {
  users: [],
  getUserInfo: undefined,
}
