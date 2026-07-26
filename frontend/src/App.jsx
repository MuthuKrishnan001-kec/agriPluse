import { useEffect, useState, useCallback } from 'react'
import { api } from './api'
import Sidebar from './components/Sidebar'
import KpiCards from './components/KpiCards'
import ChartGrid from './components/ChartGrid'
import DataTable from './components/DataTable'
import QueryConsole from './components/QueryConsole'

const PAGE_SIZE = 25

function getStatusCopy({ running, error, selectedDataset, selectedTable }) {
  if (running) {
    return {
      title: 'Gathering the latest field numbers…',
      body: 'We are pulling fresh records so the cards and charts stay current.',
    }
  }
  if (error) {
    return {
      title: 'We hit a snag pulling fresh data',
      body: error,
    }
  }
  if (selectedDataset && selectedTable) {
    return {
      title: 'Ready for a quick check',
      body: 'Scan the highlights below, then open the advanced box for a custom query when you need it.',
    }
  }
  return {
    title: 'Choose a record set to begin',
    body: 'Pick a dataset from the left to see the latest farm information in a simple, glanceable view.',
  }
}

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
      setPage(0)
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  const status = getStatusCopy({ running, error, selectedDataset, selectedTable })

  return (
    <div className="min-h-screen bg-earth text-linen font-sans">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
        <Sidebar
          datasets={datasets}
          tables={tables}
          selectedDataset={selectedDataset}
          selectedTable={selectedTable}
          onSelectDataset={setSelectedDataset}
          onSelectTable={setSelectedTable}
        />

        <main className="flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
          <header className="rounded-[30px] border border-border/70 bg-soil/90 p-5 shadow-soft furrow-sheen sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-crop/30 bg-crop/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-crop">
                  <span>🌾</span>
                  agriPulse
                </div>
                <h1 className="mt-3 font-display text-3xl leading-tight text-linen sm:text-4xl">
                  {selectedDataset && selectedTable
                    ? `Live view for ${selectedDataset}.${selectedTable}`
                    : 'Your latest field story, at a glance'}
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-linen/80 sm:text-base">
                  Read farm data in plain language, spot changes quickly, and open the advanced box when you want to run a custom check.
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-earth/70 px-4 py-3 text-sm text-linen/80">
                <div className="font-semibold text-linen">{status.title}</div>
                <p className="mt-1 max-w-sm text-sm leading-6">{status.body}</p>
              </div>
            </div>
          </header>

          <div className="mt-5 space-y-4">
            <QueryConsole lastSql={lastSql} onRun={handleRunSql} running={running} />

            {error && (
              <div className="rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent">
                <div className="font-semibold">We could not refresh this view</div>
                <p className="mt-1 leading-6">{error}</p>
              </div>
            )}

            {running && !schema && !summary && !rows && (
              <div className="rounded-2xl border border-border/70 bg-soil/70 px-4 py-4 text-sm text-linen/80">
                <div className="font-semibold text-linen">Checking the latest field records…</div>
                <p className="mt-1">This only takes a moment while we pull the freshest data.</p>
              </div>
            )}

            {schema && <KpiCards schema={schema} />}
            {summary && <ChartGrid columns={summary} />}
            {(rows || (!selectedDataset && !rows)) && (
              <DataTable
                rows={rows || []}
                page={page}
                pageSize={PAGE_SIZE}
                onPageChange={handlePageChange}
                orderBy={orderBy}
                orderDir={orderDir}
                onSort={selectedDataset && selectedTable ? handleSort : undefined}
              />
            )}

            {!selectedDataset && !rows && !running && (
              <div className="rounded-[24px] border border-dashed border-border bg-soil/60 px-6 py-10 text-center text-sm text-linen/70">
                Pick a record set from the left to start exploring your field data.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
