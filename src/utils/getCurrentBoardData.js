/**
 * Retrieve the data for a specific board type from a project.
 *
 * The project's boards are now stored under the `boardData` object where each
 * key corresponds to a board type (e.g. `kanban`, `todo`).
 *
 * @param {object} project - The project containing board data.
 * @param {string} boardType - The type of board to fetch.
 * @returns {object|null} The board data or null if unavailable.
 */
export function getCurrentBoardData(project, boardType) {
  if (!project || !boardType) return null;
  return project.boardData?.[boardType] ?? null;
}
