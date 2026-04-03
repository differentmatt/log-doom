import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SummaryView from './SummaryView'
import { setHours, formatDate, getCategories, deleteCategory } from '../storage'

describe('SummaryView', () => {
  const noop = () => {}

  it('renders totals for days with data', () => {
    const today = formatDate(new Date())
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = formatDate(yesterday)

    setHours(today, 'dr-1on1', 2)
    setHours(yesterdayStr, 'dr-1on1', 3)

    render(<SummaryView onBack={noop} onNavigateToDay={noop} />)
    expect(screen.getByText(/5h total across 2 days/)).toBeInTheDocument()
  })

  it('shows correct percentages', () => {
    const today = formatDate(new Date())
    setHours(today, 'dr-1on1', 3)
    setHours(today, 'misc', 1)

    render(<SummaryView onBack={noop} onNavigateToDay={noop} />)
    // 3 out of 4 = 75%, 1 out of 4 = 25%
    expect(screen.getByText(/75%/)).toBeInTheDocument()
    expect(screen.getByText(/25%/)).toBeInTheDocument()
  })

  it('labels deleted categories as archived', () => {
    const today = formatDate(new Date())
    const cats = getCategories()
    setHours(today, cats[0].id, 2)
    deleteCategory(cats[0].id)

    render(<SummaryView onBack={noop} onNavigateToDay={noop} />)
    expect(screen.getByText(`${cats[0].label} (archived)`)).toBeInTheDocument()
  })

  it('calls onNavigateToDay when a daily breakdown row is clicked', async () => {
    const today = formatDate(new Date())
    setHours(today, 'dr-1on1', 1)

    const onNav = vi.fn()
    const user = userEvent.setup()
    render(<SummaryView onBack={noop} onNavigateToDay={onNav} />)

    // Daily breakdown section contains day rows as buttons
    const breakdownSection = screen.getByText('Daily Breakdown').closest('div')!
    const dayButton = within(breakdownSection).getAllByRole('button')[0]
    await user.click(dayButton)
    expect(onNav).toHaveBeenCalledWith(today)
  })
})
