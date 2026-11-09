'use client'

import { useEffect, useMemo, useState } from 'react'

type Expense = { category: string; description: string; amount: number }
type Sprint = { title: string; expenses: Expense[]; income: number }

const STORAGE_KEY = 'sprint-finance-dashboard'
const sprintTitles = ['10 ноября — 25 ноября', '25 ноября — 10 декабря', '10 декабря — 25 декабря', '25 декабря — 10 января', '10 января — 25 января', '25 января — 10 февраля']
const defaults: Sprint[] = sprintTitles.map((title, index) => ({
  title,
  income: index === 0 ? 90000 : index === 1 ? 85000 : index === 2 ? 92000 : index === 3 ? 88000 : index === 4 ? 95000 : 100000,
  expenses: [
    { category: 'Жильё', description: 'Аренда квартиры', amount: index === 0 ? 45000 : 0 },
    { category: 'Продукты', description: 'Еда и покупки', amount: index === 0 ? 10000 : 0 },
    { category: 'Транспорт', description: 'Такси и проезд', amount: index === 0 ? 5000 : 0 },
    { category: 'Связь', description: 'Телефон и интернет', amount: index === 0 ? 1500 : 0 },
    { category: 'Здоровье', description: 'Аптека и врачи', amount: 0 },
    { category: 'Отдых', description: 'Кафе и развлечения', amount: 0 },
    { category: 'Разное', description: 'Незапланированные траты', amount: 0 },
    { category: 'Накопления', description: 'Отложить деньги', amount: index === 0 ? 10000 : 0 },
  ],
}))

const money = (value: number) => `${Math.round(value).toLocaleString('ru-RU')} ₽`
const safeNumber = (value: string) => {
  const parsed = Number(value.replace(/[^0-9-]/g, ''))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function EditableCell({ value, type, onSave }: { value: string | number; type: 'text' | 'number'; onSave: (value: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))

  useEffect(() => setDraft(String(value)), [value])
  const commit = () => { setEditing(false); onSave(type === 'number' ? String(safeNumber(draft)) : draft.trim() || '—') }
  if (editing) return <input autoFocus className={`cell-input ${type === 'number' ? 'number' : ''}`} type={type === 'number' ? 'text' : 'text'} inputMode={type === 'number' ? 'numeric' : undefined} value={draft} onChange={(event) => setDraft(type === 'number' ? event.target.value.replace(/[^0-9]/g, '') : event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') commit(); if (event.key === 'Escape') { setDraft(String(value)); setEditing(false) } }} aria-label="Редактируемое поле" />
  return <button className="editable" onClick={() => setEditing(true)}>{type === 'number' ? money(Number(value)) : value}</button>
}

export default function Page() {
  const [sprints, setSprints] = useState<Sprint[]>(defaults)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try { const stored = window.localStorage.getItem(STORAGE_KEY); if (stored) setSprints(JSON.parse(stored)) } catch { /* use defaults when storage is unavailable */ }
    setHydrated(true)
  }, [])
  useEffect(() => { if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sprints)) }, [sprints, hydrated])

  const totals = useMemo(() => {
    let balance = 0
    let savings = 0
    return sprints.map((sprint) => {
      const spent = sprint.expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)
      const saved = Number(sprint.expenses[7]?.amount || 0)
      balance = balance + Number(sprint.income || 0) - spent
      savings += saved
      return { balance, savings, spent }
    })
  }, [sprints])

  const updateSprint = (sprintIndex: number, change: Partial<Sprint>) => setSprints((current) => current.map((sprint, index) => index === sprintIndex ? { ...sprint, ...change } : sprint))
  const updateExpense = (sprintIndex: number, expenseIndex: number, change: Partial<Expense>) => setSprints((current) => current.map((sprint, index) => index === sprintIndex ? { ...sprint, expenses: sprint.expenses.map((expense, row) => row === expenseIndex ? { ...expense, ...change } : expense) } : sprint))

  return <main className="dashboard-shell">
    <header className="dashboard-header">
      <div><p className="eyebrow">Личный финансовый учёт</p><h1>Спринты</h1></div>
      <div className="header-meta"><span className="status-dot" /> <span>Сохранено локально</span></div>
    </header>
    <section className="sprint-grid" aria-label="Финансовые спринты">
      {sprints.map((sprint, sprintIndex) => <article className="sprint-card" key={sprintIndex}>
        <table><caption><EditableCell value={sprint.title} type="text" onSave={(value) => updateSprint(sprintIndex, { title: value })} /><span className="sprint-number">0{sprintIndex + 1}</span></caption>
          <thead><tr><th>Категория</th><th>Описание</th><th className="amount">Сумма</th></tr></thead>
          <tbody>
            {sprint.expenses.map((expense, expenseIndex) => <tr key={expenseIndex} className={expenseIndex === 7 ? 'savings-source' : ''}><td><EditableCell value={expense.category} type="text" onSave={(value) => updateExpense(sprintIndex, expenseIndex, { category: value })} /></td><td><EditableCell value={expense.description} type="text" onSave={(value) => updateExpense(sprintIndex, expenseIndex, { description: value })} /></td><td className="amount"><EditableCell value={expense.amount} type="number" onSave={(value) => updateExpense(sprintIndex, expenseIndex, { amount: safeNumber(value) })} /></td></tr>)}
            <tr className="income-row summary-row"><td><span>Доход</span></td><td><span className="muted">за спринт</span></td><td className="amount"><EditableCell value={sprint.income} type="number" onSave={(value) => updateSprint(sprintIndex, { income: safeNumber(value) })} /></td></tr>
            <tr className="total-row balance-row summary-row"><td><span className="balance-row-text">Остаток</span></td><td><span className="muted">доступно</span></td><td className="amount"><strong>{money(totals[sprintIndex].balance)}</strong></td></tr>
            <tr className="total-row savings-row summary-row"><td><span className="savings-row-text">Накопления</span></td><td><span className="muted">всего</span></td><td className="amount"><strong>{money(totals[sprintIndex].savings)}</strong></td></tr>
          </tbody>
        </table>
        <footer><span>Расходы</span><span>{money(totals[sprintIndex].spent)}</span></footer>
      </article>)}
    </section>
    <p className="hint">Нажмите на любую ячейку, чтобы изменить данные</p>
  </main>
}
