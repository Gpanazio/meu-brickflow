import './App.css'
import { useUsers } from './hooks/useUsers'
import LoginModal from './components/LoginModal'
import CreateUserModal from './components/CreateUserModal'

export default function App() {
  const {
    currentUser,
    isLoggedIn,
    showLoginModal,
    setShowLoginModal,
    showCreateUserModal,
    setShowCreateUserModal,
    handleLogin,
    handleCreateUser
  } = useUsers()

  if (!isLoggedIn) {
    return (
      <div className="app">
        {showLoginModal && (
          <LoginModal
            open={showLoginModal}
            onLogin={handleLogin}
            onShowCreateUser={() => {
              setShowLoginModal(false)
              setShowCreateUserModal(true)
            }}
          />
        )}
        {showCreateUserModal && (
          <CreateUserModal
            open={showCreateUserModal}
            onCreateUser={handleCreateUser}
            onCancel={() => {
              setShowCreateUserModal(false)
              setShowLoginModal(true)
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="app">
      <h1>BrickFlow</h1>
      <div>Bem-vindo, {currentUser.displayName}</div>
    </div>
  )
}
