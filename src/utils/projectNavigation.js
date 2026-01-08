export function accessProjectNavigation({
  item,
  type = 'project',
  projects,
  setCurrentProject,
  setCurrentView,
  setCurrentSubProject,
  setCurrentBoardType
}) {
  if (type === 'project') {
    const targetProject = projects.find(project => project.id === item?.id) || item;
    if (!targetProject) return;
    setCurrentProject({ ...targetProject, subProjects: targetProject.subProjects || [] });
    setCurrentView('project');
    return;
  }
  const targetSubProject = item;
  if (!targetSubProject) return;
  setCurrentSubProject(targetSubProject);
  setCurrentView('subproject');
  setCurrentBoardType(targetSubProject.enabledTabs ? targetSubProject.enabledTabs[0] : 'kanban');
}
