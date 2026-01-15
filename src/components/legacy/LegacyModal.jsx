import { Dialog } from '../ui/dialog';
import TaskModal from '../modals/TaskModal';
import ProjectModal from '../modals/ProjectModal';
import PasswordModal from '../modals/PasswordModal';

function LegacyModal({
  modalState,
  setModalState,
  handlePasswordSubmit,
  handleSaveProject,
  handleTaskAction,
  USER_COLORS,
  isReadOnly,
  users,
  currentUser
}) {
  return (
    <Dialog open={modalState.isOpen} onOpenChange={(open) => !open && setModalState({ ...modalState, isOpen: false })}>
      {modalState.type === 'task' && (
        <TaskModal
          modalState={modalState}
          setModalState={setModalState}
          handleTaskAction={handleTaskAction}
          isReadOnly={isReadOnly}
          currentUser={currentUser}
          users={users}
        />
      )}

      {(modalState.type === 'project' || modalState.type === 'subProject') && (
        <ProjectModal
          modalState={modalState}
          setModalState={setModalState}
          isReadOnly={isReadOnly}
          handleSaveProject={handleSaveProject}
          USER_COLORS={USER_COLORS}
        />
      )}

      {modalState.type === 'password' && (
        <PasswordModal
          handlePasswordSubmit={handlePasswordSubmit}
        />
      )}
    </Dialog>
  );
}

export default LegacyModal;
