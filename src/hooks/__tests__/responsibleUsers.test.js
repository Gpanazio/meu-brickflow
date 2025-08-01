import { describe, it, expect } from 'vitest'

function getUserTasks(tasks, username) {
  return tasks.filter(t => t.responsibleUsers?.includes(username))
}

describe('responsibleUsers', () => {
  it('returns tasks assigned to the user', () => {
    const tasks = [
      { id: 1, responsibleUsers: ['alice', 'bob'] },
      { id: 2, responsibleUsers: ['carol'] },
      { id: 3, responsibleUsers: [] }
    ]

    expect(getUserTasks(tasks, 'alice').length).toBe(1)
    expect(getUserTasks(tasks, 'carol').length).toBe(1)
    expect(getUserTasks(tasks, 'dave').length).toBe(0)
  })
})
