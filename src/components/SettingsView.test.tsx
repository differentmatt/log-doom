import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingsView from './SettingsView'
import { getCategories, deleteCategory } from '../storage'
import { defaultCategories } from '../categories'

describe('SettingsView', () => {
  const noop = () => {}

  it('renders all default categories', () => {
    render(<SettingsView onBack={noop} />)
    for (const cat of defaultCategories) {
      expect(screen.getByText(cat.label)).toBeInTheDocument()
    }
  })

  it('adds a new category', async () => {
    const user = userEvent.setup()
    render(<SettingsView onBack={noop} />)

    await user.click(screen.getByText('+ Add category'))
    await user.type(screen.getByPlaceholderText('Label'), 'My Custom')
    await user.type(screen.getByPlaceholderText('Description (optional)'), 'A description')
    await user.click(screen.getByText('Add'))

    expect(screen.getByText('My Custom')).toBeInTheDocument()
    const cats = getCategories()
    expect(cats.find((c) => c.label === 'My Custom')).toBeDefined()
  })

  it('edits a category label', async () => {
    const user = userEvent.setup()
    render(<SettingsView onBack={noop} />)

    // Click edit on the first category
    const editButtons = screen.getAllByLabelText('Edit')
    await user.click(editButtons[0])

    const input = screen.getByDisplayValue(defaultCategories[0].label)
    await user.clear(input)
    await user.type(input, 'Renamed')
    await user.click(screen.getByText('Save'))

    expect(screen.getByText('Renamed')).toBeInTheDocument()
    expect(getCategories()[0].label).toBe('Renamed')
  })

  it('deletes a category (soft delete)', async () => {
    const user = userEvent.setup()
    render(<SettingsView onBack={noop} />)

    const deleteButtons = screen.getAllByLabelText('Delete')
    await user.click(deleteButtons[0])
    // Confirm delete
    await user.click(screen.getByText('Delete'))

    expect(getCategories().find((c) => c.id === defaultCategories[0].id)!.deleted).toBe(true)
  })

  it('restores a deleted category', async () => {
    const user = userEvent.setup()
    // Pre-delete a category
    getCategories()
    deleteCategory(defaultCategories[0].id)

    render(<SettingsView onBack={noop} />)

    // Expand the deleted section
    await user.click(screen.getByText(/Deleted categories/))
    await user.click(screen.getByText('Restore'))

    expect(getCategories().find((c) => c.id === defaultCategories[0].id)!.deleted).toBe(false)
  })

  it('reorders categories via move up/down', async () => {
    const user = userEvent.setup()
    render(<SettingsView onBack={noop} />)

    const catsBefore = getCategories().filter((c) => !c.deleted).sort((a, b) => a.sortOrder - b.sortOrder)
    const secondCatId = catsBefore[1].id

    // Move the second category up
    const moveUpButtons = screen.getAllByLabelText('Move up')
    await user.click(moveUpButtons[1]) // second row's move up button

    const catsAfter = getCategories().filter((c) => !c.deleted).sort((a, b) => a.sortOrder - b.sortOrder)
    expect(catsAfter[0].id).toBe(secondCatId)
  })

  it('cancel add does not create a category', async () => {
    const user = userEvent.setup()
    render(<SettingsView onBack={noop} />)
    const countBefore = getCategories().length

    await user.click(screen.getByText('+ Add category'))
    await user.type(screen.getByPlaceholderText('Label'), 'Should Not Exist')
    await user.click(screen.getByText('Cancel'))

    expect(getCategories()).toHaveLength(countBefore)
    expect(screen.queryByText('Should Not Exist')).not.toBeInTheDocument()
  })

  it('cancel edit does not modify the category', async () => {
    const user = userEvent.setup()
    render(<SettingsView onBack={noop} />)
    const originalLabel = defaultCategories[0].label

    const editButtons = screen.getAllByLabelText('Edit')
    await user.click(editButtons[0])
    const input = screen.getByDisplayValue(originalLabel)
    await user.clear(input)
    await user.type(input, 'Changed')
    await user.click(screen.getByText('Cancel'))

    expect(getCategories()[0].label).toBe(originalLabel)
    expect(screen.getByText(originalLabel)).toBeInTheDocument()
  })

  it('cancel delete does not remove the category', async () => {
    const user = userEvent.setup()
    render(<SettingsView onBack={noop} />)

    const deleteButtons = screen.getAllByLabelText('Delete')
    await user.click(deleteButtons[0])
    // Click Cancel instead of confirming
    await user.click(screen.getByText('Cancel'))

    expect(getCategories().find((c) => c.id === defaultCategories[0].id)!.deleted).toBe(false)
    expect(screen.getByText(defaultCategories[0].label)).toBeInTheDocument()
  })
})
