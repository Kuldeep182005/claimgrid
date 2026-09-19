import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-grid-bg flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-text-primary mb-2 tracking-tight">
          Claim<span className="text-accent">Grid</span>
        </h1>
        <p className="text-text-secondary text-lg">
          Claim a cell. Build your territory.
        </p>
        <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-elevated border border-grid-line text-text-muted text-sm">
          <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse" />
          Setting up...
        </div>
      </div>
    </div>
  )
}

export default App
