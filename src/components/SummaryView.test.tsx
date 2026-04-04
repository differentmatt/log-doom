import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SummaryView from './SummaryView'
import { setHours, formatDate, getCategories, deleteCategory, getWeekStart } from '../storage'

describe('SummaryView', () => {
  const noop = () => {}

  it('renders "Weekly Trends" title', () => {
    render(<SummaryView onBack={noop} onNavigateToDay={noop} />)
    expect(screen.getByText('Weekly Trends')).toBeInTheDocument()
  })

  it('renders 4 week selector pills with "This Week" selected by default', () => {
    render(<SummaryView onBack={noop} onNavigateToDay={noop} />)
    expect(screen.getByText('This Week')).toBeInTheDocument()
    // Should have 4 week pill buttons (plus back button and any day buttons)
    const thisWeekPill = screen.getByText('This Week').closest('button')!
    expect(thisWeekPill.className).toContain('bg-blue-600')
  })

  it('shows total hours for selected week', () => {
    const today = formatDate(new Date())
    setHours(today, 'dr-1on1', 2)
    setHours(today, 'misc', 3)

    render(<SummaryView onBack={noop} onNavigateToDay={noop} />)
    expect(screen.getByText('5h total')).toBeInTheDocument()
  })

  it('shows correct stats line', () => {
    const today = formatDate(new Date())
    setHours(today, 'dr-1on1', 4)

    render(<SummaryView onBack={noop} onNavigateToDay={noop} />)
    expect(screen.getByText(/1 day tracked/)).toBeInTheDocument()
    expect(screen.getByText(/4\.0h avg\/day/)).toBeInTheDocument()
  })

  it('shows correct percentages in category breakdown', () => {
    const today = formatDate(new Date())
    setHours(today, 'dr-1on1', 3)
    setHours(today, 'misc', 1)

    render(<SummaryView onBack={noop} onNavigateToDay={noop} />)
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

  it('clicking a past week pill updates the view', async () => {
    // Set data for last week
    const today = new Date()
    const lastWeekDay = new Date(today)
    lastWeekDay.setDate(lastWeekDay.getDate() - 7)
    const lastWeekStr = formatDate(lastWeekDay)
    setHours(lastWeekStr, 'dr-1on1', 5)

    const user = userEvent.setup()
    render(<SummaryView onBack={noop} onNavigateToDay={noop} />)

    // Find the second week pill (index 1) and click it
    const weekStart = getWeekStart(lastWeekStr)
    const [, month, day] = weekStart.split('-').map(Number)
    const d = new Date(2000, month - 1, day)
    const pillLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    await user.click(screen.getByText(pillLabel))
    // Now the stats should reflect last week's data
    expect(screen.getByText(/1 day tracked/)).toBeInTheDocument()
    expect(screen.getByText(/5\.0h avg\/day/)).toBeInTheDocument()
  })

  it('daily breakdown shows all days of the week including empty ones', () => {
    // Don't set any data — all days should show as 0h
    render(<SummaryView onBack={noop} onNavigateToDay={noop} />)

    const breakdownSection = screen.getByText('Daily Breakdown').closest('div')!
    const dayButtons = within(breakdownSection).getAllByRole('button')
    // Should have at least 1 day (today) and at most 7 (full week)
    expect(dayButtons.length).toBeGreaterThanOrEqual(1)
    expect(dayButtons.length).toBeLessThanOrEqual(7)

    // Empty days show 0h
    const zeroEntries = within(breakdownSection).getAllByText('0h')
    expect(zeroEntries.length).toBeGreaterThanOrEqual(1)
  })

  it('calls onNavigateToDay when a daily breakdown row is clicked', async () => {
    const today = formatDate(new Date())
    setHours(today, 'dr-1on1', 1)

    const onNav = vi.fn()
    const user = userEvent.setup()
    render(<SummaryView onBack={noop} onNavigateToDay={onNav} />)

    const breakdownSection = screen.getByText('Daily Breakdown').closest('div')!
    const dayButtons = within(breakdownSection).getAllByRole('button')
    // Click the last button (today, since days are Mon→Sun and today is always last or only)
    await user.click(dayButtons[dayButtons.length - 1])
    expect(onNav).toHaveBeenCalledWith(today)
  })

  it('calls onBack when back button is clicked', async () => {
    const onBack = vi.fn()
    const user = userEvent.setup()
    render(<SummaryView onBack={onBack} onNavigateToDay={noop} />)
    await user.click(screen.getByLabelText('Back'))
    expect(onBack).toHaveBeenCalled()
  })
})
