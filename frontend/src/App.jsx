import { useEffect, useState, useCallback } from 'react'
import { api } from './api'
import Sidebar from './components/Sidebar'
import KpiCards from './components/KpiCards'
import ChartGrid from './components/ChartGrid'
import DataTable from './components/DataTable'
import QueryConsole from './components/QueryConsole'

const PAGE_SIZE = 25

export default function App() {
  const [datasets, setDatasets] = useState([])
  const [tables, setTables] = useState([])
  const [selectedDataset, setSelectedDataset] = useState(null)
  const [selectedTable, setSelectedTable] = useState(null)

  const [schema, setSchema] = useState(null)
  const [summary, setSummary] = useState(null)
  const [rows, setRows] = useState(null)
  const [page, setPage] = useState(0)
  const [orderBy, setOrderBy] = useState(null)
  const [orderDir, setOrderDir] = useState('ASC')

  const [lastSql, setLastSql] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.listDatasets().then((d) => setDatasets(d.datasets)).catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (!selectedDataset) return
    setSelectedTable(null)
    setTables([])
    api.listTables(selectedDataset).then((d) => setTables(d.tables)).catch((e) => setError(e.message))
  }, [selectedDataset])

  const loadTable = useCallback(async (dataset, table, pageArg = 0, orderByArg = null, orderDirArg = 'ASC') => {
    setRunning(true)
    setError(null)
    try {
      const [schemaRes, summaryRes, dataRes] = await Promise.all([
        api.getSchema(dataset, table),
        api.getSummary(dataset, table),
        api.getData(dataset, table, { limit: PAGE_SIZE, offset: pageArg * PAGE_SIZE, orderBy: orderByArg, orderDir: orderDirArg }),
      ])
      setSchema(schemaRes)
      setSummary(summaryRes.columns)
      setRows(dataRes.rows)
      setLastSql(`SELECT * FROM \`${dataset}.${table}\` ${orderByArg ? `ORDER BY ${orderByArg} ${orderDirArg} ` : ''}LIMIT ${PAGE_SIZE} OFFSET ${pageArg * PAGE_SIZE}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }, [])

  useEffect(() => {
    if (selectedDataset && selectedTable) {
      setPage(0)
      setOrderBy(null)
      loadTable(selectedDataset, selectedTable, 0, null, 'ASC')
    }
  }, [selectedDataset, selectedTable, loadTable])

  const handlePageChange = (p) => {
    setPage(p)
    loadTable(selectedDataset, selectedTable, p, orderBy, orderDir)
  }

  const handleSort = (col) => {
    const dir = orderBy === col && orderDir === 'ASC' ? 'DESC' : 'ASC'
    setOrderBy(col)
    setOrderDir(dir)
    setPage(0)
    loadTable(selectedDataset, selectedTable, 0, col, dir)
  }

  const handleRunSql = async (sql) => {
    setRunning(true)
    setError(null)
    setLastSql(sql)
    try {
      const res = await api.runQuery(sql)
      setRows(res.rows)
      setSchema(null)
      setSummary(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-base text-ink font-sans">
      <Sidebar
        datasets={datasets}
        tables={tables}
        selectedDataset={selectedDataset}
        selectedTable={selectedTable}
        onSelectDataset={setSelectedDataset}
        onSelectTable={setSelectedTable}
      />

      <main className="flex-1 px-6 py-6 space-y-5 max-w-[1400px]">
        <header className="flex items-baseline justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              {selectedDataset && selectedTable
                ? <span className="font-mono text-amber">{selectedDataset}.{selectedTable}</span>
                : 'Select a table to explore'}
            </h1>
            <p className="text-xs text-muted mt-0.5">Live read from BigQuery — nothing cached, every panel is a real query.</p>
          </div>
        </header>

        <QueryConsole lastSql={lastSql} onRun={handleRunSql} running={running} />

        {error && (
          <div className="border border-rose/40 bg-rose/10 text-rose text-sm rounded-lg px-4 py-2 font-mono">
            {error}
          </div>
        )}

        {schema && <KpiCards schema={schema} />}
        {summary && <ChartGrid columns={summary} />}
        {rows && (
          <DataTable
            rows={rows}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
            orderBy={orderBy}
            orderDir={orderDir}
            onSort={selectedDataset && selectedTable ? handleSort : undefined}
          />
        )}

        {!selectedDataset && (
          <div className="text-sm text-muted border border-dashed border-border rounded-lg px-5 py-10 text-center">
            Pick a dataset from the sidebar, or run a custom SELECT above to explore any table.
          </div>
        )}
      </main>
    </div>
  )
}
