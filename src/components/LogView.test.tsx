import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LogView from './LogView'
import { getCategories, getDayLog, setHours, deleteCategory, reorderCategories, formatDate } from '../storage'
import type { Tracker } from '../trackers'

const workTracker: Tracker = { id: 'work', label: 'Work', unit: 'hours', sortOrder: 0, deleted: false }

describe('LogView', () => {
  const today = formatDate(new Date())
  const noop = () => {}

  it('renders all active categories', () => {
    render(<LogView tracker={workTracker} onSummary={noop} />)
    const cats = getCategories('work').filter((c) => !c.deleted)
    for (const cat of cats) {
      expect(screen.getByText(cat.label)).toBeInTheDocument()
    }
  })

  it('renders categories in sortOrder', () => {
    const cats = getCategories('work')
    const active = cats.filter((c) => !c.deleted).sort((a, b) => a.sortOrder - b.sortOrder)
    // Reverse the first two
    reorderCategories('work', [active[1].id, active[0].id, ...active.slice(2).map((c) => c.id)])

    render(<LogView tracker={workTracker} onSummary={noop} />)

    const labels = screen.getAllByText(
      (_content, el) => el?.classList.contains('truncate') && el?.classList.contains('font-medium') || false
    )
    expect(labels[0].textContent).toBe(active[1].label)
    expect(labels[1].textContent).toBe(active[0].label)
  })

  it('does not render deleted categories with no data', () => {
    const cats = getCategories('work')
    deleteCategory('work', cats[0].id)
    render(<LogView tracker={workTracker} onSummary={noop} />)
    expect(screen.queryByText(cats[0].label)).not.toBeInTheDocument()
  })

  it('renders deleted categories that have data for the current day', () => {
    const cats = getCategories('work')
    setHours('work', today, cats[0].id, 2)
    deleteCategory('work', cats[0].id)
    render(<LogView tracker={workTracker} onSummary={noop} />)
    expect(screen.getByText(cats[0].label)).toBeInTheDocument()
  })

  it('persists hours to storage when an hour button is clicked', async () => {
    const user = userEvent.setup()
    render(<LogView tracker={workTracker} onSummary={noop} />)

    const buttons = screen.getAllByRole('button', { name: '1' })
    await user.click(buttons[0])

    const cats = getCategories('work').filter((c) => !c.deleted)
    const log = getDayLog('work', today)
    expect(log[cats[0].id]).toBe(1)
  })

  it('toggles hour off when same button clicked twice', async () => {
    const user = userEvent.setup()
    render(<LogView tracker={workTracker} onSummary={noop} />)

    const buttons = screen.getAllByRole('button', { name: '1' })
    await user.click(buttons[0])
    await user.click(buttons[0])

    const cats = getCategories('work').filter((c) => !c.deleted)
    const log = getDayLog('work', today)
    expect(log[cats[0].id]).toBeUndefined()
  })

  it('updates total hours display after clicking an hour button', async () => {
    const user = userEvent.setup()
    render(<LogView tracker={workTracker} onSummary={noop} />)

    expect(screen.getByText('no hours logged')).toBeInTheDocument()

    const buttons = screen.getAllByRole('button', { name: '2' })
    await user.click(buttons[0])
    expect(screen.getByText('2h logged')).toBeInTheDocument()
  })

  it('reset day button clears all hours', async () => {
    const user = userEvent.setup()
    setHours('work', today, 'dr-1on1', 2)
    setHours('work', today, 'misc', 1)
    render(<LogView tracker={workTracker} onSummary={noop} />)

    expect(screen.getByText('3h logged')).toBeInTheDocument()
    await user.click(screen.getByText('Reset day'))

    expect(getDayLog('work', today)).toEqual({})
    expect(screen.getByText('no hours logged')).toBeInTheDocument()
  })

  it('navigates to previous day', async () => {
    const user = userEvent.setup()
    render(<LogView tracker={workTracker} onSummary={noop} />)

    expect(screen.queryByText('Today')).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('Previous day'))
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('navigates back to today after going to previous day', async () => {
    const user = userEvent.setup()
    render(<LogView tracker={workTracker} onSummary={noop} />)

    await user.click(screen.getByLabelText('Previous day'))
    await user.click(screen.getByText('Today'))
    expect(screen.queryByText('Today')).not.toBeInTheDocument()
  })
})
